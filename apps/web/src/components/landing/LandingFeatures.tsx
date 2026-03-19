import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AudioWaveform,
  Clock3,
  ListMusic,
  Lock,
  Radio,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const highlights = [
  {
    icon: AudioWaveform,
    title: 'Gapless Stream Handoff',
    description:
      'Tracks resolve in advance, so transitions stay smooth when your queue shifts in real-time.',
  },
  {
    icon: Workflow,
    title: 'Queue Context Memory',
    description:
      'Your session keeps context across routes and devices to preserve momentum while browsing.',
  },
  {
    icon: ListMusic,
    title: 'Playlist Porting',
    description:
      'Bring Spotify playlists in seconds, then save your own hybrid collections inside Melofy.',
  },
  {
    icon: Radio,
    title: 'Autoplay Intelligence',
    description:
      'Recommendations continue from current mood and artist profile instead of random lookalikes.',
  },
  {
    icon: Clock3,
    title: 'Fast Wake-Up',
    description:
      'Playback begins in under a second for most sessions with lightweight queue hydration.',
  },
  {
    icon: Lock,
    title: 'Authenticated Control Plane',
    description:
      'State sync, search, and streaming routes are protected with Firebase-backed identity checks.',
  },
];

const steps = [
  {
    label: '01',
    title: 'Import and organize',
    description:
      'Pull your existing playlists, pin favorites, and build a playback lane for any mood.',
  },
  {
    label: '02',
    title: 'Play with context',
    description:
      'Melofy tracks what you are listening to and keeps the queue coherent as you explore.',
  },
  {
    label: '03',
    title: 'Sync across devices',
    description:
      'Resume your session with queue state, progress, and controls ready wherever you sign in.',
  },
];

export function LandingFeatures() {
  return (
    <>
      <section className='px-6 pb-24 pt-8'>
        <div className='mx-auto w-full max-w-7xl'>
          <div className='mb-12 flex flex-col gap-4'>
            <p className='inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/35 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-amber-200'>
              <Sparkles className='h-3.5 w-3.5' />
              Built For Daily Listening
            </p>
            <h2 className='max-w-3xl text-balance text-4xl font-black tracking-[-0.02em] text-foreground md:text-6xl'>
              Designed Like A Studio Console, Not A Generic Feed.
            </h2>
            <p className='max-w-2xl text-base text-muted-foreground md:text-lg'>
              Every section is built to reduce friction between discovery and playback.
              You search less, skip less, and stay in the zone longer.
            </p>
          </div>

          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
            {highlights.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.4, delay: index * 0.04 }}
                  className='group rounded-3xl border border-border/70 bg-background/70 p-6 backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-cyan-300/35'
                >
                  <div className='mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-cyan-400/20 to-amber-400/20 text-cyan-200 ring-1 ring-white/10'>
                    <Icon className='h-5 w-5' />
                  </div>
                  <h3 className='mb-2 text-xl font-bold tracking-tight text-foreground'>
                    {item.title}
                  </h3>
                  <p className='text-sm leading-relaxed text-muted-foreground'>
                    {item.description}
                  </p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className='px-6 pb-24'>
        <div className='mx-auto grid w-full max-w-7xl gap-8 rounded-[2rem] border border-border/70 bg-zinc-950/40 p-7 backdrop-blur-xl lg:grid-cols-[1.1fr_1fr] lg:p-10'>
          <div className='space-y-4'>
            <p className='text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/85'>
              Workflow
            </p>
            <h3 className='text-3xl font-black tracking-tight text-zinc-100 md:text-5xl'>
              Three Steps To A Better Listening Loop.
            </h3>
            <p className='max-w-xl text-sm leading-relaxed text-zinc-400 md:text-base'>
              You do not need to relearn your music habits. Melofy improves what already
              works and removes what slows you down.
            </p>
            <Link href='/login'>
              <Button className='mt-4 rounded-full bg-linear-to-r from-cyan-400 to-amber-400 px-6 font-semibold text-zinc-950 hover:opacity-90'>
                Enter Melofy
              </Button>
            </Link>
          </div>

          <div className='space-y-4'>
            {steps.map((step) => (
              <div
                key={step.label}
                className='rounded-2xl border border-white/10 bg-zinc-900/80 p-4'
              >
                <div className='mb-2 text-xs font-bold tracking-[0.16em] text-cyan-200'>
                  {step.label}
                </div>
                <h4 className='text-lg font-bold text-zinc-100'>{step.title}</h4>
                <p className='mt-1 text-sm text-zinc-400'>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
