import { IAIProvider } from './AIProvider';
import { AIRequest } from './AIRequest';
import { AIResponse } from './AIResponse';
import { MockProvider } from './providers/MockProvider';
import { AISafety } from './AISafety';
import { AIMetrics } from './AIMetrics';

export class AIEngineImpl {
  private provider: IAIProvider;

  constructor() {
    this.provider = new MockProvider();
  }

  setProvider(provider: IAIProvider) {
    this.provider = provider;
  }

  async execute(request: AIRequest): Promise<AIResponse> {
    // Phase 7: AI Safety hooks
    AISafety.validateRequest(request);
    
    try {
      const response = await this.provider.execute(request);
      
      // Phase 7: AI Safety response hooks
      AISafety.validateResponse(response);
      
      // Phase 8: Metrics
      AIMetrics.recordSuccess(response);
      
      return response;
    } catch (err: any) {
      AIMetrics.recordFailure(err.message);
      throw err;
    }
  }
}

export const AIEngine = new AIEngineImpl();
