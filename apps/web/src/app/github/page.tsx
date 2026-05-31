import type { Metadata } from 'next';
import { LandingPageHeader } from '@/components/landing/LandingPageHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { Github, Star, GitFork, Bug, Lightbulb, Code2 } from 'lucide-react';
import { GithubGuidelines } from '@/components/landing/GithubGuidelines';

export const metadata: Metadata = {
  title: 'GitHub | Melofy',
  description: 'Melofy is open source. Explore the code, contribute, and help shape the future of music streaming.',
};

const GITHUB_URL = 'https://github.com/lazyshrey/melofy';

const contributions = [
  {
    icon: <Bug className='w-5 h-5 text-red-400' />,
    title: 'Report a Bug',
    description: 'Found something broken? Open an issue and help us squash it.',
    href: `${GITHUB_URL}/issues/new`,
    label: 'Open Issue',
  },
  {
    icon: <Lightbulb className='w-5 h-5 text-amber-400' />,
    title: 'Request a Feature',
    description: 'Have an idea that would make Melofy even better? We want to hear it.',
    href: `${GITHUB_URL}/issues/new`,
    label: 'Suggest Feature',
  },
  {
    icon: <Code2 className='w-5 h-5 text-green-400' />,
    title: 'Contribute Code',
    description: 'Fork the repository, make your changes, and submit a pull request.',
    href: `${GITHUB_URL}/fork`,
    label: 'Fork & Contribute',
  },
];

export default function GithubPage() {
  return (
    <>
      <LandingPageHeader />
      <div className='min-h-screen bg-[radial-gradient(circle_at_30%_0%,rgba(168,85,247,0.10),transparent_40%),var(--background)] text-foreground'>
        <main className='max-w-4xl mx-auto px-6 py-16 md:py-24 flex flex-col items-center text-center'>
        {/* Hero */}
        <div className='mb-12 space-y-4'>
          <div className='w-16 h-16 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center mx-auto mb-6'>
            <Github className='w-8 h-8 text-foreground' />
          </div>
          <p className='text-xs font-bold uppercase tracking-widest text-primary'>Open Source</p>
          <h1 className='text-4xl md:text-6xl font-black tracking-tighter text-foreground'>
            Built in the Open
          </h1>
          <p className='text-muted-foreground text-lg font-light max-w-2xl mx-auto'>
            Melofy is open source and community-driven. Every line of code is available on GitHub.
            Explore, learn, contribute, and help shape the future of music.
          </p>
        </div>

        {/* Stats row */}
        <div className='flex items-center gap-6 mb-12'>
          <a
            href={GITHUB_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors text-sm text-muted-foreground hover:text-foreground'
          >
            <Star className='w-4 h-4 text-amber-400' />
            Star us on GitHub
          </a>
          <a
            href={`${GITHUB_URL}/fork`}
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors text-sm text-muted-foreground hover:text-foreground'
          >
            <GitFork className='w-4 h-4 text-blue-400' />
            Fork Repository
          </a>
        </div>

        {/* View on GitHub CTA */}
        <a
          href={GITHUB_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='mb-16 flex items-center gap-3 px-8 py-4 rounded-full bg-foreground text-background font-bold text-base hover:scale-105 transition-transform shadow-xl'
        >
          <Github className='w-5 h-5' />
          View on GitHub — lazyshrey/melofy
        </a>

        {/* Visual Showcase Section */}
        <div className='w-full mb-16 p-8 rounded-3xl border border-border/50 bg-card/20 backdrop-blur-sm text-left relative overflow-hidden'>
          <div className='absolute -right-20 -bottom-20 w-48 h-48 bg-primary/10 blur-[80px] rounded-full pointer-events-none' />
          <div className='flex flex-col gap-6 relative z-10'>
            <div className='space-y-2'>
              <p className='text-xs font-bold uppercase tracking-widest text-primary'>Visual Showcase</p>
              <h3 className='text-2xl font-bold text-foreground tracking-tight'>
                Interactive Screenshots & Demos
              </h3>
              <p className='text-muted-foreground text-sm font-light leading-relaxed max-w-2xl'>
                Melofy features a pixel-perfect, premium glassmorphic user interface. Access the official showcase or click a direct link below to view individual feature screenshots in full resolution on our repository.
              </p>
            </div>

            {/* Quick Links Grid */}
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 my-2'>
              {[
                { label: '🏠 Desktop Dashboard', url: `${GITHUB_URL}/blob/main/.github/screenshots/home.png` },
                { label: '💿 Now Playing View', url: `${GITHUB_URL}/blob/main/.github/screenshots/nowplaying.png` },
                { label: '🎬 Immersive Fullscreen', url: `${GITHUB_URL}/blob/main/.github/screenshots/fullscreen.png` },
                { label: '🎤 Synchronized Lyrics', url: `${GITHUB_URL}/blob/main/.github/screenshots/lyrics_overlay.png` },
                { label: '📱 Mobile Interface', url: `${GITHUB_URL}/blob/main/.github/screenshots/phone_home.png` },
                { label: '👾 Discord Rich Presence', url: `${GITHUB_URL}/blob/main/.github/screenshots/discord_presence.png` },
                { label: '⚡ Instant Search Popover', url: `${GITHUB_URL}/blob/main/.github/screenshots/popover_search.png` },
                { label: '⚙️ Settings & Customization', url: `${GITHUB_URL}/blob/main/.github/screenshots/setting.png` },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='px-4 py-3.5 rounded-xl bg-muted/20 border border-border/40 hover:bg-muted/40 hover:border-border/80 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center justify-between group shadow-sm'
                >
                  <span>{link.label}</span>
                  <span className='opacity-0 group-hover:opacity-100 transition-opacity text-primary ml-1'>↗</span>
                </a>
              ))}
            </div>

            <div className='flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/20 pt-6 mt-2'>
              <p className='text-xs text-muted-foreground/80 font-light'>
                Want the full gallery? Experience the full feature walkthrough with interactive GIFs on GitHub.
              </p>
              <a
                href={`${GITHUB_URL}/blob/main/SCREENSHOTS.md`}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-xs hover:scale-105 transition-transform shadow-md w-full sm:w-auto justify-center'
              >
                <span>View Full Showcase (SCREENSHOTS.md)</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </div>

        {/* Contribution cards */}
        <div className='w-full mb-16'>
          <h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground mb-8'>How to Contribute</h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {contributions.map((c) => (
              <a
                key={c.title}
                href={c.href}
                target='_blank'
                rel='noopener noreferrer'
                className='group p-6 rounded-2xl border border-border/50 bg-card/20 hover:bg-card/50 transition-all hover:border-border backdrop-blur-sm text-left space-y-3'
              >
                <div className='w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center'>
                  {c.icon}
                </div>
                <h3 className='font-bold text-foreground text-sm'>{c.title}</h3>
                <p className='text-muted-foreground/80 text-xs leading-relaxed'>{c.description}</p>
                <span className='text-xs font-semibold text-primary group-hover:underline'>{c.label} →</span>
              </a>
            ))}
          </div>
        </div>

        {/* Contribution Guidelines Portal */}
        <GithubGuidelines />

        <div className="mb-16" />

        {/* Tech Stack */}
        <div className='w-full p-8 rounded-3xl border border-border/50 bg-card/20 backdrop-blur-sm text-left'>
          <h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6'>Tech Stack</h2>
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
            {['Next.js 15', 'TypeScript', 'Firebase', 'Lavalink', 'Zustand', 'Framer Motion', 'Socket.io', 'Turborepo', 'Docker'].map((tech) => (
              <div key={tech} className='px-4 py-2.5 rounded-xl bg-muted/20 border border-border/40 text-sm text-muted-foreground/80 text-center font-medium'>
                {tech}
              </div>
            ))}
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
    </>
  );
}
