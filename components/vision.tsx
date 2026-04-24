import { ScrollReveal } from './scroll-reveal';

export function Vision() {
  return (
    <section className="relative bg-brand-black text-brand-white py-24 md:py-32 selection:bg-brand-neon selection:text-brand-black overflow-hidden">
      {/* Aurora Gradient */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen"
        style={{
          background: 'radial-gradient(ellipse at top left, #FF4D00 0%, transparent 50%), radial-gradient(ellipse at bottom right, #4F46E5 0%, transparent 50%)',
          animation: 'aurora 30s ease-in-out infinite alternate',
        }}
      />
      <div className="absolute inset-0 bg-brand-black/20 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24 items-center">
        <ScrollReveal>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-medium leading-[1.1] text-balance">
            Compound Your Leverage.
          </h2>
        </ScrollReveal>
        
        <ScrollReveal delay={0.1} className="flex flex-col gap-8 text-lg md:text-xl font-medium leading-relaxed opacity-90">
          <p>
            Trust becomes transactions. Transactions become wealth. Wealth compounds inside instead of leaking out.
          </p>
          <p className="font-mono uppercase tracking-widest text-sm font-semibold">
            One community. Infinite leverage.
          </p>
        </ScrollReveal>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes aurora {
          0% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.2) rotate(10deg); }
          100% { transform: scale(1) rotate(-5deg); }
        }
      `}} />
    </section>
  );
}
