'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform, animate } from 'motion/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function LiveCounter() {
  const [count, setCount] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [displayCount, setDisplayCount] = useState<number>(0);
  const isFirstLoad = useRef(true);
  const lastCount = useRef<number>(0);
  const [popKey, setPopKey] = useState<number>(0);

  useEffect(() => {
    // Initial fetch from localStorage across reloads
    const cached = localStorage.getItem('last_seen_count');
    let initialCount = 0;
    if (cached) {
      initialCount = parseInt(cached, 10);
      lastCount.current = initialCount;
      setTimeout(() => {
        setDisplayCount(initialCount);
        setIsLoaded(true); // show cached value immediately
      }, 0);
    }

    const unsub = onSnapshot(doc(db, 'metadata', 'signups'), (snap) => {
      if (snap.exists()) {
        const c = snap.data().count || 0;
        
        if (isFirstLoad.current) {
           isFirstLoad.current = false;
           setIsLoaded(true);
           setCount(c);
           // Animate from cached to current
           animate(initialCount, c, {
             duration: 1.2,
             ease: 'easeOut',
             onUpdate: (latest) => {
               setDisplayCount(Math.round(latest));
             }
           });
        } else {
           if (c > count) {
              setCount(c);
              setDisplayCount(c);
              setPopKey(prev => prev + 1);
           }
        }
        
        localStorage.setItem('last_seen_count', c.toString());
      } else {
        if (isFirstLoad.current) setIsLoaded(true);
      }
    });

    return () => unsub();
  }, [count]);

  if (!isLoaded || displayCount < 1) return null;

  return (
    <div className="flex items-center justify-center space-x-2 mt-4 text-brand-muted">
      <div className="h-[1px] w-4 bg-brand-white/20"></div>
      <motion.span 
         key={popKey}
         initial={popKey > 0 ? { scale: 1.15 } : { scale: 1 }}
         animate={{ scale: 1 }}
         transition={{ duration: 0.2 }}
         className="text-[10px] uppercase tracking-tighter tabular-nums text-brand-neon"
      >
        {displayCount.toLocaleString()} waiting list
      </motion.span>
      <div className="h-[1px] w-4 bg-brand-white/20"></div>
    </div>
  );
}
