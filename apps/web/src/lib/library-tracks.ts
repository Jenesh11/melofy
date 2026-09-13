import type { Track as FirebaseTrack } from '@/lib/firebase/playlists';

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const text = (...values: unknown[]) => values.find(value => typeof value === 'string' && value) as string | undefined;
export function libraryTrackId(value: unknown): string {
  const track = record(value);
  return text(record(track.info).identifier, record(track.info).id, track.id, track.identifier) || 'unknown';
}
/** Accept historic flat tracks as well as current NodeLink-shaped library entries. */
export function normalizeToFirebaseTrack(value: unknown): FirebaseTrack {
  const track = record(value);
  const info = record(track.info);
  const id = libraryTrackId(track);
  const source = text(info.sourceName, track.source) || (/^[\w-]{11}$/.test(id) ? 'youtube' : 'spotify');
  const duration = Number(info.duration || info.length || track.duration || track.length || 0);
  return {
    encoded: text(track.encoded, track.url) || '',
    info: {
      identifier: id,
      title: text(info.title, track.title) || 'Unknown Title',
      author: text(info.author, info.artist, track.artist, track.author) || 'Unknown Artist',
      duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
      artworkUrl: text(info.artworkUrl, track.artworkUrl) || '',
      uri: text(info.uri, track.uri) || (source === 'youtube' ? `https://www.youtube.com/watch?v=${id}` : source === 'spotify' ? `spotify:track:${id}` : ''),
      sourceName: source,
      isSeekable: info.isSeekable !== false,
      isStream: info.isStream === true,
    },
  };
}
export function deduplicateFirebaseTracks(tracks: unknown[]): FirebaseTrack[] {
  const seen = new Set<string>();
  return tracks.filter(Boolean).map(normalizeToFirebaseTrack).filter(track => {
    const key = track.info.identifier === 'unknown' ? `${track.info.title}|${track.info.author}` : track.info.identifier;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
