import { CountUp } from './count-up';
import { ScrollReveal } from './scroll-reveal';

export function Problem() {
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-24">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-24 items-start">
        <ScrollReveal className="md:col-span-2">
          <div className="flex flex-col gap-6">
            <h2 className="text-4xl md:text-5xl font-display font-medium text-brand-neon">
              <CountUp end={0.3} isFloat suffix="%" />
            </h2>
            <p className="text-sm font-mono text-brand-muted uppercase tracking-widest">Of India's Population</p>
          </div>
          <div className="flex flex-col gap-6 mt-12">
            <h2 className="text-4xl md:text-5xl font-display font-medium text-brand-white">
              <CountUp end={27} suffix="%" />
            </h2>
            <p className="text-sm font-mono text-brand-muted uppercase tracking-widest">Of India's Wealth</p>
          </div>
        </ScrollReveal>
        
        <div className="md:col-span-3 prose prose-invert max-w-none text-brand-muted text-base sm:text-lg leading-relaxed">
          <ScrollReveal delay={0.1} as="p" className="mb-6">
            The Jain community did not get lucky. Pure system design. They buy, hire, marry and build within the community. Wealth stays inside.
          </ScrollReveal>
          <ScrollReveal delay={0.2} as="p">
            100x has the same ingredients. Seven cohorts. Elite AI builders. Real trust. But when cohorts end, groups die. The community and trust slowly evaporate. No current system exists to turn this trust into supreme compounding economic value.
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
