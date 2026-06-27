export class GrowthMetrics {
  static events: Record<string, number> = {
    'DEAL_OPEN': 0,
    'COUPON_COPY': 0,
    'SEARCH_QUERY': 0,
    'EXPERIMENT_EXPOSURE': 0
  };

  static recordEvent(eventName: string, payload: any) {
    if (this.events[eventName] !== undefined) {
      this.events[eventName]++;
    } else {
      this.events[eventName] = 1;
    }
  }

  static getCTR() {
    // Simplified Mock logic
    if (this.events['SEARCH_QUERY'] === 0) return 0;
    return (this.events['DEAL_OPEN'] / this.events['SEARCH_QUERY']) * 100;
  }

  static getSummary() {
    return {
      totalEvents: Object.values(this.events).reduce((a, b) => a + b, 0),
      ctr: this.getCTR(),
      breakdown: { ...this.events }
    };
  }
}
