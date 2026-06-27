import { IEntityProvider } from './IEntityProvider';
import { BaseEntity } from '../types';

export class MemoryProvider implements IEntityProvider {
  private entities: Map<string, BaseEntity> = new Map();

  upsert(entity: BaseEntity): void {
    this.entities.set(entity.id, entity);
  }

  findById(id: string): BaseEntity | undefined {
    return this.entities.get(id);
  }

  findBySlug(slug: string): BaseEntity | undefined {
    for (const entity of this.entities.values()) {
      if (entity.slug === slug) return entity;
    }
    return undefined;
  }

  getAll(): BaseEntity[] {
    return Array.from(this.entities.values());
  }
}
