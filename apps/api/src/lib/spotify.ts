
import axios from 'axios';

let spotifyAccessToken = '';
let tokenExpirationTime = 0;
let tokenRequest: Promise<string> | null = null;

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

  if (!tokenRequest) tokenRequest = (async () => {
    const response = await axios.post(tokenUrl, 'grant_type=client_credentials', {
      timeout: 8000,
      headers: { Authorization: `Basic ${authHeader}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    spotifyAccessToken = response.data.access_token;
    tokenExpirationTime = Date.now() + Math.max(0, response.data.expires_in - 300) * 1000;
    return spotifyAccessToken;
  })().finally(() => { tokenRequest = null; });
  return tokenRequest;
}

export async function spotifyGet(path: string) {
  const token = await getSpotifyToken();
  const res = await axios.get(`https://api.spotify.com/v1${path}`, {
    timeout: 8000,
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

/** Normalize both the existing track wrapper and the newer playlist item wrapper. */
export async function fetchFullSpotifyPlaylist(playlistId: string, get = spotifyGet) {
  if (!validateSpotifyId(playlistId)) throw new Error('Invalid Spotify playlist ID');
  // Omit a track-only fields projection: it rejects the newer items schema.
  const data = await get(`/playlists/${playlistId}`);
  let page = data.tracks || data.items;
  if (!page || !Array.isArray(page.items)) {
    try { page = await get(`/playlists/${playlistId}/tracks?limit=50`); }
    catch (error) {
      if (!axios.isAxiosError(error) || ![400, 404].includes(error.response?.status || 0)) throw error;
      page = await get(`/playlists/${playlistId}/items?limit=50`);
    }
  }
  const allItems: Array<{ track: unknown }> = [];
  const visited = new Set<string>();
  let total: number | undefined;
  while (true) {
    if (!Array.isArray(page.items)) throw new Error('Playlist items unavailable');
    total ??= typeof page.total === 'number' ? page.total : undefined;
    allItems.push(...page.items.map((item: { track?: unknown; item?: unknown }) => ({ track: item?.track ?? item?.item ?? null })));
    if (!page.next) break;
    const next = new URL(page.next);
    if (next.origin !== 'https://api.spotify.com' || !next.pathname.startsWith(`/v1/playlists/${playlistId}/`)) throw new Error('Invalid playlist pagination URL');
    const path = next.pathname.slice(3) + next.search;
    if (visited.has(path) || visited.size >= 200) throw new Error('Playlist pagination did not complete');
    visited.add(path);
    // A failed page must fail the import, rather than silently saving a truncated playlist.
    page = await get(path);
  }
  if (total !== undefined && allItems.length < total) throw new Error('Incomplete playlist response');
  return { ...data, tracks: { total: total ?? allItems.length, next: null, items: allItems } };
}
