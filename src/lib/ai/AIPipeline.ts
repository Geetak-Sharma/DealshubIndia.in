import { IAIProvider } from './AIProvider';
import { PromptRegistry } from './prompts/PromptRegistry';
import { ContextProviderRegistry } from './context/DealContextProvider';
import { AISafety } from './AISafety';
import { AIMetrics } from './AIMetrics';
import { CacheManager } from '../cache/CacheManager';
import { CachePolicies } from '../cache/CachePolicy';
import { z } from 'zod';

export interface AIPipelineRequest {
  promptId: string;
  promptVersion: string;
  entityId: string;
  entityType: string;
}

export class AIPipelineImpl {
  private provider!: IAIProvider;

  setProvider(provider: IAIProvider) {
    this.provider = provider;
  }

  async execute(req: AIPipelineRequest): Promise<any> {
    // Pipeline Stage 1: Cache Check (Synthetic Key)
    // We avoid hashing large payload strings by creating a synthetic key
    const cacheKey = `ai:${req.promptId}:${req.promptVersion}:${req.entityId}`;
    
    // We leverage CacheManager.getOrFetch to automatically handle SWR, Deduplication, and Stampede Protection!
    return CacheManager.getOrFetch(cacheKey, CachePolicies.Deals, async () => {
      
      // Pipeline Stage 2: Context Resolution
      const contextProvider = ContextProviderRegistry.get(req.entityType);
      if (!contextProvider) throw new Error(`No ContextProvider for ${req.entityType}`);
      const contextData = await contextProvider.buildContext(req.entityId);

      // Pipeline Stage 3: Prompt Generation
      const promptDef = PromptRegistry.get(req.promptId, req.promptVersion);
      const compiled = PromptRegistry.compile(promptDef, contextData);
      
      const aiRequest = {
        systemPrompt: compiled.system,
        userPrompt: compiled.user
      };

      // Pipeline Stage 4: Input Validation
      AISafety.validateRequest(aiRequest);

      // Pipeline Stage 5: Provider Execution
      const rawResponse = await this.provider.execute(aiRequest);

      // Pipeline Stage 6: Metrics Logging
      AIMetrics.recordSuccess(rawResponse);

      // Pipeline Stage 7: Structured Output Schema Validation
      let parsedPayload: any = rawResponse.content;
      if (promptDef.expectedOutputSchema) {
        try {
          const jsonMatch = rawResponse.content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('No JSON object found in response');
          parsedPayload = JSON.parse(jsonMatch[0]);
          
          // Zod Validation
          parsedPayload = promptDef.expectedOutputSchema.parse(parsedPayload);
        } catch (err: any) {
          AIMetrics.recordFailure(`Schema Validation Failed: ${err.message}`);
          throw err;
        }
      }

      return parsedPayload;
    });
  }
}

export const AIPipeline = new AIPipelineImpl();
