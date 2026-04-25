'use client';
import { useModalStore } from '@/lib/store';
import { HeroAurora } from './hero-aurora';
import dynamic from 'next/dynamic';
const HeroConstellation = dynamic(() => import('./hero-constellation').then(mod => mod.HeroConstellation), { ssr: false });
import { MagneticButton } from './magnetic-button';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { useRef } from 'react';

/**
 * DIAGNOSIS ANSWERS:
 * 1. The current font for "Civilization" italic is Cormorant Garamond (--font-cormorant).
 * 2. The exact hex of the orange used in the eyebrow and Request Access button is #FF4D00 (mapped to brand-neon).
 * 3. The grid spacing in Solution is 40px x 40px, and opacity is 0.06 (rgba(255, 255, 255, 0.06)).
 * 4. The orange accent dot motif (found in cursor) is a ring (border-brand-neon) with a w-1 h-1 solid center dot (bg-brand-neon).
 * 5. prefers-reduced-motion is currently honored across the site (e.g. in count-up, cursor, team components).
 */

export function Hero() {
  const { openModal } = useModalStore();
  const prefersReducedMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  // Handoff to problem section:
  // As scroll passes 50% of hero height, the constellation scales 1 -> 0.85 and translates Y by 80px.
  // At 80% scroll-out, opacity drops 1 -> 0.4.
  const constellationScale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1, 0.85]);
  const constellationY = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0, 80]);
  const constellationOpacity = useTransform(scrollYProgress, [0, 0.8, 1], [1, 1, 0.4]);

  return (
    <section ref={heroRef} className="relative min-h-[100dvh] flex items-center pt-24 pb-16 overflow-hidden bg-brand-black">
      {/* Background layer */}
      <HeroAurora />
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full flex flex-col lg:flex-row relative z-10">
        
        {/* Left Column: Typography & CTA */}
        <div className="w-full lg:w-[55%] flex flex-col justify-center pointer-events-auto mt-12 lg:mt-0">
          
          {/* Eyebrow */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex items-center gap-3 mb-6"
          >
            <motion.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
              className="relative w-3 h-3 flex items-center justify-center"
            >
              <div className="absolute inset-0 rounded-full border border-brand-neon" />
              <div className="w-1 h-1 bg-brand-neon rounded-full" />
            </motion.div>
            <span className="text-[11px] font-mono tracking-[0.2em] text-brand-neon uppercase">
              A community project
            </span>
          </motion.div>
          
          {/* Headline */}
          <h1 className="text-[48px] sm:text-[56px] lg:text-[84px] leading-[0.95] tracking-tighter flex flex-col items-start text-left">
            <span className="font-sans font-semibold relative inline-block overflow-hidden pb-1">
               <motion.span 
                 initial={{ y: "100%", opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={prefersReducedMotion ? { duration: 0.7, delay: 0.2 } : { duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                 className="inline-block text-brand-white"
               >
                 The
               </motion.span>
               {' '}
               <motion.span 
                 initial={{ y: "100%", opacity: 0 }}
                 animate={prefersReducedMotion ? { y: 0, opacity: 1 } : { y: 0, opacity: 1, backgroundPosition: ['0% center', '200% center'] }}
                 transition={prefersReducedMotion ? { duration: 0.7, delay: 0.28 } : { duration: 0.7, delay: 0.28, ease: [0.22, 1, 0.36, 1], backgroundPosition: { repeat: Infinity, duration: 6, ease: "linear" } }}
                 className="inline-block text-transparent bg-clip-text"
                 style={{ 
                   backgroundImage: 'linear-gradient(to right, #FF4D00 0%, #FFB37A 50%, #FFFFFF 100%)',
                   WebkitBackgroundClip: 'text',
                   backgroundSize: '200% auto'
                 }}
               >
                 100x
               </motion.span>
            </span>
            <span className="overflow-hidden mt-1">
              <motion.span 
                initial={{ y: "100%", opacity: 0, filter: 'blur(8px)' }}
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block font-[family-name:var(--font-cormorant)] italic font-medium text-[64px] sm:text-[72px] lg:text-[104px] text-brand-white"
              >
                Civilization
              </motion.span>
            </span>
          </h1>
          
          {/* Sub-copy */}
          <motion.p 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.1 }}
            className="mt-6 text-[18px] text-brand-white/60 leading-[1.6] font-sans max-w-[480px]"
          >
            A members-only economic engine for 100x cohorts. Trust compounds. Wealth stays inside.
          </motion.p>
          
          {/* CTA Group */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 1.4 }}
            className="mt-10 flex flex-col sm:flex-row items-start gap-4"
          >
            <MagneticButton 
              variant="custom"
              onClick={openModal}
              className="bg-brand-neon text-brand-black font-semibold px-[36px] py-[18px] rounded-none hover:bg-[#FF6A26] transition-colors border-none"
            >
              Request Access
            </MagneticButton>
            <button 
              onClick={openModal}
              className="bg-transparent text-brand-white font-semibold px-[36px] py-[18px] rounded-none border border-brand-white/20 hover:bg-brand-white/5 transition-colors"
            >
              Learn more
            </button>
          </motion.div>
          
          {/* Stats Line */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 1.7 }}
            className="mt-6"
          >
            <span className="font-mono text-[11px] text-brand-white/40 tracking-wider">
              7 COHORTS · 500+ BUILDERS · INVITE ONLY
            </span>
          </motion.div>
          
        </div>
        
        {/* Right Column: Constellation placeholder */}
        <div className="w-full lg:w-[45%] mt-12 lg:mt-0 flex items-center justify-center pointer-events-auto">
           <motion.div 
             className="w-[320px] lg:w-[600px] h-[320px] lg:h-[600px] flex items-center justify-center"
             style={{ scale: constellationScale, y: constellationY, opacity: constellationOpacity }}
           >
             <HeroConstellation />
           </motion.div>
        </div>

      </div>
    </section>
  );
}
