import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  getDoc,
  deleteDoc, 
  doc,
  serverTimestamp,
  updateDoc,
  runTransaction,
  Timestamp,
  FieldValue
} from 'firebase/firestore';
import { db } from './config';
import { deduplicateFirebaseTracks, libraryTrackId, normalizeToFirebaseTrack } from '@/lib/library-tracks';

export interface Track {
  encoded: string;
  info: {
    identifier: string;
    title: string;
    author: string;
    duration: number;
    artworkUrl?: string;
    uri: string;
    sourceName: string;
    isSeekable: boolean;
    isStream: boolean;
    isrc?: string | null;
  };
}

export interface Playlist {
  id?: string;
  userId: string;
  name: string;
  trackCount: number;
  coverUrl?: string;
  artworkUrl?: string;
  createdAt?: Timestamp | FieldValue;
  tracks: Track[];
  isLikedSongs?: boolean;
  /** Where an imported playlist came from (see playlistSourceId). */
  sourceId?: string;
}

export const LIKED_SONGS_PLAYLIST_NAME = 'Liked Songs';

// Firestore rejects documents over 1 MiB; leave headroom for its own field overhead.
const MAX_PLAYLIST_BYTES = 950_000;

export class PlaylistTooLargeError extends Error {
  constructor(name: string, trackCount: number) {
    super(`"${name}" has too many tracks to save (${trackCount}). Try a smaller playlist.`);
    this.name = 'PlaylistTooLargeError';
  }
}

export function isLikedSongsData(data: { isLikedSongs?: unknown; name?: unknown }) {
  return data.isLikedSongs === true || data.name === LIKED_SONGS_PLAYLIST_NAME;
}

/** Stable identity for an imported playlist so re-importing the same link refreshes it. */
export function playlistSourceId(input: string): string | undefined {
  const spotify = input.match(/(?:spotify\.com\/(?:intl-[\w-]+\/)?|spotify:)(?:playlist|album)[/:]([a-zA-Z0-9]{22})/);
  if (spotify) return `spotify:${spotify[1]}`;
  const youtube = input.match(/[?&]list=([\w-]+)/);
  if (youtube) return `youtube:${youtube[1]}`;
  return undefined;
}

type NewPlaylist = Omit<Playlist, 'id' | 'userId' | 'createdAt'> & { description?: string };

/**
 * Adds a new playlist to Firestore for a specific user.
 * Re-importing the same source (or re-creating Liked Songs) reuses the existing document;
 * playlists that merely share a name are kept separate so one import can't overwrite another.
 */
export async function addPlaylist(userId: string, playlistData: NewPlaylist): Promise<{ id: string, updated: boolean }> {
  try {
    const data = { ...playlistData, tracks: (playlistData.tracks || []).map(normalizeToFirebaseTrack) };
    if (new TextEncoder().encode(JSON.stringify(data)).length > MAX_PLAYLIST_BYTES) {
      throw new PlaylistTooLargeError(data.name, data.tracks.length);
    }

    const matches = data.isLikedSongs
      ? isLikedSongsData
      : data.sourceId
        ? (existing: { sourceId?: unknown }) => existing.sourceId === data.sourceId
        : null;

    if (matches) {
      const existingSnap = await getDocs(query(collection(db, 'playlists'), where('userId', '==', userId)));
      const existingDoc = existingSnap.docs.find(d => matches(d.data()));
      if (existingDoc) {
        // Never replace an existing Liked Songs list with a fresh (usually empty) one.
        if (data.isLikedSongs) return { id: existingDoc.id, updated: false };
        await updateDoc(doc(db, 'playlists', existingDoc.id), data);
        return { id: existingDoc.id, updated: true };
      }
    }

    const playlistRef = await addDoc(collection(db, 'playlists'), {
      ...data,
      userId,
      createdAt: serverTimestamp(),
    });
    return { id: playlistRef.id, updated: false };
  } catch (error) {
    console.error('Error adding/updating playlist:', error);
    throw error;
  }
}

/**
 * Fetches all playlists for a specific user from Firestore.
 * Throws on failure so callers can tell "empty library" apart from "couldn't load".
 */
export async function getUserPlaylists(userId: string): Promise<Playlist[]> {
  const q = query(
    collection(db, 'playlists'),
    where('userId', '==', userId),
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Playlist))
    .sort((a, b) => {
      const timeA = (a.createdAt && 'seconds' in a.createdAt ? a.createdAt.seconds : 0);
      const timeB = (b.createdAt && 'seconds' in b.createdAt ? b.createdAt.seconds : 0);
      return timeB - timeA;
    });
}

/** Finds the user's Liked Songs playlist, creating it on first use. */
async function ensureLikedSongsPlaylist(userId: string): Promise<string> {
  const { id } = await addPlaylist(userId, {
    name: LIKED_SONGS_PLAYLIST_NAME,
    trackCount: 0,
    tracks: [],
    isLikedSongs: true,
  });
  return id;
}

/**
 * Likes or unlikes a track against the server copy inside a transaction, so a stale local list
 * can never drop tracks liked on another device. Returns the Liked Songs playlist id.
 */
export async function saveLikedSongChange(
  userId: string,
  knownPlaylistId: string | null,
  change: { add: Track } | { removeId: string },
): Promise<string> {
  let playlistId = knownPlaylistId;
  for (let attempt = 0; attempt < 2; attempt++) {
    playlistId ||= await ensureLikedSongsPlaylist(userId);
    const ref = doc(db, 'playlists', playlistId);
    const saved = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      // The cached id can point at a duplicate that LikedSongsSync already merged away.
      if (!snap.exists() || snap.data().userId !== userId) return false;
      let tracks = deduplicateFirebaseTracks(snap.data().tracks || []);
      if ('removeId' in change) {
        tracks = tracks.filter(t => libraryTrackId(t) !== change.removeId);
      } else if (!tracks.some(t => libraryTrackId(t) === libraryTrackId(change.add))) {
        tracks = [...tracks, normalizeToFirebaseTrack(change.add)];
      }
      transaction.update(ref, { tracks, trackCount: tracks.length, isLikedSongs: true });
      return true;
    });
    if (saved) return playlistId;
    playlistId = null;
  }
  throw new Error('Liked Songs playlist is unavailable');
}

/**
 * Fetches a single playlist by its ID.
 */
export async function getPlaylistById(playlistId: string): Promise<Playlist | null> {
  try {
    const snap = await getDoc(doc(db, 'playlists', playlistId));
    if (!snap.exists()) return null;
    return {
      id: snap.id,
      ...snap.data(),
    } as Playlist;
  } catch (error) {
    console.error('Error getting playlist by ID:', error);
    return null;
  }
}

/**
 * Deletes a playlist from Firestore.
 */
export async function deletePlaylist(playlistId: string) {
  try {
    await deleteDoc(doc(db, 'playlists', playlistId));
  } catch (error) {
    console.error('Error deleting playlist:', error);
    throw error;
  }
}

/**
 * Renames a playlist in Firestore.
 */
export async function renamePlaylist(playlistId: string, newName: string) {
  try {
    const docRef = doc(db, 'playlists', playlistId);
    await updateDoc(docRef, { name: newName });
  } catch (error) {
    console.error('Error renaming playlist:', error);
    throw error;
  }
}
