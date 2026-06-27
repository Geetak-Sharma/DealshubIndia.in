import { DealExplanation } from './DealIntelligenceReport';
import { ScoringConfig } from './scoring.config';

export class ExplainabilityEngine {
  static generateExplanation(params: {
    discountPercentage: number;
    merchantTrustScore: number;
    hoursSincePosted: number;
    velocityScore: number;
    hasStackableCoupons: boolean;
  }): DealExplanation[] {
    const w = ScoringConfig.weights;
    const expl: DealExplanation[] = [];

    // Discount
    let discountNorm = params.discountPercentage;
    if (discountNorm > 90) discountNorm = 50;
    expl.push({ reason: 'Discount Depth', delta: Math.round(discountNorm * w.discountDepth) });

    // Trust
    expl.push({ reason: 'Merchant Trust', delta: Math.round(params.merchantTrustScore * w.merchantTrust) });

    // Freshness
    const freshnessNorm = Math.max(0, 100 - (params.hoursSincePosted * 1.38));
    expl.push({ reason: 'Freshness Decay', delta: Math.round(freshnessNorm * w.freshness) });

    // Velocity
    expl.push({ reason: 'Interaction Velocity', delta: Math.round(params.velocityScore * w.velocity) });

    // Coupons
    const couponNorm = params.hasStackableCoupons ? 100 : 0;
    if (couponNorm > 0) {
      expl.push({ reason: 'Coupon Stackability', delta: Math.round(couponNorm * w.couponStackability) });
    }

    return expl;
  }
}
