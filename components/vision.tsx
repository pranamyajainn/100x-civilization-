import { ScrollReveal } from './scroll-reveal';

export function Vision() {
  return (
    <section className="bg-brand-neon text-brand-black py-24 md:py-32 selection:bg-brand-black selection:text-brand-neon">
      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24 items-center">
        <ScrollReveal>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-medium leading-[1.1] text-balance">
            Do for 100x what the Jain community did for themselves.
          </h2>
        </ScrollReveal>
        
        <ScrollReveal delay={0.1} className="flex flex-col gap-8 text-lg md:text-xl font-medium leading-relaxed opacity-90">
          <p>
            They became the wealthiest community in India. Trust becomes transactions. Transactions become wealth. Wealth compounds inside instead of leaking out.
          </p>
          <p className="font-mono uppercase tracking-widest text-sm font-semibold">
            One community. Infinite leverage.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
