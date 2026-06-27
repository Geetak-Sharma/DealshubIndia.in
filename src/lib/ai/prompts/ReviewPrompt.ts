import { PromptBuilder, PromptTemplate } from './PromptBuilder';

export const ReviewPrompt = {
  extractProsCons: (reviews: string[]): PromptTemplate => {
    return PromptBuilder.build(
      `You are a data analyst. Extract a bulleted list of the top 3 pros and top 3 cons from the provided product reviews. Output strictly in JSON format {"pros": [], "cons": []}.`,
      `Reviews: {{reviews}}`,
      { reviews }
    );
  }
};
