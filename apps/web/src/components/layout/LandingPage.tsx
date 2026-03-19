'use client';

import { LandingHero } from '@/components/landing/LandingHero';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { LandingFooter } from '@/components/landing/LandingFooter';

export function LandingPage() {
  return (
    <div className='relative flex flex-col w-full overflow-x-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(6,182,212,0.16),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(245,158,11,0.15),transparent_38%),var(--background)]'>
      <div className='pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:48px_48px]' />
      <LandingHero />
      <LandingFeatures />
      <LandingFooter />
    </div>
  );
}
