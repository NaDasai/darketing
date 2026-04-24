// Simple sliding-window rate limiter for "N calls per 1 second" semantics.
//
// p-limit (already in deps) enforces concurrency, not throughput — it can't
// express "≤10 requests per second." A sliding window is enough for our
// OpenRouter usage: acquire() resolves in submission order, queueing callers
// until a slot frees up within the trailing 1s window.
//
// Not a token bucket: we don't accumulate credit across idle periods, which
// matches what OpenRouter actually rate-limits on (short-horizon bursts).

export class RateLimiter {
  private readonly intervalMs: number;
  private readonly timestamps: number[] = [];
  private readonly queue: Array<() => void> = [];
  private scheduled = false;

  constructor(
    private readonly maxInInterval: number,
    intervalMs = 1000,
  ) {
    if (maxInInterval <= 0) {
      throw new Error('RateLimiter: maxInInterval must be > 0');
    }
    this.intervalMs = intervalMs;
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.pump();
    });
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    return fn();
  }

  private pump(): void {
    const now = Date.now();
    while (this.timestamps.length > 0 && now - this.timestamps[0] >= this.intervalMs) {
      this.timestamps.shift();
    }

    while (this.timestamps.length < this.maxInInterval && this.queue.length > 0) {
      const resolve = this.queue.shift()!;
      this.timestamps.push(Date.now());
      resolve();
    }

    if (this.queue.length > 0 && !this.scheduled) {
      const oldest = this.timestamps[0] ?? Date.now();
      const waitMs = Math.max(this.intervalMs - (Date.now() - oldest) + 1, 5);
      this.scheduled = true;
      setTimeout(() => {
        this.scheduled = false;
        this.pump();
      }, waitMs);
    }
  }
}
