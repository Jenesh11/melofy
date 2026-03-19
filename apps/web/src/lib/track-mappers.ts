import type { Track } from '@/store/usePlayerStore';
import type { TrackItem } from '@/lib/track-types';

interface SpotifyArtistLike {
  name?: string;
}

interface SpotifyImageLike {
  url?: string;
}

interface SpotifyAlbumLike {
  name?: string;
  images?: SpotifyImageLike[];
}

export interface SpotifyTrackLike {
  id?: string;
  name?: string;
  artists?: SpotifyArtistLike[];
  album?: SpotifyAlbumLike;
  duration_ms?: number;
}

function mapArtists(artists?: SpotifyArtistLike[]): string {
  return artists?.map((artist) => artist.name).filter(Boolean).join(', ') || 'Unknown';
}

export function mapSpotifyTrackToTrackItem(track: SpotifyTrackLike): TrackItem {
  const title = track.name || 'Unknown Title';
  const artist = mapArtists(track.artists);

  return {
    id: track.id || title,
    title,
    artist,
    artworkUrl: track.album?.images?.[0]?.url || '',
    duration: track.duration_ms || 0,
    album: track.album?.name || artist,
  };
}

export function mapTrackItemToPlayerTrack(track: TrackItem): Track {
  return {
    id: track.id,
    identifier: track.identifier,
    title: track.title,
    artist: track.artist,
    artworkUrl: track.artworkUrl,
    duration: track.duration,
    url: track.encoded || '',
  };
}

export function mapSpotifyTrackToPlayerTrack(track: SpotifyTrackLike): Track {
  return mapTrackItemToPlayerTrack(mapSpotifyTrackToTrackItem(track));
}
