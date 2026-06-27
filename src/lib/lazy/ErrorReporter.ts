export class ErrorReporter {
  public static capture(error: Error | unknown, context?: Record<string, any>) {
    console.error(`[LazyFramework Error]`, error, context);
    // In the future, this is where Sentry.captureException(error, { extra: context }) will go.
  }
}
