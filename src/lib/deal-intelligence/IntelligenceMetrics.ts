export class IntelligenceMetricsTracker {
  totalDealsScored: number = 0;
  totalDuplicatesFlagged: number = 0;
  totalSuspiciousPrices: number = 0;
  cumulativeQualityScore: number = 0;
  averageBatchLatencyMs: number = 0;

  recordDealScore(score: number) {
    this.totalDealsScored++;
    this.cumulativeQualityScore += score;
  }

  recordDuplicate() {
    this.totalDuplicatesFlagged++;
  }

  recordSuspiciousPrice() {
    this.totalSuspiciousPrices++;
  }

  recordBatchExecution(latencyMs: number) {
    this.averageBatchLatencyMs = latencyMs; // Simplified tracking for architecture demo
  }

  get summary() {
    return {
      dealsScored: this.totalDealsScored,
      averageQuality: this.totalDealsScored === 0 ? 0 : Math.round(this.cumulativeQualityScore / this.totalDealsScored),
      duplicateRatePercentage: this.totalDealsScored === 0 ? 0 : ((this.totalDuplicatesFlagged / this.totalDealsScored) * 100).toFixed(2),
      suspiciousPricingAnomalies: this.totalSuspiciousPrices,
      averageBatchLatencyMs: this.averageBatchLatencyMs
    };
  }
}

export const IntelligenceMetrics = new IntelligenceMetricsTracker();
