import { Router } from 'express';
import { Redis } from '@upstash/redis';
import { requireFirebaseAuth } from '../lib/firebaseAuth';
import { 
  validateSpotifyId, 
  spotifyGet, 
  fetchFullSpotifyPlaylist 
} from '../lib/spotify';
import { lavalink } from '../index';

const router = Router();

// All Spotify routes require authentication
router.use(requireFirebaseAuth);

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

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
    // Fetch full 50 tracks from Top 50 Global playlist
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
 * Pulls new releases/hits from YouTube Music via NodeLink
 * mapped to the Spotify track schema expected by the frontend.
 */
router.get('/new-releases', async (req, res) => {
  try {
    const node = lavalink.nodeManager.leastUsedNodes()[0];
    if (!node) {
      return res.status(500).json({ error: 'No NodeLink nodes available' });
    }

    const result = await node.search(
      { query: 'ytmsearch:latest music releases' },
      { id: req.user?.uid || 'MelofyInternal' }
    );

    if (result.loadType === 'empty' || result.loadType === 'error') {
      return res.json([]);
    }

    const rawTracks = (result as any).tracks || (result as any).data || [];
    
    const formatted = rawTracks.slice(0, 10).map((track: any) => ({
      id: track.info.identifier,
      name: track.info.title,
      artists: [{ name: track.info.author }],
      album: {
        id: track.info.identifier,
        name: track.info.title,
        images: [{ url: track.info.artworkUrl }]
      }
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error(
      '[Spotify] New releases error (NodeLink fallback):',
      error?.message,
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

  const cacheKey = `spotify:recommendations:${chosenGenre}:${mood}`;

  try {
    // Check cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const query = mood ? `genre:${chosenGenre} ${mood}` : `genre:${chosenGenre}`;

    const data = await spotifyGet(
      `/search?q=${encodeURIComponent(query)}&type=track&limit=10&market=US`,
    );

    const tracks = data.tracks.items;

    // Cache for 24 hours
    await redis.setex(cacheKey, 60 * 60 * 24, tracks);

    res.json(tracks);
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
    "Top hits",
    'Rap hits',
    'New Music',
    'Bollywood hits',
    'Rock',
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
 * POST /api/spotify/discovery
 * Takes a list of artist names from user history and returns curated "Mix" playlists.
 */
router.post('/discovery', async (req, res) => {
  const { artists } = req.body as { artists: string[] };
  if (!artists || !Array.isArray(artists) || artists.length === 0) {
    return res.status(400).json({ error: 'Missing artists in request body' });
  }

  // Get unique artists and limit to top 5 to avoid too many requests
  const uniqueArtists = Array.from(new Set(artists)).slice(0, 5);

  try {
    const results = await Promise.allSettled(
      uniqueArtists.map((artist) =>
        spotifyGet(
          `/search?q=${encodeURIComponent(artist + ' Mix')}&type=playlist&limit=1&market=US`,
        ),
      ),
    );

    const recommendations = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value?.playlists?.items?.[0])
      .filter(Boolean);

    res.json(recommendations);
  } catch (error: any) {
    console.error(
      '[Spotify] Discovery error:',
      error?.response?.data || error.message,
    );
    res.status(500).json({ error: 'Failed to fetch discovery mixes' });
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
    const cacheKey = 'spotify:mixes';
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(cached);

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
    if (playlists.length > 0) {
      await redis.set(cacheKey, playlists, { ex: 21600 }); // 6 hours
    }
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
  const id = validateSpotifyId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid Spotify album ID' });
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
  const id = validateSpotifyId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid Spotify playlist ID' });
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
  const id = validateSpotifyId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid Spotify playlist ID' });
  try {
    // 1. Check Redis Cache First
    const cacheKey = `spotify:playlist:${id}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      console.log(`[Spotify] serving playlist ${id} from Redis cache`);

      if (typeof cachedData === 'string') {
        try {
          return res.json(JSON.parse(cachedData));
        } catch {
          // Continue with live fetch if cache is malformed.
        }
      } else {
        return res.json(cachedData);
      }
    }

    // 2. Cache Miss: Fetch from Spotify API
    console.log(`[Spotify] 🌐 Fetching playlist ${id} from live API`);

    const data = await fetchFullSpotifyPlaylist(id);
    const allItems = data.tracks?.items || [];

    const filteredTracks = (allItems.map((item: any) => item.track).filter(Boolean) || [])
      .filter((t: any) => {
        const hasValidTitle = t.name && typeof t.name === 'string' && t.name.toLowerCase() !== 'unknown' && t.name.toLowerCase() !== 'unknown title';
        const hasValidDuration = typeof t.duration_ms === 'number' && t.duration_ms > 0;
        return t.id && hasValidTitle && hasValidDuration;
      });

    const formattedData = {
      id: data.id,
      name: data.name,
      description: data.description,
      artworkUrl: data.images?.[0]?.url || '',
      trackCount: filteredTracks.length,
      tracks: filteredTracks,
    };

    // 3. Save to Redis Cache (Expire after 1 hour = 3600 seconds)
    await redis.set(cacheKey, formattedData, { ex: 3600 });

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
    const cacheKey = `spotify:search:${type}:${q.toLowerCase().trim()}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`[SpotifyCache] Hit for: ${q}`);
      return res.json(cached);
    }

    const data = await spotifyGet(
      `/search?q=${encodeURIComponent(q)}&type=${type}&limit=10&market=US`,
    );
    
    if (data) {
      await redis.set(cacheKey, data, { ex: 43200 }); // 12 hours
    }
    
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

