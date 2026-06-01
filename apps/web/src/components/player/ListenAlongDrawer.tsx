'use client';

import { useState } from 'react';
import { Users, Copy, Check, LogOut, Loader2, Lock, Unlock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/lib/socket-context';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Drawer } from 'vaul';

export function ListenAlongDrawer() {
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
    <>
      <Button
        variant='ghost'
        size='icon'
        className={`text-white/80 hover:text-white transition-colors ${partyId ? 'text-primary bg-primary/20' : ''}`}
        title='Listen Along'
        onClick={() => setIsOpen(true)}
      >
        <Users className='h-5 w-5' />
      </Button>

      <Drawer.NestedRoot open={isOpen} onOpenChange={setIsOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[130]" />
          <Drawer.Content className='fixed bottom-0 left-0 right-0 z-[140] bg-zinc-950 flex flex-col rounded-t-[2rem] outline-none border-t border-white/10'>
            <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-white/20 mt-4 mb-4" />
            <div className='flex items-center justify-between px-6 pb-4 shrink-0 border-b border-white/10'>
              <Drawer.Title className='text-lg font-bold text-white tracking-widest uppercase m-0 flex items-center gap-2'>
                <Users className='h-5 w-5 text-primary' /> Listen Along
              </Drawer.Title>
              <Drawer.Close asChild>
                <Button variant='ghost' size='icon' className='text-white/70 hover:text-white'>
                  <X className='h-6 w-6' />
                </Button>
              </Drawer.Close>
            </div>
            
            <div className='p-6 overflow-y-auto custom-scrollbar max-h-[70vh]'>
              {!partyId ? (
                <div className='space-y-4'>
                  <p className='text-sm text-white/60 leading-relaxed'>
                    Start a real-time listening session with friends. Everyone stays in sync perfectly.
                  </p>
                  
                  <Button onClick={handleCreateParty} className='w-full font-bold h-12 rounded-xl' disabled={isLoading || !isConnected}>
                    {isLoading || !isConnected ? <Loader2 className='mr-2 h-5 w-5 animate-spin' /> : null}
                    {!isConnected ? 'Connecting to Sync...' : 'Start New Session'}
                  </Button>

                  <div className='relative py-2'>
                    <div className='absolute inset-0 flex items-center'>
                      <span className='w-full border-t border-white/10' />
                    </div>
                    <div className='relative flex justify-center text-xs uppercase'>
                      <span className='bg-zinc-950 px-2 text-white/50 font-semibold'>Or join existing</span>
                    </div>
                  </div>

                  <form onSubmit={handleJoinParty} className='flex space-x-2'>
                    <Input
                      className='h-12 flex-1 font-semibold text-lg bg-white/5 border-white/10 rounded-xl px-4 focus-visible:ring-primary'
                      placeholder={!isConnected ? 'Connecting...' : 'Code'}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      disabled={!isConnected}
                    />
                    <Button type='submit' className='h-12 px-6 font-bold rounded-xl' disabled={!joinCode.trim() || isLoading || !isConnected}>
                      {isLoading ? <Loader2 className='h-5 w-5 animate-spin' /> : (!isConnected ? '...' : 'Join')}
                    </Button>
                  </form>
                </div>
              ) : (
                <div className='space-y-4'>
                  <div className='rounded-xl bg-white/5 p-4 border border-white/10'>
                    <div className='text-xs text-white/50 mb-1 uppercase tracking-wider font-semibold'>
                      {isPartyHost ? 'You are the Host' : (hostName ? `Listening with ${hostName}` : 'Listening with Host')}
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='flex items-center font-mono text-3xl tracking-widest text-white font-bold'>
                         {partyId}
                      </span>
                      <Button variant='ghost' size='icon' className='h-10 w-10 bg-white/5 hover:bg-white/10 rounded-full' onClick={copyToClipboard} title='Copy join link'>
                        {copied ? <Check className='h-5 w-5 text-green-500' /> : <Copy className='h-5 w-5 text-white/70' />}
                      </Button>
                    </div>
                  </div>

                  <div className='flex items-center justify-between my-2 bg-white/5 border border-white/10 rounded-xl p-4'>
                    <div className='flex items-center space-x-3'>
                       {listenersCanControl ? <Unlock className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5 text-white/50" />}
                       <span className='text-sm font-medium text-white/90'>
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
                        <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    ) : (
                      <span className='text-xs text-white/50'>
                        {listenersCanControl ? 'Unlocked' : 'Locked by host'}
                      </span>
                    )}
                  </div>

                  {partyListeners.length > 0 && (
                    <div className='bg-primary/10 rounded-xl p-4 border border-primary/20'>
                      <div className='flex items-center space-x-2 mb-3'>
                        <Users className='h-4 w-4 text-primary' />
                        <span className='text-xs font-semibold text-primary uppercase tracking-wider'>
                          Active Listeners ({partyListeners.length})
                        </span>
                      </div>
                      <div className='space-y-2 max-h-32 overflow-y-auto no-scrollbar'>
                        {partyListeners.map((listener) => (
                          <div key={listener.userId} className='flex items-center space-x-3 text-sm bg-black/20 rounded-lg p-2 px-3'>
                            <span className='w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary'>
                              {listener.username?.charAt(0).toUpperCase() || '?'}
                            </span>
                            <span className='truncate text-white/80 flex-1 font-medium'>{listener.username}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className='text-xs text-white/50 leading-relaxed text-center py-2'>
                    {isPartyHost
                      ? 'Share this code or link with friends so they can join and listen in sync with you.'
                      : 'Your playback is perfectly synced with the host. Sit back and enjoy!'}
                  </p>

                  <Button onClick={handleLeaveParty} variant='destructive' className='w-full h-12 rounded-xl font-bold'>
                    <LogOut className='mr-2 h-5 w-5' />
                    {isPartyHost ? 'End Session' : 'Leave Session'}
                  </Button>
                </div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.NestedRoot>
    </>
  );
}
