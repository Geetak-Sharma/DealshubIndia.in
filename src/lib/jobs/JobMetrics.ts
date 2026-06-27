export class JobMetrics {
  static executed = 0;
  static succeeded = 0;
  static failed = 0;
  static retried = 0;
  static activeWorkers = 0;
  static queueLength = 0;
  static totalDurationMs = 0;

  static recordExecution(success: boolean, duration: number, isRetry: boolean) {
    this.executed++;
    this.totalDurationMs += duration;
    if (success) this.succeeded++;
    else this.failed++;
    if (isRetry) this.retried++;
  }

  static getSummary() {
    return {
      executed: this.executed,
      successPercentage: this.executed ? ((this.succeeded / this.executed) * 100).toFixed(2) : 0,
      failurePercentage: this.executed ? ((this.failed / this.executed) * 100).toFixed(2) : 0,
      averageDurationMs: this.executed ? Math.round(this.totalDurationMs / this.executed) : 0,
      activeWorkers: this.activeWorkers,
      queueLength: this.queueLength,
      retries: this.retried
    };
  }
}
