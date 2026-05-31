'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Github, Globe } from 'lucide-react';
import { DonateButton } from '@/components/common/DonateButton';

export function LandingFooter() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'degraded' | 'error'>('loading');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (!res.ok) throw new Error('Health check failed');
        const data = await res.json();
        setStatus(data.status === 'ok' ? 'ok' : 'degraded');
      } catch {
        setStatus('error');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const getStatusConfig = () => {
    switch (status) {
      case 'ok':
        return { text: 'All Systems Operational', color: 'text-emerald-500' };
      case 'degraded':
        return { text: 'Systems Degraded', color: 'text-amber-500' };
      case 'error':
        return { text: 'Systems Offline', color: 'text-red-500' };
      default:
        return { text: 'Checking Systems...', color: 'text-muted-foreground/40' };
    }
  };

  const { text, color } = getStatusConfig();

  return (
    <footer className='py-20 px-6 border-t border-border bg-background'>
      <div className='max-w-7xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-12'>
        {/* Brand */}
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
        </div>

        {/* Links */}
        <div className='flex flex-col gap-6'>
          <h4 className='text-foreground font-bold tracking-tight uppercase text-xs'>
            Links
          </h4>
          <div className='flex flex-col gap-5'>
            <div className='flex items-center gap-4 text-muted-foreground/40'>
              <Link href='/github'>
                <Github className='w-5 h-5 hover:text-foreground cursor-pointer transition-colors' />
              </Link>
              <a
                href='https://lazyshrey.in'
                target='_blank'
                rel='noopener noreferrer'
                className='hover:text-foreground cursor-pointer transition-colors'
                title='Personal Website'
              >
                <Globe className='w-5 h-5' />
              </a>
              <a
                href='https://discord.gg/ZVCB8EnRX2'
                target='_blank'
                rel='noopener noreferrer'
                className='hover:text-foreground cursor-pointer transition-colors'
                title='Discord'
              >
                <svg viewBox='0 0 24 24' fill='currentColor' className='w-5 h-5'>
                  <path d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.196.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z' />
                </svg>
              </a>
            </div>
            <DonateButton
              variant='default'
              className='w-fit transform hover:-rotate-1 transition-transform'
            />
          </div>
        </div>

        {/* Downloads */}
        <div className='flex flex-col gap-6'>
          <h4 className='text-foreground font-bold tracking-tight uppercase text-xs'>
            Downloads
          </h4>
          <div className='flex flex-col gap-3 text-sm text-muted-foreground/60'>
            <a
              href='https://github.com/lazyshrey/melofy/releases/latest/download/Melofy_x64.msi'
              target='_blank'
              rel='noopener noreferrer'
              className='hover:text-primary transition-colors'
            >
              Windows App (.msi)
            </a>
            <a
              href='https://github.com/lazyshrey/melofy/releases/latest/download/Melofy.apk'
              target='_blank'
              rel='noopener noreferrer'
              className='hover:text-primary transition-colors'
            >
              Android App (.apk)
            </a>
          </div>
        </div>

        {/* Company */}
        <div className='flex flex-col gap-6'>
          <h4 className='text-foreground font-bold tracking-tight uppercase text-xs'>
            Company
          </h4>
          <div className='flex flex-col gap-3 text-sm text-muted-foreground/60'>
            <Link href='/github' className='hover:text-primary transition-colors'>
              GitHub
            </Link>
            <Link href='/help' className='hover:text-primary transition-colors'>
              Help Center
            </Link>
          </div>
        </div>

        {/* Legal */}
        <div className='flex flex-col gap-6'>
          <h4 className='text-foreground font-bold tracking-tight uppercase text-xs'>
            Legal
          </h4>
          <div className='flex flex-col gap-3 text-sm text-muted-foreground/60'>
            <Link href='/privacy' className='hover:text-primary transition-colors'>
              Privacy Policy
            </Link>
            <Link href='/terms' className='hover:text-primary transition-colors'>
              Terms of Service
            </Link>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto w-full pt-20 flex flex-col md:flex-row justify-between items-center gap-6'>
        <p className='text-xs text-muted-foreground/40 font-medium'>
          © 2026 Melofy Inc. Built with passion for music.
        </p>
        <div className='flex items-center gap-6'>
          <a
            href="https://status.melofy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground/40 hover:text-primary cursor-pointer transition-colors font-medium border-r border-border/50 pr-6"
          >
            System Status
          </a>
          <a
            href='https://discord.gg/ZVCB8EnRX2'
            target='_blank'
            rel='noopener noreferrer'
            className='text-xs text-muted-foreground/40 hover:text-primary cursor-pointer transition-colors font-medium border-r border-border/50 pr-6'
          >
            Discord Support
          </a>
          <span className='text-xs text-muted-foreground/40 hover:text-muted-foreground cursor-pointer transition-colors'>
            English (US)
          </span>
          <a
            href="https://status.lazyshrey.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5"
          >
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground/3 border border-border/50 ${color} transition-colors duration-500 hover:bg-foreground/6 cursor-pointer`}>
              <Globe className='w-3 h-3 text-current' />
              <span className='text-[10px] font-bold uppercase tracking-wider'>
                {text}
              </span>
            </div>
          </a>
        </div>
      </div>
    </footer>
  );
}
