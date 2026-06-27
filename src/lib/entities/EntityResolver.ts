import { EntityRegistry } from './EntityRegistry';
import { BaseEntity } from './types';

export class EntityResolver {
  static resolveById(id: string): BaseEntity | undefined {
    // Assuming synchronous MemoryProvider for now.
    // In an async provider, this would be a Promise.
    return EntityRegistry.find(id) as BaseEntity | undefined;
  }

  static resolveBySlug(slug: string): BaseEntity | undefined {
    return EntityRegistry.findBySlug(slug) as BaseEntity | undefined;
  }

  static resolveCanonical(entity: BaseEntity): string {
    // Basic taxonomy routing schema
    switch (entity.type) {
      case 'Deal': return `https://dealshubindia.in/deals/${entity.slug}`;
      case 'Blog': return `https://dealshubindia.in/blog/${entity.slug}`;
      case 'Guide': return `https://dealshubindia.in/guides/${entity.slug}`;
      case 'Merchant': return `https://dealshubindia.in/stores/${entity.slug}`;
      case 'Category': return `https://dealshubindia.in/categories/${entity.slug}`;
      default: return `https://dealshubindia.in/${entity.slug}`;
    }
  }
}
