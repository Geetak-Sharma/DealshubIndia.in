export class PerformanceMonitor {
  public static start(featureName: string) {
    if (typeof performance !== 'undefined') {
      performance.mark(`start_lazy_${featureName}`);
    }
  }

  public static end(featureName: string) {
    if (typeof performance !== 'undefined') {
      performance.mark(`end_lazy_${featureName}`);
      try {
        performance.measure(
          `LazyFeature: ${featureName}`,
          `start_lazy_${featureName}`,
          `end_lazy_${featureName}`
        );
        const entries = performance.getEntriesByName(`LazyFeature: ${featureName}`);
        const last = entries[entries.length - 1];
        console.log(`[ES-002.5] ${featureName} initialized in ${last.duration.toFixed(2)}ms`);
      } catch (e) {
        // Ignored
      }
    }
  }
}
