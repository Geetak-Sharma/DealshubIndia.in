import { IAIProvider, ProviderCapabilities } from '../AIProvider';
import { AIRequest } from '../AIRequest';
import { AIResponse } from '../AIResponse';

export class MockProvider implements IAIProvider {
  name = 'MockProvider';
  capabilities: ProviderCapabilities = {
    supportsStreaming: false,
    supportsVision: false,
    supportsJSON: true,
    supportsTools: false,
    supportsEmbeddings: false,
    supportsReasoning: false
  };

  async execute(request: AIRequest): Promise<AIResponse> {
    const start = performance.now();
    await new Promise(resolve => setTimeout(resolve, 300));
    const estimatedTokens = Math.ceil((request.systemPrompt.length + request.userPrompt.length) / 4);
    
    // Simulate JSON output if requested
    let content = `[Mock AI Response] Evaluated ${estimatedTokens} tokens.`;
    if (request.systemPrompt.includes('JSON')) {
      content = JSON.stringify({ mockKey: "mockValue", _tokens: estimatedTokens });
    }

    return {
      content,
      estimatedTokens,
      provider: this.name,
      latencyMs: performance.now() - start
    };
  }
}
