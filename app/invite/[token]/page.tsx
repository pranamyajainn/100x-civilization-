'use client';

/**
 * /invite/[token] — Invite landing page.
 *
 * Validates the invite token from Firestore:
 * - If active and not expired: shows Google OAuth sign-in button
 * - If used/expired/revoked/not found: shows an error
 *
 * On successful Google sign-in, marks the invite as used and redirects to /app/onboarding.
 * The "fb_session" cookie is set by useAuth in onboarding automatically.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

interface InviteStatus {
  valid: boolean;
  reason?: string;
  targetEmail?: string;
}

export default function InvitePage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();
  const [invite, setInvite] = useState<InviteStatus | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function checkInvite() {
      try {
        const ref = doc(db, 'invites', token);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setInvite({ valid: false, reason: 'Invite link not found or already claimed.' });
          return;
        }

        const data = snap.data();

        if (data.revokedAt) {
          setInvite({ valid: false, reason: 'This invite has been revoked.' });
          return;
        }

        if (data.usedAt) {
          setInvite({ valid: false, reason: 'This invite has already been used.' });
          return;
        }

        const expiresAt = data.expiresAt?.toDate?.() ?? new Date(data.expiresAt);
        if (expiresAt && expiresAt < new Date()) {
          setInvite({ valid: false, reason: 'This invite has expired.' });
          return;
        }

        setInvite({ valid: true, targetEmail: data.targetEmail ?? '' });
      } catch (err) {
        console.error('[invite] check error:', err);
        setInvite({ valid: false, reason: 'Unable to validate invite. Try again.' });
      }
    }

    checkInvite();
  }, [token]);

  const handleSignIn = async () => {
    setSigningIn(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // If invite is targeted to a specific email, enforce it
      if (invite?.targetEmail && invite.targetEmail !== user.email) {
        await auth.signOut();
        setError(`This invite is for ${invite.targetEmail} only.`);
        setSigningIn(false);
        return;
      }

      // Mark invite as used
      await updateDoc(doc(db, 'invites', token), {
        usedAt: serverTimestamp(),
        usedBy: user.uid,
        status: 'used',
      });

      // Set session cookie (also set by useAuth, but set here preemptively)
      document.cookie = 'fb_session=1; path=/; max-age=86400; SameSite=Lax';

      // Check if user already onboarded
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
        setError('Sign-in cancelled.');
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
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo / brand */}
        <div className="flex items-center gap-3 mb-10">
          <div className="relative w-3 h-3 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-brand-neon" />
            <div className="w-1 h-1 bg-brand-neon rounded-full" />
          </div>
          <span className="text-[11px] font-mono tracking-[0.2em] text-brand-neon uppercase">
            100x Civilization
          </span>
        </div>

        {invite === null && (
          <div className="flex items-center gap-3 text-brand-muted">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-mono">Validating invite…</span>
          </div>
        )}

        {invite !== null && !invite.valid && (
          <div>
            <h1 className="text-2xl font-display font-medium text-brand-white mb-3">Invite Invalid</h1>
            <p className="text-brand-muted text-sm">{invite.reason}</p>
          </div>
        )}

        {invite?.valid && (
          <div>
            <h1 className="text-3xl font-display font-medium text-brand-white mb-2 leading-tight">
              You have been invited.
            </h1>
            <p className="text-brand-muted text-sm mb-8 leading-relaxed">
              Sign in with Google to claim your seat and access the 100x Civilization opportunity feed.
              No password required.
            </p>

            {error && (
              <div className="mb-4 p-3 border border-red-500/40 bg-red-500/10 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSignIn}
              disabled={signingIn}
              id="invite-google-signin"
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

            <p className="mt-6 text-[10px] font-mono text-brand-muted text-center">
              Invite-only. Not a 100x Engineers alumni? This platform is not for you.
            </p>
          </div>
        )}
      </motion.div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9a8.78 8.78 0 0 0 2.7-6.62z" />
      <path fill="#34A853" d="M9 18a8.6 8.6 0 0 0 5.96-2.18l-2.9-2.26A5.43 5.43 0 0 1 9 14.58a5.41 5.41 0 0 1-5.09-3.72H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.91 10.86A5.44 5.44 0 0 1 3.63 9a5.44 5.44 0 0 1 .28-1.86V4.81H.96A9.01 9.01 0 0 0 0 9a9.01 9.01 0 0 0 .96 4.19l2.95-2.33z" />
      <path fill="#EA4335" d="M9 3.58a4.86 4.86 0 0 1 3.44 1.35l2.58-2.58A8.64 8.64 0 0 0 9 0a9 9 0 0 0-8.04 4.81L3.9 7.14A5.41 5.41 0 0 1 9 3.58z" />
    </svg>
  );
}
