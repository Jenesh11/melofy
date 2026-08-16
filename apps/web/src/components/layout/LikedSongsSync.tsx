'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Playlist, Track as FirebaseTrack } from '@/lib/firebase/playlists';
import { useLikedStore } from '@/store/useLikedStore';

const LIKED_SONGS_PLAYLIST_NAME = 'Liked Songs';

export function normalizeToFirebaseTrack(track: any): FirebaseTrack {
  if (track.info && typeof track.info === 'object') {
    return {
      encoded: track.encoded || track.url || '',
      info: {
        identifier: track.info.identifier || track.info.id || track.id || 'unknown',
        title: track.info.title || track.title || 'Unknown Title',
        author: track.info.author || track.info.artist || track.artist || track.author || 'Unknown Artist',
        duration: track.info.duration || track.info.length || track.duration || 0,
        artworkUrl: track.info.artworkUrl || track.artworkUrl || '',
        uri: track.info.uri || `spotify:track:${track.info.identifier || track.id || 'track'}`,
        sourceName: track.info.sourceName || 'spotify',
        isSeekable: true,
        isStream: false,
      },
    };
  }

  return {
    encoded: track.encoded || track.url || '',
    info: {
      identifier: track.id || track.identifier || 'unknown',
      title: track.title || 'Unknown Title',
      author: track.artist || track.author || 'Unknown Artist',
      duration: track.duration || track.length || 0,
      artworkUrl: track.artworkUrl || '',
      uri: `spotify:track:${track.id || track.identifier || 'track'}`,
      sourceName: 'spotify',
      isSeekable: true,
      isStream: false,
    },
  };
}

export function deduplicateFirebaseTracks(tracks: any[]): FirebaseTrack[] {
  const seen = new Set<string>();
  const result: FirebaseTrack[] = [];
  for (const raw of tracks) {
    if (!raw) continue;
    const normalized = normalizeToFirebaseTrack(raw);
    const key = normalized.info.identifier || `${normalized.info.title}_${normalized.info.author}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }
  return result;
}

export function LikedSongsSync() {
  const { user } = useAuth();
  const { setLikedTracks, setLikedPlaylistId, setIsLoading } = useLikedStore();
  const isSyncing = useRef(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    // Listen to all playlists belonging to user in real time (single field query = instant)
    const q = query(
      collection(db, 'playlists'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (isSyncing.current) return;

        try {
          const likedDocs = snapshot.docs.filter((docSnap) => {
            const data = docSnap.data();
            return data.isLikedSongs === true || data.name === LIKED_SONGS_PLAYLIST_NAME;
          });

          if (likedDocs.length === 0) {
            // Check if we have cached liked tracks in local store that need to be synced to Firestore
            const cachedLikedTracks = useLikedStore.getState().likedTracks;
            if (cachedLikedTracks && cachedLikedTracks.length > 0) {
              isSyncing.current = true;
              const newDocRef = await addDoc(collection(db, 'playlists'), {
                userId: user.uid,
                name: LIKED_SONGS_PLAYLIST_NAME,
                trackCount: cachedLikedTracks.length,
                tracks: cachedLikedTracks,
                isLikedSongs: true,
                createdAt: serverTimestamp(),
              });
              setLikedPlaylistId(newDocRef.id);
              isSyncing.current = false;
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
          let allTracks: any[] = [...(masterData.tracks || [])];

          // If there are duplicate liked songs playlists, merge tracks and delete duplicates
          if (likedDocs.length > 1) {
            isSyncing.current = true;
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
            isSyncing.current = false;
          } else if (!masterData.isLikedSongs) {
            await updateDoc(doc(db, 'playlists', masterDoc.id), { isLikedSongs: true });
          }

          const normalizedMasterTracks = deduplicateFirebaseTracks(allTracks);
          setLikedPlaylistId(masterDoc.id);
          setLikedTracks(normalizedMasterTracks);
          setIsLoading(false);
        } catch (err) {
          console.error('[LikedSongsSync] Sync error:', err);
          setIsLoading(false);
          isSyncing.current = false;
        }
      },
      (error) => {
        console.error('[LikedSongsSync] Snapshot error:', error);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user, setLikedTracks, setLikedPlaylistId, setIsLoading]);

  return null;
}
