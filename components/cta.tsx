'use client';
import { MagneticButton } from './magnetic-button';
import { ScrollReveal } from './scroll-reveal';
import { useModalStore } from '@/lib/store';

export function FinalCTA() {
  const { openModal } = useModalStore();

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
        <p className="text-lg md:text-xl text-brand-muted font-mono tracking-wide mb-8">
          Wealth compounds inside. The door closes when it closes.
        </p>
        <MagneticButton onClick={openModal}>
          Request access
        </MagneticButton>
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
