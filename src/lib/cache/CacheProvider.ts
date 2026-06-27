export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  staleAt: number;
  estimatedBytes?: number;
  tags?: string[];
}

export interface ICacheProvider {
  get<T>(key: string): CacheEntry<T> | undefined | Promise<CacheEntry<T> | undefined>;
  set<T>(key: string, entry: CacheEntry<T>): void | Promise<void>;
  delete(key: string): void | Promise<void>;
  deleteByPrefix(prefix: string): void | Promise<void>;
  deleteByTag(tag: string): void | Promise<void>;
  clear(): void | Promise<void>;
  keys(): string[] | Promise<string[]>;
}
