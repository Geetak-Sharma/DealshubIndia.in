import { GrowthMetrics } from './GrowthMetrics';

export type GrowthEventType = 
  | 'DEAL_OPEN'
  | 'COUPON_COPY'
  | 'SEARCH_QUERY'
  | 'EXPERIMENT_EXPOSURE'
  | 'NOTIFICATION_OPEN';

export class GrowthEventTracker {
  static track(eventName: GrowthEventType, userId: string, payload: any) {
    // In production, this pipes into Mixpanel or Amplitude
    // For ES-010, we track it internally in GrowthMetrics
    GrowthMetrics.recordEvent(eventName, payload);
    
    // Example: tracking experiment exposure explicitly
    if (eventName === 'EXPERIMENT_EXPOSURE') {
      console.log(`User ${userId} exposed to ${payload.experimentId} Variant ${payload.variantId}`);
    }
  }
}
