'use client';
import { motion } from 'motion/react';

export function ScrollReveal({ children, className = '', delay = 0, as = 'div' }: { children: React.ReactNode, className?: string, delay?: number, as?: any }) {
  const Component: any = motion[as as keyof typeof motion] || motion.div;
  return (
    <Component
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </Component>
  );
}
