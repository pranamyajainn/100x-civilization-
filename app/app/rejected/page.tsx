'use client';

import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { clearSessionCookies } from '@/lib/client-session';

export default function RejectedPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    await auth.signOut();
    clearSessionCookies();
    router.push('/');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-black px-6 py-16">
      <div className="w-full max-w-lg border border-brand-border bg-black/40 p-8 md:p-10 text-center">
        <div className="mb-8 flex items-center gap-3 justify-center">
          <div className="relative flex h-3 w-3 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-brand-neon" />
            <div className="h-1 w-1 rounded-full bg-brand-neon" />
          </div>
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-brand-neon">100x Civilization</span>
        </div>

        <h1 className="mb-3 text-4xl font-display font-medium text-brand-white">Access closed.</h1>
        <p className="mb-8 text-sm leading-relaxed text-brand-muted">
          Your profile was not approved for this platform.
        </p>

        <a
          href="mailto:hello@100xcivilization.com"
          className="inline-flex min-h-[44px] items-center justify-center bg-brand-neon px-6 py-3 font-semibold text-brand-black transition-colors hover:bg-[#FF6A26]"
        >
          Contact us
        </a>

        <button onClick={handleSignOut} className="mt-6 block w-full text-sm font-mono text-brand-muted hover:text-brand-white">
          Sign out
        </button>
      </div>
    </main>
  );
}
