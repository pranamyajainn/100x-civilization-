/**
 * Layout for all /app/* routes (authenticated platform pages).
 * This is separate from the root layout which wraps the marketing landing page.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '100x Civilization — Platform',
  description: 'Members-only opportunity feed for 100x Engineers alumni.',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-black text-brand-white">
      {children}
    </div>
  );
}
