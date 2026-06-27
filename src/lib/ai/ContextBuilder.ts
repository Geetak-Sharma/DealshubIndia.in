import { EntityRegistry } from '../entities/EntityRegistry';
import { DealEntity, BaseEntity } from '../entities/types';

export class ContextBuilder {
  static async buildDealContext(dealId: string): Promise<Record<string, any>> {
    const deal = await EntityRegistry.find(dealId) as DealEntity | undefined;
    if (!deal) throw new Error('Deal not found in registry');

    // Retrieve related graph objects for RAG
    const merchant = await EntityRegistry.find(deal.merchantId);
    const category = await EntityRegistry.find(deal.categoryId);
    let brand: BaseEntity | undefined;
    if (deal.brandId) brand = await EntityRegistry.find(deal.brandId);

    return {
      deal,
      merchant,
      category,
      brand,
      // The context structure enforces explicit JSON serialization for LLMs
      _meta: {
        generatedAt: new Date().toISOString(),
        entityType: 'DealContext'
      }
    };
  }

  // Similar functions for buildMerchantContext, buildBlogContext, etc.
}
