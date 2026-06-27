import { EntityRegistry, BaseEntity, DealEntity, BlogEntity } from '../entities/EntityRegistry';

export class RelatedContentService {
  
  static getRelatedDeals(entity: BaseEntity): DealEntity[] {
    const related = EntityRegistry.related(entity);
    return related.filter((e): e is DealEntity => e.type === 'Deal');
  }

  static getRelatedBlogs(entity: BaseEntity): BlogEntity[] {
    const related = EntityRegistry.related(entity);
    return related.filter((e): e is BlogEntity => e.type === 'Blog');
  }

  // To be implemented: ranking algorithms, caching, and weighted scoring
}
