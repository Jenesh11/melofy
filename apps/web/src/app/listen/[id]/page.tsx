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

  return (
    <div className='flex h-screen w-full flex-col items-center justify-center bg-background text-foreground gap-6'>
      <div className='flex flex-col items-center text-center space-y-2'>
        <h2 className='text-3xl font-bold tracking-tight'>Listen Along</h2>
        <div className='flex flex-col items-center gap-1'>
          <p className='text-muted-foreground'>
            {partyInfo?.hostName ? (
              <>
                <span className='font-semibold text-foreground underline decoration-primary/50 underline-offset-4'>
                  {partyInfo.hostName}
                </span>{' '}
                invited you to join their jam
              </>
            ) : (
              "You've been invited to a session"
            )}
          </p>
          <span className='font-mono text-primary font-bold text-sm bg-primary/10 px-2 py-0.5 rounded'>
             #{id?.toUpperCase()}
          </span>
        </div>
      </div>

      <Button disabled={isJoining || !isConnected} onClick={handleJoin} size='lg' className='w-48'>
        {isJoining ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
        {isJoining ? 'Joining...' : 'Join Session'}
      </Button>

      <p className='text-xs text-muted-foreground opacity-75'>{status}</p>
    </div>
  );
}
