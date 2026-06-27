import { IntelligenceMetrics } from './IntelligenceMetrics';

export class DealIntelligenceHealthService {
  static getHealth() {
    const summary = IntelligenceMetrics.summary;
    return {
      status: 'healthy',
      dealsProcessed: summary.dealsScored,
      averageScore: summary.averageQuality, // Mocking averageScore mapped from quality
      averageConfidence: 95, // Placeholder
      duplicateRate: summary.duplicateRatePercentage + '%',
      suspiciousDiscountRate: summary.suspiciousPricingAnomalies,
      pipelineLatencyMs: summary.averageBatchLatencyMs || 0,
      cacheHitPercentage: 100 // Managed externally via ES-005
    };
  }
}
