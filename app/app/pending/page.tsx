'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Loader2, RefreshCw } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { clearSessionCookies } from '@/lib/client-session';

interface PendingProfile {
  fullName: string;
  email: string;
  cohort: string;
  status?: string;
}

export default function PendingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PendingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const loadStatus = async (currentUser: User, options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setChecking(true);
    }
    setError('');

    try {
      const [userDoc, pendingDoc] = await Promise.all([
        getDoc(doc(db, 'users', currentUser.uid)),
        getDoc(doc(db, 'pending_users', currentUser.uid)),
      ]);

      const userStatus = userDoc.data()?.status;
      if (userStatus === 'approved') {
        router.replace('/app/feed');
        return;
      }

      if (userStatus === 'rejected') {
        router.replace('/app/rejected');
        return;
      }

      const data = pendingDoc.data();
      setProfile({
        fullName: data?.fullName ?? currentUser.displayName ?? 'Pending user',
        email: data?.email ?? currentUser.email ?? '',
        cohort: data?.cohort ?? 'Pending approval',
        status: data?.status ?? 'pending',
      });

      if (!pendingDoc.exists() && !userDoc.exists()) {
        setError('We could not find your approval status yet. Please check again in a moment.');
      }
    } catch (loadError) {
      console.error('[pending] status check failed:', loadError);
      setError('Could not check your approval status. Please try again.');
    } finally {
      setLoading(false);
      if (!options?.silent) {
        setChecking(false);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/');
        return;
      }

      setUser(currentUser);
      await loadStatus(currentUser);
    });

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const intervalId = window.setInterval(() => {
      void loadStatus(user, { silent: true });
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [user]);

  const handleSignOut = async () => {
    await auth.signOut();
    clearSessionCookies();
    router.push('/');
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-black px-6 py-16">
        <Loader2 className="h-6 w-6 animate-spin text-brand-neon" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-black px-6 py-16">
      <div className="w-full max-w-xl border border-brand-border bg-black/40 p-8 md:p-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="relative flex h-3 w-3 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-brand-neon" />
            <div className="h-1 w-1 rounded-full bg-brand-neon" />
          </div>
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-brand-neon">100x Civilization</span>
        </div>

        <h1 className="mb-3 text-4xl font-display font-medium text-brand-white">You&apos;re through the door.</h1>
        <p className="mb-8 text-sm leading-relaxed text-brand-muted">
          We review every member personally. This is how we keep the network worth being in.
        </p>

        <div className="mt-8 space-y-3">
          <p className="font-mono text-xs tracking-widest text-brand-neon">✓ PROFILE RECEIVED</p>
          <p className="font-mono text-xs tracking-widest text-brand-muted">→ PERSONAL REVIEW · USUALLY WITHIN 24H</p>
          <p className="font-mono text-xs tracking-widest text-brand-muted opacity-40">○ WELCOME TO THE CIVILIZATION</p>
        </div>

        {error ? (
          <div className="mb-5 border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        ) : null}

        <div className="mb-8 border border-brand-border px-4 py-4">
          <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-brand-muted">Submitted profile</p>
          <p className="text-lg text-brand-white">{profile?.fullName ?? user?.displayName ?? 'Pending user'}</p>
          <p className="mt-1 text-sm text-brand-muted">{profile?.cohort ?? 'Pending approval'}</p>
          {profile?.email ? <p className="mt-1 text-sm text-brand-muted">{profile.email}</p> : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => user && loadStatus(user)}
            disabled={checking}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 bg-brand-neon px-5 py-3 text-sm font-bold uppercase tracking-widest text-brand-black transition-colors hover:bg-[#FF6A26] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Check status
          </button>
          <button onClick={handleSignOut} className="text-sm font-mono text-brand-neon hover:underline">
            Sign out and come back later
          </button>
        </div>
      </div>
    </main>
  );
}
