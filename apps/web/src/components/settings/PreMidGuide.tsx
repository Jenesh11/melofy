'use client';

import React from 'react';
import { ExternalLink, Monitor, Chrome } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export function PreMidGuide() {
  const steps = [
    {
      title: 'Browser Extension',
      description:
        'Add the PreMiD extension to your browser (Chrome, Edge, etc.).',
      icon: Chrome,
      link: 'https://premid.app/downloads',
    },
    {
      title: 'Enable Melofy',
      description:
        'Search for "Melofy" in the PreMiD Store and add the presence.',
      icon: Monitor,
      link: 'https://premid.app/store/presences/Melofy',
    },
  ];

  return (
    <div className='flex flex-col gap-6 py-2'>
      <div className='flex items-center gap-3.5'>
        <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 shadow-inner'>
          <Monitor className='h-5 w-5 text-primary' />
        </div>
        <div>
          <h3 className='font-bold text-foreground text-base leading-tight'>
            Discord Rich Presence
          </h3>
          <p className='text-muted-foreground text-xs font-medium opacity-80'>
            Share your current rhythm with friends via PreMiD.
          </p>
        </div>
      </div>

      <div className='relative flex flex-col gap-6 pl-1 mt-2'>
        {steps.map((step, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className='relative flex gap-4'
          >
            {/* Timeline connector line */}
            {idx < steps.length - 1 && (
              <div className='absolute left-[17px] top-9 bottom-[-24px] w-0.5 bg-foreground/10' />
            )}

            {/* Step Icon Container */}
            <div className='h-9 w-9 rounded-full bg-foreground/5 flex items-center justify-center border border-foreground/10 shrink-0 relative z-10 bg-background'>
              <step.icon className='h-4.5 w-4.5 text-foreground/80' />
            </div>

            {/* Step Details */}
            <div className='flex flex-col gap-1.5 flex-1 min-w-0 pt-0.5'>
              <div className='space-y-0.5'>
                <h4 className='font-bold text-foreground text-sm flex items-center gap-2'>
                  {step.title}
                  <span className='text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-black uppercase tracking-wider'>
                    Step {idx + 1}
                  </span>
                </h4>
                <p className='text-xs text-muted-foreground leading-relaxed max-w-md'>
                  {step.description}
                </p>
              </div>

              <a
                href={step.link}
                target='_blank'
                rel='noopener noreferrer'
                className={cn(
                  buttonVariants({ variant: 'link', size: 'sm' }),
                  'h-auto w-fit p-0 text-primary hover:text-primary/80 no-underline text-xs font-bold transition-colors flex items-center gap-1',
                )}
              >
                Configure
                <ExternalLink className='h-3 w-3 opacity-60' />
              </a>
            </div>
          </motion.div>
        ))}
      </div>

      <div className='mt-2 pt-4 border-t border-foreground/5'>
        <a
          href='https://premid.app/store/presences/Melofy'
          target='_blank'
          rel='noopener noreferrer'
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'w-full sm:w-auto rounded-full text-xs font-bold border-foreground/10 h-10 px-5 hover:bg-foreground/5 transition-all inline-flex items-center justify-center gap-1.5',
          )}
        >
          Add to Discord
          <ExternalLink className='h-3.5 w-3.5 opacity-60' />
        </a>
      </div>
    </div>
  );
}

