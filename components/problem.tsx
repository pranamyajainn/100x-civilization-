import { ScrollReveal } from './scroll-reveal';

export function Problem() {
  return (
    <section className="relative max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-24 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.08]" style={{ mixBlendMode: 'overlay' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)"/>
        </svg>
      </div>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-brand-black via-transparent to-brand-black" />
      
      <div className="relative z-10 grid grid-cols-1 gap-12 items-start">
        <ScrollReveal>
          <div className="flex flex-col gap-6">
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-display font-medium text-brand-neon">
              Trust Disappears At The Exit.
            </h2>
          </div>
        </ScrollReveal>
        
        <div className="prose prose-invert max-w-none text-brand-muted text-base sm:text-lg leading-relaxed">
          <ScrollReveal delay={0.1} as="p" className="mb-6 text-xl md:text-2xl text-brand-muted/80 font-sans max-w-2xl mt-4 text-balance">
            You build deep trust within your cohort. But when the program ends, that leverage evaporates. No structure exists to capture it.
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
