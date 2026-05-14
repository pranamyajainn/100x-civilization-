'use client';

/**
 * /app/feed — Main opportunity feed.
 *
 * Displays posts sorted by:
 * 1. Relevance to the current user's profile embedding (cosine similarity)
 * 2. Recency (fallback when similarity scores are tied or embeddings are absent)
 *
 * Empty state: if no matches, one-sentence explanation + prompt to add more skill tags.
 *
 * PRD requirement: "if a user's feed shows no matches, explain why in one sentence
 * and prompt them to add more skill tags."
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { PostCard, PostData } from '@/components/post-card';
import { PostForm } from '@/components/post-form';
import { cosineSimilarity } from '@/lib/matching';
import { motion } from 'motion/react';
import { Plus, LogOut, Settings } from 'lucide-react';

interface UserProfile {
  uid: string;
  fullName: string;
  cohort: string;
  email: string;
  embedding: number[];
  skillTags: string[];
  onboardingComplete: boolean;
}

export default function FeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [postFormOpen, setPostFormOpen] = useState(false);

  // Load auth + profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/'); return; }
      setUser(u);

      const profileSnap = await getDoc(doc(db, 'users', u.uid));
      if (profileSnap.exists()) {
        const data = profileSnap.data() as UserProfile;
        setProfile(data);

        // Check admin
        const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim());
        if (u.email && adminEmails.includes(u.email)) setIsAdmin(true);
      }
    });
    return unsub;
  }, [router]);

  // Load and rank posts
  const loadPosts = useCallback(async (userProfile: UserProfile) => {
    setLoading(true);
    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(100));
      const snap = await getDocs(q);

      const rawPosts: PostData[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
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

      // Rank by cosine similarity if user has embedding
      const userEmb = userProfile.embedding;
      const ranked = rawPosts
        .map((post: any) => {
          const score =
            userEmb?.length > 0 && post.embedding?.length > 0
              ? cosineSimilarity(userEmb, post.embedding)
              : 0;
          return { ...post, relevanceScore: score };
        })
        .sort((a: any, b: any) => {
          if (Math.abs(a.relevanceScore - b.relevanceScore) > 0.05) {
            return b.relevanceScore - a.relevanceScore; // relevance primary
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // recency secondary
        });

      setPosts(ranked);
    } catch (err) {
      console.error('[feed] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile) loadPosts(profile);
  }, [profile, loadPosts]);

  const handleSignOut = async () => {
    await auth.signOut();
    document.cookie = 'fb_session=; path=/; max-age=0';
    document.cookie = 'ob_complete=; path=/; max-age=0';
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-brand-black">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-brand-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-3 h-3 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-brand-neon" />
              <div className="w-1 h-1 bg-brand-neon rounded-full" />
            </div>
            <span className="text-[11px] font-mono tracking-[0.2em] text-brand-neon uppercase">100x Civilization</span>
          </div>

          <div className="flex items-center gap-1">
            {isAdmin && (
              <button
                onClick={() => router.push('/app/admin')}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-brand-muted hover:text-brand-white transition-colors"
                aria-label="Admin panel"
              >
                <Settings size={16} />
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-brand-muted hover:text-brand-white transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-medium text-brand-white mb-1">
              Opportunities
            </h1>
            {profile && (
              <p className="text-sm text-brand-muted">
                Hi {profile.fullName.split(' ')[0]} · {profile.cohort} · {posts.length} open opportunities
              </p>
            )}
          </div>

          <button
            id="post-opportunity-btn"
            onClick={() => setPostFormOpen(true)}
            className="flex items-center gap-2 bg-brand-neon text-brand-black font-semibold px-5 py-3 hover:bg-[#FF6A26] transition-colors text-sm whitespace-nowrap min-h-[44px]"
          >
            <Plus size={16} />
            Post Opportunity
          </button>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex items-center gap-3 py-20 justify-center text-brand-muted">
            <div className="w-4 h-4 border border-brand-neon border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-mono">Loading opportunities…</span>
          </div>
        ) : posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <p className="text-brand-muted text-sm mb-4">
              {/* PRD-specified empty state copy */}
              No opportunities match your current skill tags — add more specific tags to your profile to improve your matches.
            </p>
            <button
              onClick={() => router.push('/app/profile')}
              className="text-sm font-mono text-brand-neon hover:underline"
            >
              Update skill tags →
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                onClick={(id) => router.push(`/app/posts/${id}`)}
                index={i}
              />
            ))}
          </div>
        )}
      </main>

      {/* Post creation form */}
      {profile && user && (
        <PostForm
          isOpen={postFormOpen}
          onClose={() => { setPostFormOpen(false); if (profile) loadPosts(profile); }}
          posterUid={user.uid}
          posterName={profile.fullName}
          posterCohort={profile.cohort}
          posterEmail={profile.email}
        />
      )}
    </div>
  );
}
