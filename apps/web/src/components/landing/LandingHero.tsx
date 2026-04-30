import { motion } from 'framer-motion';
import { ChevronRight, Headphones, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function LandingHero() {
  return (
    <section className='relative min-h-screen flex items-center justify-center pt-20 pb-32 px-6 overflow-hidden'>
      {/* Animated Background Orbs */}
      <div className='absolute top-0 left-0 w-full h-full overflow-hidden -z-10'>
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className='absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[120px]'
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, -40, 0],
            y: [0, 60, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
          className='absolute top-[20%] -right-[5%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px]'
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.3, 0.1],
            x: [0, 30, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
          className='absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[110px]'
        />
      </div>

      <div className='max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center'>
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className='flex flex-col gap-8 text-center lg:text-left pt-10'
        >
          <div className='flex flex-col gap-6'>
            <div className='flex items-center justify-center lg:justify-start gap-4 mb-2'>
              <div className='w-12 h-12 flex items-center justify-center overflow-hidden'>
                <img
                  src='/logo.png'
                  alt='Melofy Logo'
                  className='w-full h-full object-contain'
                />
              </div>
              <span className='text-4xl font-black text-foreground tracking-tighter'>
                Melofy
              </span>
            </div>

            <h1 className='text-5xl md:text-8xl font-black text-foreground tracking-tighter leading-[0.9] text-balance'>
              Elevate <br />
              <span className='text-transparent bg-clip-text bg-linear-to-r from-primary via-blue-500 to-purple-500'>
                Your Sound.
              </span>
            </h1>
          </div>

          <p className='text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed'>
            Experience sound like never before. Melofy brings millions of songs,
            podcasts, and curated playlists to your ears, everywhere you go.
          </p>

          <div className='flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start'>
            <Link href='/login'>
              <Button
                size='lg'
                className='h-14 px-10 rounded-full bg-primary text-primary-foreground font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-primary/20'
              >
                Get Started Free
                <ChevronRight className='ml-2 w-5 h-5' />
              </Button>
            </Link>
            <a href='https://github.com/ShreyJaiswal1/melofy/releases/download/1.0.0/Melofy.apk' target='_blank' rel='noopener noreferrer'>
              <Button
                variant='outline'
                size='lg'
                className='h-14 px-10 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-foreground/5'
              >
                Download for Android
              </Button>
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          className='relative hidden lg:flex items-center justify-center'
        >
          <div className='relative w-full max-w-[500px] aspect-square flex items-center justify-center'>
            {/* Background Glow */}
            <div className='absolute inset-0 bg-linear-to-tr from-primary/30 via-purple-500/20 to-blue-500/30 blur-[100px] rounded-full' />

            {/* Main Center Image */}
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className='absolute z-20 w-64 h-64 md:w-80 md:h-80 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl'
            >
              <img
                src='https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=1000'
                className='w-full h-full object-cover hover:scale-110 transition-transform duration-700'
                alt='Vibrant Album Artwork'
              />
              <div className='absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent' />
            </motion.div>

            {/* Top Right Floating Image */}
            <motion.div
              animate={{ y: [0, 20, 0], rotate: [6, 2, 6] }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 1,
              }}
              className='absolute -top-4 right-4 z-10 w-40 h-40 md:w-52 md:h-52 rounded-3xl overflow-hidden border border-white/10 shadow-2xl'
            >
              <img
                src='https://images.unsplash.com/photo-1541126274323-dbac58d14741?auto=format&fit=crop&q=80&w=800'
                className='w-full h-full object-cover scale-110'
                alt='Live Concert'
              />
              <div className='absolute inset-0 bg-black/20' />
            </motion.div>

            {/* Bottom Left Floating Image */}
            <motion.div
              animate={{ y: [0, -20, 0], rotate: [-6, -2, -6] }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 2,
              }}
              className='absolute -bottom-8 left-0 z-30 w-48 h-48 md:w-60 md:h-60 rounded-3xl overflow-hidden border border-white/10 shadow-2xl'
            >
              <img
                src='https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800'
                className='w-full h-full object-cover'
                alt='DJ Deck'
              />
              <div className='absolute inset-0 bg-linear-to-tr from-primary/20 to-transparent' />
            </motion.div>

            {/* Floating Glassmorphism Badges */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.5,
              }}
              className='absolute top-1/4 -left-12 z-40 bg-background/80 backdrop-blur-xl p-4 rounded-2xl border border-white/5 shadow-2xl flex items-center gap-4'
            >
              <div className='p-3 bg-primary/20 rounded-full text-primary'>
                <Headphones className='w-6 h-6' />
              </div>
              <div className='pr-4 text-left'>
                <p className='text-sm font-bold text-foreground'>
                  Lossless Audio
                </p>
                <p className='text-xs text-muted-foreground font-medium'>
                  High Fidelity
                </p>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 15, 0] }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 1.5,
              }}
              className='absolute bottom-1/4 -right-8 z-40 bg-background/80 backdrop-blur-xl p-4 rounded-2xl border border-white/5 shadow-2xl flex items-center gap-4'
            >
              <div className='p-3 bg-blue-500/20 rounded-full text-blue-400'>
                <Music2 className='w-6 h-6' />
              </div>
              <div className='pr-4 text-left'>
                <p className='text-sm font-bold text-foreground'>50M+ Tracks</p>
                <p className='text-xs text-muted-foreground font-medium'>
                  Endless library
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
