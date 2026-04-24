'use client';
import { HeroMesh } from './hero-mesh';
import { WaitlistForm } from './waitlist-form';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

export function Hero() {
  const headline = "The 100x Civilization".split(" ");
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  return (
    <section className="relative min-h-[90vh] flex items-center pt-32 pb-16 overflow-hidden">
      <HeroMesh />
      
      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 relative z-10">
        <div className="flex flex-col justify-center">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-brand-neon/10 border border-brand-neon/40 text-[10px] font-mono tracking-widest uppercase text-brand-neon mb-6 md:mb-8 w-fit backdrop-blur-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-neon animate-pulse" />
            A community project
          </motion.div>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-medium tracking-tight mb-6 md:mb-8 leading-[1.1] md:leading-[1.05]">
            {isMounted ? headline.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block mr-2 sm:mr-3 md:mr-4 last:mr-0"
                style={{
                  background: word === '100x' ? 'linear-gradient(to right, #FF4D00, #FFFFFF)' : 'none',
                  WebkitBackgroundClip: word === '100x' ? 'text' : 'none',
                  WebkitTextFillColor: word === '100x' ? 'transparent' : 'initial',
                }}
              >
                {word}
              </motion.span>
            )) : <span className="opacity-0">The 100x Civilization</span>}
          </h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-base sm:text-lg md:text-xl text-brand-muted leading-relaxed font-sans max-w-lg mb-8 md:mb-10 text-balance"
          >
            Members-only exclusive economic engine for all cohorts. Trust becomes transactions. Transactions become wealth. Wealth compounds inside instead of leaking out.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-4 text-xs sm:text-sm font-mono text-brand-muted"
          >
            <span className="flex h-px w-8 bg-brand-border hidden sm:block" />
            Invite-only. Cohort verification required.
          </motion.div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center w-full lg:justify-end"
        >
          <div className="w-full max-w-md">
            <WaitlistForm />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
