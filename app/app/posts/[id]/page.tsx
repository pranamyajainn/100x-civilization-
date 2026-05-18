'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { motion } from 'motion/react';
import { ArrowLeft, Check, Copy, Loader2, Mail } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { getAuthorizedHeaders } from '@/lib/client-session';
import { skillLabel } from '@/lib/taxonomy';

const TYPE_LABELS: Record<string, string> = {
  hiring: 'Hiring',
  'co-founder': 'Co-Founder Search',
  'paid-project': 'Paid Project',
  'pressure-test': 'Pressure Test',
  'warm-intro': 'Warm Intro Request',
};

interface PostDetail {
  id: string;
  type: string;
  title: string;
  description: string;
  skillTags: string[];
  compensation?: string;
  commitment?: string;
  equity?: string;
  targetIntro?: string;
  posterName: string;
  posterCohort: string;
  posterUid: string;
  contactVisible: boolean;
  contactEmail: string;
  createdAt: string;
}

interface PosterContact {
  fullName: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  isFoundingMember?: boolean;
}

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = typeof params?.id === 'string' ? params.id : '';

  const [user, setUser] = useState<User | null>(null);
  const [post, setPost] = useState<PostDetail | null>(null);
  const [posterContact, setPosterContact] = useState<PosterContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [contactRevealed, setContactRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [fillConfirm, setFillConfirm] = useState(false);
  const [filling, setFilling] = useState(false);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/');
        return;
      }

      setUser(currentUser);
    });

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    async function fetchPost() {
      setLoading(true);
      setError('');

      try {
        const snap = await getDoc(doc(db, 'posts', postId));
        if (!snap.exists()) {
          setError('This opportunity is no longer available.');
          return;
        }

        const data = snap.data();
        const nextPost: PostDetail = {
          id: snap.id,
          type: data.type,
          title: data.title,
          description: data.description,
          skillTags: data.skillTags ?? [],
          compensation: data.compensation,
          commitment: data.commitment,
          equity: data.equity,
          targetIntro: data.targetIntro,
          posterName: data.posterName,
          posterCohort: data.posterCohort,
          posterUid: data.posterUid,
          contactVisible: data.contactVisible ?? false,
          contactEmail: data.contactEmail ?? '',
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? '',
        };
        setPost(nextPost);

        if (nextPost.posterUid) {
          try {
            const posterSnap = await getDoc(doc(db, 'users', nextPost.posterUid));
            const posterData = posterSnap.data();
            setPosterContact({
              fullName: posterData?.fullName ?? nextPost.posterName,
              email: posterData?.email ?? nextPost.contactEmail,
              phone: posterData?.phone ?? '',
              linkedinUrl: posterData?.linkedinUrl ?? '',
              isFoundingMember: posterData?.isFoundingMember ?? false,
            });
          } catch (posterError) {
            console.error('[post-detail] poster fetch error:', posterError);
            setPosterContact({
              fullName: nextPost.posterName,
              email: nextPost.contactEmail,
              phone: '',
              linkedinUrl: '',
            });
          }
        }
      } catch (fetchError) {
        console.error('[post-detail] fetch error:', fetchError);
        setError('This opportunity is no longer available.');
      } finally {
        setLoading(false);
      }
    }

    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const logConnection = async (action: 'reveal' | 'message'): Promise<boolean> => {
    if (!user || !post) return false;

    setConnecting(true);
    try {
      const headers = await getAuthorizedHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch('/api/connect', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          postId: post.id,
          action,
        }),
      });

      if (!response.ok && response.status !== 409) {
        throw new Error('Failed to log connection');
      }

      setConnected(true);
      return true;
    } catch (connectionError) {
      console.error('[post-detail] connection log error:', connectionError);
      return false;
    } finally {
      setConnecting(false);
    }
  };

  const handleReveal = async () => {
    if (connected) return;
    const logged = await logConnection('reveal');
    if (logged) {
      setContactRevealed(true);
    }
  };

  const handleCopyEmail = () => {
    const email = posterContact?.email ?? post?.contactEmail ?? '';
    if (!email) return;

    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleMarkFilled = async () => {
    setFilling(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/posts/close', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) throw new Error('Failed to close post');
      setFilled(true);
      setFillConfirm(false);
    } catch (fillError) {
      console.error('[post-detail] fill error:', fillError);
    } finally {
      setFilling(false);
    }
  };

  const isOwnPost = user?.uid === post?.posterUid;
  const contact = posterContact ?? (post
    ? {
        fullName: post.posterName,
        email: post.contactEmail,
        phone: '',
        linkedinUrl: '',
      }
    : null);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-black">
        <Loader2 className="h-6 w-6 animate-spin text-brand-neon" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-black px-6">
        <div className="text-center">
          <p className="mb-4 text-brand-muted">{error || 'This opportunity is no longer available.'}</p>
          <button onClick={() => router.push('/app/feed')} className="text-sm font-mono text-brand-neon hover:underline">
            Back to feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-black">
      <header className="sticky top-0 z-30 border-b border-brand-border bg-black/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-4 px-6">
          <button
            onClick={() => router.push('/app/feed')}
            className="flex min-h-[44px] min-w-[44px] items-center text-brand-muted transition-colors hover:text-brand-white"
            aria-label="Back to feed"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-brand-neon">100x Civilization</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="border-b border-white/6 mb-8" />
        <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="mb-6 flex items-center gap-3">
            <span className="border border-brand-neon/30 bg-brand-neon/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-brand-neon font-mono">
              {TYPE_LABELS[post.type] ?? post.type}
            </span>
          </div>

          <h1 className="mb-4 font-display text-4xl md:text-5xl font-medium leading-tight tracking-tight text-brand-white break-words">
            {post.title}
          </h1>

          <div className="mb-8 flex items-center gap-3 border-b border-brand-border pb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-neon/20 text-xs font-bold text-brand-neon">
              {post.posterName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-brand-white">
                {post.posterName}
                {posterContact?.isFoundingMember ? (
                  <span className="inline-block font-mono text-[8px] tracking-[0.2em] text-brand-neon border border-brand-neon/40 px-1.5 py-0.5 uppercase ml-2">
                    Founding
                  </span>
                ) : null}
              </p>
              <p className="text-[11px] font-mono text-brand-muted">{post.posterCohort}</p>
            </div>
          </div>

          <section className="mb-8">
            <h2 className="mb-3 text-[10px] font-mono uppercase tracking-wider text-brand-muted">Description</h2>
            <p className="whitespace-pre-wrap leading-relaxed text-brand-white/80">{post.description}</p>
          </section>

          {(post.compensation || post.commitment || post.equity || post.targetIntro) ? (
            <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              {post.compensation ? <DetailField label="Compensation / Budget" value={post.compensation} /> : null}
              {post.commitment ? <DetailField label="Commitment" value={post.commitment} /> : null}
              {post.equity ? <DetailField label="Equity" value={post.equity} /> : null}
              {post.targetIntro ? <DetailField label="Intro Target" value={post.targetIntro} /> : null}
            </section>
          ) : null}

          {post.skillTags.length > 0 ? (
            <section className="mb-8">
              <h2 className="mb-3 text-[10px] font-mono uppercase tracking-wider text-brand-muted">Skills sought</h2>
              <div className="flex flex-wrap gap-2">
                {post.skillTags.map((tag) => (
                  <span key={tag} className="border border-brand-border bg-white/5 px-3 py-1 text-xs font-mono text-brand-white/60">
                    {skillLabel(tag)}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {!isOwnPost ? (
            <section className="mt-10 border-t border-brand-border pt-8">
              {!contactRevealed && !connected ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  {post.contactVisible ? (
                    <button
                      id="reveal-contact-btn"
                      onClick={handleReveal}
                      disabled={connecting}
                      className="flex items-center gap-2 bg-brand-neon px-6 py-3 font-semibold text-brand-black transition-colors hover:bg-[#FF6A26] disabled:opacity-60"
                    >
                      {connecting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                      Reveal Contact Info
                    </button>
                  ) : (
                    <p className="text-sm italic text-brand-muted">Contact info not shared publicly for this opportunity.</p>
                  )}
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border border-brand-neon/30 bg-brand-neon/5 p-5">
                  <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-brand-muted">Contact this member directly</p>
                  <p className="mb-4 text-sm text-brand-muted">Reach out externally — there is no in-platform messaging.</p>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <DetailField label="Full name" value={contact?.fullName ?? post.posterName} />
                    <DetailField
                      label="Email"
                      value={contact?.email ?? post.contactEmail ?? ''}
                      action={
                        <button
                          onClick={handleCopyEmail}
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-brand-muted transition-colors hover:text-brand-neon"
                          aria-label="Copy email"
                        >
                          {copied ? <Check size={14} className="text-brand-neon" /> : <Copy size={14} />}
                        </button>
                      }
                    />
                    {contact?.phone ? <DetailField label="Phone number" value={contact.phone} /> : null}
                    {contact?.linkedinUrl ? <DetailField label="LinkedIn URL" value={contact.linkedinUrl} /> : null}
                  </div>

                  <p className="mt-4 text-[11px] font-mono text-brand-muted">
                    Connection logged. Good luck.
                  </p>
                </motion.div>
              )}
            </section>
          ) : (
            <section className="mt-8 border-t border-brand-border pt-8">
              <p className="mb-4 text-sm font-mono text-brand-muted">This is your post.</p>
              {filled ? (
                <span className="font-mono text-xs tracking-widest text-brand-muted">FILLED · REMOVED FROM FEED</span>
              ) : fillConfirm ? (
                <div>
                  <p className="mb-3 text-sm text-brand-muted">Mark this opportunity as filled? It will be hidden from the feed.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleMarkFilled}
                      disabled={filling}
                      className="min-h-[44px] border border-white/20 text-brand-muted font-mono text-xs tracking-widest px-4 py-2 hover:border-white/40 hover:text-brand-white transition-all duration-200 disabled:opacity-50"
                    >
                      {filling ? 'Saving...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setFillConfirm(false)}
                      className="min-h-[44px] font-mono text-xs tracking-widest text-brand-muted hover:text-brand-white transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setFillConfirm(true)}
                  className="w-full min-h-[44px] border border-white/20 text-brand-muted font-mono text-xs tracking-widest px-4 py-2 hover:border-white/40 hover:text-brand-white transition-all duration-200 sm:w-auto"
                >
                  MARK AS FILLED
                </button>
              )}
            </section>
          )}
        </motion.article>
      </main>
    </div>
  );
}

function DetailField({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border border-brand-border p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">{label}</span>
        {action}
      </div>
      <span className="break-words text-sm text-brand-white">{value || '—'}</span>
    </div>
  );
}
