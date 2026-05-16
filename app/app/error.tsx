'use client';

import Link from 'next/link';

export default function AppErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-black px-6 py-16 text-brand-white">
      <div className="w-full max-w-xl border border-brand-border bg-black/40 p-8 text-center md:p-10">
        <h1 className="mb-3 text-4xl font-display font-medium">Something went wrong.</h1>
        <p className="mb-8 text-sm leading-relaxed text-brand-muted">
          Try the request again, or return to the feed if the problem persists.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-[44px] items-center justify-center bg-brand-neon px-6 py-3 text-sm font-bold uppercase tracking-widest text-brand-black transition-colors hover:bg-[#FF6A26]"
          >
            Try again
          </button>
          <Link
            href="/app/feed"
            className="inline-flex min-h-[44px] items-center justify-center border border-brand-border px-6 py-3 text-sm font-mono text-brand-white transition-colors hover:border-brand-neon/50"
          >
            Back to feed
          </Link>
        </div>
      </div>
    </main>
  );
}
