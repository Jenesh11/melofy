import { Router } from 'express';
import { Redis } from '@upstash/redis';
import { requireFirebaseAuth } from '../lib/firebaseAuth';

const router = Router();
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const MAX_STATE_SIZE_BYTES = 256 * 1024; // 256KB limit

// GET /api/player-state - Fetch persisted player state
router.get('/player-state', requireFirebaseAuth, async (req, res) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Using the same key pattern as the frontend for consistency: player:{userId}
    const state = await redis.get(`player:${uid}`);
    res.json({ state: state || null });
  } catch (error) {
    console.error('[PlayerState] Failed to fetch state:', error);
    res.status(500).json({ error: 'Failed to fetch player state' });
  }
});

// POST /api/player-state - Persist current player state
router.post('/player-state', requireFirebaseAuth, async (req, res) => {
  const uid = req.user?.uid;
  const { state } = req.body;

  if (!uid) return res.status(401).json({ error: 'Unauthorized' });
  if (!state) return res.status(400).json({ error: 'Missing state' });

  try {
    const serializedState = JSON.stringify(state);
    if (Buffer.byteLength(serializedState, 'utf8') > MAX_STATE_SIZE_BYTES) {
      return res.status(413).json({ error: 'Player state payload too large' });
    }

    // Store state for 14 days (matching the frontend's previous policy)
    await redis.set(`player:${uid}`, serializedState, { ex: 60 * 60 * 24 * 14 });
    res.json({ success: true });
  } catch (error) {
    console.error('[PlayerState] Failed to save state:', error);
    res.status(500).json({ error: 'Failed to save player state' });
  }
});

export default router;
