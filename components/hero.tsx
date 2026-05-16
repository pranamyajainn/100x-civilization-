'use client';
import { HeroAurora } from './hero-aurora';
import { MagneticButton } from './magnetic-button';
import { motion, useScroll, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * DIAGNOSIS ANSWERS:
 * 1. The current font for "Civilization" italic is Cormorant Garamond (--font-cormorant).
 * 2. The exact hex of the orange used in the eyebrow and Request Access button is #FF4D00 (mapped to brand-neon).
 * 3. The grid spacing in Solution is 40px x 40px, and opacity is 0.06 (rgba(255, 255, 255, 0.06)).
 * 4. The orange accent dot motif (found in cursor) is a ring (border-brand-neon) with a w-1 h-1 solid center dot (bg-brand-neon).
 * 5. prefers-reduced-motion is currently honored across the site (e.g. in count-up, cursor, team components).
 */

const constellationNodes = [
  { id: 'C1', x: 305, y: 80 },
  { id: 'C2', x: 468, y: 155 },
  { id: 'C3', x: 510, y: 345 },
  { id: 'C4', x: 395, y: 505 },
  { id: 'C5', x: 195, y: 495 },
  { id: 'C6', x: 80, y: 335 },
  { id: 'C7', x: 135, y: 165 },
];
const constellationCenter = { x: 300, y: 300 };

function HeroConstellationInline() {
  const prefersReducedMotion = useSafeReducedMotion();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  return (
    <div className="relative w-full aspect-square max-w-[600px] flex items-center justify-center">
      <motion.svg
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
        layout={false}
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-center" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="24" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="center-blur" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="32" />
          </filter>
        </defs>

        {constellationNodes.map((node, i) => (
          <motion.line
            key={`link-center-${i}`}
            x1={constellationCenter.x}
            y1={constellationCenter.y}
            x2={node.x}
            y2={node.y}
            stroke="white"
            strokeWidth="1"
            initial={false}
            animate={prefersReducedMotion ? { opacity: hoveredNode === node.id ? 0.4 : 0.12 } : { opacity: [0.08, 0.12, 0.08] }}
            transition={prefersReducedMotion ? { duration: 0.2 } : { duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ opacity: hoveredNode === node.id ? 0.4 : undefined }}
            className="transition-opacity duration-300"
          />
        ))}

        {constellationNodes.map((node, i) => {
          const nextNode = constellationNodes[(i + 1) % constellationNodes.length];
          return (
            <motion.line
              key={`link-loop-${i}`}
              x1={node.x}
              y1={node.y}
              x2={nextNode.x}
              y2={nextNode.y}
              stroke="white"
              strokeWidth="1"
              initial={false}
              animate={prefersReducedMotion ? { opacity: (hoveredNode === node.id || hoveredNode === nextNode.id) ? 0.3 : 0.12 } : { opacity: [0.08, 0.12, 0.08] }}
              transition={prefersReducedMotion ? { duration: 0.2 } : { duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ opacity: (hoveredNode === node.id || hoveredNode === nextNode.id) ? 0.3 : undefined }}
              className="transition-opacity duration-300"
            />
          );
        })}

        <style dangerouslySetInnerHTML={{
          __html: `
            .center-radius { r: 52.5px; }
            .center-text-size { font-size: 20.6px; }
            @media (min-width: 1024px) {
              .center-radius { r: 36px; }
              .center-text-size { font-size: 13px; }
            }
          `
        }} />

        <motion.g
          initial={false}
          animate={prefersReducedMotion ? { scale: 1 } : { scale: [1, 1.02, 1] }}
          transition={prefersReducedMotion ? { duration: 0.2 } : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: `${constellationCenter.x}px ${constellationCenter.y}px` }}
        >
          <motion.g
            animate={prefersReducedMotion ? {} : { scale: [1, 1.03, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: `${constellationCenter.x}px ${constellationCenter.y}px` }}
          >
            <motion.circle
              cx={constellationCenter.x}
              cy={constellationCenter.y}
              className="center-radius"
              fill="white"
              filter="url(#center-blur)"
              initial={false}
              animate={prefersReducedMotion ? { opacity: 0.7 } : { opacity: [0.7, 0.9, 0.7] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            {!prefersReducedMotion && (
              <motion.circle
                cx={constellationCenter.x}
                cy={constellationCenter.y}
                className="center-radius"
                fill="white"
                filter="url(#center-blur)"
                initial={false}
                animate={{ opacity: [0, 0, 0.9, 0, 0] }}
                transition={{ duration: 6, repeat: Infinity, times: [0, 0.966, 0.983, 1, 1] }}
              />
            )}
            <circle
              cx={constellationCenter.x}
              cy={constellationCenter.y}
              className="center-radius"
              fill="white"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1"
            />
          </motion.g>

          <motion.text
            x={constellationCenter.x}
            y={constellationCenter.y}
            textAnchor="middle"
            dominantBaseline="central"
            textRendering="geometricPrecision"
            className="font-sans font-bold center-text-size"
            fill="#050409"
            style={{ letterSpacing: '-0.02em', transformOrigin: `${constellationCenter.x}px ${constellationCenter.y}px` }}
            initial={false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            100x
          </motion.text>
        </motion.g>

        {constellationNodes.map((node, i) => {
          const isHovered = hoveredNode === node.id;
          return (
            <g
              key={`node-${i}`}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer"
            >
              <motion.circle
                cx={node.x}
                cy={node.y}
                r="8"
                fill="#FF4D00"
                stroke="#FF4D00"
                strokeWidth="1"
                filter={isHovered ? 'url(#glow-center)' : 'url(#glow)'}
                initial={false}
                animate={prefersReducedMotion ? { scale: 1, opacity: 0.6 } : { scale: [1, 1.04, 1], opacity: 0.6 }}
                transition={prefersReducedMotion ? { duration: 0.2 } : { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }}
                style={{ opacity: isHovered ? 1 : undefined }}
                className="transition-opacity transition-[filter] duration-300"
              />
              <motion.text
                x={node.x + 16}
                y={node.y + 4}
                fill="white"
                className="font-mono text-[11px] select-none pointer-events-none transition-opacity duration-300"
                initial={false}
                animate={{ opacity: isHovered ? 1 : 0.4 }}
                transition={{ duration: 0.2 }}
              >
                {node.id}
              </motion.text>
            </g>
          );
        })}
      </motion.svg>
    </div>
  );
}

export function Hero() {
  const router = useRouter();
  const prefersReducedMotion = useSafeReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  // Handoff to problem section:
  // As scroll passes 50% of hero height, the constellation scales 1 -> 0.85 and translates Y by 80px.
  // At 80% scroll-out, opacity drops 1 -> 0.4.
  const constellationScale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1, 0.85]);
  const constellationY = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0, 80]);
  const constellationOpacity = useTransform(scrollYProgress, [0, 0.8, 1], [1, 1, 0.4]);

  return (
    <section ref={heroRef} className="relative min-h-[100dvh] flex items-center pt-24 pb-16 overflow-hidden bg-brand-black">
      {/* Background layer */}
      <HeroAurora />
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full flex flex-col lg:flex-row relative z-10">
        
        {/* Left Column: Typography & CTA */}
        <div className="w-full lg:w-[55%] flex flex-col justify-center pointer-events-auto mt-12 lg:mt-0">
          
          {/* Eyebrow */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.02 }}
            className="flex items-center gap-3 mb-6"
          >
            <motion.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.05, type: "spring" }}
              className="relative w-3 h-3 flex items-center justify-center"
            >
              <div className="absolute inset-0 rounded-full border border-brand-neon" />
              <div className="w-1 h-1 bg-brand-neon rounded-full" />
            </motion.div>
            <span className="text-[11px] font-mono tracking-[0.2em] text-brand-neon uppercase">
              LIVE NOW · INVITE ONLY · 7 COHORTS · 500+ BUILDERS
            </span>
          </motion.div>
          
          {/* Headline */}
          <h1 className="text-[48px] sm:text-[56px] lg:text-[84px] leading-[0.95] tracking-tighter flex flex-col items-start text-left">
            <motion.span
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={prefersReducedMotion ? { duration: 0.45, delay: 0.02 } : { duration: 0.45, delay: 0.02, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block text-brand-white"
            >
              The people you need
            </motion.span>
            <span className="overflow-hidden mt-1">
              <motion.span
                initial={{ y: '100%', opacity: 0, filter: 'blur(8px)' }}
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block font-[family-name:var(--font-cormorant)] italic font-medium text-[64px] sm:text-[72px] lg:text-[104px] text-brand-neon"
              >
                are already inside.
              </motion.span>
            </span>
            <motion.span
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={prefersReducedMotion ? { duration: 0.45, delay: 0.12 } : { duration: 0.45, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block text-brand-white"
            >
              Stop searching outside.
            </motion.span>
          </h1>
          
          {/* Sub-copy */}
          <motion.p 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.16 }}
            className="mt-6 text-[18px] text-brand-white/60 leading-[1.6] font-sans max-w-[480px]"
          >
            <span className="block">100x Civilization is the private network where</span>
            <span className="block">100xEngineers alumni post what they need, find who</span>
            <span className="block">can help, and connect directly — without leaving</span>
            <span className="block">the community that built them.</span>
          </motion.p>
          
          {/* CTA Group */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, delay: 0.22 }}
            className="mt-10 flex flex-col sm:flex-row items-start gap-4"
          >
            {/* PRIMARY CTA: product is live — route to /invite */}
            <MagneticButton 
              variant="custom"
              onClick={() => router.push('/invite')}
              className="bg-brand-neon text-brand-black font-semibold px-[36px] py-[18px] rounded-none hover:bg-[#FF6A26] transition-colors border-none"
            >
              Join the Network
            </MagneticButton>
            {/* SECONDARY CTA: sign in via invite link */}
            <button 
              onClick={() => router.push('/invite')}
              className="bg-transparent text-brand-white font-semibold px-[36px] py-[18px] rounded-none border border-brand-white/20 hover:bg-brand-white/5 transition-colors"
            >
              Sign In
            </button>
          </motion.div>
          
          {/* Stats Line */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, delay: 0.28 }}
            className="mt-6"
          >
            <span className="font-mono text-[11px] text-brand-white/40 tracking-wider">
              7 COHORTS · 500+ BUILDERS · LIVE NOW
            </span>
          </motion.div>
          
        </div>
        
        {/* Right Column: Constellation placeholder */}
        <div className="w-full lg:w-[45%] mt-12 lg:mt-0 flex items-center justify-center pointer-events-auto">
           <motion.div 
             className="w-[320px] lg:w-[600px] h-[320px] lg:h-[600px] flex items-center justify-center"
             style={{ scale: constellationScale, y: constellationY, opacity: constellationOpacity }}
           >
             <HeroConstellationInline />
           </motion.div>
        </div>

      </div>
    </section>
  );
}

function useSafeReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);

    return () => {
      mediaQuery.removeEventListener('change', updatePreference);
    };
  }, []);

  return prefersReducedMotion;
}
