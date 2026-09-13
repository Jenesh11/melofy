'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Playlist } from '@/lib/firebase/playlists';
import { useLikedStore } from '@/store/useLikedStore';

const LIKED_SONGS_PLAYLIST_NAME = 'Liked Songs';

export { normalizeToFirebaseTrack, deduplicateFirebaseTracks } from '@/lib/library-tracks';
import { deduplicateFirebaseTracks } from '@/lib/library-tracks';

export function LikedSongsSync() {
  const { user } = useAuth();
  const { setLikedTracks, setLikedPlaylistId, setIsLoading } = useLikedStore();

  useEffect(() => {
    useLikedStore.getState().bindUser(user?.uid || null);
    if (!user) {
      return;
    }

    let active = true;
    let syncing = false;
    const ownsAccount = () => active && useLikedStore.getState().userId === user.uid;

    // Listen to all playlists belonging to user in real time (single field query = instant)
    const q = query(
      collection(db, 'playlists'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (!ownsAccount()) return;
        if (syncing) return;

        try {
          const likedDocs = snapshot.docs.filter((docSnap) => {
            const data = docSnap.data();
            return data.isLikedSongs === true || data.name === LIKED_SONGS_PLAYLIST_NAME;
          });

          if (likedDocs.length === 0) {
            // Check if we have cached liked tracks in local store that need to be synced to Firestore
            const cachedLikedTracks = useLikedStore.getState().likedTracks;
            if (cachedLikedTracks && cachedLikedTracks.length > 0) {
              syncing = true;
              const newDocRef = await addDoc(collection(db, 'playlists'), {
                userId: user.uid,
                name: LIKED_SONGS_PLAYLIST_NAME,
                trackCount: cachedLikedTracks.length,
                tracks: cachedLikedTracks,
                isLikedSongs: true,
                createdAt: serverTimestamp(),
              });
              if (!ownsAccount()) return;
              setLikedPlaylistId(newDocRef.id);
              syncing = false;
            }
            setIsLoading(false);
            return;
          }

          // Sort so the document with the most tracks is selected as the primary master
          likedDocs.sort((a, b) => {
            const countA = (a.data().tracks?.length) || a.data().trackCount || 0;
            const countB = (b.data().tracks?.length) || b.data().trackCount || 0;
            return countB - countA;
          });

          const masterDoc = likedDocs[0];
          const masterData = masterDoc.data() as Playlist;
          let allTracks: unknown[] = [...(masterData.tracks || [])];

          // If there are duplicate liked songs playlists, merge tracks and delete duplicates
          if (likedDocs.length > 1) {
            syncing = true;
            console.log(`[LikedSongsSync] Found ${likedDocs.length} Liked Songs playlists. Merging into master ${masterDoc.id}...`);
            for (let i = 1; i < likedDocs.length; i++) {
              const dupDoc = likedDocs[i];
              const dupData = dupDoc.data() as Playlist;
              if (dupData.tracks && Array.isArray(dupData.tracks)) {
                allTracks.push(...dupData.tracks);
              }

            }

            const mergedUnique = deduplicateFirebaseTracks(allTracks);
            await updateDoc(doc(db, 'playlists', masterDoc.id), {
              tracks: mergedUnique,
              trackCount: mergedUnique.length,
              isLikedSongs: true,
              name: LIKED_SONGS_PLAYLIST_NAME,
            });
            // Delete duplicates only after the complete merged master was saved.
            if (!ownsAccount()) return;
            await Promise.all(likedDocs.slice(1).map(duplicate => deleteDoc(doc(db, 'playlists', duplicate.id))));
            allTracks = mergedUnique;
            syncing = false;
          } else if (!masterData.isLikedSongs) {
            await updateDoc(doc(db, 'playlists', masterDoc.id), { isLikedSongs: true });
          }

          if (!ownsAccount()) return;
          const normalizedMasterTracks = deduplicateFirebaseTracks(allTracks);
          setLikedPlaylistId(masterDoc.id);
          setLikedTracks(normalizedMasterTracks);
          setIsLoading(false);
        } catch (err) {
          if (!ownsAccount()) return;
          console.error('[LikedSongsSync] Sync error:', err);
          setIsLoading(false);
          syncing = false;
        }
      },
      (error) => {
        if (!ownsAccount()) return;
        console.error('[LikedSongsSync] Snapshot error:', error);
        setIsLoading(false);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user, setLikedTracks, setLikedPlaylistId, setIsLoading]);

  return null;
}
