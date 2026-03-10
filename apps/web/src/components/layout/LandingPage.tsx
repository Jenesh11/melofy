'use client';

import { LandingHero } from '@/components/landing/LandingHero';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { LandingFooter } from '@/components/landing/LandingFooter';

export function LandingPage() {
  return (
    <div className='flex flex-col w-full bg-background'>
      <LandingHero />
      <LandingFeatures />
      <LandingFooter />
    </div>
  );
}
