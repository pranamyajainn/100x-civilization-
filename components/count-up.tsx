'use client';
import { useEffect, useState, useRef } from 'react';
import { useInView } from 'motion/react';

export function CountUp({ end, suffix = '', duration = 1.2, isFloat = false }: { end: number, suffix?: string, duration?: number, isFloat?: boolean }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  useEffect(() => {
    if (!isInView) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setValue(end);
      return;
    }

    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setValue(easeOut * end);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setValue(end);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration, isInView]);

  const displayValue = isFloat ? value.toFixed(1) : Math.floor(value);

  return <span ref={ref}>{displayValue}{suffix}</span>;
}
