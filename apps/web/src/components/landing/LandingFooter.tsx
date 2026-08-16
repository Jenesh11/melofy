'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Github, Globe } from 'lucide-react';
import { DonateButton } from '@/components/common/DonateButton';

export function LandingFooter() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'degraded' | 'error'>('loading');
  const [winDownloadUrl, setWinDownloadUrl] = useState('https://github.com/Jenesh11/melofy/releases/latest/download/Melofy_x64-setup.exe');

  useEffect(() => {
    const fetchLatestRelease = async () => {
      try {
        const res = await fetch('https://api.github.com/repos/Jenesh11/melofy/releases/latest');
        if (res.ok) {
          const data = await res.json() as { assets?: { name: string; browser_download_url: string }[] };
          const exeAsset = data.assets?.find((a) => a.name.endsWith('.exe'));
          if (exeAsset) {
            setWinDownloadUrl(exeAsset.browser_download_url);
          }
        }
      } catch (err) {
        console.error('Failed to fetch latest release:', err);
      }
    };
    void fetchLatestRelease();
  }, []);

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
              href={winDownloadUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='hover:text-primary transition-colors font-semibold flex items-center gap-1.5'
            >
              <span>Windows App (.exe)</span>
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Recommended
              </span>
            </a>
            <a
              href='https://github.com/Jenesh11/melofy/releases/latest/download/Melofy_x64.msi'
              target='_blank'
              rel='noopener noreferrer'
              className='hover:text-primary transition-colors text-xs opacity-75'
            >
              Windows Installer (.msi)
            </a>
            <a
              href='https://github.com/Jenesh11/melofy/releases/latest/download/Melofy.apk'
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
          <span className='text-xs text-muted-foreground/40 hover:text-muted-foreground cursor-pointer transition-colors'>
            English (US)
          </span>
          <div className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground/3 border border-border/50 ${color} transition-colors duration-500 hover:bg-foreground/6 cursor-default`}>
              <Globe className='w-3 h-3 text-current' />
              <span className='text-[10px] font-bold uppercase tracking-wider'>
                {text}
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
