import { useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { addPlaylist, Track as FirebaseTrack } from '@/lib/firebase/playlists';
import { Track as PlayerTrack } from '@/store/usePlayerStore';
import { useLikedStore } from '@/store/useLikedStore';
import { toast } from 'sonner';

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
        
        if (likedPlaylistId) {
          const docRef = doc(db, 'playlists', likedPlaylistId);
          const trackToRemove = likedTracks.find(t => t.info.identifier === track.id);
          if (trackToRemove) {
            await updateDoc(docRef, {
              tracks: arrayRemove(trackToRemove),
              trackCount: Math.max(0, likedTracks.length - 1)
            });
            toast.success('Removed from Liked Songs');
          }
        }
      } else {
        // Optimistic update
        addLikedTrack(firebaseTrack);

        if (likedPlaylistId) {
          const docRef = doc(db, 'playlists', likedPlaylistId);
          await updateDoc(docRef, {
            tracks: arrayUnion(firebaseTrack),
            trackCount: likedTracks.length + 1
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
        toast.success('Added to Liked Songs');
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
