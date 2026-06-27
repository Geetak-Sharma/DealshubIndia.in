import { DealEntity } from '../entities/types';

export class ConfidenceEngine {
  static calculate(deal: DealEntity, qualityScore: number, isDuplicate: boolean): number {
    let confidence = 100;
    
    // Data Completeness
    if (qualityScore < 50) confidence -= 30;
    else if (qualityScore < 80) confidence -= 10;

    // Duplicate Trust
    if (isDuplicate) confidence -= 40;

    // Price Consistency Check (Assume currentPrice missing drops confidence heavily)
    if (!deal.metadata?.currentPrice) confidence -= 50;

    return Math.max(0, confidence);
  }
}
