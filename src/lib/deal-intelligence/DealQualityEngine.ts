import { DealEntity } from '../entities/types';

export class DealQualityEngine {
  static evaluate(deal: DealEntity): number {
    let score = 0;

    // Title Quality (Max 25)
    if (deal.name && deal.name.length > 15 && deal.name.length < 100) score += 25;

    // Entity Completeness (Max 25)
    if (deal.merchantId) score += 10;
    if (deal.categoryId) score += 10;
    if (deal.brandId) score += 5;

    // Image Presence (Max 25)
    // Assuming metadata holds images for architectural stub
    if (deal.metadata?.images && Array.isArray(deal.metadata.images) && deal.metadata.images.length > 0) score += 25;

    // Description/Schema Completeness (Max 25)
    if (deal.metadata?.description && deal.metadata.description.length > 50) score += 25;

    return Math.min(100, score);
  }
}
