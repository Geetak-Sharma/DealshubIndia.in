
export interface FeatureFlags {
  enableAiSummary: boolean;
  enableRecommendations: boolean;
  enableCoupons: boolean;
  enableCashback: boolean;
  enableMerchantTrust: boolean;
  enableAlternatives: boolean;
}

export interface TargetingContext {
  userId?: string;
  env: 'development' | 'production';
}

const DEFAULT_FLAGS: FeatureFlags = {
  enableAiSummary: true,
  enableRecommendations: true,
  enableCoupons: true,
  enableCashback: true,
  enableMerchantTrust: true,
  enableAlternatives: true
};

export const Flags = {
  resolve: async (context: TargetingContext): Promise<FeatureFlags> => {
    // In production, this would query LaunchDarkly or an internal flag service based on `context.userId`.
    // Returning defaults for now.
    return { ...DEFAULT_FLAGS };
  }
};
