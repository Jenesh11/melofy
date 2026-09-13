import { Router } from 'express';
import { createRecommendationService, displayTrack, parseProfile, type RecommendationDependencies } from '../lib/recommendations';

const mixes = [
  { slug: 'chill', name: 'Chill Vibes', query: 'chill acoustic songs' },
  { slug: 'workout', name: 'Workout Energy', query: 'workout energetic music' },
  { slug: 'indie', name: 'Indie Focus', query: 'indie pop songs' },
  { slug: 'lofi', name: 'Lofi Beats', query: 'lofi instrumental beats' },
  { slug: 'rock', name: 'Rock Anthems', query: 'rock anthems songs' },
  { slug: 'jazz', name: 'Late Night Jazz', query: 'late night jazz songs' },
];
function mixDefinition(id: string) {
  const predefined = mixes.find(m => `mix:${m.slug}` === id);
  if (predefined) return predefined;
  if (id.startsWith('mix:artist:')) {
    const artist = Buffer.from(id.slice(11), 'base64url').toString('utf8').trim();
    if (artist && artist.length <= 200 && !/[\u0000-\u001f]/.test(artist)) return { slug: `artist:${id.slice(11)}`, name: `${artist} Mix`, query: `${artist} songs` };
  }
  return null;
}
export function createDiscoveryRouter(deps: RecommendationDependencies) {
  const router = Router();
  const service = createRecommendationService(deps);
  const getMix = async (id: string) => {
    const definition = mixDefinition(id);
    if (!definition) return null;
    const tracks = (await service.search(definition.query)).slice(0, 20);
    if (!tracks.length) throw new Error('No tracks available');
    return { id, name: definition.name, type: 'mix', description: 'A Melofy selection. Save your favorites to make it your own.',
      owner: { display_name: 'Melofy' }, images: tracks[0].artwork ? [{ url: tracks[0].artwork }] : [],
      tracks: { total: tracks.length, items: tracks.map(displayTrack) } };
  };
  router.post('/recommendations', async (req, res) => {
    const profile = parseProfile(req.body);
    const result = await service.recommend(profile);
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(result.tracks.length ? 200 : result.degraded ? 503 : 200).json(result);
  });
  // Backward compatible seed parameters for existing desktop/mobile clients.
  router.get('/recommendations', async (req, res) => {
    const string = (v: unknown) => typeof v === 'string' ? v.slice(0, 300) : '';
    const title = string(req.query.query || req.query.trackId);
    const id = string(req.query.videoId || req.query.spotifyId || req.query.trackId);
    if (!title && !id) return res.status(400).json({ error: 'Missing seed identifier' });
    const profile = parseProfile({ seed: { id: id || title, identifier: string(req.query.videoId), title: title || id, artist: string(req.query.artist) || 'Music' } });
    const result = await service.recommend(profile);
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(result.tracks.length ? 200 : result.degraded ? 503 : 200).json(result);
  });
  router.get('/discovery/mixes/:id', async (req, res) => {
    try {
      const result = await getMix(req.params.id);
      if (!result) return res.status(404).json({ error: 'Unknown mix' });
      res.json(result);
    } catch { res.status(503).json({ error: 'This mix is temporarily unavailable. Please retry.' }); }
  });
  router.get('/discovery/trending', async (_req, res) => {
    try {
      const tracks = await service.search(`popular music songs ${new Date().getFullYear()}`);
      res.status(tracks.length ? 200 : 503).json(tracks.map(t => ({ track: displayTrack(t) })));
    } catch { res.status(503).json({ error: 'Discovery is temporarily unavailable' }); }
  });
  router.post('/discovery/home', async (req, res) => {
    const profile = parseProfile(req.body);
    const requested = Array.isArray(req.body?.sections) ? req.body.sections : null;
    const artists = [...new Set([...profile.history.slice(-8).reverse(), ...profile.liked.slice(-8).reverse()].map(t => t.artist))].slice(0, 3);
    const unavailable: string[] = [];
    const mixResults = async (section: string, ids: string[]) => {
      const results = await Promise.allSettled(ids.map(getMix));
      if (results.some(result => result.status === 'rejected')) unavailable.push(section);
      return results.flatMap(result => result.status === 'fulfilled' && result.value ? [result.value] : []);
    };
    const fields: Record<string, () => Promise<unknown>> = {
      recommendations: async () => {
        const result = await service.recommend(profile);
        if (!result.tracks.length && result.degraded) throw new Error('Unavailable');
        return result.tracks.map(displayTrack);
      },
      trending: async () => (await service.search(`${profile.language === 'all' ? '' : profile.language} popular songs ${new Date().getFullYear()}`)).map(t => ({ track: displayTrack(t) })),
      newReleases: async () => (await service.search(`${profile.language === 'all' ? '' : profile.language} new music ${new Date().getFullYear()} ${profile.genre}`)).map(displayTrack),
      mixes: async () => mixResults('mixes', mixes.slice(0, 3).map(m => `mix:${m.slug}`)),
      editorsPicks: async () => mixResults('editorsPicks', mixes.slice(3).map(m => `mix:${m.slug}`)),
      featuredPlaylists: async () => mixResults('featuredPlaylists', [mixes[0], mixes[3], mixes[4]].map(m => `mix:${m.slug}`)),
      discoveryMixes: async () => mixResults('discoveryMixes', artists.map(artist => `mix:artist:${Buffer.from(artist).toString('base64url')}`)),
    };
    const data: Record<string, unknown> = {};
    await Promise.all(Object.entries(fields).filter(([key]) => !requested || requested.includes(key)).map(async ([key, run]) => {
      try {
        const result = await run();
        if (Array.isArray(result) && result.length === 0 && key !== 'discoveryMixes') throw new Error('Empty');
        data[key] = result;
      } catch { unavailable.push(key); }
    }));
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ ...data, unavailable: [...new Set(unavailable)] });
  });
  return router;
}
