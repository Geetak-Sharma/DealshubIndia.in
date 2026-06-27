import { AIRequest } from './AIRequest';
import { AIResponse } from './AIResponse';

export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsJSON: boolean;
  supportsTools: boolean;
  supportsEmbeddings: boolean;
  supportsReasoning: boolean;
}

export interface IAIProvider {
  name: string;
  capabilities: ProviderCapabilities;
  execute(request: AIRequest): Promise<AIResponse>;
}
