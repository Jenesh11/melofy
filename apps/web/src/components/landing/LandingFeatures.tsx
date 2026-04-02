import { motion } from 'framer-motion';
import {
  Music2,
  Users,
  Smartphone,
  CloudLightning,
  Layers,
  Zap,
  Shield,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

export function LandingFeatures() {
  const features = [
    {
      icon: <Music2 className='w-6 h-6' />,
      title: 'Millions of Tracks',
      description:
        'Access a vast library of music from every genre and era, all at your fingertips.',
    },
    {
      icon: <Users className='w-6 h-6' />,
      title: 'Listen Along',
      description:
        'Share your listening session with friends in real-time and experience music together.',
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
    <>
      {/* Features Grid */}
      <section className='py-32 px-6 border-y border-border relative bg-card/30'>
        <div className='max-w-7xl mx-auto w-full'>
          <div className='text-center mb-20 flex flex-col gap-4'>
            <h2 className='text-4xl md:text-5xl font-bold text-foreground tracking-tight py-4'>
              Everything you need to{' '}
              <span className='text-primary italic pr-2'>feel</span> the music.
            </h2>
            <p className='text-muted-foreground max-w-2xl mx-auto text-lg font-light'>
              Melofy is built by audiophiles, for audiophiles. We&apos;ve packed
              every feature you&apos;ve ever wanted into a stunning, minimal
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
              <Image
                src='https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=1000&auto=format&fit=crop'
                width={800}
                height={450}
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
              <Image
                src='https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000&auto=format&fit=crop'
                width={800}
                height={450}
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
    </>
  );
}
