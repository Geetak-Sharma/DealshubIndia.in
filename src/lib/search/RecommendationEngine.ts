import { EntityRegistry } from '../entities/EntityRegistry';
import { DealEntity } from '../entities/types';
import { SearchEngine } from './SearchEngine';

export class RecommendationRanker {
  static score(sourceDeal: DealEntity, candidateDeal: DealEntity): number {
    let score = 0;
    if (sourceDeal.merchantId && sourceDeal.merchantId === candidateDeal.merchantId) score += 50;
    if (sourceDeal.categoryId && sourceDeal.categoryId === candidateDeal.categoryId) score += 30;
    if (sourceDeal.brandId && sourceDeal.brandId === candidateDeal.brandId) score += 20;
    
    // Future: Popularity, Freshness, Embeddings Similarity
    return score;
  }
}

export class RecommendationEngine {
  static async getRelatedDeals(dealId: string): Promise<any[]> {
    const deal = await EntityRegistry.find(dealId) as DealEntity | undefined;
    if (!deal) throw new Error('Deal not found');

    // Natively querying the SearchEngine for deals in the same category or merchant
    // Utilizing OR-like expansion (pseudo-implementation via broad search)
    const results = await SearchEngine.search('', {
      pagination: { limit: 100, offset: 0 } // Fetch a batch to rerank
    });

    const candidates = [];
    for (const item of results.items) {
        if (item.entityId === dealId) continue;
        const candidateEntity = await EntityRegistry.find(item.entityId) as DealEntity | undefined;
        if (candidateEntity) {
            const score = RecommendationRanker.score(deal, candidateEntity);
            if (score > 0) candidates.push({ item, score });
        }
    }

    // Sort by recommendation rank
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 10).map(c => c.item);
  }

  static async getSimilarDeals(dealId: string) {
     throw new Error('Not implemented');
  }
}
