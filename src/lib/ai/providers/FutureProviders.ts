import { IAIProvider, ProviderCapabilities } from '../AIProvider';
import { AIRequest } from '../AIRequest';
import { AIResponse } from '../AIResponse';

const basicCapabilities: ProviderCapabilities = {
  supportsStreaming: true,
  supportsVision: true,
  supportsJSON: true,
  supportsTools: true,
  supportsEmbeddings: true,
  supportsReasoning: false
};

export class FutureOpenAIProvider implements IAIProvider {
  name = 'OpenAI';
  capabilities = { ...basicCapabilities, supportsReasoning: true };
  async execute(request: AIRequest): Promise<AIResponse> { throw new Error('Not implemented'); }
}

export class FutureGeminiProvider implements IAIProvider {
  name = 'Gemini';
  capabilities = { ...basicCapabilities, supportsReasoning: true };
  async execute(request: AIRequest): Promise<AIResponse> { throw new Error('Not implemented'); }
}

export class FutureOllamaProvider implements IAIProvider {
  name = 'Ollama';
  capabilities = { ...basicCapabilities, supportsVision: false, supportsReasoning: false };
  async execute(request: AIRequest): Promise<AIResponse> { throw new Error('Not implemented'); }
}
