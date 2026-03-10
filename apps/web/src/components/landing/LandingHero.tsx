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
            <Button
              variant='outline'
              size='lg'
              className='h-14 px-10 rounded-full border-border text-foreground font-bold hover:bg-muted backdrop-blur-sm'
            >
              View Plans
            </Button>
          </div>

          <div className='flex items-center gap-6 justify-center lg:justify-start pt-4'>
            <div className='flex -space-x-3'>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className='w-10 h-10 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center overflow-hidden'
                >
                  <img
                    src={`https://i.pravatar.cc/100?u=${i}`}
                    alt='user'
                    className='w-full h-full object-cover opacity-80'
                  />
                </div>
              ))}
            </div>
            <p className='text-sm text-muted-foreground font-medium'>
              Joined by{' '}
              <span className='text-foreground font-bold'>10,000+</span> music
              lovers
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          className='relative hidden lg:block'
        >
          <div className='relative z-10 w-[500px] h-[600px] mx-auto bg-card rounded-[3rem] p-4 border border-border shadow-2xl overflow-hidden group'>
            <div className='absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors duration-500' />

            {/* Mock App UI */}
            <div className='relative h-full flex flex-col gap-6 p-6'>
              <div className='flex items-center justify-between'>
                <div className='w-10 h-10 rounded-full bg-muted' />
                <div className='flex gap-2'>
                  <div className='w-2 h-2 rounded-full bg-muted' />
                  <div className='w-2 h-2 rounded-full bg-muted' />
                </div>
              </div>
              <div className='w-full aspect-square bg-zinc-800/80 rounded-2xl overflow-hidden border border-white/5 relative group/img'>
                <img
                  src='https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop'
                  className='w-full h-full object-cover opacity-60 group-hover/img:scale-110 transition-transform duration-700'
                  alt='album'
                />
                <div className='absolute inset-0 flex items-center justify-center'>
                  <div className='w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-2xl'>
                    <div className='w-0 h-0 border-t-10 border-t-transparent border-l-16 border-l-black border-b-10 border-b-transparent translate-x-1' />
                  </div>
                </div>
              </div>
              <div className='flex flex-col gap-2'>
                <div className='h-6 w-3/4 bg-white/10 rounded-md' />
                <div className='h-4 w-1/2 bg-white/5 rounded-md' />
              </div>
              <div className='mt-auto space-y-4'>
                <div className='h-1.5 w-full bg-muted rounded-full overflow-hidden'>
                  <motion.div
                    animate={{ width: ['10%', '60%', '30%'] }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className='h-full bg-primary'
                  />
                </div>
                <div className='flex justify-between'>
                  <div className='w-4 h-4 rounded bg-muted' />
                  <div className='w-4 h-4 rounded bg-muted' />
                  <div className='w-4 h-4 rounded bg-muted' />
                </div>
              </div>
            </div>
          </div>

          {/* Floating Elements */}
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className='absolute -top-10 -right-10 w-24 h-24 bg-primary/20 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center justify-center shadow-xl'
          >
            <Headphones className='w-10 h-10 text-primary' />
          </motion.div>
          <motion.div
            animate={{ y: [0, 20, 0] }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
            className='absolute bottom-20 -left-20 w-32 h-16 bg-blue-500/20 backdrop-blur-xl rounded-full border border-white/10 flex items-center justify-center gap-3 px-4 shadow-xl'
          >
            <Music2 className='w-6 h-6 text-blue-400' />
            <div className='flex flex-col gap-1'>
              <div className='h-1.5 w-12 bg-white/20 rounded-full' />
              <div className='h-1.5 w-8 bg-white/10 rounded-full' />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
