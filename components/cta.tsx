'use client';
import { ScrollReveal } from './scroll-reveal';
import Link from 'next/link';

/**
 * FinalCTA — Bottom of landing page call to action.
 *
 * CHANGE: Removed openModal / waitlist modal trigger. Both buttons now route
 * directly to /invite which is the live sign-in page. The waitlist modal
 * is no longer triggered from here — the product is live.
 */
export function FinalCTA() {
  return (
    <section className="relative w-full max-w-4xl mx-auto px-6 md:px-12 py-24 md:py-32 text-center overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-20 mix-blend-screen"
        style={{
          background: 'radial-gradient(ellipse at center, #FF4D00 0%, transparent 60%)',
          animation: 'pulse-slow 8s infinite alternate',
        }}
      />
      <ScrollReveal className="relative z-10 flex flex-col items-center gap-6">
        <h2 className="text-4xl md:text-6xl font-display font-medium text-brand-white leading-tight">
          Seven cohorts.<br className="hidden sm:block" /> One economy.
        </h2>
        <p className="text-lg md:text-xl text-brand-muted font-mono tracking-wide mb-4">
          The platform is live. Invite-only.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/invite"
            className="bg-brand-neon text-brand-black font-bold uppercase tracking-widest px-8 py-4 hover:bg-[#FF6A26] transition-colors"
          >
            Join 100x Civilization
          </Link>
          <Link
            href="/invite"
            className="border border-brand-white/20 text-brand-white font-semibold px-8 py-4 hover:bg-brand-white/5 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </ScrollReveal>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-slow {
          0% { transform: scale(0.8); opacity: 0.1; }
          100% { transform: scale(1.2); opacity: 0.3; }
        }
      `}} />
    </section>
  );
}
