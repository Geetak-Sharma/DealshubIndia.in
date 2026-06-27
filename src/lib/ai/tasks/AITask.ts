import { AIRequest } from '../AIRequest';

export enum AITaskType {
  Summarization = 'Summarization',
  Classification = 'Classification',
  Extraction = 'Extraction',
  Recommendation = 'Recommendation',
  Comparison = 'Comparison',
  Translation = 'Translation',
  Validation = 'Validation',
  Explanation = 'Explanation'
}

export interface AITaskPayload {
  type: AITaskType;
  request: AIRequest;
  metadata?: Record<string, any>;
}
