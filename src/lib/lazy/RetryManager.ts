export class RetryManager {
  public static async execute<T>(
    fn: () => Promise<T>,
    retries: number = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (retries > 0) {
        console.warn(`[LazyFramework RetryManager] Execution failed. Retrying... Attempts left: ${retries}`);
        return await RetryManager.execute(fn, retries - 1);
      }
      throw err;
    }
  }
}
