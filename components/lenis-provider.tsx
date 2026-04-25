'use client';
import { ReactNode, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const ReactLenis = dynamic(() => import('lenis/react').then(mod => mod.ReactLenis), { ssr: false });

export function LenisProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // Defer mounting Lenis slightly to ensure it doesn't block main thread during hydration
    const timer = setTimeout(() => setMounted(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
