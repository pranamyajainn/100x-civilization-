'use client';

import { create } from 'zustand';
import { motion, AnimatePresence } from 'motion/react';
import React from 'react';

interface ShimmerStore {
  key: number;
  trigger: () => void;
}

export const useShimmerStore = create<ShimmerStore>((set) => ({
  key: 0,
  trigger: () => set((state) => ({ key: state.key + 1 })),
}));

export function ShimmerEffect() {
  const { key } = useShimmerStore();

  return (
    <AnimatePresence mode="wait">
      {key > 0 && (
        <motion.div
          key={key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="fixed inset-0 pointer-events-none z-[999]"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%22100%22 numOctaves=%221%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
            backgroundSize: '200px 200px',
            mixBlendMode: 'screen',
            backgroundColor: 'white'
          }}
        />
      )}
    </AnimatePresence>
  );
}
