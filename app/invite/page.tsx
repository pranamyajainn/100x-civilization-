'use client';

import { useState } from 'react';
import { browserPopupRedirectResolver, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { clearSessionCookies, setSessionCookies } from '@/lib/client-session';
import { motion } from 'motion/react';

export default function InviteSignInPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleGoogleSignIn() {
    setError('');
    setIsSigningIn(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      const result = await signInWithPopup(
        auth,
        provider,
        browserPopupRedirectResolver
      );
      setSessionCookies(result.user.uid);

      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (userDoc.exists() && userDoc.data()?.status === 'approved') {
        router.push('/app/feed');
      } else {
        try {
          const token = await result.user.getIdToken();
          await fetch('/api/auth/partial-signup', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        } catch {
          // non-critical — swallow and proceed
        }
        router.push('/app/onboarding');
      }
    } catch (err) {
      const code = typeof err === 'object' && err && 'code' in err
        ? String(err.code)
        : '';

      if (
        code !== 'auth/popup-closed-by-user' &&
        code !== 'auth/cancelled-popup-request'
      ) {
        clearSessionCookies();
        setError(
          err instanceof Error
            ? err.message
            : 'Sign-in failed. Please try again.'
        );
      }
      setIsSigningIn(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-black flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        layout={false}
        className="w-full max-w-md"
      >
        {/* Brand */}
        <div className="flex items-center gap-3 mb-10">
          <div className="relative w-3 h-3 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-brand-neon" />
            <div className="w-1 h-1 bg-brand-neon rounded-full" />
          </div>
          <span className="text-[11px] font-mono tracking-[0.2em] text-brand-neon uppercase">
            100x Civilization
          </span>
        </div>

        <h1 className="text-3xl font-display font-medium text-brand-white mb-2 leading-tight">
          Sign in to 100x Civilization
        </h1>
        <p className="text-brand-muted text-sm mb-8 leading-relaxed">
          Sign in with Google, complete onboarding, and wait for approval.
        </p>

        {error && (
          <div className="mb-5 p-3 border border-red-500/40 bg-red-500/10 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="w-full flex justify-center">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-3 border border-brand-white/20 bg-brand-white text-brand-black px-5 py-3 text-sm font-medium transition hover:bg-brand-neon disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon />
            {isSigningIn ? 'Opening Google...' : 'Continue with Google'}
          </button>
        </div>

        <p className="mt-6 text-[10px] font-mono text-brand-muted text-center leading-relaxed">
          For 100xEngineers alumni only.<br />
          Access is enabled after admin approval.
        </p>
      </motion.div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9a8.78 8.78 0 0 0 2.7-6.62z" />
      <path fill="#34A853" d="M9 18a8.6 8.6 0 0 0 5.96-2.18l-2.9-2.26A5.43 5.43 0 0 1 9 14.58a5.41 5.41 0 0 1-5.09-3.72H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.91 10.86A5.44 5.44 0 0 1 3.63 9a5.44 5.44 0 0 1 .28-1.86V4.81H.96A9.01 9.01 0 0 0 0 9a9.01 9.01 0 0 0 .96 4.19l2.95-2.33z" />
      <path fill="#EA4335" d="M9 3.58a4.86 4.86 0 0 1 3.44 1.35l2.58-2.58A8.64 8.64 0 0 0 9 0a9 9 0 0 0-8.04 4.81L3.9 7.14A5.41 5.41 0 0 1 9 3.58z" />
    </svg>
  );
}
