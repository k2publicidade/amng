import { createHmac } from 'node:crypto';
import type { ClientRateLimitInfo, Options, Store } from 'express-rate-limit';
import type { Database } from './database.ts';

/** Shared counter store for serverless instances; raw client addresses are never persisted. */
export class DatabaseRateLimitStore implements Store {
  localKeys = false;
  private windowMs = 15 * 60 * 1000;
  private nextCleanupAt = 0;

  constructor(
    private readonly db: Database,
    private readonly bucket: string,
    private readonly secret: string,
  ) {}

  init(options: Options) { this.windowMs = options.windowMs; }

  private key(value: string) {
    return createHmac('sha256', this.secret).update(`${this.bucket}:${value}`).digest('hex');
  }

  async increment(value: string): Promise<ClientRateLimitInfo> {
    const key = this.key(value);
    const now = Date.now();
    if (now >= this.nextCleanupAt) {
      await this.db.run('DELETE FROM api_rate_limits WHERE reset_at <= ?', [now - this.windowMs]);
      this.nextCleanupAt = now + 60_000;
    }
    const resetAt = now + this.windowMs;
    const row = await this.db.get<{ hits: number; reset_at: number }>(
      `INSERT INTO api_rate_limits(rate_key,bucket,hits,reset_at) VALUES(?,?,1,?)
       ON CONFLICT(rate_key) DO UPDATE SET
         hits=CASE WHEN api_rate_limits.reset_at<=? THEN 1 ELSE api_rate_limits.hits+1 END,
         reset_at=CASE WHEN api_rate_limits.reset_at<=? THEN excluded.reset_at ELSE api_rate_limits.reset_at END
       RETURNING hits,reset_at`,
      [key, this.bucket, resetAt, now, now],
    );
    return { totalHits: Number(row?.hits ?? 1), resetTime: new Date(Number(row?.reset_at ?? resetAt)) };
  }

  async get(value: string): Promise<ClientRateLimitInfo | undefined> {
    const row = await this.db.get<{ hits: number; reset_at: number }>(
      'SELECT hits,reset_at FROM api_rate_limits WHERE rate_key=? AND bucket=?',
      [this.key(value), this.bucket],
    );
    if (!row || Number(row.reset_at) <= Date.now()) return undefined;
    return { totalHits: Number(row.hits), resetTime: new Date(Number(row.reset_at)) };
  }

  async decrement(value: string): Promise<void> {
    await this.db.run(
      'UPDATE api_rate_limits SET hits=CASE WHEN hits>0 THEN hits-1 ELSE 0 END WHERE rate_key=? AND bucket=?',
      [this.key(value), this.bucket],
    );
  }

  async resetKey(value: string): Promise<void> {
    await this.db.run('DELETE FROM api_rate_limits WHERE rate_key=? AND bucket=?', [this.key(value), this.bucket]);
  }

  async resetAll(): Promise<void> {
    await this.db.run('DELETE FROM api_rate_limits WHERE bucket=?', [this.bucket]);
  }
}
