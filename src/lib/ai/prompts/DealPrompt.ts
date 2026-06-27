import { PromptBuilder, PromptTemplate } from './PromptBuilder';
import { DealEntity } from '../../entities/types';

export const DealPrompt = {
  summarize: (deal: DealEntity, context: any): PromptTemplate => {
    return PromptBuilder.build(
      `You are an expert commerce editor. Analyze the Deal and its context (Merchant, Category) to write a 2-sentence summary highlighting why it is a good purchase. Do not hallucinate.`,
      `Deal Data: {{deal}}\n\nContext Data: {{context}}`,
      { deal, context }
    );
  }
};
