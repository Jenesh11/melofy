import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { addPlaylist, Track as FirebaseTrack, Playlist } from '@/lib/firebase/playlists';
import { Track as PlayerTrack } from '@/store/usePlayerStore';
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
  const [likedPlaylistId, setLikedPlaylistId] = useState<string | null>(null);
  const [likedTracks, setLikedTracks] = useState<FirebaseTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLikedSongs = useCallback(async () => {
    if (!user) {
      setLikedPlaylistId(null);
      setLikedTracks([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // Try by flag first
      let q = query(
        collection(db, 'playlists'),
        where('userId', '==', user.uid),
        where('isLikedSongs', '==', true)
      );
      
      let snapshot = await getDocs(q);
      
      // Fallback to name match for backward compatibility
      if (snapshot.empty) {
        q = query(
          collection(db, 'playlists'),
          where('userId', '==', user.uid),
          where('name', '==', LIKED_SONGS_PLAYLIST_NAME)
        );
        snapshot = await getDocs(q);
        
        // If found by name, let's update it to add the flag
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          await updateDoc(doc(db, 'playlists', docSnap.id), { isLikedSongs: true });
        }
      }

      if (!snapshot.empty) {
        // Liked songs playlist exists
        const docSnap = snapshot.docs[0];
        setLikedPlaylistId(docSnap.id);
        const data = docSnap.data() as Playlist;
        setLikedTracks(data.tracks || []);
      } else {
        setLikedPlaylistId(null);
        setLikedTracks([]);
      }
    } catch (error) {
      console.error('[useLikedSongs] Error fetching liked songs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchLikedSongs();
  }, [fetchLikedSongs]);

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
        setLikedTracks(prev => prev.filter(t => t.info.identifier !== track.id));
        
        if (likedPlaylistId) {
          const docRef = doc(db, 'playlists', likedPlaylistId);
          // Find the exact object to pass to arrayRemove
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
        setLikedTracks(prev => [...prev, firebaseTrack]);

        if (likedPlaylistId) {
          // Update existing playlist
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
      toast.error('Failed to update Liked Songs');
      // Revert optimistic update
      void fetchLikedSongs();
    }
  }, [user, likedTracks, likedPlaylistId, isLiked, fetchLikedSongs]);

  return {
    likedTracks,
    isLoading,
    isLiked,
    toggleLike,
    refetch: fetchLikedSongs
  };
}
