'use client';
/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';
import { Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArtworkProps {
  src?: string | null;
  alt?: string;
  /** Pixel width requested from the image proxy fallback. */
  size?: number;
  className?: string;
  imgClassName?: string;
  iconClassName?: string;
  eager?: boolean;
}

/**
 * Cover art that never shows a broken-image icon. Remote CDNs (notably
 * googleusercontent) sometimes answer bursts of cross-origin requests with a
 * non-image body that Chrome's opaque-response blocking drops, so a failed
 * direct load retries once through the same-origin image proxy before
 * falling back to a placeholder.
 */
export function Artwork({ src, alt = '', size = 256, className, imgClassName, iconClassName, eager }: ArtworkProps) {
  const [attempt, setAttempt] = useState<{ src: string | null | undefined; stage: 0 | 1 | 2 }>({ src, stage: 0 });
  // Reset when the source changes without an effect round-trip.
  const stage = attempt.src === src ? attempt.stage : 0;
  if (attempt.src !== src) setAttempt({ src, stage: 0 });

  const isRemote = !!src && /^https?:\/\//.test(src);
  const url = !src || stage === 2
    ? null
    : stage === 1
      ? `/_next/image?url=${encodeURIComponent(src)}&w=${size <= 128 ? 128 : size <= 384 ? 384 : 640}&q=75`
      : src;

  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {url ? (
        <img
          key={url}
          src={url}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding='async'
          referrerPolicy='no-referrer'
          onError={() => setAttempt({ src, stage: stage === 0 && isRemote ? 1 : 2 })}
          className={cn('h-full w-full object-cover', imgClassName)}
        />
      ) : (
        <div className='flex h-full w-full items-center justify-center bg-linear-to-br from-foreground/[0.08] to-foreground/[0.02]'>
          <Music2 className={cn('h-1/3 w-1/3 max-h-10 max-w-10 text-muted-foreground/60', iconClassName)} />
        </div>
      )}
    </div>
  );
}
