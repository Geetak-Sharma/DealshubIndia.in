export interface AIResponse {
  content: string;
  estimatedTokens: number;
  provider: string;
  latencyMs: number;
}
