import { DealEntity } from '../entities/types';
import { ScoringConfig } from './scoring.config';
import { IntelligenceMetrics } from './IntelligenceMetrics';

export class DuplicateDetector {
  private static normalizeTitle(title: string): string {
    // Remove special characters, lowercase, sort tokens
    return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).sort().join(' ');
  }

  static isDuplicate(newDeal: DealEntity, existingDeals: DealEntity[]): boolean {
    const normalizedNewTitle = this.normalizeTitle(newDeal.name);
    
    for (const existing of existingDeals) {
      // Rule 1: Same Merchant and Identical Normalized Title
      if (newDeal.merchantId === existing.merchantId) {
        if (this.normalizeTitle(existing.name) === normalizedNewTitle) {
          
          // Rule 2: Price similarity (within threshold variance)
          if (newDeal.metadata?.currentPrice && existing.metadata?.currentPrice) {
            const priceDiff = Math.abs(newDeal.metadata.currentPrice - existing.metadata.currentPrice);
            const variance = priceDiff / existing.metadata.currentPrice;
            
            if (variance <= ScoringConfig.thresholds.duplicatePriceVariance) {
              IntelligenceMetrics.recordDuplicate();
              return true;
            }
          } else {
             // If no prices are present, title + merchant match is a hard duplicate
             IntelligenceMetrics.recordDuplicate();
             return true;
          }
        }
      }
    }
    
    return false;
  }
}
