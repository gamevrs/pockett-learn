import { positiveInt } from "./cost.ts";

/**
 * Best-effort abuse protection for /api/run. Both limiters live in module memory, so on serverless
 * every warm instance has its own counters: a determined attacker can spread across instances.
 * The hard backstops are the Vercel firewall and Sandbox's own quotas; these just stop accidents
 * and casual abuse (a runaway client loop, one person hammering Run).
 */

export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly max: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly maxKeys: number;

  constructor(max: number, windowMs: number, now: () => number = Date.now, maxKeys = 5000) {
    this.max = max;
    this.windowMs = windowMs;
    this.now = now;
    this.maxKeys = maxKeys;
  }

  /** Records an attempt for `key`. `ok: false` means over the limit (the attempt is not recorded). */
  hit(key: string): { ok: boolean; retryAfterMs: number } {
    const t = this.now();
    const cutoff = t - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((x) => x > cutoff);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return { ok: false, retryAfterMs: Math.max(1, recent[0] + this.windowMs - t) };
    }
    recent.push(t);
    this.hits.set(key, recent);
    if (this.hits.size > this.maxKeys) this.prune();
    return { ok: true, retryAfterMs: 0 };
  }

  /** Drops keys with no recent attempts; if that isn't enough, drops the oldest keys. */
  prune() {
    const cutoff = this.now() - this.windowMs;
    for (const [key, times] of this.hits) {
      if (times.length === 0 || times[times.length - 1] <= cutoff) this.hits.delete(key);
    }
    if (this.hits.size > this.maxKeys) {
      const excess = this.hits.size - this.maxKeys;
      let dropped = 0;
      for (const key of this.hits.keys()) {
        this.hits.delete(key);
        if (++dropped >= excess) break;
      }
    }
  }

  get size() {
    return this.hits.size;
  }
}

export class ConcurrencyGate {
  private active = 0;
  private readonly max: number;

  constructor(max: number) {
    this.max = max;
  }

  /** Returns a release function, or null when the gate is full. The release is idempotent. */
  tryAcquire(): (() => void) | null {
    if (this.active >= this.max) return null;
    this.active++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active--;
    };
  }

  get inFlight() {
    return this.active;
  }
}

/** Picks the client address. On Vercel the platform sets x-real-ip / overwrites x-forwarded-for. */
export function clientIp(headers: { get(name: string): string | null }): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

/** Thrown when this instance has created too many sandboxes in the last minute (a global cost guard). */
export class RunnerBusyError extends Error {
  readonly retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super("Too many sandboxes were created in the last minute.");
    this.name = "RunnerBusyError";
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Per-instance cap on sandbox creations per minute, on top of the per-IP limit: a ceiling on cost
 * even when abuse is spread across many addresses. RUNNER_MAX_CREATES_PER_MIN overrides the default.
 */
export const DEFAULT_MAX_CREATES_PER_MIN = 120;

let creations: SlidingWindowLimiter | null = null;

/** Call right before creating a sandbox; throws RunnerBusyError when over the cap. */
export function takeCreateSlot(): void {
  creations ??= new SlidingWindowLimiter(positiveInt(process.env.RUNNER_MAX_CREATES_PER_MIN, DEFAULT_MAX_CREATES_PER_MIN), 60_000, Date.now, 4);
  const taken = creations.hit("all");
  if (!taken.ok) throw new RunnerBusyError(taken.retryAfterMs);
}
