'use client';
import { MagneticButton } from './magnetic-button';
import { ScrollReveal } from './scroll-reveal';

export function FinalCTA() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="max-w-4xl mx-auto px-6 md:px-12 py-24 md:py-32 text-center">
      <ScrollReveal className="flex flex-col items-center gap-6">
        <h2 className="text-4xl md:text-6xl font-display font-medium text-brand-white leading-tight">
          Seven cohorts.<br className="hidden sm:block" /> One civilization.
        </h2>
        <p className="text-lg md:text-xl text-brand-muted font-mono tracking-wide mb-8">
          Wealth compounds inside. The door closes when it closes.
        </p>
        <MagneticButton onClick={scrollToTop}>
          Request access
        </MagneticButton>
      </ScrollReveal>
    </section>
  );
}
