'use client';

/**
 * /app/posts/[id] — Post detail page.
 *
 * Shows the full opportunity with:
 * - Poster info (name, cohort)
 * - Full description + all fields
 * - "Connect" button: reveals contact email (if contactVisible=true) OR shows in-platform
 *   message fallback if contact is hidden
 * - Connection event logged to Firestore via /api/connect on first connect action
 *
 * PRD: "Connection is defined as: user A views post by user B AND sends message
 * or reveals contact info. View alone does not count."
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { skillLabel } from '@/lib/taxonomy';
import { motion } from 'motion/react';
import { ArrowLeft, Loader2, Mail, Copy, Check } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  'hiring': 'Hiring',
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

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [contactRevealed, setContactRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/'); return; }
      setUser(u);
      const profileSnap = await getDoc(doc(db, 'users', u.uid));
      if (profileSnap.exists()) setUserProfile(profileSnap.data());
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    async function fetchPost() {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'posts', postId));
        if (!snap.exists()) { setError('Opportunity not found.'); return; }
        const d = snap.data();
        setPost({
          id: snap.id,
          type: d.type,
          title: d.title,
          description: d.description,
          skillTags: d.skillTags ?? [],
          compensation: d.compensation,
          commitment: d.commitment,
          equity: d.equity,
          targetIntro: d.targetIntro,
          posterName: d.posterName,
          posterCohort: d.posterCohort,
          posterUid: d.posterUid,
          contactVisible: d.contactVisible ?? false,
          contactEmail: d.contactEmail ?? '',
          createdAt: d.createdAt?.toDate?.()?.toISOString() ?? '',
        });
      } catch (err) {
        console.error('[post-detail] fetch error:', err);
        setError('Failed to load this opportunity.');
      } finally {
        setLoading(false);
      }
    }
    if (postId) fetchPost();
  }, [postId]);

  const logConnection = async (action: 'reveal' | 'message') => {
    if (!user || !post || !userProfile) return;
    setConnecting(true);
    try {
      await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viewerUid: user.uid,
          viewerEmail: user.email ?? '',
          viewerCohort: userProfile.cohort ?? '',
          posterUid: post.posterUid,
          posterCohort: post.posterCohort,
          postId: post.id,
          postType: post.type,
          action,
        }),
      });
      setConnected(true);
    } catch (err) {
      console.error('[post-detail] connection log error:', err);
    } finally {
      setConnecting(false);
    }
  };

  const handleReveal = async () => {
    if (connected) return;
    await logConnection('reveal');
    setContactRevealed(true);
  };

  const handleCopyEmail = () => {
    if (!post?.contactEmail) return;
    navigator.clipboard.writeText(post.contactEmail).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isOwnPost = user?.uid === post?.posterUid;

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-neon animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-brand-muted mb-4">{error || 'Opportunity not found.'}</p>
          <button onClick={() => router.push('/app/feed')} className="text-brand-neon font-mono text-sm hover:underline">
            ← Back to feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-black">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-brand-border">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <button
            onClick={() => router.push('/app/feed')}
            className="min-h-[44px] min-w-[44px] flex items-center text-brand-muted hover:text-brand-white transition-colors"
            aria-label="Back to feed"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-[11px] font-mono tracking-[0.2em] text-brand-neon uppercase">
            100x Civilization
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Type badge */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 border border-brand-neon/30 bg-brand-neon/10 text-brand-neon">
              {TYPE_LABELS[post.type] ?? post.type}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-4xl font-display font-medium text-brand-white mb-4 leading-tight">
            {post.title}
          </h1>

          {/* Poster */}
          <div className="flex items-center gap-3 mb-8 pb-8 border-b border-brand-border">
            <div className="w-8 h-8 rounded-full bg-brand-neon/20 flex items-center justify-center text-brand-neon text-xs font-bold">
              {post.posterName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-brand-white">{post.posterName}</p>
              <p className="text-[11px] font-mono text-brand-muted">{post.posterCohort}</p>
            </div>
          </div>

          {/* Description */}
          <section className="mb-8">
            <h2 className="text-[10px] font-mono uppercase tracking-wider text-brand-muted mb-3">Description</h2>
            <p className="text-brand-white/80 leading-relaxed whitespace-pre-wrap">{post.description}</p>
          </section>

          {/* Conditional fields */}
          {(post.compensation || post.commitment || post.equity || post.targetIntro) && (
            <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {post.compensation && <DetailField label="Compensation / Budget" value={post.compensation} />}
              {post.commitment && <DetailField label="Commitment" value={post.commitment} />}
              {post.equity && <DetailField label="Equity" value={post.equity} />}
              {post.targetIntro && <DetailField label="Intro Target" value={post.targetIntro} />}
            </section>
          )}

          {/* Skill tags */}
          {post.skillTags.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[10px] font-mono uppercase tracking-wider text-brand-muted mb-3">Skills Sought</h2>
              <div className="flex flex-wrap gap-2">
                {post.skillTags.map((tag) => (
                  <span key={tag} className="text-xs font-mono text-brand-white/60 bg-white/5 border border-brand-border px-3 py-1">
                    {skillLabel(tag)}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Connect / Reveal */}
          {!isOwnPost && (
            <section className="mt-10 pt-8 border-t border-brand-border">
              {!contactRevealed && !connected ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  {post.contactVisible ? (
                    <button
                      id="reveal-contact-btn"
                      onClick={handleReveal}
                      disabled={connecting}
                      className="flex items-center gap-2 bg-brand-neon text-brand-black font-semibold px-6 py-3 hover:bg-[#FF6A26] transition-colors disabled:opacity-60"
                    >
                      {connecting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                      Reveal Contact Info
                    </button>
                  ) : (
                    <p className="text-sm text-brand-muted italic">
                      Contact info not shared publicly for this opportunity.
                    </p>
                  )}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 border border-brand-neon/30 bg-brand-neon/5"
                >
                  <p className="text-[10px] font-mono uppercase tracking-wider text-brand-muted mb-2">Contact</p>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-brand-white">{post.contactEmail}</span>
                    <button
                      onClick={handleCopyEmail}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-brand-muted hover:text-brand-neon transition-colors"
                      aria-label="Copy email"
                    >
                      {copied ? <Check size={14} className="text-brand-neon" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="text-[11px] font-mono text-brand-muted mt-2">Connection logged. Good luck.</p>
                </motion.div>
              )}
            </section>
          )}

          {isOwnPost && (
            <p className="text-sm font-mono text-brand-muted mt-8 pt-8 border-t border-brand-border">
              This is your post.
            </p>
          )}
        </motion.article>
      </main>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 p-4 border border-brand-border">
      <span className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">{label}</span>
      <span className="text-sm text-brand-white">{value}</span>
    </div>
  );
}
