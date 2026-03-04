/**
 * シンプルなインメモリ Token Bucket レートリミッター
 *
 * API Route の先頭で rateLimit.check(ip) を呼び出し、
 * 制限超過なら 429 レスポンスを返す。
 */

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimiterOptions {
  /** 1 分あたりの最大リクエスト数 */
  maxRequestsPerMinute: number;
}

class RateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms

  /** 古いエントリを定期的にクリーンアップする間隔 (5分) */
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000;
  private lastCleanup = Date.now();

  constructor(options: RateLimiterOptions) {
    this.maxTokens = options.maxRequestsPerMinute;
    this.refillRate = options.maxRequestsPerMinute / 60_000;
  }

  /**
   * リクエストを許可するかチェックする
   * @returns true = 許可, false = 制限超過
   */
  check(key: string): boolean {
    const now = Date.now();
    this.cleanupIfNeeded(now);

    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // トークンを補充
    const elapsed = now - bucket.lastRefill;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + elapsed * this.refillRate);
    bucket.lastRefill = now;

    // トークンを消費
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  private cleanupIfNeeded(now: number): void {
    if (now - this.lastCleanup < this.CLEANUP_INTERVAL) return;
    this.lastCleanup = now;

    // 5分以上アクセスがないエントリを削除
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastRefill > this.CLEANUP_INTERVAL) {
        this.buckets.delete(key);
      }
    }
  }
}

/** API全体のレートリミッター (60リクエスト/分) */
export const apiRateLimiter = new RateLimiter({ maxRequestsPerMinute: 60 });

/** 同期エンドポイント用レートリミッター (10リクエスト/分) */
export const syncRateLimiter = new RateLimiter({ maxRequestsPerMinute: 10 });
