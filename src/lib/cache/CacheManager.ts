import { ICacheProvider, CacheEntry } from './CacheProvider';
import { MemoryCacheProvider } from './providers/MemoryCacheProvider';
import { CachePolicyDef } from './CachePolicy';
import { GlobalCacheMetrics } from './CacheMetrics';

type Fetcher<T> = () => Promise<T>;

export class CacheManagerImpl {
  private provider: ICacheProvider;
  
  // Concurrency Engine
  private activeFetches: Map<string, Promise<any>> = new Map();
  private activeRefreshes: Map<string, Promise<void>> = new Map();

  constructor() {
    this.provider = new MemoryCacheProvider(500, 50 * 1024 * 1024); 
  }

  setProvider(provider: ICacheProvider) {
    this.provider = provider;
  }

  async getOrFetch<T>(key: string, policy: CachePolicyDef, fetcher: Fetcher<T>, tags?: string[]): Promise<T> {
    const start = performance.now();
    const entry = await this.provider.get<T>(key);
    const now = Date.now();

    if (entry) {
      // Negative Cache Check: if it's explicitly marked as empty/not-found
      if ((entry.data as any)?.__isNegativeCache) {
        if (now < entry.expiresAt) {
          throw new Error('NotFound (Negative Cached)');
        }
      } else {
        if (now < entry.expiresAt) {
          GlobalCacheMetrics.recordHit(performance.now() - start);
          return entry.data;
        }
        
        if (now < entry.staleAt) {
          GlobalCacheMetrics.recordHit(performance.now() - start);
          this.backgroundRefresh(key, policy, fetcher, tags);
          return entry.data;
        }
      }
    }

    GlobalCacheMetrics.recordMiss(performance.now() - start);
    return this.fetchWithStampedeProtection(key, policy, fetcher, tags);
  }

  // Stampede Protection: ensures only 1 fetch per key executes concurrently
  private async fetchWithStampedeProtection<T>(key: string, policy: CachePolicyDef, fetcher: Fetcher<T>, tags?: string[]): Promise<T> {
    if (this.activeFetches.has(key)) {
      return this.activeFetches.get(key) as Promise<T>;
    }

    const promise = this.executeFetchAndSet(key, policy, fetcher, tags).finally(() => {
      this.activeFetches.delete(key);
    });

    this.activeFetches.set(key, promise);
    return promise;
  }

  // SWR Deduplication: ensures only 1 background refresh per key executes concurrently
  private backgroundRefresh<T>(key: string, policy: CachePolicyDef, fetcher: Fetcher<T>, tags?: string[]) {
    if (this.activeRefreshes.has(key)) return; // Deduplication logic

    GlobalCacheMetrics.refreshes++;
    
    const promise = this.executeFetchAndSet(key, policy, fetcher, tags)
      .catch(err => {
        console.error(`Background refresh failed for key: ${key}`, err);
      })
      .finally(() => {
        this.activeRefreshes.delete(key);
      });

    this.activeRefreshes.set(key, promise);
  }

  private async executeFetchAndSet<T>(key: string, policy: CachePolicyDef, fetcher: Fetcher<T>, tags?: string[]): Promise<T> {
    try {
      const data = await fetcher();
      const now = Date.now();
      
      await this.provider.set(key, {
        data,
        expiresAt: now + (policy.ttlSeconds * 1000),
        staleAt: now + (policy.swrSeconds * 1000),
        tags
      });
      
      return data;
    } catch (err: any) {
      // Negative Caching strategy
      if (err.message && (err.message.includes('NotFound') || err.message.includes('Empty'))) {
        const now = Date.now();
        await this.provider.set(key, {
          data: { __isNegativeCache: true } as any,
          expiresAt: now + 30000, // 30s negative cache
          staleAt: now + 30000,
          tags
        });
      }
      throw err;
    }
  }

  // Advanced Invalidation
  async invalidate(key: string) { await this.provider.delete(key); }
  async invalidatePrefix(prefix: string) { await this.provider.deleteByPrefix(prefix); }
  async invalidateTag(tag: string) { await this.provider.deleteByTag(tag); }
  async invalidateAll() { await this.provider.clear(); }

  // Backward compatible intelligent invalidation for EntityRegistry
  async invalidateEntity(entityId: string, entityType: string) {
    await this.invalidate(`v1:entity:${entityId}`); // Assumes CacheKey structure
    await this.invalidatePrefix(`v1:query:${entityType}`);
  }
}

export const CacheManager = new CacheManagerImpl();
