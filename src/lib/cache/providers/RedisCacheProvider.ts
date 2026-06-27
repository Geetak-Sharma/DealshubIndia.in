import { ICacheProvider, CacheEntry } from '../CacheProvider';

export class RedisCacheProvider implements ICacheProvider {
  constructor(private connectionString: string) {}

  async get<T>(key: string): Promise<CacheEntry<T> | undefined> {
    console.warn('RedisCacheProvider is a stub and not fully implemented.');
    return undefined;
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {}
  async delete(key: string): Promise<void> {}
  async clear(): Promise<void> {}
  async keys(): Promise<string[]> { return []; }
}
