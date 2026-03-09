import { Redis } from '@upstash/redis';

// Initialize Redis only if the URL and Token are provided in env vars
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});
