import { Cursor } from '@/components/cursor';
import { ShimmerEffect } from '@/components/shimmer-effect';
import { EasterEggSound } from '@/components/easter-egg';
import { Hero } from '@/components/hero';
import { SectionDivider } from '@/components/section-divider';
import { WaitlistModal } from '@/components/waitlist-modal';
import { Problem } from '@/components/problem';
import { Solution } from '@/components/solution';
import { Vision } from '@/components/vision';
import { Team } from '@/components/team';
import { FinalCTA } from '@/components/cta';
import { Footer } from '@/components/footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-brand-black text-brand-white selection:bg-brand-neon selection:text-brand-black w-full overflow-x-hidden pt-safe">
      <Cursor />
      <ShimmerEffect />
      <EasterEggSound />
      <WaitlistModal />
      <Hero />
      <SectionDivider />
      <Problem />
      <SectionDivider />
      <Solution />
      <Vision />
      <SectionDivider />
      <Team />
      <SectionDivider />
      <FinalCTA />
      <Footer />
    </main>
  );
}
