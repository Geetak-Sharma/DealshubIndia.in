
export type EventName = 'card_view' | 'expand_analysis' | 'buy_click' | 'coupon_click' | 'merchant_click' | 'alternative_click' | 'save' | 'share';

export const trackEvent = (eventName: EventName, payload: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    console.log(`[Analytics] ${eventName}`, payload);
    // In production, this pushes to Data Platform / DataLayer
  }
};
