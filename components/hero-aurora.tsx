'use client';
import { motion, useReducedMotion } from 'motion/react';

/**
 * Aurora gradient A drifts in a slow Lissajous figure to create depth without distraction.
 * Gradient B counter-drifts.
 * The static grid grounds the hero in the same space as the rest of the site.
 */
export function HeroAurora() {
  const prefersReducedMotion = useReducedMotion();

  // Grid matches Solution component exactly
  const gridStyle = {
    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px)',
    backgroundSize: '40px 40px'
  };

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* 1. Base color #050409 is applied to parent, but we can enforce it here too */}
      <div className="absolute inset-0 bg-[#050409]" />
      
      {/* 2. Grid */}
      <div className="absolute inset-0 opacity-100" style={gridStyle} />
      
      {/* 3. Aurora Mesh */}
      {/* 
         Gradient A: #5B2BFF at 32% opacity, drifting in a Lissajous figure across the viewport.
         Gradient B: #FF4D00 at 18% opacity, counter-drifting.
         (Using #FF4D00 instead of #FF6B1A to match the site's neon orange)
      */}
      <div className="absolute inset-0 mix-blend-screen">
        <motion.div
           className="absolute top-[50%] left-[30%] w-[2200px] h-[2200px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px]"
           style={{
             background: 'radial-gradient(circle, rgba(91,43,255,0.32) 0%, transparent 60%)'
           }}
           animate={prefersReducedMotion ? {} : {
             x: [0, 400, 0, -400, 0],
             y: [0, 300, -300, 200, 0]
           }}
           transition={{
             repeat: Infinity,
             duration: 28,
             ease: "easeInOut"
           }}
        />
        <motion.div
           className="absolute top-[50%] left-[70%] w-[1600px] h-[1600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
           style={{
             background: 'radial-gradient(circle, rgba(255,77,0,0.18) 0%, transparent 60%)'
           }}
           animate={prefersReducedMotion ? {} : {
             x: [0, -300, 0, 300, 0],
             y: [0, -400, 300, -200, 0]
           }}
           transition={{
             repeat: Infinity,
             duration: 22,
             ease: "easeInOut"
           }}
        />
      </div>
      
      {/* 4. Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#000_100%)] opacity-30" />
    </div>
  );
}
