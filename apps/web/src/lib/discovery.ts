import type { Track } from '@/store/usePlayerStore';
import type { Track as LibraryTrack } from '@/lib/firebase/playlists';

export interface RecommendationTrack {
  id: string; identifier?: string; title: string; artist: string; duration: number;
  artwork: string; encoded: string; source?: string; uri?: string; recordingMbid?: string;
}
export function recommendationToTrack(track: RecommendationTrack): Track {
  return { id: track.id, identifier: track.identifier, title: track.title, artist: track.artist,
    duration: track.duration || 0, artworkUrl: track.artwork || '', url: track.encoded || '',
    source: track.source, uri: track.uri, recordingMbid: track.recordingMbid };
}
export function libraryToTrack(track: LibraryTrack): Track {
  return { id: track.info.identifier, identifier: track.info.identifier, title: track.info.title,
    artist: track.info.author, duration: track.info.duration || 0, artworkUrl: track.info.artworkUrl || '',
    url: track.encoded || '', source: track.info.sourceName, uri: track.info.uri };
}
/** Exclude large encoded audio payloads from recommendation seed requests. */
export function seedMetadata(track: Track) {
  return { id: track.id, identifier: track.identifier, title: track.title, artist: track.artist,
    duration: track.duration, artworkUrl: track.artworkUrl, source: track.source, recordingMbid: track.recordingMbid };
}
