'use client';

import { motion } from 'framer-motion';
import {
  Music2,
  Search,
  Library,
  Home,
  ChevronLeft,
  Ghost,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-context';

export default function NotFound() {
  const { user } = useAuth();

  return (
    <div className='min-h-[80vh] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden'>
      {/* Background Decorative Elements */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]'
        />
      </div>

      <div className='relative z-10 flex flex-col items-center gap-8 max-w-2xl'>
        {/* Animated Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 20,
          }}
          className='relative'
        >
          <div className='w-32 h-32 bg-zinc-900 rounded-[2.5rem] border border-white/5 flex items-center justify-center shadow-2xl relative group'>
            <Music2 className='w-16 h-16 text-zinc-700 group-hover:text-primary transition-colors duration-500' />
            <motion.div
              animate={{
                y: [0, -10, 0],
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className='absolute -top-4 -right-4'
            >
              <Ghost className='w-8 h-8 text-primary/40' />
            </motion.div>
          </div>
        </motion.div>

        {/* Text Content */}
        <div className='space-y-4'>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='text-7xl font-black text-white tracking-tighter'
          >
            404
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className='text-3xl font-bold text-zinc-100'
          >
            Lost in the Rhythm?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className='text-zinc-500 max-w-md mx-auto text-lg'
          >
            The track you're looking for has drifted off into the void. Let's
            get you back to the music.
          </motion.p>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className='flex flex-wrap items-center justify-center gap-4 mt-4'
        >
          <Link href='/'>
            <Button
              size='lg'
              className='bg-primary text-black font-bold h-14 px-8 rounded-full hover:scale-105 transition-transform shadow-xl shadow-primary/20'
            >
              <Home className='mr-2 w-5 h-5' />
              Home Dashboard
            </Button>
          </Link>

          <Link href='/search'>
            <Button
              variant='outline'
              size='lg'
              className='border-white/10 text-white h-14 px-8 rounded-full hover:bg-white/5 backdrop-blur-sm'
            >
              <Search className='mr-2 w-5 h-5' />
              Find Music
            </Button>
          </Link>

          <Link href='/library'>
            <Button
              variant='outline'
              size='lg'
              className='border-white/10 text-white h-14 px-8 rounded-full hover:bg-white/5 backdrop-blur-sm'
            >
              <Library className='mr-2 w-5 h-5' />
              Your Library
            </Button>
          </Link>
        </motion.div>

        {/* Subtle Back Link */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => window.history.back()}
          className='text-zinc-600 hover:text-white text-sm font-medium transition-colors flex items-center gap-2 mt-4'
        >
          <ChevronLeft className='w-4 h-4' />
          Go back to where you were
        </motion.button>
      </div>
    </div>
  );
}
