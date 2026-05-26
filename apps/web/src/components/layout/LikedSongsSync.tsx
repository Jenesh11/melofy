'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { Playlist } from '@/lib/firebase/playlists';
import { useLikedStore } from '@/store/useLikedStore';

const LIKED_SONGS_PLAYLIST_NAME = 'Liked Songs';

export function LikedSongsSync() {
  const { user } = useAuth();
  const { setLikedTracks, setLikedPlaylistId, setIsLoading } = useLikedStore();
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLikedTracks([]);
      setLikedPlaylistId(null);
      setIsLoading(false);
      lastUserId.current = null;
      return;
    }

    // Only set loading if the user has changed
    if (lastUserId.current !== user.uid) {
      setIsLoading(true);
      lastUserId.current = user.uid;
    }

    // Initial query to find the liked songs playlist
    const findPlaylist = async () => {
      try {
        let q = query(
          collection(db, 'playlists'),
          where('userId', '==', user.uid),
          where('isLikedSongs', '==', true)
        );
        
        let snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          // Fallback to name for older playlists
          q = query(
            collection(db, 'playlists'),
            where('userId', '==', user.uid),
            where('name', '==', LIKED_SONGS_PLAYLIST_NAME)
          );
          snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const docSnap = snapshot.docs[0];
            await updateDoc(doc(db, 'playlists', docSnap.id), { isLikedSongs: true });
          }
        }

        const playlistDoc = snapshot.empty ? null : snapshot.docs[0];
        
        if (playlistDoc) {
          setLikedPlaylistId(playlistDoc.id);
          // Set up the real-time listener for this specific doc
          return onSnapshot(doc(db, 'playlists', playlistDoc.id), (docSnapshot) => {
            if (docSnapshot.exists()) {
              const data = docSnapshot.data() as Playlist;
              setLikedTracks(data.tracks || []);
            }
            setIsLoading(false);
          });
        } else {
          setLikedPlaylistId(null);
          setLikedTracks([]);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error in LikedSongsSync:', err);
        setIsLoading(false);
      }
    };

    let unsubscribe: (() => void) | undefined;
    findPlaylist().then((unsub) => {
      if (unsub) unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, setLikedTracks, setLikedPlaylistId, setIsLoading]);

  return null;
}
