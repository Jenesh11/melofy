'use client';

import { usePlayerStore } from '@/store/usePlayerStore';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Music2, Share2, Play, Pause } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

export default function TrackInfoPage() {
  const params = useParams();
  const id = params.id as string;
  const { currentTrack, isPlaying, play, pause, resume } = usePlayerStore();

  const isCurrentTrack = currentTrack?.id === id;

  const handleTogglePlay = () => {
    if (isCurrentTrack) {
      if (isPlaying) pause();
      else resume();
    } else if (currentTrack) {
      // if we had a way to fetch track by ID we would play it here
      resume();
    }
  };

  const handleShare = () => {
    if (!currentTrack) return;

    const youtubeUrl = `https://www.youtube.com/watch?v=${currentTrack.id}`;
    navigator.clipboard
      .writeText(youtubeUrl)
      .then(() => {
        toast.success('Link copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
        toast.error('Failed to copy link');
      });
  };

  return (
    <div className='flex flex-col h-full overflow-y-auto custom-scrollbar p-8'>
      <div className='max-w-4xl mx-auto w-full'>
        <Link href='/'>
          <Button
            variant='ghost'
            className='mb-8 -ml-4 text-zinc-400 hover:text-white'
          >
            <ChevronLeft className='mr-2 h-4 w-4' />
            Back
          </Button>
        </Link>

        {isCurrentTrack ? (
          <div className='flex flex-col md:flex-row gap-10 items-center md:items-start'>
            {/* Artwork */}
            <div className='w-full max-w-sm aspect-square rounded-[2rem] bg-zinc-900 shadow-2xl overflow-hidden shadow-primary/10 shrink-0 relative group'>
              {currentTrack?.artworkUrl ? (
                <img
                  src={currentTrack.artworkUrl}
                  alt={currentTrack.title}
                  className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-105'
                />
              ) : (
                <div className='w-full h-full flex items-center justify-center'>
                  <Music2 className='h-32 w-32 text-zinc-800' />
                </div>
              )}
              <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                <Button
                  size='icon'
                  className='h-20 w-20 rounded-full bg-primary text-black hover:scale-105 transition-transform'
                  onClick={handleTogglePlay}
                >
                  {isPlaying ? (
                    <Pause className='h-10 w-10 fill-current' />
                  ) : (
                    <Play className='h-10 w-10 ml-2 fill-current' />
                  )}
                </Button>
              </div>
            </div>

            {/* Info */}
            <div className='flex flex-col gap-6 flex-1 text-center md:text-left pt-4'>
              <div className='space-y-2'>
                <p className='text-primary font-bold tracking-widest text-xs uppercase'>
                  Now Playing
                </p>
                <h1 className='text-4xl md:text-4xl lg:text-5xl font-bold text-white tracking-tighter leading-tight'>
                  {currentTrack.title}
                </h1>
                <p className='text-xl md:text-2xl text-zinc-400 font-light mt-2'>
                  {currentTrack.artist}
                </p>
              </div>

              <div className='flex items-center justify-center md:justify-start gap-4 mt-4'>
                <Button
                  size='lg'
                  className='bg-primary text-black font-bold h-12 px-8 rounded-full hover:scale-105 transition-transform'
                  onClick={handleTogglePlay}
                >
                  {isPlaying ? (
                    <>
                      <Pause className='h-5 w-5 mr-2 fill-current' /> Pause
                    </>
                  ) : (
                    <>
                      <Play className='h-5 w-5 mr-2 fill-current' /> Play
                    </>
                  )}
                </Button>
                <Button
                  size='icon'
                  variant='outline'
                  className='h-12 w-12 rounded-full border-white/10 hover:bg-white/5'
                  onClick={handleShare}
                >
                  <Share2 className='h-5 w-5' />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center h-64 gap-4'>
            <Music2 className='h-12 w-12 text-zinc-700' />
            <h2 className='text-xl text-zinc-400'>
              Track information unavailable.
            </h2>
            <p className='text-sm text-zinc-600 max-w-md text-center'>
              Currently, only the active track can be viewed on this page due to
              data limitations. Please play a track first.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
