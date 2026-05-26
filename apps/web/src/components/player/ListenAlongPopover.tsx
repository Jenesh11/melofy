'use client';

import { useState } from 'react';
import { Users, Copy, Check, LogOut, Loader2, Lock, Unlock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/lib/socket-context';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

export function ListenAlongPopover() {
  const { socket, isConnected } = useSocket();
  const partyId = usePlayerStore((state) => state.partyId);
  const hostName = usePlayerStore((state) => state.hostName);
  const isPartyHost = usePlayerStore((state) => state.isPartyHost);
  const setParty = usePlayerStore((state) => state.setParty);
  const clearParty = usePlayerStore((state) => state.clearParty);
  const listenersCanControl = usePlayerStore((state) => state.listenersCanControl);
  const setListenersCanControl = usePlayerStore((state) => state.setListenersCanControl);
  const partyListeners = usePlayerStore((state) => state.partyListeners) || [];

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreateParty = () => {
    if (!socket) {
      toast.error('Syncing service is disconnected (No Socket)');
      return;
    }
    if (!isConnected) {
      toast.error('Syncing service is disconnected (Not Connected)');
      return;
    }

    setIsLoading(true);
    
    let isHandled = false;

    socket.emit('create_party', (response: { ok: boolean; partyId?: string; error?: string }) => {
      isHandled = true;
      setIsLoading(false);
      if (response && response.ok && response.partyId) {
        setParty(response.partyId, true);
        toast.success(`Session started! Code: ${response.partyId}`);
      } else {
        toast.error(response?.error || 'Failed to create session');
      }
    });

    setTimeout(() => {
      if (!isHandled) {
        setIsLoading(false);
        toast.error('Server timed out. Please try again.');
      }
    }, 5000);
  };

  const handleJoinParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket) {
      toast.error('Syncing service is disconnected (No Socket)');
      return;
    }
    if (!isConnected) {
      toast.error('Syncing service is disconnected (Not Connected)');
      return;
    }
    if (!joinCode.trim()) return;
    
    setIsLoading(true);
    let isHandled = false;

    socket.emit('join_party', joinCode.trim(), (response: { 
      ok: boolean; 
      error?: string; 
      initialState?: { 
        hostName?: string; 
        currentTrack?: Track | null;
        isPlaying?: boolean; 
      }; 
      isHost?: boolean 
    }) => {
      isHandled = true;
      setIsLoading(false);
      if (response && response.ok) {
        setParty(joinCode.trim().toUpperCase(), !!response.isHost, response.initialState?.hostName);
        setJoinCode('');
        
        if (response.initialState) {
          const state = response.initialState;
          if (state.currentTrack) {
            usePlayerStore.getState().play(state.currentTrack);
            if (state.isPlaying) {
              setTimeout(() => {
                usePlayerStore.getState().resume();
              }, 500);
            }
          }
        }
        
        toast.success(`Joined session`);
        setIsOpen(false);
      } else {
        toast.error(response?.error || 'Failed to join session');
      }
    });

    setTimeout(() => {
      if (!isHandled) {
        setIsLoading(false);
        toast.error('Server timed out. Please try again.');
      }
    }, 5000);
  };

  const handleLeaveParty = () => {
    if (socket && isConnected) {
      socket.emit('leave_party');
    }
    clearParty();
    toast.info('Left session');
    setIsOpen(false);
  };

  const copyToClipboard = () => {
    if (!partyId) return;
    const url = `${window.location.origin}/listen/${partyId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <Button
            variant='ghost'
            size='icon'
            className={`text-muted-foreground hover:text-foreground transition-colors ${partyId ? 'text-primary bg-primary/10' : ''}`}
            title='Listen Along'
          />
        }
      >
        <Users className='h-5 w-5' />
      </PopoverTrigger>
      <PopoverContent className='w-80 border-border/50 bg-background/95 backdrop-blur-xl' align='end' sideOffset={20}>
        <div className='flex flex-col space-y-4'>
          <div className='flex items-center space-x-2'>
            <Users className='h-4 w-4 text-primary' />
            <span className='font-semibold text-sm'>Listen Along Session</span>
          </div>

          {!partyId ? (
            <div className='space-y-4'>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                Start a real-time listening session with friends. Everyone stays in sync perfectly.
              </p>
              
              <Button onClick={handleCreateParty} className='w-full' disabled={isLoading}>
                {isLoading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                Start New Session
              </Button>

              <div className='relative'>
                <div className='absolute inset-0 flex items-center'>
                  <span className='w-full border-t border-muted' />
                </div>
                <div className='relative flex justify-center text-xs uppercase'>
                  <span className='bg-background px-2 text-muted-foreground'>Or join existing</span>
                </div>
              </div>

              <form onSubmit={handleJoinParty} className='flex space-x-2'>
                <Input
                  className='h-9 flex-1'
                  placeholder='Enter session code'
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
                <Button type='submit' className='h-9' disabled={!joinCode.trim() || isLoading}>
                  {isLoading ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Join'}
                </Button>
              </form>
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='rounded-lg bg-muted p-3'>
                <div className='text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold'>
                  {isPartyHost ? 'You are the Host' : (hostName ? `Listening with ${hostName}` : 'Listening with Host')}
                </div>
                <div className='flex items-center justify-between'>
                  <span className='flex items-center font-mono text-xl tracking-widest text-foreground font-bold'>
                     {partyId}
                  </span>
                  <Button variant='ghost' size='icon' className='h-8 w-8' onClick={copyToClipboard} title='Copy join link'>
                    {copied ? <Check className='h-4 w-4 text-green-500' /> : <Copy className='h-4 w-4 text-muted-foreground' />}
                  </Button>
                </div>
              </div>

              <div className='flex items-center justify-between my-2 bg-card border rounded-md p-3'>
                <div className='flex items-center space-x-2'>
                   {listenersCanControl ? <Unlock className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                   <span className='text-xs font-medium'>
                     {isPartyHost ? "Allow guests to control" : "Guest control"}
                   </span>
                </div>
                {isPartyHost ? (
                  <label className="flex items-center cursor-pointer relative">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={listenersCanControl}
                      onChange={(e) => {
                         const newVal = e.target.checked;
                         setListenersCanControl(newVal);
                         if (socket) socket.emit('toggle_listener_control', { canControl: newVal });
                      }}
                    />
                    <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                ) : (
                  <span className='text-xs text-muted-foreground'>
                    {listenersCanControl ? 'Unlocked' : 'Locked by host'}
                  </span>
                )}
              </div>

              {partyListeners.length > 0 && (
                <div className='bg-primary/5 rounded-md p-3 border border-primary/10'>
                  <div className='flex items-center space-x-2 mb-2'>
                    <Users className='h-3.5 w-3.5 text-primary' />
                    <span className='text-xs font-semibold text-primary/80 uppercase tracking-wider'>
                      Active Listeners ({partyListeners.length})
                    </span>
                  </div>
                  <div className='space-y-1.5 max-h-32 overflow-y-auto no-scrollbar'>
                    {partyListeners.map((listener) => (
                      <div key={listener.userId} className='flex items-center space-x-2 text-sm bg-background/50 rounded-md p-1.5 px-2'>
                        <span className='w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary'>
                          {listener.username?.charAt(0).toUpperCase() || '?'}
                        </span>
                        <span className='truncate text-muted-foreground flex-1'>{listener.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className='text-xs text-muted-foreground leading-relaxed'>
                {isPartyHost
                  ? 'Share this code or link with friends so they can join and listen in sync with you.'
                  : 'Your playback is perfectly synced with the host. Sit back and enjoy!'}
              </p>

              <Button onClick={handleLeaveParty} variant='destructive' className='w-full'>
                <LogOut className='mr-2 h-4 w-4' />
                {isPartyHost ? 'End Session' : 'Leave Session'}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
