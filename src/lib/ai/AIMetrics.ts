import { AIResponse } from './AIResponse';

// Example arbitrary costs: $0.0001 per 1k input tokens, $0.0002 per 1k output tokens
const CostModel: Record<string, { input: number, output: number }> = {
  'MockProvider': { input: 0.0, output: 0.0 },
  'OpenAI': { input: 0.0001 / 1000, output: 0.0002 / 1000 },
  'Gemini': { input: 0.00005 / 1000, output: 0.00015 / 1000 }
};

export class AIMetricsTracker {
  totalRequests: number = 0;
  totalFailures: number = 0;
  totalLatencyMs: number = 0;
  
  tokensInput: number = 0;
  tokensOutput: number = 0;
  estimatedCostUSD: number = 0;
  
  providerUsage: Record<string, number> = {};

  recordSuccess(response: AIResponse) {
    this.totalRequests++;
    this.totalLatencyMs += response.latencyMs;
    
    // For this architecture demo, we assume estimatedTokens are split 80/20 input/output
    const inputT = Math.floor(response.estimatedTokens * 0.8);
    const outputT = Math.floor(response.estimatedTokens * 0.2);
    
    this.tokensInput += inputT;
    this.tokensOutput += outputT;
    
    const rates = CostModel[response.provider] || { input: 0, output: 0 };
    this.estimatedCostUSD += (inputT * rates.input) + (outputT * rates.output);

    if (!this.providerUsage[response.provider]) {
      this.providerUsage[response.provider] = 0;
    }
    this.providerUsage[response.provider]++;
  }

  recordFailure(reason: string) {
    this.totalRequests++;
    this.totalFailures++;
    console.error(`[AIMetrics] AI Request failed: ${reason}`);
  }

  get summary() {
    return {
      requests: this.totalRequests,
      successRate: this.totalRequests === 0 ? 100 : ((this.totalRequests - this.totalFailures) / this.totalRequests) * 100,
      totalCostUSD: this.estimatedCostUSD.toFixed(4),
      avgLatencyMs: this.totalRequests === 0 ? 0 : Math.round(this.totalLatencyMs / this.totalRequests)
    };
  }
}

export const AIMetrics = new AIMetricsTracker();
