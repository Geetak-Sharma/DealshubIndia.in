
import { logger } from '../observability';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

export interface CacheOptions {
  ttlMs?: number;
  swr?: boolean; // stale-while-revalidate
}

export const Cache = {
  get: <T>(key: string): T | null => {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return null;
    }
    return entry.data as T;
  },
  
  set: <T>(key: string, data: T, options: CacheOptions = { ttlMs: 60000 }) => {
    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (options.ttlMs || 60000)
    });
  },

  invalidate: (key: string) => {
    memoryCache.delete(key);
  },

  // Helper for SWR wrapping
  wrap: async <T>(key: string, fetcher: () => Promise<T>, options: CacheOptions = { ttlMs: 60000 }): Promise<T> => {
    const cached = Cache.get<T>(key);
    if (cached) {
      if (options.swr) {
        // Fire and forget revalidation
        fetcher().then(newData => Cache.set(key, newData, options)).catch(err => logger.error('SWR Revalidation Failed', err, { key }));
      }
      return cached;
    }
    const fresh = await fetcher();
    Cache.set(key, fresh, options);
    return fresh;
  }
};
