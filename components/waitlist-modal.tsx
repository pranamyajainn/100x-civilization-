'use client';
import { motion, AnimatePresence } from 'motion/react';
import { useModalStore } from '@/lib/store';
import { WaitlistForm } from './waitlist-form';
import { useEffect } from 'react';
import { MagneticButton } from './magnetic-button';

export function WaitlistModal() {
  const { isOpen, closeModal } = useModalStore();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeModal]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.25 }}
            onClick={closeModal}
            className="absolute inset-0 bg-brand-black/80"
          />

          {/* Door panels */}
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: '-100%' }}
            exit={{ x: 0, transition: { duration: 0.3 } }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 top-0 bottom-0 w-1/2 bg-brand-black pointer-events-none z-10 border-r border-brand-border/10"
          />
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: '100%' }}
            exit={{ x: 0, transition: { duration: 0.3 } }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-0 bottom-0 w-1/2 bg-brand-black pointer-events-none z-10 border-l border-brand-border/10"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="relative w-full max-w-2xl px-4 z-20 flex justify-center"
          >
            <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-30">
              <MagneticButton onClick={closeModal} className="w-12 h-12 rounded-full flex items-center justify-center bg-transparent border border-brand-border hover:bg-brand-white/5 p-0">
                <svg className="w-5 h-5 text-brand-muted hover:text-brand-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </MagneticButton>
            </div>
            <WaitlistForm />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
