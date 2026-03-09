'use client';

import { useAuth } from '@/lib/firebase/auth-context';
import { motion } from 'framer-motion';
import {
  Play,
  Sparkles,
  TrendingUp,
  Clock,
  Disc,
  Headphones,
  Music2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingPage } from '@/components/layout/LandingPage';

export default function Home() {
  const { user, loading } = useAuth();

  // Show a blank screen while checking auth
  if (loading) return <div className='min-h-screen bg-background' />;

  // Display the detailed Landing Page if not logged in
  if (!user) {
    return <LandingPage />;
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  };

  const greeting = getGreeting();

  // Dashboard for logged-in users
  return (
    <div className='p-8 flex flex-col gap-10'>
      <header className='flex flex-col gap-2'>
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className='text-primary font-bold tracking-widest text-xs uppercase'
        >
          Welcome back
        </motion.p>
        <motion.h1
          animate={{ opacity: 1, x: 0 }}
          className='text-4xl md:text-5xl font-bold text-foreground tracking-tight'
        >
          {user?.displayName
            ? `${greeting}, ${user.displayName.split(' ')[0]}`
            : greeting}
        </motion.h1>
      </header>

      <section className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className='relative group overflow-hidden rounded-[2rem] bg-linear-to-br from-primary/20 to-blue-500/10 border border-white/5 p-8 flex flex-col justify-between h-[300px] hover:border-white/20 transition-all duration-500 cursor-pointer shadow-2xl'
        >
          <div className='absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform duration-700'>
            <TrendingUp className='h-32 w-32 text-primary' />
          </div>
          <div>
            <span className='px-3 py-1 bg-primary/20 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider border border-primary/20'>
              Featured
            </span>
            <h2 className='text-3xl font-bold text-foreground mt-4 leading-tight'>
              Top Hits <br /> India
            </h2>
            <p className='text-muted-foreground mt-2 text-sm max-w-[200px] font-light'>
              The most streamed tracks globally, right now.
            </p>
          </div>
          <Button
            size='lg'
            className='bg-primary text-primary-foreground font-semibold rounded-full w-fit px-8 group-hover:scale-105 transition-transform'
          >
            Play Now
            <Play className='ml-2 h-4 w-4 fill-black' />
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className='relative group overflow-hidden rounded-3xl bg-linear-to-br from-purple-500/20 to-pink-500/10 border border-white/5 p-8 flex flex-col justify-between h-[300px] hover:border-white/20 transition-all duration-500 cursor-pointer shadow-2xl'
        >
          <div className='absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform duration-700'>
            <Clock className='h-32 w-32 text-purple-400' />
          </div>
          <div>
            <span className='px-3 py-1 bg-purple-500/20 text-purple-400 text-[10px] font-bold rounded-full uppercase tracking-wider border border-purple-500/20'>
              Just for you
            </span>
            <h2 className='text-3xl font-bold text-foreground mt-4 leading-tight'>
              Your <br /> Daily Mix
            </h2>
            <p className='text-muted-foreground mt-2 text-sm max-w-[200px]'>
              A personalized blend of your favorite artists.
            </p>
          </div>
          <Button
            size='lg'
            className='bg-purple-500 text-white font-bold rounded-full w-fit px-8 hover:bg-purple-600 transition-colors group-hover:scale-105 transition-transform border-none'
          >
            Listen
            <Headphones className='ml-2 h-4 w-4' />
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className='relative group overflow-hidden rounded-3xl bg-linear-to-br from-emerald-500/20 to-cyan-500/10 border border-white/5 p-8 flex flex-col justify-between h-[300px] hover:border-white/20 transition-all duration-500 cursor-pointer shadow-2xl'
        >
          <div className='absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform duration-700'>
            <Sparkles className='h-32 w-32 text-emerald-400' />
          </div>
          <div>
            <span className='px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider border border-emerald-500/20'>
              Mood Filter
            </span>
            <h2 className='text-3xl font-bold text-foreground mt-4 leading-tight'>
              Chill <br /> Lofi Beats
            </h2>
            <p className='text-muted-foreground mt-2 text-sm max-w-[200px]'>
              Perfect backdrop for work or late night vibes.
            </p>
          </div>
          <Button
            size='lg'
            className='bg-emerald-500 text-white font-bold rounded-full w-fit px-8 hover:bg-emerald-600 transition-colors group-hover:scale-105 transition-transform border-none'
          >
            Vibe
            <Disc className='ml-2 h-4 w-4' />
          </Button>
        </motion.div>
      </section>

      <section>
        <div className='flex items-center justify-between mb-6'>
          <h3 className='text-2xl font-bold text-foreground flex items-center gap-2'>
            <TrendingUp className='h-6 w-6 text-primary' />
            Trending Right Now
          </h3>
          <Button
            variant='link'
            className='text-primary font-bold hover:no-underline'
          >
            View All
          </Button>
        </div>
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6'>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.05 }}
              className='flex flex-col gap-3 group cursor-pointer'
            >
              <div className='aspect-square rounded-2xl bg-muted relative overflow-hidden shadow-lg group-hover:shadow-primary/20 transition-all duration-500'>
                <div className='absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center placeholder-background'>
                  <div className='w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground scale-90 group-hover:scale-100 transition-transform'>
                    <Play className='h-6 w-6 fill-current translate-x-0.5' />
                  </div>
                </div>
                <div className='h-full w-full bg-linear-to-br from-muted to-background group-hover:scale-110 transition-transform duration-700 flex items-center justify-center'>
                  <Music2 className='h-12 w-12 text-muted-foreground/40' />
                </div>
              </div>
              <div className='flex flex-col'>
                <p className='text-foreground font-semibold truncate'>
                  Trending Song {i + 1}
                </p>
                <p className='text-muted-foreground text-xs truncate uppercase tracking-tighter'>
                  Popular Artist
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
