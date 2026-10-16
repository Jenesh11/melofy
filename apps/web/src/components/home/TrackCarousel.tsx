'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { Track, usePlayerStore } from '@/store/usePlayerStore';
import { resolvePlayableTrack, TrackItem } from '@/components/ui/TrackList';
import { TrackOptionsMenu } from '@/components/ui/TrackOptionsMenu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ListPlus } from 'lucide-react';
import {
  mapSpotifyTrackToTrackItem,
  mapTrackItemToPlayerTrack,
  type SpotifyTrackLike,
} from '@/lib/track-mappers';
import { cn } from '@/lib/utils';
import { Artwork } from '@/components/ui/Artwork';
import { Shelf, SHELF_CARD_WIDTH } from '@/components/home/Shelf';

interface TrackCarouselProps {
  title: string;
  subtitle?: string;
  href?: string;
  tracks: (SpotifyTrackLike | Track)[];
  onPlayAll?: () => void;
  className?: string;
}

export function TrackCarousel({
  title,
  subtitle,
  href,
  tracks,
  onPlayAll,
  className,
}: TrackCarouselProps) {
  const play = usePlayerStore((state) => state.play);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const pause = usePlayerStore((state) => state.pause);
  const resume = usePlayerStore((state) => state.resume);

  const trackItems: TrackItem[] = useMemo(
    () =>
      (tracks || []).map((track) => {
        if ('artworkUrl' in track && 'title' in track) {
          return {
            id: track.id,
            identifier: track.identifier,
            title: track.title,
            artist: track.artist,
            artworkUrl: track.artworkUrl,
            duration: track.duration,
            album: track.title,
            encoded: track.url,
            source: track.source,
            uri: track.uri,
            recordingMbid: track.recordingMbid,
          };
        }
        return mapSpotifyTrackToTrackItem(track as SpotifyTrackLike);
      }),
    [tracks],
  );

  const contextTracks = useMemo(
    () => trackItems.map((track) => mapTrackItemToPlayerTrack(track)),
    [trackItems],
  );

  const handlePlay = useCallback(
    async (index: number) => {
      const item = trackItems.at(index);
      if (!item) return;

      if (currentTrack?.title === item.title) {
        if (isPlaying) {
          pause();
        } else {
          resume();
        }
        return;
      }

      const resolved = await resolvePlayableTrack(item);
      if (!resolved) {
        toast.error('Could not find a playable version of this track');
        return;
      }

      play(resolved);
    },
    [currentTrack?.title, isPlaying, pause, play, resume, trackItems],
  );

  const addToQueue = usePlayerStore((state) => state.addToQueue);

  const handleAddToQueue = useCallback(
    async (index: number) => {
      const item = trackItems.at(index);
      if (!item) return;

      let trackToAdd = contextTracks.at(index);
      if (!trackToAdd) return;
      if (!trackToAdd.url) {
        const resolved = await resolvePlayableTrack(item);
        if (!resolved) {
          toast.error('Could not find a playable version of this track');
          return;
        }
        trackToAdd = resolved;
      }
      addToQueue(trackToAdd);
      
      toast('Added to Queue', {
        className: 'bg-primary text-primary-foreground border-none shadow-2xl',
        description: (
          <div className="flex items-center gap-2 mt-1">
            {trackToAdd.artworkUrl && (
              <img src={trackToAdd.artworkUrl} alt="" className="h-8 w-8 rounded-md object-cover shadow-md brightness-90" />
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs truncate opacity-90">{trackToAdd.title}</span>
            </div>
          </div>
        ),
        icon: <ListPlus className="h-4 w-4" />,
        duration: 2500,
      });
    },
    [contextTracks, trackItems, addToQueue]
  );

  if (!tracks || tracks.length === 0) return null;

  return (
    <Shelf
      title={title}
      subtitle={subtitle}
      href={href}
      className={className}
      actions={onPlayAll && (
        <Button variant='ghost' size='sm' onClick={onPlayAll}
          className='h-8 rounded-full px-3 text-xs font-bold text-muted-foreground hover:text-foreground'>
          <Play className='h-3.5 w-3.5 fill-current' />
          Play all
        </Button>
      )}
    >
      {tracks.map((track, index) => {
        const trackItem = trackItems.at(index);
        const titleText = trackItem?.title || 'Unknown Title';
        const artistText = trackItem?.artist || 'Unknown Artist';
        const artworkUrl = trackItem?.artworkUrl || '';
        const isCurrent = currentTrack?.title === titleText;
        const isActive = isCurrent && isPlaying;

        return (
          <motion.div
            key={(trackItem?.id || 'track') + index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index, 8) * 0.03, duration: 0.3, ease: 'easeOut' }}
            className={cn('group relative shrink-0 snap-start cursor-pointer rounded-xl p-2 md:p-2.5 transition-colors hover:bg-foreground/[0.05]', SHELF_CARD_WIDTH)}
            onClick={() => void handlePlay(index)}
          >
            <div className='relative aspect-square overflow-hidden rounded-lg bg-muted shadow-[0_8px_24px_-8px_rgb(0_0_0/0.5)]'>
              <Artwork src={artworkUrl} className='h-full w-full' imgClassName='transition-transform duration-500 group-hover:scale-[1.03]' />
              <button
                type='button'
                aria-label={isActive ? `Pause ${titleText}` : `Play ${titleText}`}
                onClick={(event) => { event.stopPropagation(); void handlePlay(index); }}
                className={cn(
                  'absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_rgb(0_0_0/0.45)] transition-all duration-300 hover:scale-105 active:scale-95',
                  isActive ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100',
                )}
              >
                {isActive ? (
                  <span className='flex h-4 items-end gap-[3px]'>
                    <span className='eq-bar h-full' />
                    <span className='eq-bar h-full' style={{ animationDelay: '-0.3s' }} />
                    <span className='eq-bar h-full' style={{ animationDelay: '-0.6s' }} />
                  </span>
                ) : (
                  <Play className='h-5 w-5 translate-x-px fill-current' />
                )}
              </button>
            </div>
            <div className='mt-2.5 flex items-start gap-1'>
              <div className='min-w-0 flex-1'>
                <p className={cn('truncate text-sm font-semibold', isCurrent ? 'text-primary' : 'text-foreground')}>{titleText}</p>
                <p className='mt-0.5 truncate text-[13px] text-muted-foreground'>{artistText}</p>
              </div>
              <div className='-mr-1 shrink-0 opacity-100 md:opacity-0 transition-opacity md:group-hover:opacity-100' onClick={(e) => e.stopPropagation()}>
                <TrackOptionsMenu
                  track={contextTracks.at(index)!}
                  onAddToQueue={() => handleAddToQueue(index)}
                />
              </div>
            </div>
          </motion.div>
        );
      })}
    </Shelf>
  );
}
