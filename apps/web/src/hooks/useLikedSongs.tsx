/* eslint-disable @next/next/no-img-element */
import { useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';
import { addPlaylist, Track as FirebaseTrack } from '@/lib/firebase/playlists';
import { Track as PlayerTrack } from '@/store/usePlayerStore';
import { useLikedStore } from '@/store/useLikedStore';
import { toast } from 'sonner';
import { Heart, HeartOff } from 'lucide-react';

export const LIKED_SONGS_PLAYLIST_NAME = 'Liked Songs';

// Helper to map PlayerTrack to FirebaseTrack
export function mapPlayerTrackToFirebaseTrack(track: PlayerTrack): FirebaseTrack {
  return {
    encoded: track.url || '',
    info: {
      identifier: track.id,
      title: track.title,
      author: track.artist,
      duration: track.duration,
      artworkUrl: track.artworkUrl,
      uri: `spotify:track:${track.id}`, // Fallback
      sourceName: 'spotify',
      isSeekable: true,
      isStream: false,
    }
  };
}

export function useLikedSongs() {
  const { user } = useAuth();
  const { 
    likedTracks, 
    likedPlaylistId, 
    isLoading,
    setLikedPlaylistId,
    addLikedTrack,
    removeLikedTrack,
  } = useLikedStore();

  const isLiked = useCallback((trackId: string) => {
    return likedTracks.some(t => t.info.identifier === trackId);
  }, [likedTracks]);

  const toggleLike = useCallback(async (track: PlayerTrack) => {
    if (!user) {
      toast.error('You must be logged in to like songs');
      return;
    }

    try {
      const currentlyLiked = isLiked(track.id);
      const firebaseTrack = mapPlayerTrackToFirebaseTrack(track);

      if (currentlyLiked) {
        // Optimistic update
        removeLikedTrack(track.id);
        
        let targetPlaylistId = likedPlaylistId;
        if (!targetPlaylistId) {
          const q = query(
            collection(db, 'playlists'),
            where('userId', '==', user.uid)
          );
          const snap = await getDocs(q);
          const existing = snap.docs.find(d => {
            const data = d.data();
            return data.isLikedSongs === true || data.name === LIKED_SONGS_PLAYLIST_NAME;
          });
          if (existing) {
            targetPlaylistId = existing.id;
            setLikedPlaylistId(existing.id);
          }
        }

        if (targetPlaylistId) {
          const docRef = doc(db, 'playlists', targetPlaylistId);
          const trackToRemove = likedTracks.find(t => t.info.identifier === track.id);
          if (trackToRemove) {
            await updateDoc(docRef, {
              tracks: arrayRemove(trackToRemove),
              trackCount: Math.max(0, likedTracks.length - 1)
            });
            toast('Removed from Liked Songs', {
              className: 'bg-primary text-primary-foreground border-none shadow-2xl',
              description: (
                <div className="flex items-center gap-2 mt-1">
                  {track.artworkUrl && (
                    <img src={track.artworkUrl} alt="" className="h-8 w-8 rounded-md object-cover shadow-md brightness-90" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-xs truncate opacity-90">{track.title}</span>
                  </div>
                </div>
              ),
              icon: <HeartOff className="h-4 w-4" />,
              duration: 2000,
            });
          }
        }
      } else {
        // Optimistic update
        addLikedTrack(firebaseTrack);

        let targetPlaylistId = likedPlaylistId;
        if (!targetPlaylistId) {
          const q = query(
            collection(db, 'playlists'),
            where('userId', '==', user.uid)
          );
          const snap = await getDocs(q);
          const existing = snap.docs.find(d => {
            const data = d.data();
            return data.isLikedSongs === true || data.name === LIKED_SONGS_PLAYLIST_NAME;
          });
          if (existing) {
            targetPlaylistId = existing.id;
            setLikedPlaylistId(existing.id);
          }
        }

        if (targetPlaylistId) {
          const docRef = doc(db, 'playlists', targetPlaylistId);
          await updateDoc(docRef, {
            tracks: arrayUnion(firebaseTrack),
            trackCount: likedTracks.length + 1,
            isLikedSongs: true,
          });
        } else {
          // Create new Liked Songs playlist
          const res = await addPlaylist(user.uid, {
            name: LIKED_SONGS_PLAYLIST_NAME,
            trackCount: 1,
            tracks: [firebaseTrack],
            isLikedSongs: true,
          });
          setLikedPlaylistId(res.id);
        }
        toast('Added to Liked Songs', {
          className: 'bg-primary text-primary-foreground border-none shadow-2xl',
          description: (
            <div className="flex items-center gap-2 mt-1">
              {track.artworkUrl && (
                <img src={track.artworkUrl} alt="" className="h-8 w-8 rounded-md object-cover shadow-md brightness-90" />
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-xs truncate opacity-90">{track.title}</span>
              </div>
            </div>
          ),
          icon: <Heart className="fill-current h-4 w-4" />,
          duration: 2500,
        });
      }
    } catch (error) {
      console.error('[useLikedSongs] Error toggling like:', error);
      toast.error('Failed to update Liked Songs. Your changes might not be saved.');
    }
  }, [user, likedTracks, likedPlaylistId, isLiked, addLikedTrack, removeLikedTrack, setLikedPlaylistId]);

  return {
    likedTracks,
    isLoading,
    isLiked,
    toggleLike,
  };
}
