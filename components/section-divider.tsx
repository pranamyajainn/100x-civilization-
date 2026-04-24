'use client';
import { motion } from 'motion/react';

export function SectionDivider() {
  return (
    <div className="w-full h-[1px] overflow-hidden max-w-7xl mx-auto px-6 md:px-12 my-12 md:my-24">
      <motion.div 
        initial={{ scaleX: 0, originX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full h-full bg-brand-border"
      />
    </div>
  );
}
