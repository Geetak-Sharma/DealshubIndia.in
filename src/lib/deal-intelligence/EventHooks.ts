import { DealEntity } from '../entities/types';
import { DealIntelligenceReport } from './DealIntelligenceReport';

export type PipelineHook<T> = (data: T) => void;

export class EventHooks {
  private static hooks: Record<string, PipelineHook<any>[]> = {
    beforeScore: [],
    afterScore: [],
    beforeDuplicateCheck: [],
    afterDuplicateCheck: [],
    beforeTrendCalculation: [],
    afterTrendCalculation: []
  };

  static register<T>(event: string, callback: PipelineHook<T>) {
    if (!this.hooks[event]) this.hooks[event] = [];
    this.hooks[event].push(callback);
  }

  static trigger<T>(event: string, data: T) {
    if (this.hooks[event]) {
      for (const cb of this.hooks[event]) {
        cb(data); // Executed synchronously for architectural predictability
      }
    }
  }
}
