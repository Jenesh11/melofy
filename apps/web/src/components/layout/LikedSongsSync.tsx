'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Playlist, Track as FirebaseTrack } from '@/lib/firebase/playlists';
import { useLikedStore } from '@/store/useLikedStore';

const LIKED_SONGS_PLAYLIST_NAME = 'Liked Songs';

function normalizeToFirebaseTrack(track: any): FirebaseTrack {
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

function deduplicateFirebaseTracks(tracks: any[]): FirebaseTrack[] {
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

    let unsubMasterDoc: (() => void) | undefined;

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

          unsubMasterDoc = onSnapshot(doc(db, 'playlists', newDocRef.id), (docSnapshot) => {
            if (docSnapshot.exists()) {
              const data = docSnapshot.data() as Playlist;
              const normalized = (data.tracks || []).map(normalizeToFirebaseTrack);
              setLikedTracks(normalized);
            }
            setIsLoading(false);
          });
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

        const normalizedMasterTracks = deduplicateFirebaseTracks(allTracks);
        setLikedPlaylistId(masterDoc.id);
        setLikedTracks(normalizedMasterTracks);
        setIsLoading(false);

        // Set up the real-time listener for the master doc
        unsubMasterDoc = onSnapshot(doc(db, 'playlists', masterDoc.id), (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data() as Playlist;
            const normalized = (data.tracks || []).map(normalizeToFirebaseTrack);
            setLikedTracks(normalized);
          }
          setIsLoading(false);
        });
      } catch (err) {
        console.error('Error in LikedSongsSync:', err);
        setIsLoading(false);
      }
    };

    void findAndMergeLikedPlaylists();

    return () => {
      if (unsubMasterDoc) unsubMasterDoc();
    };
  }, [user, setLikedTracks, setLikedPlaylistId, setIsLoading]);

  return null;
}
