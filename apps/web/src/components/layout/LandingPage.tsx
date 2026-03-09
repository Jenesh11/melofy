'use client';

import { motion } from 'framer-motion';
import {
  Play,
  Music2,
  Search,
  Smartphone,
  Globe,
  Zap,
  Shield,
  Heart,
  Github,
  Twitter,
  Instagram,
  ChevronRight,
  Headphones,
  Sparkles,
  Layers,
  CloudLightning,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function LandingPage() {
  const features = [
    {
      icon: <Music2 className='w-6 h-6' />,
      title: 'Millions of Tracks',
      description:
        'Access a vast library of music from every genre and era, all at your fingertips.',
    },
    {
      icon: <Search className='w-6 h-6' />,
      title: 'Smart Search',
      description:
        'Find your favorite songs, artists, and albums instantly with our powerful search engine.',
    },
    {
      icon: <Smartphone className='w-6 h-6' />,
      title: 'Listen Anywhere',
      description:
        'Seamlessly switch between your desktop and mobile devices without missing a beat.',
    },
    {
      icon: <CloudLightning className='w-6 h-6' />,
      title: 'High Fidelity',
      description:
        'Experience crystal clear audio quality that brings every note to life.',
    },
  ];

  const details = [
    {
      title: 'Real-time Sync',
      description:
        'Your queue, playlists, and settings stay in sync across all devices in real-time.',
      icon: <Layers className='w-5 h-5 text-primary' />,
    },
    {
      icon: <Zap className='w-5 h-5 text-yellow-400' />,
      title: 'Instant Playback',
      description:
        'No buffering, no waiting. Just hit play and let the music flow instantly.',
    },
    {
      icon: <Shield className='w-5 h-5 text-blue-400' />,
      title: 'Privacy First',
      description:
        'Your data is secure and your listening habits are yours alone. We value your privacy.',
    },
    {
      icon: <Heart className='w-5 h-5 text-red-400' />,
      title: 'Curated for You',
      description:
        'Discover new favorites with personalized recommendations based on your unique taste.',
    },
  ];

  return (
    <div className='flex flex-col w-full bg-background'>
      {/* Hero Section */}
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
              Experience sound like never before. Melofy brings millions of
              songs, podcasts, and curated playlists to your ears, everywhere
              you go.
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
                      <Play className='fill-black w-8 h-8 translate-x-1' />
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

      {/* Features Grid */}
      <section className='py-32 px-6 border-y border-border relative bg-card/30'>
        <div className='max-w-7xl mx-auto w-full'>
          <div className='text-center mb-20 flex flex-col gap-4'>
            <h2 className='text-4xl md:text-5xl font-bold text-foreground tracking-tight py-4'>
              Everything you need to{' '}
              <span className='text-primary italic'>feel</span> the music.
            </h2>
            <p className='text-muted-foreground max-w-2xl mx-auto text-lg font-light'>
              Melofy is built by audiophiles, for audiophiles. We've packed
              every feature you've ever wanted into a stunning, minimal
              interface.
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -10 }}
                className='p-8 rounded-[2rem] bg-card border border-border hover:bg-card/80 hover:border-primary/50 transition-all duration-300 flex flex-col gap-6 group shadow-lg'
              >
                <div className='w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300'>
                  {feature.icon}
                </div>
                <div className='flex flex-col gap-2'>
                  <h3 className='text-xl font-bold text-foreground tracking-tight'>
                    {feature.title}
                  </h3>
                  <p className='text-muted-foreground leading-relaxed text-sm font-light'>
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Section 1: Visual Experience */}
      <section className='py-32 px-6 overflow-hidden'>
        <div className='max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-20'>
          <div className='flex-1 relative order-2 lg:order-1'>
            <div className='relative z-10 rounded-3xl border border-border overflow-hidden shadow-2xl shadow-primary/5 aspect-video bg-card group items-center'>
              <img
                src='https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=1000&auto=format&fit=crop'
                className='w-full h-full object-cover opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-80 transition-all duration-1000'
                alt='vibe'
              />
              <div className='absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent flex items-end p-8'>
                <div className='flex flex-col gap-2'>
                  <p className='text-primary font-bold text-sm tracking-widest uppercase'>
                    Visual Sound
                  </p>
                  <h3 className='text-3xl font-bold text-foreground'>
                    Stunning Track Arts
                  </h3>
                </div>
              </div>
            </div>
          </div>

          <div className='flex-1 flex flex-col gap-8 order-1 lg:order-2'>
            <h2 className='text-5xl font-bold text-foreground leading-tight tracking-tighter'>
              A visual feast for <br />
              your auditory senses.
            </h2>
            <p className='text-xl text-muted-foreground leading-relaxed'>
              We believe music is more than just sound. Every track profile on
              Melofy is uniquely generated based on the album art, creating a
              fully immersive environment while you listen.
            </p>
            <div className='grid grid-cols-2 gap-8 pt-4'>
              {details.slice(0, 2).map((item, id) => (
                <div key={id} className='flex flex-col gap-3'>
                  <div className='flex items-center gap-2'>
                    {item.icon}
                    <span className='font-bold text-foreground tracking-tight'>
                      {item.title}
                    </span>
                  </div>
                  <p className='text-sm text-muted-foreground leading-relaxed font-light'>
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Content Section 2: Smart Discovery */}
      <section className='py-32 px-6 bg-card/20'>
        <div className='max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-20'>
          <div className='flex-1 flex flex-col gap-8'>
            <h2 className='text-5xl font-bold text-foreground leading-tight tracking-tighter'>
              Never stop discovering. <br />
              AI-powered queues.
            </h2>
            <p className='text-xl text-muted-foreground leading-relaxed'>
              Our advanced Autoplay algorithm learns your taste in real-time.
              When your queue ends, Melofy keeps the vibe going with tracks that
              perfectly match the mood.
            </p>
            <div className='grid grid-cols-2 gap-8 pt-4'>
              {details.slice(2, 4).map((item, id) => (
                <div key={id} className='flex flex-col gap-3'>
                  <div className='flex items-center gap-2'>
                    {item.icon}
                    <span className='font-bold text-foreground tracking-tight'>
                      {item.title}
                    </span>
                  </div>
                  <p className='text-sm text-muted-foreground leading-relaxed font-light'>
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className='flex-1 relative'>
            <div className='relative z-10 rounded-3xl border border-border overflow-hidden shadow-2xl shadow-blue-500/5 aspect-video bg-card group h-fit'>
              <img
                src='https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000&auto=format&fit=crop'
                className='w-full h-full object-cover opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-80 transition-all duration-1000'
                alt='dj'
              />
              <div className='absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent flex items-end p-8'>
                <div className='flex flex-col gap-2'>
                  <p className='text-blue-500 font-bold text-sm tracking-widest uppercase'>
                    Smart Flow
                  </p>
                  <h3 className='text-3xl font-bold text-foreground'>
                    Dynamic Recommendations
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='py-40 px-6 relative overflow-hidden'>
        <div className='absolute inset-0 bg-primary/10 blur-[120px] rounded-full -z-10 animate-pulse' />
        <div className='max-w-4xl mx-auto text-center flex flex-col gap-10'>
          <h2 className='text-6xl md:text-8xl font-black text-foreground tracking-tighter leading-none'>
            Ready to start <br />
            Your Journey?
          </h2>
          <p className='text-xl text-muted-foreground font-medium'>
            Join thousands of listeners who have already found their rhythm.
          </p>
          <div className='flex flex-col sm:flex-row items-center gap-6 justify-center'>
            <Link href='/login'>
              <Button
                size='lg'
                className='h-16 px-12 rounded-full bg-foreground text-background font-black text-xl hover:scale-105 transition-transform hover:bg-foreground/90'
              >
                Create Free Account
              </Button>
            </Link>
            <Button
              variant='ghost'
              className='text-foreground font-bold hover:bg-muted h-16 px-10 rounded-full text-lg'
            >
              Contact Support
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='py-20 px-6 border-t border-border bg-background'>
        <div className='max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-4 gap-12'>
          <div className='flex flex-col gap-6 col-span-1 md:col-span-1'>
            <div className='flex items-center gap-2'>
              <div className='w-8 h-8 flex items-center justify-center overflow-hidden'>
                <img
                  src='/logo.png'
                  alt='Melofy'
                  className='w-full h-full object-contain'
                />
              </div>
              <span className='text-2xl font-black text-foreground tracking-tighter'>
                Melofy.
              </span>
            </div>
            <p className='text-sm text-muted-foreground leading-relaxed font-light'>
              The ultimate destination for music lovers. Designed with passion
              for the perfect listening experience.
            </p>
            <div className='flex items-center gap-4 text-muted-foreground/40'>
              <Github className='w-5 h-5 hover:text-foreground cursor-pointer transition-colors' />
              <Twitter className='w-5 h-5 hover:text-foreground cursor-pointer transition-colors' />
              <Instagram className='w-5 h-5 hover:text-foreground cursor-pointer transition-colors' />
            </div>
          </div>

          <div className='flex flex-col gap-6'>
            <h4 className='text-foreground font-bold tracking-tight uppercase text-xs'>
              Platform
            </h4>
            <div className='flex flex-col gap-3 text-sm text-muted-foreground/60'>
              <span className='hover:text-primary cursor-pointer transition-colors'>
                Download App
              </span>
              <span className='hover:text-primary cursor-pointer transition-colors'>
                Web Player
              </span>
              <span className='hover:text-primary cursor-pointer transition-colors'>
                Premium Plans
              </span>
              <span className='hover:text-primary cursor-pointer transition-colors'>
                Partnerships
              </span>
            </div>
          </div>

          <div className='flex flex-col gap-6'>
            <h4 className='text-foreground font-bold tracking-tight uppercase text-xs'>
              Resources
            </h4>
            <div className='flex flex-col gap-3 text-sm text-muted-foreground/60'>
              <span className='hover:text-primary cursor-pointer transition-colors'>
                Help Center
              </span>
              <span className='hover:text-primary cursor-pointer transition-colors'>
                Community
              </span>
              <span className='hover:text-primary cursor-pointer transition-colors'>
                Developers
              </span>
              <span className='hover:text-primary cursor-pointer transition-colors'>
                API Docs
              </span>
            </div>
          </div>

          <div className='flex flex-col gap-6'>
            <h4 className='text-foreground font-bold tracking-tight uppercase text-xs'>
              Legal
            </h4>
            <div className='flex flex-col gap-3 text-sm text-muted-foreground/60'>
              <span className='hover:text-primary cursor-pointer transition-colors'>
                Privacy Policy
              </span>
              <span className='hover:text-primary cursor-pointer transition-colors'>
                Terms of Service
              </span>
              <span className='hover:text-primary cursor-pointer transition-colors'>
                Cookie Settings
              </span>
              <span className='hover:text-primary cursor-pointer transition-colors'>
                Trust Center
              </span>
            </div>
          </div>
        </div>
        <div className='max-w-7xl mx-auto w-full pt-20 flex flex-col md:flex-row justify-between items-center gap-6'>
          <p className='text-xs text-muted-foreground/40 font-medium'>
            © 2026 Melofy Inc. Built with passion for music.
          </p>
          <div className='flex items-center gap-6'>
            <span className='text-xs text-muted-foreground/40 hover:text-muted-foreground cursor-pointer transition-colors'>
              English (US)
            </span>
            <div className='flex items-center gap-1'>
              <Globe className='w-3 h-3 text-muted-foreground/40' />
              <span className='text-xs text-muted-foreground/40'>
                All Systems Operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
