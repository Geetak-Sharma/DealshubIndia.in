import { IEntityProvider } from './providers/IEntityProvider';
import { MemoryProvider } from './providers/MemoryProvider';
import { BaseEntity } from './types';
import { CacheManager } from '../cache/CacheManager';
import { CachePolicies } from '../cache/CachePolicy';
import { CacheKey } from '../cache/CacheKey';

class EntityRegistryImpl {
  private provider: IEntityProvider;

  constructor(provider?: IEntityProvider) {
    this.provider = provider || new MemoryProvider();
  }

  setProvider(provider: IEntityProvider) {
    this.provider = provider;
  }

  async register(entity: BaseEntity): Promise<void> {
    await this.provider.upsert(entity);
    // Trigger intelligent cache invalidation on upsert
    await CacheManager.invalidateEntity(entity.id, entity.type);
  }

  async find(id: string): Promise<BaseEntity | undefined> {
    const key = CacheKey.entity(id);
    return CacheManager.getOrFetch(key, CachePolicies.Deals, async () => {
      const data = await this.provider.findById(id);
      if (!data) throw new Error('Not found');
      return data;
    }).catch(() => undefined);
  }

  async findBySlug(slug: string): Promise<BaseEntity | undefined> {
    const key = CacheKey.entity(`slug:${slug}`);
    return CacheManager.getOrFetch(key, CachePolicies.Deals, async () => {
      const data = await this.provider.findBySlug(slug);
      if (!data) throw new Error('Not found');
      return data;
    }).catch(() => undefined);
  }

  async getAll(): Promise<BaseEntity[]> {
    return CacheManager.getOrFetch('query:all', CachePolicies.Deals, async () => {
      return this.provider.getAll();
    });
  }
}

export const EntityRegistry = new EntityRegistryImpl();
