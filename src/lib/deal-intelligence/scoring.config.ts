export const ScoringConfig = {
  weights: {
    discountDepth: 0.40,
    merchantTrust: 0.20,
    freshness: 0.15,
    velocity: 0.15,
    couponStackability: 0.10
  },
  thresholds: {
    suspiciousDiscountPercentage: 90, // Anything above 90% discount triggers a suspicious flag
    highQualityDealScore: 75,
    duplicatePriceVariance: 0.05 // 5% variance allowed for duplicate detection
  }
};
