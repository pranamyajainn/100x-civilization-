'use client';
import { ScrollReveal } from './scroll-reveal';
import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue } from 'motion/react';

const team = [
  {
    name: "Pranamya Jain",
    role: "AI Solutions Architect",
    desc: "Full-stack AI builder, agentic workflows, RAG, multi-LLM orchestration. Part of the wealthiest community in India, bringing the closed-loop economic playbook to 100x.",
    tag: "Mini Hackathon Winner"
  },
  {
    name: "Zara Kennedy",
    role: "Communications Strategist",
    desc: "GCC media, brand storytelling, 35M+ earned impressions across tier-1 media.",
    tag: "Mini Hackathon Runner-up"
  },
  {
    name: "Nakshatra Sain",
    role: "Psychology-driven Marketing",
    desc: "AI content production, 10K+ creators monetized, 5M+ impressions on X, 100+ clients.",
    tag: null
  },
  {
    name: "Arunkumar S.V",
    role: "Applied AI Engineer",
    desc: "Pharmacoinformatics, data analysis, applied AI, backend systems.",
    tag: null
  }
];

export function Team() {
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-24">
      <ScrollReveal className="mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl font-display font-medium text-brand-white text-balance">
          Built by cohort members, for cohort members.
        </h2>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 scale-100">
        {team.map((member, i) => (
          <TeamCard key={i} member={member} delay={i * 0.1} />
        ))}
      </div>
    </section>
  );
}

function TeamCard({ member, delay }: { member: typeof team[0], delay: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const [prefersReduced, setPrefersReduced] = useState(true);

  useEffect(() => {
    setPrefersReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (prefersReduced) return;
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }

  return (
    <ScrollReveal delay={delay}>
      <div 
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative h-full p-8 md:p-10 border border-brand-border bg-brand-white/5 backdrop-blur-sm overflow-hidden group"
      >
        {/* Radial spotlight effect */}
        {!prefersReduced && (
            <motion.div
              className="absolute pointer-events-none rounded-full w-[400px] h-[400px] bg-brand-neon/20 blur-[80px] -translate-x-1/2 -translate-y-1/2 mix-blend-screen"
              style={{ x: mouseX, y: mouseY, opacity: isHovered ? 1 : 0 }}
              transition={{ opacity: { duration: 0.3 } }}
            />
        )}
        
        <div className="relative z-10 flex flex-col h-full justify-between gap-8 pointer-events-none">
          <div>
            <h3 className="text-xl md:text-2xl font-display font-medium text-brand-white mb-1.5">{member.name}</h3>
            <p className="text-brand-muted font-mono text-sm tracking-wide mb-6">{member.role}</p>
            <p className="text-brand-muted/90 leading-relaxed text-sm sm:text-base">{member.desc}</p>
          </div>
          
          {member.tag ? (
            <div className="inline-flex w-fit items-center px-3 py-1 bg-brand-neon/10 text-[10px] font-mono uppercase tracking-widest text-brand-neon border border-brand-neon/40">
              {member.tag}
            </div>
          ) : (
            <div className="h-6" /> // spacer
          )}
        </div>
      </div>
    </ScrollReveal>
  );
}
