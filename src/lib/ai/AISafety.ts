import { AIRequest } from './AIRequest';
import { AIResponse } from './AIResponse';

export class AISafety {
  static validateRequest(request: AIRequest): void {
    if (!request.systemPrompt || !request.userPrompt) {
      throw new Error('AIRequest is missing prompts');
    }

    // Input sanitization hook: e.g. stripping explicit PII or regex blocking
    if (request.userPrompt.length > 50000) {
      throw new Error('AIRequest exceeds maximum token threshold limits');
    }
  }

  static validateResponse(response: AIResponse): void {
    if (!response.content || response.content.trim() === '') {
      throw new Error('AIResponse returned empty payload');
    }
    
    // Future: Parse JSON outputs to ensure strict formatting
  }
}
