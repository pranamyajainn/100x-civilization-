'use client';
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';

// Hardcoded stable positions for the 7 cohort nodes to maintain a slightly irregular, alive feeling.
const nodes = [
  { id: 'C1', x: 305, y: 80 },
  { id: 'C2', x: 468, y: 155 },
  { id: 'C3', x: 510, y: 345 },
  { id: 'C4', x: 395, y: 505 },
  { id: 'C5', x: 195, y: 495 },
  { id: 'C6', x: 80, y: 335 },
  { id: 'C7', x: 135, y: 165 },
];
const center = { x: 300, y: 300 };

/**
 * Constellation: visualizes the 7 cohorts as a closed network.
 * The product metaphor made visible.
 */
export function HeroConstellation() {
  const prefersReducedMotion = useReducedMotion();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Entrance animations
  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => ({
      pathLength: 1,
      opacity: prefersReducedMotion ? 0.12 : [0.4, 0.12], // flash on mount
      transition: { 
        pathLength: { delay: 1.0 + i * 0.1, duration: 1.4, ease: "easeOut" as const },
        opacity: { delay: 1.0 + i * 0.1, duration: 1.4 }
      }
    }),
  };

  const loopVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => ({
      pathLength: 1,
      opacity: prefersReducedMotion ? 0.12 : [0.3, 0.12],
      transition: { 
        pathLength: { delay: 2.4 + i * 0.05, duration: 0.6, ease: "easeOut" as const },
        opacity: { delay: 2.4 + i * 0.05, duration: 0.6 }
      }
    }),
  };

  const nodeVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i: number) => ({
      scale: 1,
      opacity: 0.6,
      transition: { delay: 3.0 + i * 0.06, type: "spring" as const, stiffness: 200, damping: 15 }
    }),
  };

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

        {/* Links to center */}
        {nodes.map((node, i) => {
          // Calculate length roughly for dasharray pulse (optional, but let's do a simple animated dash offset if we want, or rely on pathLength)
          return (
            <motion.line
               key={`link-center-${i}`}
               x1={center.x} y1={center.y}
               x2={node.x} y2={node.y}
               stroke="white"
               strokeWidth="1"
               custom={i}
               initial="hidden"
               animate="visible"
               variants={pathVariants}
               style={{ opacity: hoveredNode === node.id ? 0.4 : undefined }}
               className="transition-opacity duration-300"
            />
          );
        })}

        {/* Loop connections (C1 to C2, etc) */}
        {nodes.map((node, i) => {
          const nextNode = nodes[(i + 1) % nodes.length];
          return (
            <motion.line
               key={`link-loop-${i}`}
               x1={node.x} y1={node.y}
               x2={nextNode.x} y2={nextNode.y}
               stroke="white"
               strokeWidth="1"
               custom={i}
               initial="hidden"
               animate="visible"
               variants={loopVariants}
               style={{ opacity: (hoveredNode === node.id || hoveredNode === nextNode.id) ? 0.3 : undefined }}
               className="transition-opacity duration-300"
            />
          );
        })}

        {/* Responsive styles for center node */}
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

        {/* Center node */}
        <motion.g 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }} 
          transition={{ delay: 1.0, type: "spring", stiffness: 200, damping: 15 }}
          style={{ transformOrigin: `${center.x}px ${center.y}px` }}
        >
          {/* Idle pulse group (only scales disc, not text) */}
          <motion.g
            animate={prefersReducedMotion ? {} : { scale: [1, 1.03, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: `${center.x}px ${center.y}px` }}
          >
            {/* Glow (Idle) */}
            <motion.circle 
               cx={center.x} cy={center.y} 
               className="center-radius" 
               fill="white" 
               filter="url(#center-blur)" 
               animate={prefersReducedMotion ? { opacity: 0.7 } : { opacity: [0.7, 0.9, 0.7] }} 
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Glow (Flash sync with loop) */}
            {!prefersReducedMotion && (
              <motion.circle 
                 cx={center.x} cy={center.y} 
                 className="center-radius" 
                 fill="white" 
                 filter="url(#center-blur)" 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: [0, 0, 1, 0, 0] }}
                 transition={{ duration: 6, repeat: Infinity, times: [0, 0.966, 0.983, 1, 1] }}
              />
            )}
            
            {/* Base White Disc */}
            <circle 
               cx={center.x} cy={center.y} 
               className="center-radius" 
               fill="white" 
               stroke="rgba(255,255,255,0.4)" 
               strokeWidth="1" 
            />
          </motion.g>

          {/* Text mark - fades in at 2200ms, not affected by idle scale */}
          <motion.text
            x={center.x} y={center.y}
            textAnchor="middle"
            dominantBaseline="central"
            textRendering="geometricPrecision"
            className="font-sans font-bold center-text-size"
            fill="#050409"
            style={{ letterSpacing: "-0.02em", transformOrigin: `${center.x}px ${center.y}px` }}
            initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            100x
          </motion.text>
        </motion.g>

        {/* Nodes and Labels */}
        {nodes.map((node, i) => {
          const isHovered = hoveredNode === node.id;
          return (
            <g 
               key={`node-${i}`} 
               onMouseEnter={() => setHoveredNode(node.id)}
               onMouseLeave={() => setHoveredNode(null)}
               className="cursor-pointer"
            >
              <motion.circle
                cx={node.x} cy={node.y}
                r="8"
                fill="#FF4D00"
                stroke="#FF4D00"
                strokeWidth="1"
                filter={isHovered ? 'url(#glow-center)' : 'url(#glow)'}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={nodeVariants}
                style={{ opacity: isHovered ? 1 : undefined }}
                className="transition-opacity transition-[filter] duration-300"
              />
              <motion.text
                x={node.x + 16}
                y={node.y + 4}
                fill="white"
                className="font-mono text-[11px] select-none pointer-events-none transition-opacity duration-300"
                custom={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0.4 }}
                transition={{ delay: 3.5 + i * 0.05 }}
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
