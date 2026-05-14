'use client';

/**
 * /invite — Direct sign-in entry point for 100x Civilization.
 *
 * This page is the primary auth entry for all users:
 * - No invite token required
 * - Triggers Google OAuth directly
 * - On success: checks Firestore users/{uid}.onboardingComplete
 *   → true:  redirect to /app/feed
 *   → false: redirect to /app/onboarding
 *
 * Alumni who arrive via /invite/[token] (email invite links) continue
 * to use the token flow. This page is the "Sign In" entry for everyone else.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export default function InviteSignInPage() {
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    setSigningIn(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Set session cookie
      document.cookie = 'fb_session=1; path=/; max-age=86400; SameSite=Lax';

      // Check onboarding status
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (userSnap.exists() && userSnap.data().onboardingComplete) {
        document.cookie = 'ob_complete=1; path=/; max-age=86400; SameSite=Lax';
        router.push('/app/feed');
      } else {
        router.push('/app/onboarding');
      }
    } catch (err: any) {
      console.error('[invite] sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Try again.');
      } else {
        setError(err.message ?? 'Sign-in failed. Please try again.');
      }
      setSigningIn(false);
    }
  };

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
          For 100xEngineers alumni only. No password required.
        </p>

        {error && (
          <div className="mb-5 p-3 border border-red-500/40 bg-red-500/10 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          id="direct-google-signin"
          onClick={handleSignIn}
          disabled={signingIn}
          className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-4 hover:bg-gray-100 transition-colors disabled:opacity-60"
        >
          {signingIn ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </button>

        <p className="mt-6 text-[10px] font-mono text-brand-muted text-center leading-relaxed">
          This platform is invite-only for 100xEngineers alumni (cohorts 1–7+).<br />
          Not an alumnus? This platform is not for you.
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
