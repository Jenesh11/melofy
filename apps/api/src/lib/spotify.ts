
import axios from 'axios';

let spotifyAccessToken = '';
let tokenExpirationTime = 0;

export const SPOTIFY_ID_PATTERN = /^[a-zA-Z0-9]{22}$/;

export function validateSpotifyId(rawId: unknown): string | null {
  if (typeof rawId !== 'string') return null;
  const id = rawId.trim();
  if (!SPOTIFY_ID_PATTERN.test(id)) return null;
  return id;
}

export async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET is missing in .env',
    );
  }

  if (spotifyAccessToken && Date.now() < tokenExpirationTime) {
    return spotifyAccessToken;
  }

  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString(
    'base64',
  );

  const response = await axios.post(tokenUrl, 'grant_type=client_credentials', {
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  spotifyAccessToken = response.data.access_token;
  tokenExpirationTime = Date.now() + (response.data.expires_in - 300) * 1000;
  return spotifyAccessToken;
}

export async function spotifyGet(path: string) {
  const token = await getSpotifyToken();
  const res = await axios.get(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function fetchFullSpotifyPlaylist(playlistId: string) {
  // 1. Initial Fetch
  const playlistFields =
    'id,name,description,images,tracks(total,next,items(track(id,name,artists,album,duration_ms)))';
  const data = await spotifyGet(
    `/playlists/${playlistId}?fields=${encodeURIComponent(playlistFields)}`,
  );

  const allItems = [...(data.tracks?.items || [])];
  let nextUrl = data.tracks?.next;

  // 2. Pagination Loop
  while (nextUrl) {
    const urlObj = new URL(nextUrl);
    const trackFields = 'next,items(track(id,name,artists,album,duration_ms))';
    urlObj.searchParams.set('fields', trackFields);

    const nextPath = urlObj.pathname.replace('/v1', '') + urlObj.search;

    try {
      const nextData = await spotifyGet(nextPath);
      allItems.push(...(nextData.items || []));
      nextUrl = nextData.next;
    } catch (err) {
      console.error(
        `[Spotify] Error fetching next tracks batch for playlist ${playlistId}:`,
        err,
      );
      break;
    }
  }

  return {
    ...data,
    tracks: {
      ...data.tracks,
      items: allItems
    }
  };
}
