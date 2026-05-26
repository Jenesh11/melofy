import type { Metadata } from 'next';
import { LandingPageHeader } from '@/components/landing/LandingPageHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { Music2, Headphones, Wifi, ListMusic, Github, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Help Center | Melofy',
  description: 'Get help with Melofy — FAQs, feature guides, and support resources.',
};

const faqs = [
  {
    q: 'How do I import my Spotify playlists?',
    a: 'After logging in, navigate to your Library. Click the "+" button and select "Import from Spotify". You will be prompted to authenticate with Spotify. Once connected, your playlists will be imported automatically.',
  },
  {
    q: 'Why is a track not playing?',
    a: 'Some tracks may be unavailable due to regional licensing restrictions or temporary server issues. Try searching for the track manually or refreshing the page. If the issue persists, check our GitHub for known issues.',
  },
  {
    q: 'How does the Listen Along feature work?',
    a: '"Listen Along" lets you share a listening session with friends in real-time. Start a session from the player controls, share the link with a friend, and they can join to hear the same music simultaneously.',
  },
  {
    q: 'Can I use Melofy offline?',
    a: 'Currently, Melofy requires an active internet connection to stream music. Offline playback is a feature we are exploring for future updates.',
  },
  {
    q: 'How do I enable Discord Rich Presence?',
    a: 'Install the PreMiD browser extension and the Melofy presence from the PreMiD marketplace. Once set up, your currently playing track will automatically show on your Discord status.',
  },
  {
    q: 'How do I delete a playlist?',
    a: 'Right-click (or long-press on mobile) on a playlist in your Library to reveal the context menu, then select "Delete Playlist". Note that the "Liked Songs" playlist cannot be deleted.',
  },
];

const features = [
  {
    icon: <Music2 className='w-6 h-6 text-primary' />,
    title: 'Music Discovery',
    description: 'Explore trending tracks, new releases, curated mixes, and personalized recommendations on your home dashboard.',
  },
  {
    icon: <ListMusic className='w-6 h-6 text-blue-400' />,
    title: 'Playlist Management',
    description: 'Create, edit, and organize playlists. Import directly from Spotify and manage your entire music library.',
  },
  {
    icon: <Headphones className='w-6 h-6 text-purple-400' />,
    title: 'High-Fidelity Playback',
    description: 'Enjoy lossless audio quality with a feature-rich player including shuffle, repeat, and real-time synced lyrics.',
  },
  {
    icon: <Wifi className='w-6 h-6 text-amber-400' />,
    title: 'Listen Along',
    description: 'Share a real-time listening session with friends. Everyone hears the same music, perfectly in sync.',
  },
  {
    icon: <Github className='w-6 h-6 text-muted-foreground' />,
    title: 'Open Source',
    description: 'Melofy is built in the open. Contribute, report bugs, or request features on our GitHub repository.',
  },
  {
    icon: <Shield className='w-6 h-6 text-green-400' />,
    title: 'Privacy First',
    description: 'Your data is yours. We use secure, industry-standard practices to keep your account and listening history safe.',
  },
];

export default function HelpPage() {
  return (
    <>
      <LandingPageHeader />
      <div className='min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.12),transparent_50%),var(--background)] text-foreground'>
        <main className='max-w-5xl mx-auto px-6 py-16 md:py-24'>
        {/* Hero */}
        <div className='mb-16 text-center'>
          <p className='text-xs font-bold uppercase tracking-widest text-primary mb-3'>Help Center</p>
          <h1 className='text-4xl md:text-6xl font-black tracking-tighter text-foreground mb-4'>How can we help?</h1>
          <p className='text-muted-foreground text-lg font-light max-w-xl mx-auto'>
            Find answers to common questions and learn how to get the most out of Melofy.
          </p>
        </div>

        {/* Features Grid */}
        <div className='mb-20'>
          <h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground mb-8'>Features Overview</h2>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {features.map((f) => (
              <div
                key={f.title}
                className='p-5 rounded-2xl border border-border/50 bg-card/30 hover:bg-card/60 transition-colors backdrop-blur-sm space-y-3'
              >
                <div className='w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center'>{f.icon}</div>
                <h3 className='font-bold text-foreground text-sm'>{f.title}</h3>
                <p className='text-muted-foreground/80 text-xs leading-relaxed'>{f.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className='mb-20'>
          <h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground mb-8'>Frequently Asked Questions</h2>
          <div className='space-y-4'>
            {faqs.map((faq, i) => (
              <div
                key={i}
                className='p-6 rounded-2xl border border-border/50 bg-card/20 hover:bg-card/40 transition-colors backdrop-blur-sm'
              >
                <h3 className='font-bold text-foreground text-sm mb-2'>{faq.q}</h3>
                <p className='text-muted-foreground/80 text-xs leading-relaxed'>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Still need help? */}
        <div className='text-center p-10 rounded-3xl border border-border/50 bg-card/20 backdrop-blur-sm'>
          <h2 className='text-2xl font-black tracking-tight text-foreground mb-3'>Still need help?</h2>
          <p className='text-muted-foreground/80 text-sm mb-6 max-w-md mx-auto'>
            Can&apos;t find what you&apos;re looking for? Reach out to us on Discord or open an issue on GitHub.
          </p>
          <div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
            <a
              href='https://discord.gg/ZVCB8EnRX2'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#5865F2] text-white font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-[#5865F2]/20 w-full sm:w-auto justify-center'
            >
              <svg
                viewBox='0 0 24 24'
                fill='currentColor'
                className='w-4 h-4'
              >
                <path d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.196.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z' />
              </svg>
              Join Discord Server
            </a>
            <a
              href='https://github.com/ShreyJaiswal1/melofy'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-primary/20 w-full sm:w-auto justify-center'
            >
              <Github className='w-4 h-4' />
              Open an Issue on GitHub
            </a>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
    </>
  );
}
