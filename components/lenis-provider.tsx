'use client';

import { ReactNode, useEffect } from 'react';

export function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let isCancelled = false;
    let lenisInstance: { destroy: () => void } | null = null;

    void import('lenis').then(({ default: Lenis }) => {
      if (isCancelled) return;

      lenisInstance = new Lenis({
        autoRaf: true,
        lerp: 0.1,
        duration: 1.5,
        smoothWheel: true,
      });
    });

    return () => {
      isCancelled = true;
      lenisInstance?.destroy();
    };
  }, []);

  return <>{children}</>;
}
