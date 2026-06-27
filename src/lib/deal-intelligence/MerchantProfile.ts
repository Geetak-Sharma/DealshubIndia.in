export interface MerchantIntelligenceStats {
  merchantId: string;
  trustScore: number; // 0-100
  averageDiscountPercentage: number;
  dealFrequencyPerWeek: number;
  priceStabilityScore: number;
}

export class MerchantProfile {
  static getProfile(merchantId: string): MerchantIntelligenceStats {
    // In production, this pulls from a materialized view / cache
    // Mocking baseline trust profiles for architecture
    const mockProfiles: Record<string, MerchantIntelligenceStats> = {
      'amazon': { merchantId: 'amazon', trustScore: 95, averageDiscountPercentage: 30, dealFrequencyPerWeek: 500, priceStabilityScore: 80 },
      'flipkart': { merchantId: 'flipkart', trustScore: 90, averageDiscountPercentage: 35, dealFrequencyPerWeek: 450, priceStabilityScore: 75 }
    };

    return mockProfiles[merchantId] || {
      merchantId,
      trustScore: 50, // Unknown merchants start at 50
      averageDiscountPercentage: 0,
      dealFrequencyPerWeek: 0,
      priceStabilityScore: 50
    };
  }
}
