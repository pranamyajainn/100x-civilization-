'use client';
import { ScrollReveal } from './scroll-reveal';
import { motion } from 'motion/react';

const pillars = [
  {
    num: "01",
    title: "B2B Marketplace",
    desc: "Hire and get hired within our network."
  },
  {
    num: "02",
    title: "Skill Exchange",
    desc: "Trade expertise, no money, pure leverage."
  },
  {
    num: "03",
    title: "Deal Flow",
    desc: "Gigs, referrals, co-founder matching. 100x members exclusive only."
  },
  {
    num: "04",
    title: "Culture Layer",
    desc: "Support zone, Gen Z arena, Dating Pools."
  }
];

export function Solution() {
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-24">
      <ScrollReveal className="mb-12 md:mb-16">
        <h2 className="text-3xl md:text-5xl font-display font-medium text-brand-white mb-4">
          The 100x Civilization
        </h2>
        <p className="font-mono text-brand-neon uppercase tracking-widest text-sm">
          One community. Infinite leverage.
        </p>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {pillars.map((pillar, i) => (
          <ScrollReveal key={i} delay={i * 0.1}>
            <motion.div 
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="relative p-8 md:p-10 border border-brand-border bg-brand-white/5 backdrop-blur-sm group h-full flex flex-col justify-between overflow-hidden"
            >
              {/* Border trace effect */}
              <div className="absolute -inset-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-400 z-0">
                 <div className="absolute inset-0 bg-transparent" style={{ backgroundImage: 'conic-gradient(from 0deg at 50% 50%, transparent 60%, #FF4D00 100%)', animation: 'spin 3s linear infinite' }} />
              </div>
              <div className="absolute inset-[1px] bg-brand-black/40 z-0 pointer-events-none transition-colors duration-400 group-hover:bg-brand-black/60" />
              
              <div className="relative z-10 pointer-events-none">
                <span className="block text-brand-muted font-mono mb-6 md:mb-8 text-sm">{pillar.num}</span>
                <h3 className="text-xl md:text-2xl font-display font-medium text-brand-white mb-3">{pillar.title}</h3>
                <p className="text-brand-muted leading-relaxed">{pillar.desc}</p>
              </div>
            </motion.div>
          </ScrollReveal>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </section>
  );
}
