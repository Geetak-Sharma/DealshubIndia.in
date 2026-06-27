export interface DealExplanation {
  reason: string;
  delta: number;
}

export interface DealIntelligenceReport {
  dealScore: number;
  qualityScore: number;
  merchantScore: number;
  priceAnalysis: {
    discountPercentage: number;
    isSuspicious: boolean;
  };
  trendAnalysis: {
    velocity: number;
    momentum: number;
  };
  duplicateStatus: {
    isDuplicate: boolean;
    confidence: number;
  };
  warnings: string[];
  confidenceScore: number;
  explainability: DealExplanation[];
  generatedAt: string;
  version: string;
}
