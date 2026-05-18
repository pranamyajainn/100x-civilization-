'use client';

/**
 * /app/feed — Main opportunity feed.
 *
 * Ranks posts by profile relevance first, then recency.
 * Empty states distinguish between no posts and no matches.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, getDoc, getDocs, limit, query, updateDoc, where } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { motion } from 'motion/react';
import { LogOut, Plus, RefreshCw, Settings, User as UserIcon } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { clearSessionCookies } from '@/lib/client-session';
import { PostCard, PostData } from '@/components/post-card';
import { PostForm } from '@/components/post-form';
import { scoreFeedRelevance } from '@/lib/matching';
import { ActivityTicker } from '@/components/activity-ticker';
import { CivChat } from '@/components/civ-chat';

interface UserProfile {
  uid: string;
  fullName?: string;
  cohort?: string;
  email?: string;
  linkedinUrl?: string;
  embedding?: number[];
  skillTags?: string[];
  onboardingComplete?: boolean;
  status?: string;
  isAdmin?: boolean;
  celebrationShown?: boolean;
  approvedAt?: { toMillis(): number } | null;
  isFoundingMember?: boolean;
}

export default function FeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [rawPostCount, setRawPostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [postFormOpen, setPostFormOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationProfile, setCelebrationProfile] = useState<UserProfile | null>(null);
  const [celebrationSaving, setCelebrationSaving] = useState(false);

  const loadMembers = useCallback(async (currentUserId: string) => {
    setMembersLoading(true);
    setMembersError('');

    try {
      const membersQuery = query(
        collection(db, 'users'),
        where('status', '==', 'approved'),
        where('onboardingComplete', '==', true)
      );
      const snapshot = await getDocs(membersQuery);
      const approvedMembers = snapshot.docs
        .map((document) => {
          const data = document.data() as UserProfile;

          return {
            ...data,
            uid: document.id,
            fullName: safeText(data.fullName),
            cohort: safeText(data.cohort, '100x alum'),
            email: safeText(data.email),
            linkedinUrl: safeText(data.linkedinUrl),
            skillTags: Array.isArray(data.skillTags) ? data.skillTags : [],
          } satisfies UserProfile;
        })
        .filter((member) => member.uid !== currentUserId);

      setMembers(approvedMembers);
    } catch (error) {
      console.error('[feed] members load error:', error);
      setMembers([]);
      setMembersError('Could not load members right now.');
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const loadPosts = useCallback(async (userProfile: UserProfile) => {
    setLoading(true);
    setLoadError('');

    try {
      // v2: add cursor pagination
      const postQuery = query(collection(db, 'posts'), where('status', '==', 'open'), limit(100));
      const snapshot = await getDocs(postQuery);

      const rawPosts: PostData[] = snapshot.docs.map((document) => {
        const data = document.data();
        return {
          id: document.id,
          type: data.type,
          title: data.title,
          description: data.description,
          skillTags: data.skillTags ?? [],
          posterName: data.posterName,
          posterCohort: data.posterCohort,
          posterUid: data.posterUid,
          contactVisible: data.contactVisible ?? false,
          contactEmail: data.contactEmail,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
          embedding: data.embedding ?? [],
          relevanceScore: 0,
        } as PostData & { embedding: number[] };
      });

      setRawPostCount(rawPosts.length);
      setPosts(rawPosts);
    } catch (error) {
      console.error('[feed] load error:', error);
      setLoadError('Could not load the feed. Refresh to try again.');
      setPosts([]);
      setRawPostCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/');
        return;
      }

      setUser(currentUser);
      try {
        const profileSnap = await getDoc(doc(db, 'users', currentUser.uid));
        if (profileSnap.exists()) {
          const data = profileSnap.data() as UserProfile;
          const normalizedProfile = {
            ...data,
            fullName: safeText(data.fullName),
            cohort: safeText(data.cohort),
            email: safeText(data.email, currentUser.email ?? ''),
            embedding: Array.isArray(data.embedding) ? data.embedding : [],
            skillTags: Array.isArray(data.skillTags) ? data.skillTags : [],
          };
          setIsAdmin(isConfiguredAdminEmail(currentUser.email));

          if (data.celebrationShown === false) {
            setCelebrationProfile(normalizedProfile);
            setShowCelebration(true);
            setLoading(false);
            void loadMembers(currentUser.uid);
            return;
          }

          setProfile(normalizedProfile);
          void loadPosts(normalizedProfile);
          void loadMembers(currentUser.uid);
        } else {
          setLoadError('Could not load the feed. Refresh to try again.');
          setLoading(false);
        }
      } catch (err) {
        console.error('[feed] failed to load profile:', err);
        setLoadError('Failed to load your profile. Please refresh.');
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [loadMembers, loadPosts, router]);

  const rankedPosts = useMemo(() => {
    if (!profile) return [];

    const userEmbedding = profile.embedding ?? [];
    const userSkills = profile.skillTags ?? [];

    return posts
      .map((post) => {
        const score = scoreFeedRelevance(
          {
            title: post.title,
            type: post.type,
            description: post.description,
            skillTags: post.skillTags ?? [],
            embedding: post.embedding ?? null,
          },
          {
            skillTags: userSkills,
            embedding: userEmbedding,
          }
        );

        return {
          ...post,
          relevanceScore: score,
        };
      })
      .sort((left, right) => {
        if (Math.abs(left.relevanceScore - right.relevanceScore) > 0.05) {
          return right.relevanceScore - left.relevanceScore;
        }

        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
  }, [posts, profile?.embedding, profile?.skillTags]);

  const isNewMember = checkIsNewMember(profile);

  const profileDisplayName = safeText(profile?.fullName, safeText(profile?.email, 'there'));
  const profileFirstName = profileDisplayName.match(/^\S+/)?.[0] ?? 'there';
  const profileCohort = safeText(profile?.cohort, '100x alum');
  const profileEmail = safeText(profile?.email, user?.email ?? '');

  const handleSignOut = async () => {
    await auth.signOut();
    clearSessionCookies();
    router.push('/');
  };

  const handleCelebrationContinue = async () => {
    if (!user || !celebrationProfile) return;

    setCelebrationSaving(true);
    setLoadError('');

    try {
      const nextProfile = {
        ...celebrationProfile,
        celebrationShown: true,
      };

      await updateDoc(doc(db, 'users', user.uid), { celebrationShown: true });
      setShowCelebration(false);
      setProfile(nextProfile);
      setCelebrationProfile(null);
      await loadPosts(nextProfile);
    } catch (error) {
      console.error('[feed] celebration update error:', error);
      setLoadError('Could not save your welcome state. Please try again.');
    } finally {
      setCelebrationSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black">
      <ActivityTicker db={db} />

      {isNewMember ? (
        <div className="w-full py-3 px-6 bg-brand-neon/10 border-b border-brand-neon/20">
          <p className="font-mono text-xs tracking-widest text-brand-neon uppercase text-center">
            WELCOME TO THE NETWORK · POST YOUR FIRST OPPORTUNITY OR BROWSE THE MEMBERS BELOW
          </p>
        </div>
      ) : null}

      {showCelebration ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-black px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-xl border border-brand-border bg-black/70 p-8 text-center md:p-12"
          >
            <div className="mx-auto mb-8 flex h-12 w-12 items-center justify-center rounded-full border border-brand-neon/50 bg-brand-neon/10">
              <div className="h-2 w-2 rounded-full bg-brand-neon" />
            </div>
            <h1 className="mb-3 text-5xl font-display font-medium text-brand-white">You&apos;re in.</h1>
            <p className="mb-8 text-sm leading-relaxed text-brand-muted">
              Welcome to 100x Civilization.
            </p>
            {loadError ? (
              <p className="mb-5 text-sm text-red-400">{loadError}</p>
            ) : null}
            <button
              type="button"
              onClick={handleCelebrationContinue}
              disabled={celebrationSaving}
              className="inline-flex min-h-[44px] items-center justify-center bg-brand-neon px-8 py-3 text-sm font-bold uppercase tracking-widest text-brand-black transition-colors hover:bg-[#FF6A26] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {celebrationSaving ? 'Saving...' : "Let's go"}
            </button>
          </motion.div>
        </div>
      ) : null}

      <header className="sticky top-0 z-50 border-b border-white/8 bg-brand-black/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-brand-neon" />
              <div className="h-1 w-1 rounded-full bg-brand-neon" />
            </div>
            <span className="font-display text-sm uppercase tracking-[0.3em] text-brand-neon">100x Civilization</span>
          </div>

          <div className="flex items-center gap-1">
            {isAdmin ? (
              <button
                onClick={() => router.push('/app/admin')}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center text-brand-muted transition-colors hover:text-brand-white"
                aria-label="Admin panel"
              >
                <Settings size={16} />
              </button>
            ) : null}
            <button
              onClick={() => router.push('/app/profile')}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-brand-muted transition-colors hover:text-brand-white"
              aria-label="Edit profile"
            >
              <UserIcon size={16} />
            </button>
            <button
              onClick={handleSignOut}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-brand-muted transition-colors hover:text-brand-white"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 font-display text-4xl md:text-5xl font-medium text-brand-white leading-tight">Opportunities</h1>
            {profile ? (
              <p className="text-xs font-mono tracking-widest text-brand-muted uppercase">
                Hi {profileFirstName} · {profileCohort} · {rankedPosts.length} relevant opportunities
              </p>
            ) : null}
          </div>

          <button
            id="post-opportunity-btn"
            onClick={() => setPostFormOpen(true)}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap bg-brand-neon px-5 py-3 text-sm font-semibold text-brand-black transition-all duration-200 shadow-[0_0_20px_rgba(255,107,53,0.3)] hover:bg-[#FF6A26] hover:shadow-[0_0_30px_rgba(255,107,53,0.5)] sm:w-auto"
          >
            <Plus size={16} />
            Post an opportunity
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <PostCardSkeleton key={index} />
            ))}
          </div>
        ) : loadError ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
            <p className="mb-4 text-sm text-brand-muted">{loadError}</p>
            <button
              onClick={() => profile && loadPosts(profile)}
              className="inline-flex items-center gap-2 text-sm font-mono text-brand-neon hover:underline"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </motion.div>
        ) : rawPostCount === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
            <p className="mb-4 text-sm text-brand-muted">No opportunities posted yet. Be the first.</p>
            <button
              onClick={() => setPostFormOpen(true)}
              className="text-sm font-mono text-brand-neon hover:underline"
            >
              Post an opportunity
            </button>
          </motion.div>
        ) : rankedPosts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
            <p className="mb-2 text-lg font-display font-medium text-brand-white">No opportunities yet.</p>
            <p className="mb-4 text-sm text-brand-muted">Be the first to post one.</p>
            <button
              onClick={() => setPostFormOpen(true)}
              className="text-sm font-mono text-brand-neon hover:underline"
            >
              Post an opportunity
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 border-t border-white/8 pt-8">
            {rankedPosts.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                onClick={(id) => router.push(`/app/posts/${id}`)}
                index={index}
              />
            ))}
          </div>
        )}

        <section className="mt-16">
          <div className="mb-8">
            <h2 className="mb-1 font-display text-3xl md:text-4xl font-medium text-brand-white">Members</h2>
            <p className="text-xs font-mono tracking-widest text-brand-muted uppercase">YOUR NETWORK · CONNECT DIRECTLY</p>
          </div>

          {membersLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <MemberCardSkeleton key={index} />
              ))}
            </div>
          ) : membersError ? (
            <div className="border border-brand-border bg-black p-6 text-sm text-brand-muted">
              {membersError}
            </div>
          ) : members.length === 0 ? (
            <div className="border border-brand-border bg-black p-6 text-sm text-brand-muted">
              No other approved members are visible yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {members.map((member) => {
                const memberName = safeText(member.fullName, safeText(member.email, 'Member'));
                const memberCohort = safeText(member.cohort, '100x alum');
                const memberSkills = Array.isArray(member.skillTags) ? member.skillTags : [];
                const memberLinkedIn = safeText(member.linkedinUrl);
                const memberEmail = safeText(member.email);

                return (
                  <div key={member.uid} className="border border-white/8 bg-white/[0.02] hover:border-white/20 transition-colors duration-300 p-6">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-display font-medium text-brand-white">
                          {memberName}
                          {member.isFoundingMember ? (
                            <span className="inline-block font-mono text-[8px] tracking-[0.2em] text-brand-neon border border-brand-neon/40 px-1.5 py-0.5 uppercase ml-2">
                              Founding
                            </span>
                          ) : null}
                        </h3>
                        <p className="mt-1 font-mono text-xs tracking-widest text-brand-muted">COHORT {memberCohort}</p>
                      </div>
                      {memberLinkedIn ? (
                        <a
                          href={toExternalUrl(memberLinkedIn)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[44px] items-center justify-center border border-brand-neon px-4 py-2 text-xs font-mono uppercase tracking-[0.2em] text-brand-neon transition-colors hover:bg-brand-neon hover:text-brand-black"
                        >
                          Connect
                        </a>
                      ) : null}
                    </div>

                    {memberSkills.length > 0 ? (
                      <div className="mb-5 flex flex-wrap gap-2">
                        {memberSkills.map((skill) => (
                          <span
                            key={`${member.uid}-${skill}`}
                            className="border border-brand-border px-2 py-1 text-[11px] font-mono uppercase tracking-[0.16em] text-brand-muted"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mb-5 text-sm text-brand-muted">Skills not listed yet.</p>
                    )}

                    {memberLinkedIn ? null : memberEmail ? (
                      <div>
                        <p className="mb-1 text-[10px] font-mono uppercase tracking-[0.2em] text-brand-muted">
                          Contact
                        </p>
                        <a
                          href={`mailto:${memberEmail}`}
                          className="text-sm text-brand-neon transition-colors hover:text-[#FF6A26]"
                        >
                          {memberEmail}
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-brand-muted">No LinkedIn or contact email available.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {profile && user ? (
        <PostForm
          isOpen={postFormOpen}
          onClose={() => {
            setPostFormOpen(false);
            if (profile) {
              loadPosts(profile);
            }
          }}
          posterUid={user.uid}
          posterName={profileDisplayName}
          posterCohort={profileCohort}
          posterEmail={profileEmail}
        />
      ) : null}

      <CivChat />
    </div>
  );
}

function safeText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function isConfiguredAdminEmail(email: string | null | undefined) {
  const configuredValue = process.env.NEXT_PUBLIC_ADMIN_EMAILS;

  if (!configuredValue) {
    return false;
  }

  const normalizedValue = configuredValue.trim();

  if (!normalizedValue || normalizedValue === 'REPLACE_ME') {
    return false;
  }

  const adminEmails = normalizedValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return !!email && adminEmails.includes(email.trim());
}

function PostCardSkeleton() {
  return (
    <div className="border border-brand-border bg-black p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="h-5 w-24 animate-pulse bg-white/10" />
        <div className="h-3 w-14 animate-pulse bg-white/10" />
      </div>
      <div className="mb-3 h-6 w-3/4 animate-pulse bg-white/10" />
      <div className="mb-2 h-4 w-full animate-pulse bg-white/10" />
      <div className="mb-4 h-4 w-5/6 animate-pulse bg-white/10" />
      <div className="mb-5 flex gap-2">
        <div className="h-5 w-16 animate-pulse bg-white/10" />
        <div className="h-5 w-20 animate-pulse bg-white/10" />
        <div className="h-5 w-14 animate-pulse bg-white/10" />
      </div>
      <div className="h-3 w-1/2 animate-pulse bg-white/10" />
    </div>
  );
}

function MemberCardSkeleton() {
  return (
    <div className="border border-brand-border bg-black p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-2 h-6 w-2/3 animate-pulse bg-white/10" />
          <div className="h-4 w-24 animate-pulse bg-white/10" />
        </div>
        <div className="h-11 w-24 animate-pulse bg-white/10" />
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        <div className="h-6 w-20 animate-pulse bg-white/10" />
        <div className="h-6 w-24 animate-pulse bg-white/10" />
        <div className="h-6 w-16 animate-pulse bg-white/10" />
      </div>
      <div className="h-4 w-1/2 animate-pulse bg-white/10" />
    </div>
  );
}

function toExternalUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function checkIsNewMember(profile: UserProfile | null): boolean {
  if (!profile?.celebrationShown || !profile.approvedAt) return false;
  return Date.now() - profile.approvedAt.toMillis() < 48 * 60 * 60 * 1000;
}
