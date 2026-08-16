'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Playlist, Track as FirebaseTrack } from '@/lib/firebase/playlists';
import { useLikedStore } from '@/store/useLikedStore';

const LIKED_SONGS_PLAYLIST_NAME = 'Liked Songs';

function deduplicateFirebaseTracks(tracks: FirebaseTrack[]): FirebaseTrack[] {
  const seen = new Set<string>();
  const result: FirebaseTrack[] = [];
  for (const t of tracks) {
    const key = t.info.identifier || `${t.info.title}_${t.info.author}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(t);
    }
  }
  return result;
}

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

    // Query to find, merge duplicates, and listen to the single canonical liked songs playlist
    const findAndMergeLikedPlaylists = async () => {
      try {
        const q = query(
          collection(db, 'playlists'),
          where('userId', '==', user.uid)
        );
        
        const snapshot = await getDocs(q);
        
        const likedDocs = snapshot.docs.filter((docSnap) => {
          const data = docSnap.data();
          return data.isLikedSongs === true || data.name === LIKED_SONGS_PLAYLIST_NAME;
        });

        if (likedDocs.length === 0) {
          // Create initial single liked songs playlist
          const newDocRef = await addDoc(collection(db, 'playlists'), {
            userId: user.uid,
            name: LIKED_SONGS_PLAYLIST_NAME,
            trackCount: 0,
            tracks: [],
            isLikedSongs: true,
            createdAt: serverTimestamp(),
          });
          setLikedPlaylistId(newDocRef.id);
          setLikedTracks([]);
          setIsLoading(false);

          return onSnapshot(doc(db, 'playlists', newDocRef.id), (docSnapshot) => {
            if (docSnapshot.exists()) {
              const data = docSnapshot.data() as Playlist;
              setLikedTracks(data.tracks || []);
            }
            setIsLoading(false);
          });
        }

        // Primary master playlist is the first one
        const masterDoc = likedDocs[0];
        const masterData = masterDoc.data() as Playlist;
        let allTracks: FirebaseTrack[] = [...(masterData.tracks || [])];

        // If there are duplicate liked songs playlists, merge tracks and delete duplicates
        if (likedDocs.length > 1) {
          console.log(`[LikedSongsSync] Found ${likedDocs.length} Liked Songs playlists. Merging into master ${masterDoc.id}...`);
          for (let i = 1; i < likedDocs.length; i++) {
            const dupDoc = likedDocs[i];
            const dupData = dupDoc.data() as Playlist;
            if (dupData.tracks && Array.isArray(dupData.tracks)) {
              allTracks.push(...dupData.tracks);
            }
            // Delete duplicate playlist document from Firestore
            deleteDoc(doc(db, 'playlists', dupDoc.id)).catch(console.error);
          }

          const mergedUnique = deduplicateFirebaseTracks(allTracks);
          await updateDoc(doc(db, 'playlists', masterDoc.id), {
            tracks: mergedUnique,
            trackCount: mergedUnique.length,
            isLikedSongs: true,
            name: LIKED_SONGS_PLAYLIST_NAME,
          });
          allTracks = mergedUnique;
        } else if (!masterData.isLikedSongs) {
          await updateDoc(doc(db, 'playlists', masterDoc.id), { isLikedSongs: true });
        }

        setLikedPlaylistId(masterDoc.id);
        setLikedTracks(deduplicateFirebaseTracks(allTracks));
        setIsLoading(false);

        // Set up the real-time listener for the master doc
        return onSnapshot(doc(db, 'playlists', masterDoc.id), (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data() as Playlist;
            setLikedTracks(data.tracks || []);
          }
          setIsLoading(false);
        });
      } catch (err) {
        console.error('Error in LikedSongsSync:', err);
        setIsLoading(false);
      }
    };

    let unsubscribe: (() => void) | undefined;
    findAndMergeLikedPlaylists().then((unsub) => {
      if (unsub) unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, setLikedTracks, setLikedPlaylistId, setIsLoading]);

  return null;
}
