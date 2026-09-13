import type { Redis } from '@upstash/redis';

/** Only for disposable discovery/search data, never authoritative user/party state. */
export function optionalCache(redis: Redis) {
  async function attempt<T>(operation: Promise<T>): Promise<T | null> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 800); }),
      ]);
    } catch { return null; }
    finally { if (timer) clearTimeout(timer); }
  }
  return {
    get: <T = unknown>(key: string) => attempt(redis.get<T>(key)),
    set: (key: string, value: unknown, options: { ex: number }) => attempt(redis.set(key, value, options)),
    setex: (key: string, seconds: number, value: unknown) => attempt(redis.setex(key, seconds, value)),
  };
}
