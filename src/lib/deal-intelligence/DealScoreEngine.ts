import { ScoringConfig } from './scoring.config';
import { IntelligenceMetrics } from './IntelligenceMetrics';

export class DealScoreEngine {
  static calculateScore(params: {
    discountPercentage: number;
    merchantTrustScore: number;
    hoursSincePosted: number;
    velocityScore: number;
    hasStackableCoupons: boolean;
  }): number {
    const w = ScoringConfig.weights;
    
    // Normalize Discount (0-100)
    let discountNorm = params.discountPercentage;
    if (discountNorm > ScoringConfig.thresholds.suspiciousDiscountPercentage) {
      discountNorm = 50; // Penalize highly suspicious discounts unless verified
      IntelligenceMetrics.recordSuspiciousPrice();
    }

    // Normalize Freshness (Exponential decay over 72 hours)
    let freshnessNorm = Math.max(0, 100 - (params.hoursSincePosted * 1.38));

    // Normalize Coupons
    let couponNorm = params.hasStackableCoupons ? 100 : 0;

    const finalScore = 
      (discountNorm * w.discountDepth) +
      (params.merchantTrustScore * w.merchantTrust) +
      (freshnessNorm * w.freshness) +
      (params.velocityScore * w.velocity) +
      (couponNorm * w.couponStackability);

    const rounded = Math.round(finalScore);
    IntelligenceMetrics.recordDealScore(rounded);
    return rounded;
  }
}
