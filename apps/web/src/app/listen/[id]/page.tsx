'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useSocket } from '@/lib/socket-context';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface PartyInfoResponse {
  ok: boolean;
  hostName?: string;
  currentTrack?: Track;
}

interface JoinPartyResponse {
  ok: boolean;
  isHost?: boolean;
  initialState?: {
    listenersCanControl?: boolean;
    currentTrack?: Track;
    isPlaying?: boolean;
  };
  error?: string;
}

export default function ListenJoinPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const setParty = usePlayerStore((state) => state.setParty);
  const partyId = usePlayerStore((state) => state.partyId);

  const [status, setStatus] = useState('Ready to sync');
  const [isJoining, setIsJoining] = useState(false);
  const [partyInfo, setPartyInfo] = useState<{ hostName?: string; currentTrack?: Track } | null>(null);

  const [isTauri, setIsTauri] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tauriDetected = '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
      setIsTauri(tauriDetected);
      
      const capacitorDetected = 'Capacitor' in window || (typeof navigator !== 'undefined' && /Capacitor/i.test(navigator.userAgent));
      setIsMobile(capacitorDetected || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    }
  }, []);

  useEffect(() => {
    if (!id) {
      router.push('/');
      return;
    }
    if (partyId === id.toUpperCase()) {
      router.push('/');
      return;
    }

    if (socket && isConnected && id) {
      socket.emit('get_party_info', id.toUpperCase(), (response: PartyInfoResponse) => {
        if (response.ok) {
          setPartyInfo({ hostName: response.hostName, currentTrack: response.currentTrack });
        }
      });
    }
  }, [id, router, partyId, socket, isConnected]);

  const handleJoin = () => {
    if (!isConnected || !socket) {
      setStatus('Sync service disconnected. Try reloading.');
      return;
    }

    setIsJoining(true);
    setStatus(`Connecting to session...`);

    socket.emit('join_party', id.toUpperCase(), (response: JoinPartyResponse) => {
      if (response.ok) {
        setParty(id.toUpperCase(), !!response.isHost);
        
        if (response.initialState) {
          const state = response.initialState;
          if (state.listenersCanControl !== undefined) {
             usePlayerStore.getState().setListenersCanControl(!!state.listenersCanControl);
          }
          if (state.currentTrack) {
            usePlayerStore.getState().play(state.currentTrack, true);
            if (state.isPlaying) {
              setTimeout(() => {
                usePlayerStore.getState().resume(true);
              }, 500);
            }
          }
        }
        
        toast.success(`Joined session: ${id.toUpperCase()}`);
        router.push('/');
      } else {
        setIsJoining(false);
        setStatus('Failed to join');
        toast.error(response.error || 'Failed to join session');
      }
    });
  };

  const showDesktopLauncher = !isTauri && !isMobile;

  return (
    <div className='flex h-screen w-full flex-col items-center justify-center bg-background text-foreground gap-6 px-4'>
      <div className='flex flex-col items-center text-center space-y-2'>
        <h2 className='text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent'>
          Listen Along
        </h2>
        <div className='flex flex-col items-center gap-1'>
          <p className='text-muted-foreground max-w-xs sm:max-w-md leading-relaxed text-sm sm:text-base'>
            {partyInfo?.hostName ? (
              <>
                <span className='font-bold text-foreground underline decoration-primary/50 underline-offset-4'>
                  {partyInfo.hostName}
                </span>{' '}
                invited you to join their jam
              </>
            ) : (
              "You've been invited to a session"
            )}
          </p>
          <span className='font-mono text-primary font-bold text-sm bg-primary/10 border border-primary/20 px-3 py-0.5 rounded-full mt-1'>
             #{id?.toUpperCase()}
          </span>
        </div>
      </div>

      <div className='flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-sm sm:max-w-lg mt-2'>
        {showDesktopLauncher && (
          <Button
            onClick={() => {
              window.location.href = `melofy://listen/${id?.toUpperCase()}`;
            }}
            size='lg'
            className='w-full sm:w-48 bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 rounded-[1.25rem] h-12 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center'
          >
            Open Desktop App
          </Button>
        )}

        <Button
          disabled={isJoining || !isConnected}
          onClick={handleJoin}
          size='lg'
          variant={showDesktopLauncher ? 'outline' : 'default'}
          className={`w-full sm:w-48 font-bold rounded-[1.25rem] h-12 flex items-center justify-center transition-all ${
            showDesktopLauncher 
              ? 'border-foreground/10 hover:border-foreground/20 hover:bg-foreground/5' 
              : 'bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/20'
          }`}
        >
          {isJoining ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
          {isJoining ? 'Joining...' : showDesktopLauncher ? 'Join in Browser' : 'Join Session'}
        </Button>
      </div>

      <p className='text-xs text-muted-foreground opacity-75 font-medium'>{status}</p>
    </div>
  );
}
