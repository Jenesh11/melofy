import { Github, Twitter, Instagram, Globe } from 'lucide-react';

export function LandingFooter() {
  return (
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
            The ultimate destination for music lovers. Designed with passion for
            the perfect listening experience.
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
  );
}
