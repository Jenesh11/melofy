import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc,
  serverTimestamp,
  orderBy,
  updateDoc,
  Timestamp,
  FieldValue
} from 'firebase/firestore';
import { db } from './config';

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
}

/**
 * Adds a new playlist to Firestore for a specific user.
 * If a playlist with the same name exists for the user, it gets updated instead.
 */
export async function addPlaylist(userId: string, playlistData: Omit<Playlist, 'id' | 'userId' | 'createdAt'>): Promise<{ id: string, updated: boolean }> {
  try {
    // Check for existing playlist with same name for this user
    const q = query(
      collection(db, 'playlists'),
      where('userId', '==', userId),
      where('name', '==', playlistData.name)
    );
    const existingSnap = await getDocs(q);

    if (!existingSnap.empty) {
      // Update the existing playlist instead of duplicating
      const existingDoc = existingSnap.docs[0];
      
      await updateDoc(doc(db, 'playlists', existingDoc.id), {
        ...playlistData,
        // we can leave createdAt the way it is on the document
      });
      
      return { id: existingDoc.id, updated: true };
    }

    // Otherwise, create a new one
    const playlistRef = await addDoc(collection(db, 'playlists'), {
      ...playlistData,
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
 */
export async function getUserPlaylists(userId: string): Promise<Playlist[]> {
  try {
    const q = query(
      collection(db, 'playlists'), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Playlist));
  } catch (error) {
    console.error('Error getting playlists:', error);
    return [];
  }
}

/**
 * Fetches a single playlist by its ID.
 */
export async function getPlaylistById(playlistId: string): Promise<Playlist | null> {
  try {
    const docSnap = await getDocs(query(collection(db, 'playlists'), where('__name__', '==', playlistId)));
    
    if (docSnap.empty) return null;
    
    const data = docSnap.docs[0].data();
    return {
      id: docSnap.docs[0].id,
      ...data
    } as Playlist;
  } catch (error) {
    console.error('Error getting playlist by ID:', error);
    throw error;
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
