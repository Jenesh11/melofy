'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle2, Monitor, Download, Chrome } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export function PreMidGuide() {
  const steps = [
    {
      title: 'Browser Extension',
      description: 'Add the PreMiD extension to your browser (Chrome, Edge, etc.).',
      icon: Chrome,
      link: 'https://premid.app/store/extension',
    },
    {
      title: 'Enable Melofy',
      description: 'Search for "Melofy" in the PreMiD Store and add the presence.',
      icon: Monitor,
      link: 'https://premid.app/store/presences/Melofy',
    },
  ];

  return (
    <Card className='p-6 bg-card/40 border-border/50 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden relative group shadow-2xl shadow-primary/5'>
      <div className='absolute -top-24 -right-24 h-64 w-64 bg-primary/10 blur-[80px] rounded-full group-hover:bg-primary/20 transition-all duration-1000' />
      
      <div className='relative z-10'>
        <div className='flex items-center gap-4 mb-8'>
          <div className='h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner'>
            <Monitor className='h-6 w-6 text-primary' />
          </div>
          <div>
            <h2 className='text-xl font-bold text-foreground leading-tight'>Discord Presence</h2>
            <p className='text-muted-foreground text-xs font-medium opacity-80'>Share your rhythm with PreMiD.</p>
          </div>
        </div>

        <div className='flex flex-col gap-4'>
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className='flex items-start gap-4 p-4 rounded-2xl bg-foreground/[0.04] border border-foreground/[0.04] hover:bg-foreground/5 hover:border-foreground/10 transition-all duration-300'
            >
              <div className='h-9 w-9 rounded-xl bg-background/60 flex items-center justify-center border border-foreground/10 shrink-0 shadow-sm'>
                <step.icon className='h-4.5 w-4.5 text-foreground/80' />
              </div>
              
              <div className='flex flex-col gap-2 flex-1 min-w-0'>
                <div className='space-y-0.5'>
                  <h3 className='font-bold text-foreground text-sm flex items-center justify-between'>
                    {step.title}
                    <span className='text-[9px] font-black opacity-10 select-none'>0{idx + 1}</span>
                  </h3>
                  <p className='text-[11px] text-muted-foreground leading-snug break-words'>{step.description}</p>
                </div>

                <a 
                  href={step.link} 
                  target='_blank' 
                  rel='noopener noreferrer' 
                  className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'h-auto w-fit p-0 text-primary hover:text-primary/80 no-underline text-xs font-bold transition-opacity')}
                >
                  Configure <ExternalLink className='ml-1.5 h-3 w-3 opacity-60' />
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        <div className='mt-8 pt-6 border-t border-foreground/5 flex flex-col gap-4'>
          <div className='flex items-center gap-2 text-[10px] font-medium text-muted-foreground bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10'>
            <CheckCircle2 className='h-3.5 w-3.5 text-emerald-500 shrink-0' />
            <span>Officially verified Melofy support.</span>
          </div>
          <a 
            href='https://premid.app' 
            target='_blank' 
            rel='noopener noreferrer'
            className={cn(buttonVariants({ variant: 'outline' }), 'w-full rounded-2xl text-[11px] font-black uppercase tracking-widest border-foreground/10 h-11 hover:bg-foreground/5 transition-all')}
          >
            Explore PreMiD
          </a>
        </div>
      </div>
    </Card>
  );
}
