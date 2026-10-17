import { libraryTrackId } from '@/lib/library-tracks';
/* eslint-disable @next/next/no-img-element */
import { useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { LIKED_SONGS_PLAYLIST_NAME, saveLikedSongChange, Track as FirebaseTrack } from '@/lib/firebase/playlists';
import { Track as PlayerTrack } from '@/store/usePlayerStore';
import { useLikedStore } from '@/store/useLikedStore';
import { toast } from 'sonner';
import { Heart, HeartOff } from 'lucide-react';

export { LIKED_SONGS_PLAYLIST_NAME };

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
      uri: track.uri || (/^[\w-]{11}$/.test(track.identifier || track.id) ? 'https://www.youtube.com/watch?v=' + (track.identifier || track.id) : `spotify:track:${track.id}`),
      sourceName: track.source || (/^[\w-]{11}$/.test(track.identifier || track.id) ? 'youtube' : 'spotify'),
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
    return likedTracks.some(t => libraryTrackId(t) === trackId);
  }, [likedTracks]);

  const toggleLike = useCallback(async (track: PlayerTrack) => {
    if (!user) {
      toast.error('You must be logged in to like songs');
      return;
    }

    const ownsAccount = () => useLikedStore.getState().userId === user.uid;
    if (!ownsAccount()) return;

    const currentlyLiked = isLiked(track.id);
    const firebaseTrack = mapPlayerTrackToFirebaseTrack(track);
    const previousEntry = likedTracks.find(t => libraryTrackId(t) === track.id);

    // Optimistic update; rolled back below if the server doesn't keep it.
    if (currentlyLiked) removeLikedTrack(track.id);
    else addLikedTrack(firebaseTrack);

    try {
      const playlistId = await saveLikedSongChange(
        user.uid,
        likedPlaylistId,
        currentlyLiked ? { removeId: track.id } : { add: firebaseTrack },
      );
      if (!ownsAccount()) return;
      setLikedPlaylistId(playlistId);

      toast(currentlyLiked ? 'Removed from Liked Songs' : 'Added to Liked Songs', {
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
        icon: currentlyLiked ? <HeartOff className="h-4 w-4" /> : <Heart className="fill-current h-4 w-4" />,
        duration: currentlyLiked ? 2000 : 2500,
      });
    } catch (error) {
      if (!ownsAccount()) return;
      console.error('[useLikedSongs] Error toggling like:', error);
      // Never leave the UI showing a like state the server didn't save — it would vanish on reload.
      if (currentlyLiked) addLikedTrack(previousEntry || firebaseTrack);
      else removeLikedTrack(track.id);
      toast.error('Could not update Liked Songs. Please check your connection and try again.');
    }
  }, [user, likedTracks, likedPlaylistId, isLiked, addLikedTrack, removeLikedTrack, setLikedPlaylistId]);

  return {
    likedTracks,
    isLoading,
    isLiked,
    toggleLike,
  };
}
