import { Router } from 'express';
import axios from 'axios';
import { Redis } from '@upstash/redis';

const router = Router();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

let spotifyAccessToken = '';
let tokenExpirationTime = 0;

async function getSpotifyToken() {
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

// Helper to call Spotify API
async function spotifyGet(path: string) {
  const token = await getSpotifyToken();
  const res = await axios.get(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

/**
 * GET /api/spotify/trending
 * Uses the Search API to get top tracks in the "top" genre query.
 * We use Spotify's public Global Top 50 playlist (still accessible by ID).
 */
router.get('/trending', async (req, res) => {
  try {
    // This is a publicly accessible playlist, not a Spotify editorial featured list
    // The Top 50 - Global is accessible via playlist tracks endpoint
    const playlistId = '37i9dQZEVXbMDoHDwVN2tF';
    const data = await spotifyGet(`/playlists/${playlistId}/tracks?limit=50`);
    res.json(data.items.filter((item: any) => item.track));
  } catch (error: any) {
    // Fallback: use search API for popular tracks
    try {
      console.log(
        '[Spotify] Playlist fallback — using search API for trending',
      );
      const data = await spotifyGet(
        `/search?q=year:2024-2025&type=track&limit=50&market=US`,
      );
      // Transform to match the {track} shape expected by frontend
      res.json(data.tracks.items.map((track: any) => ({ track })));
    } catch (fallbackError: any) {
      console.error(
        '[Spotify] Trending error:',
        fallbackError?.response?.data || fallbackError.message,
      );
      res.status(500).json({ error: 'Failed to fetch trending tracks' });
    }
  }
});

/**
 * GET /api/spotify/new-releases
 * Uses the browse/new-releases endpoint (still available)
 */
router.get('/new-releases', async (req, res) => {
  try {
    const data = await spotifyGet(`/browse/new-releases?limit=15&country=US`);
    res.json(data.albums.items);
  } catch (error: any) {
    console.error(
      '[Spotify] New releases error:',
      error?.response?.data || error.message,
    );
    res.status(500).json({ error: 'Failed to fetch new releases' });
  }
});

/**
 * GET /api/spotify/recommendations
 * Spotify's /v1/recommendations was deprecated for new apps.
 * Replacement: Use the Search API with genre filters for a smart recommendation-like experience.
 */
router.get('/recommendations', async (req, res) => {
  const genre = (req.query.genre as string) || 'pop';
  const mood = (req.query.mood as string) || '';

  // Build a smart search query to simulate content-based filtering
  const genres = [
    'pop',
    'hip-hop',
    'r&b',
    'indie',
    'electronic',
    'lo-fi',
    'soul',
    'rock',
  ];
  const chosenGenre = genres.includes(genre)
    ? genre
    : genres[Math.floor(Math.random() * genres.length)];

  const query = mood ? `genre:${chosenGenre} ${mood}` : `genre:${chosenGenre}`;

  try {
    const data = await spotifyGet(
      `/search?q=${encodeURIComponent(query)}&type=track&limit=50&market=US`,
    );
    res.json(data.tracks.items);
  } catch (error: any) {
    console.error(
      '[Spotify] Recommendations error:',
      error?.response?.data || error.message,
    );
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

/**
 * GET /api/spotify/popular-playlists
 * Uses search queries for popular playlists since direct IDs for editorial playlists often return 404 now.
 */
router.get('/popular-playlists', async (req, res) => {
  const SEARCH_QUERIES = [
    "Today's Top Hits",
    'RapCaviar',
    'New Music Friday',
    'mint',
    'Rock Classics',
    'Punjabi',
    'Hot Country',
    'Peaceful Piano',
    'Indie Pop',
  ];

  try {
    const results = await Promise.allSettled(
      SEARCH_QUERIES.map((q) =>
        spotifyGet(`/search?q=${encodeURIComponent(q)}&type=playlist&limit=5`),
      ),
    );

    const playlists = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => {
        const items = r.value?.playlists?.items || [];
        // Find the first playlist that isn't null (Spotify returns null for restricted editorial playlists)
        return items.find((p: any) => p !== null);
      })
      .filter(Boolean); // Ensure no empty slots in carousel

    res.json(playlists);
  } catch (error: any) {
    console.error(
      '[Spotify] Popular playlists error:',
      error?.response?.data || error.message,
    );
    res.status(500).json({ error: 'Failed to fetch popular playlists' });
  }
});

/**
 * GET /api/spotify/mixes
 * Genre-based "mixes" using search API by different moods/vibes.
 * Each "mix" is fetched as a search result collection of tracks.
 */
router.get('/mixes', async (req, res) => {
  const mixQueries = [
    { name: 'Chill Vibes', query: 'Chill Mix' },
    { name: 'Workout Energy', query: 'Workout Mix' },
    { name: 'Indie Focus', query: 'Indie Mix' },
    { name: 'Hip-Hop Fire', query: 'Hip-Hop Mix' },
    { name: 'Acoustic Soul', query: 'Acoustic Mix' },
    { name: 'Lofi Beats', query: 'Lofi Mix' },
    { name: 'Electronic Dance', query: 'EDM Mix' },
    { name: 'R&B Grooves', query: 'R&B Mix' },
    { name: 'Rock Anthems', query: 'Rock Mix' },
    { name: 'Deep Focus', query: 'Deep Focus Mix' },
    { name: 'Late Night Jazz', query: 'Late Night Jazz Mix' },
    { name: 'Pop Hits', query: 'Pop Mix' },
  ];

  try {
    const results = await Promise.allSettled(
      mixQueries.map((m) =>
        spotifyGet(
          `/search?q=${encodeURIComponent(m.query)}&type=playlist&limit=10&market=US`,
        ),
      ),
    );

    const playlists: any[] = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled') {
        const items: any[] = r.value?.playlists?.items || [];
        const validPlaylist = items.find((p: any) => p !== null);
        if (validPlaylist) {
          validPlaylist.name = mixQueries[i].name;
          playlists.push(validPlaylist);
        }
      }
    }

    res.json(playlists);
  } catch (error: any) {
    console.error(
      '[Spotify] Mixes error:',
      error?.response?.data || error.message,
    );
    res.status(500).json({ error: 'Failed to fetch mixes' });
  }
});

/**
 * GET /api/spotify/albums/:id/tracks
 * Fetches tracks for a specific album.
 */
router.get('/albums/:id/tracks', async (req, res) => {
  const { id } = req.params;
  try {
    const data = await spotifyGet(`/albums/${id}/tracks?limit=50`);
    res.json(data);
  } catch (error: any) {
    console.error(
      '[Spotify] Album tracks error:',
      error?.response?.data || error.message,
    );
    res.status(500).json({ error: 'Failed to fetch album tracks' });
  }
});

/**
 * GET /api/spotify/playlists/:id/tracks
 * Fetches tracks for a specific playlist.
 */
router.get('/playlists/:id/tracks', async (req, res) => {
  const { id } = req.params;
  try {
    const data = await spotifyGet(`/playlists/${id}/tracks?limit=50`);
    res.json(data);
  } catch (error: any) {
    console.error(
      '[Spotify] Playlist tracks error:',
      error?.response?.data || error.message,
    );
    res.status(500).json({ error: 'Failed to fetch playlist tracks' });
  }
});

/**
 * GET /api/spotify/playlists/:id
 * Fetches full playlist metadata and tracks with pagination to bypass the 100 tracks limit.
 * Optimized with 'fields' query to reduce payload size.
 */
router.get('/playlists/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Check Redis Cache First
    const cacheKey = `spotify:playlist:${id}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      console.log(`[Spotify] ⚡ Serving playlist ${id} from Redis Cache`);
      return res.json(cachedData);
    }

    // 2. Cache Miss: Fetch from Spotify API
    console.log(`[Spotify] 🌐 Fetching playlist ${id} from live API`);

    // Use fields to limit response size. For playlist: we need id, name, description, images.
    // For tracks: we need total, next url, and items containing the track object.
    const playlistFields =
      'id,name,description,images,tracks(total,next,items(track(id,name,artists,album,duration_ms)))';
    const data = await spotifyGet(
      `/playlists/${id}?fields=${encodeURIComponent(playlistFields)}`,
    );

    const allItems = [...(data.tracks?.items || [])];
    let nextUrl = data.tracks?.next;

    // Process pagination for large playlists loop
    while (nextUrl) {
      console.log(
        `[Spotify] Fetching next batch of tracks for playlist ${id}...`,
      );
      const urlObj = new URL(nextUrl);

      // Optimize pagination fetch with fields as well
      const trackFields =
        'next,items(track(id,name,artists,album,duration_ms))';
      urlObj.searchParams.set('fields', trackFields);

      const nextPath = urlObj.pathname.replace('/v1', '') + urlObj.search;

      try {
        const nextData = await spotifyGet(nextPath);
        allItems.push(...(nextData.items || []));
        nextUrl = nextData.next;
      } catch (err) {
        console.error(
          `[Spotify] Error fetching next tracks batch for playlist ${id}:`,
          err,
        );
        break; // Stop fetching on error but return what we currently have
      }
    }

    const formattedData = {
      id: data.id,
      name: data.name,
      description: data.description,
      artworkUrl: data.images?.[0]?.url || '',
      trackCount: data.tracks?.total || 0,
      tracks: allItems.map((item: any) => item.track).filter(Boolean) || [],
    };

    // 3. Save to Redis Cache (Expire after 1 hour = 3600 seconds)
    await redis.set(cacheKey, JSON.stringify(formattedData), { ex: 3600 });

    res.json(formattedData);
  } catch (error: any) {
    console.error(
      '[Spotify] Playlist details error:',
      error?.response?.data || error.message,
    );
    res.status(500).json({ error: 'Failed to fetch playlist details' });
  }
});

/**
 * GET /api/spotify/search?q=...
 * General search passthrough for the frontend.
 */
router.get('/search', async (req, res) => {
  const q = req.query.q as string;
  const type = (req.query.type as string) || 'track';
  if (!q) return res.status(400).json({ error: 'Missing query parameter q' });

  try {
    const data = await spotifyGet(
      `/search?q=${encodeURIComponent(q)}&type=${type}&limit=20&market=US`,
    );
    res.json(data);
  } catch (error: any) {
    console.error(
      '[Spotify] Search error:',
      error?.response?.data || error.message,
    );
    res.status(500).json({ error: 'Failed to search Spotify' });
  }
});

export default router;
