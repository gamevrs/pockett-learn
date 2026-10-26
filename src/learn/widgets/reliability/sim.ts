/**
 * Pure simulations behind the reliability widgets. No DOM, no imports, so they can be run (and
 * tuned) straight from Node. Everything is deterministic: randomness comes from a seeded generator.
 */

/** Seeded generator (mulberry32): the same seed always rolls the same numbers. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rounds to `d` decimals and drops trailing zeros. */
export function num(v: number, d = 1): string {
  return String(Math.round(v * 10 ** d) / 10 ** d);
}

// ───────────────────────── a request that may or may not come back ─────────────────────────

export interface World {
  id: string;
  label: string;
  /** Milliseconds until the reply reaches the client; null = never. */
  reply: number | null;
  processed: boolean;
  desc: string;
}

export const WORLDS: World[] = [
  { id: "fast", label: "Quick answer", reply: 80, processed: true, desc: "The server does the work and answers within a blink." },
  { id: "slow", label: "Slow answer", reply: 1400, processed: true, desc: "The server is busy. It does the work, but the answer takes 1.4 s to arrive." },
  { id: "lost", label: "Answer lost", reply: null, processed: true, desc: "The server does the work, but the reply is dropped on the way back." },
  { id: "dead", label: "Never arrived", reply: null, processed: false, desc: "The request is lost, or the server is down. Nothing happens." },
];

// ───────────────────────── workers piling up behind a hung call ─────────────────────────

export const HANG = { pool: 20, rate: 4, hungFrom: 10, hungTo: 40, seconds: 40 };

export interface HangResult {
  busy: number[];
  /** Seconds where every worker was taken. */
  fullSeconds: number;
  /** Seconds the unrelated /about page could not be served. */
  aboutDown: number;
  /** Peak workers a hung dependency would pin. */
  peak: number;
}

/** `timeout` in seconds, or null for no timeout at all. */
export function simHang(timeout: number | null): HangResult {
  const busy: number[] = [];
  let fullSeconds = 0;
  for (let s = 0; s < HANG.seconds; s++) {
    let hung = 0;
    if (s >= HANG.hungFrom) {
      // checkouts that arrived since the hang began, minus those already given up on
      const since = s - HANG.hungFrom + 1;
      const window = timeout === null ? since : Math.min(since, timeout);
      hung = HANG.rate * window;
      // with no timeout the stuck workers never come back, even after the dependency heals
    }
    const normal = 2; // checkouts and pages in flight when things are healthy
    const total = Math.min(HANG.pool, hung + normal);
    busy.push(total);
    if (total >= HANG.pool) fullSeconds += 1;
  }
  return { busy, fullSeconds, aboutDown: fullSeconds, peak: Math.max(...busy) };
}

// ───────────────────────── deadlines through a chain of services ─────────────────────────

export const CHAIN = ["Gateway", "Orders", "Inventory", "Warehouse"] as const;
export const HOP = 0.1;
export const USER_PATIENCE = 4;

export interface Span {
  name: string;
  start: number;
  /** When this service stopped working on the request. */
  end: number;
  /** Seconds of work after the user had already given up. */
  wasted: number;
}

export interface DeadlineResult {
  spans: Span[];
  wasted: number;
  /** Seconds the user waited. */
  waited: number;
  answered: boolean;
}

/**
 * One request through Gateway -> Orders -> Inventory -> Warehouse. `latency` is the warehouse's own
 * work time. In "percall" mode every caller waits `perCall` seconds for its callee and the callee never
 * hears that it was abandoned; in "deadline" mode one absolute deadline travels with the request.
 */
export function simDeadline(mode: "percall" | "deadline", latency: number, perCall: number): DeadlineResult {
  const starts = [0, HOP, HOP * 2, HOP * 3];
  const natural = starts[3] + latency; // when the warehouse would finish on its own
  const limit = (i: number) => (mode === "deadline" ? USER_PATIENCE : Math.min(starts[i] + perCall, Number.POSITIVE_INFINITY));
  const ends: number[] = [0, 0, 0, 0];
  let ok = true;
  if (mode === "deadline") {
    ends[3] = Math.min(natural, USER_PATIENCE); // told to stop at the deadline
    ok = natural <= USER_PATIENCE;
  } else {
    ends[3] = natural; // nobody tells it to stop
  }
  let arrive = natural + HOP;
  let good = ok;
  for (let i = 2; i >= 0; i--) {
    const lim = limit(i);
    good = good && arrive <= lim;
    ends[i] = Math.min(arrive, lim);
    arrive = ends[i] + HOP;
  }
  const spans = CHAIN.map((name, i) => ({ name, start: starts[i], end: ends[i], wasted: Math.max(0, ends[i] - Math.max(starts[i], USER_PATIENCE)) }));
  const answered = good && ends[0] <= USER_PATIENCE;
  return { spans, wasted: spans.reduce((a, x) => a + x.wasted, 0), waited: Math.min(ends[0], USER_PATIENCE), answered };
}

// ───────────────────────── backoff ─────────────────────────

export type Backoff = "fixed" | "exp" | "full" | "equal";

/** The ceiling of the wait after failure number `attempt` (1-based). */
export function backoffCeiling(strategy: Backoff, attempt: number, base: number, cap: number): number {
  if (strategy === "fixed") return base;
  return Math.min(cap, base * 2 ** (attempt - 1));
}

/** One sampled wait; `r` is a roll in [0, 1). */
export function backoffDelay(strategy: Backoff, attempt: number, base: number, cap: number, r: number): number {
  const c = backoffCeiling(strategy, attempt, base, cap);
  if (strategy === "full") return r * c;
  if (strategy === "equal") return c / 2 + r * (c / 2);
  return c;
}

// ───────────────────────── retry storm ─────────────────────────

export const STORM = { ticks: 360, cap: 40, collapseAt: 80, collapsedCap: 20, maxAttempts: 6 };
const BASE = 20; // ticks: a 2 s base wait
export type StormPolicy = "none" | "now" | "fixed" | "exp" | "jitter";

export interface StormResult {
  /** Attempts per half-second bucket, scaled to per-second. */
  load: number[];
  /** Whether the server was collapsed (overloaded) during each bucket. */
  collapsed: boolean[];
  attempts: number;
  served: number;
  lost: number;
  total: number;
  peak: number;
  /** Highest load after the first two seconds, i.e. the retries alone. */
  retryPeak: number;
  /** Seconds the server spent collapsed. */
  collapsedSeconds: number;
  /** When the last client got through. */
  finishedAt: number;
}

/**
 * A ticket sale opens and `clients` all arrive within the first second. The server absorbs 40
 * attempts per half-second window (80 a second); when more than 80 land in one window it thrashes
 * and absorbs only 20 in the next. Every failed client retries by `policy`.
 */
export function simStorm(clients: number, policy: StormPolicy, seed = 7): StormResult {
  const roll = rng(seed);
  const due: number[][] = Array.from({ length: STORM.ticks + 1 }, () => []);
  const perTick: number[] = new Array(STORM.ticks).fill(0);
  let served = 0;
  let lost = 0;
  let total = 0;
  let attempts = 0;
  let room = STORM.cap;
  let windowArrivals = 0;
  let collapsed = false;
  let collapsedSeconds = 0;
  let finishedAt = 0;
  const flags: boolean[] = new Array(STORM.ticks).fill(false);
  for (let t = 0; t < STORM.ticks; t++) {
    if (t % 5 === 0) {
      // a new half-second window begins: judge the one that just ended
      collapsed = windowArrivals > STORM.collapseAt;
      if (collapsed) collapsedSeconds += 0.5;
      room = collapsed ? STORM.collapsedCap : STORM.cap;
      windowArrivals = 0;
    }
    flags[t] = collapsed;
    // the whole crowd shows up within the first second of the sale
    if (t < 10) {
      const share = Math.floor(((t + 1) * clients) / 10) - Math.floor((t * clients) / 10);
      for (let i = 0; i < share; i++) due[t].push(1);
      total += share;
    }
    const list = due[t];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(roll() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    for (const k of list) {
      attempts += 1;
      perTick[t] += 1;
      windowArrivals += 1;
      if (room > 0) {
        room -= 1;
        served += 1;
        finishedAt = (t + 1) / 10;
        continue;
      }
      if (policy === "none" || k >= STORM.maxAttempts) {
        lost += 1;
        continue;
      }
      let wait: number; // in ticks
      if (policy === "now") wait = 1;
      else if (policy === "fixed") wait = BASE;
      else if (policy === "exp") wait = BASE * 2 ** (k - 1);
      else wait = Math.max(1, Math.round(roll() * BASE * 2 ** (k - 1)));
      if (t + wait < STORM.ticks) due[t + wait].push(k + 1);
      else lost += 1;
    }
  }
  const load: number[] = [];
  const bucketFlags: boolean[] = [];
  for (let b = 0; b < STORM.ticks / 5; b++) {
    let sum = 0;
    for (let k = 0; k < 5; k++) sum += perTick[b * 5 + k];
    load.push(sum * 2); // per second
    bucketFlags.push(flags[b * 5]);
  }
  return { load, collapsed: bucketFlags, attempts, served, lost, total, peak: Math.max(...load), retryPeak: Math.max(...load.slice(4)), collapsedSeconds, finishedAt };
}

// ───────────────────────── circuit breaker ─────────────────────────

export type BreakerState = "closed" | "open" | "half";

export interface Breaker {
  state: BreakerState;
  failures: number;
  openedAt: number;
  now: number;
  up: boolean;
  threshold: number;
  cooldown: number;
  reached: number;
  blocked: number;
  failed: number;
  everOpened: boolean;
  recovered: boolean;
  log: { id: number; kind: "ok" | "fail" | "blocked" | "probe-ok" | "probe-fail" | "note"; text: string }[];
}

export function newBreaker(threshold: number, cooldown: number): Breaker {
  return { state: "closed", failures: 0, openedAt: 0, now: 0, up: true, threshold, cooldown, reached: 0, blocked: 0, failed: 0, everOpened: false, recovered: false, log: [] };
}

function push(b: Breaker, kind: Breaker["log"][number]["kind"], text: string): Breaker {
  const id = (b.log[0]?.id ?? 0) + 1;
  return { ...b, log: [{ id, kind, text: `${b.now}s  ${text}` }, ...b.log].slice(0, 7) };
}

/** The wall clock moves on by one second. An open breaker whose cool-down has passed becomes half-open. */
export function breakerTick(b: Breaker): Breaker {
  let n: Breaker = { ...b, now: b.now + 1 };
  if (n.state === "open" && n.now - n.openedAt >= n.cooldown) {
    n = { ...n, state: "half" };
    n = push(n, "note", "cool-down over: half-open, the next call is a test");
  }
  return n;
}

/** The app makes one call to the dependency (through the breaker). */
export function breakerSend(b: Breaker): Breaker {
  if (b.state === "open") {
    return push({ ...b, blocked: b.blocked + 1 }, "blocked", `request refused at once (breaker is open, ${Math.max(0, b.cooldown - (b.now - b.openedAt))}s left)`);
  }
  const reached = b.reached + 1;
  if (b.state === "half") {
    if (b.up) {
      return push({ ...b, reached, state: "closed", failures: 0, recovered: true }, "probe-ok", "test call succeeded: breaker closes");
    }
    return push({ ...b, reached, failed: b.failed + 1, state: "open", openedAt: b.now }, "probe-fail", "test call failed: breaker opens again");
  }
  if (b.up) return push({ ...b, reached, failures: 0 }, "ok", "call succeeded");
  const failures = b.failures + 1;
  if (failures >= b.threshold) {
    return push({ ...b, reached, failed: b.failed + 1, failures, state: "open", openedAt: b.now, everOpened: true }, "fail", `call failed (${failures} in a row): breaker opens`);
  }
  return push({ ...b, reached, failed: b.failed + 1, failures }, "fail", `call failed (${failures} in a row)`);
}

// ───────────────────────── bulkheads ─────────────────────────

export const BULK = { pool: 12, bulkhead: { pay: 8, rec: 4 }, perTick: 3, slowTicks: 20 };

export interface Slot {
  who: "pay" | "rec";
  left: number;
}
export interface BulkState {
  slots: (Slot | null)[];
  t: number;
  served: { pay: number; rec: number };
  rejected: { pay: number; rec: number };
}

export const newBulk = (): BulkState => ({ slots: new Array(BULK.pool).fill(null), t: 0, served: { pay: 0, rec: 0 }, rejected: { pay: 0, rec: 0 } });

/** One second: finished calls free their slot, then new requests arrive and need one. */
export function bulkStep(s: BulkState, recSlow: boolean, split: boolean): BulkState {
  const slots = s.slots.map((x) => (x && x.left > 1 ? { ...x, left: x.left - 1 } : null));
  const served = { ...s.served };
  const rejected = { ...s.rejected };
  // slots 0..7 belong to payments and 8..11 to recommendations when the pool is split
  const allowed = (who: "pay" | "rec", i: number) => !split || (who === "pay" ? i < BULK.bulkhead.pay : i >= BULK.bulkhead.pay);
  const order: ("pay" | "rec")[] = s.t % 2 === 0 ? ["pay", "rec"] : ["rec", "pay"];
  // interleave arrivals: pay, rec, pay, rec... (or the reverse on odd seconds)
  const arrivals: ("pay" | "rec")[] = [];
  for (let k = 0; k < BULK.perTick; k++) for (const w of order) arrivals.push(w);
  for (const who of arrivals) {
    const i = slots.findIndex((x, idx) => x === null && allowed(who, idx));
    if (i < 0) {
      rejected[who] += 1;
      continue;
    }
    slots[i] = { who, left: who === "rec" && recSlow ? BULK.slowTicks : 1 };
    served[who] += 1;
  }
  return { slots, t: s.t + 1, served, rejected };
}

// ───────────────────────── the resilient client ─────────────────────────

export type Scenario = "flaky" | "slow" | "outage" | "hang";
export interface Toggles {
  timeout: boolean;
  retry: boolean;
  breaker: boolean;
  fallback: boolean;
}

export const CLIENT = { requests: 200, every: 2, patience: 30, timeout: 5, maxAttempts: 3, bad: [100, 250] as const, threshold: 5, cooldown: 30 };
export type Outcome = "ok" | "fallback" | "error";

export interface ClientResult {
  outcomes: Outcome[];
  latencies: number[];
  /** Requests that got a real answer or a cached one. */
  served: number;
  okPct: number;
  errors: number;
  fallbacks: number;
  /** Dependency calls per user request. */
  amplification: number;
  p95: number;
  /** Which requests began during the trouble window (for shading). */
  badFrom: number;
  badTo: number;
}

interface Dep {
  ok: boolean;
  latency: number; // ticks until it answers; Infinity = never
}

function dependency(scn: Scenario, t: number, roll: () => number): Dep {
  const bad = t >= CLIENT.bad[0] && t < CLIENT.bad[1];
  if (scn === "flaky") return roll() < 0.3 ? { ok: false, latency: 2 } : { ok: true, latency: 2 };
  if (!bad) return { ok: true, latency: 2 };
  if (scn === "slow") return { ok: true, latency: 40 };
  if (scn === "outage") return { ok: false, latency: 1 };
  return { ok: true, latency: Infinity };
}

export function simClient(scn: Scenario, tg: Toggles, seed = 11): ClientResult {
  const roll = rng(seed);
  const n = CLIENT.requests;
  const outcomes: Outcome[] = new Array(n).fill("error");
  const latencies: number[] = new Array(n).fill(0);
  let calls = 0;
  // breaker (shared by all requests)
  let bState: BreakerState = "closed";
  let bFail = 0;
  let bOpenedAt = 0;
  let probing = false;
  type Ev = { at: number; req: number; kind: "start" | "result"; ok?: boolean; wasProbe?: boolean; attempt: number };
  const events: Ev[] = [];
  const begin = (req: number) => req * CLIENT.every;
  for (let r = 0; r < n; r++) events.push({ at: begin(r), req: r, kind: "start", attempt: 1 });
  const finish = (req: number, at: number, ok: boolean) => {
    const waited = at - begin(req);
    if (ok && waited <= CLIENT.patience) {
      outcomes[req] = "ok";
      latencies[req] = waited;
    } else if (tg.fallback) {
      outcomes[req] = "fallback";
      latencies[req] = Math.min(waited, CLIENT.patience);
    } else {
      outcomes[req] = "error";
      latencies[req] = Math.min(waited, CLIENT.patience);
    }
  };
  const failAttempt = (e: Ev, at: number) => {
    if (tg.retry && e.attempt < CLIENT.maxAttempts) {
      const ceil = Math.min(16, 4 * 2 ** (e.attempt - 1));
      const wait = Math.max(1, Math.round(roll() * ceil));
      if (at + wait - begin(e.req) < CLIENT.patience) {
        events.push({ at: at + wait, req: e.req, kind: "start", attempt: e.attempt + 1 });
        return;
      }
    }
    finish(e.req, at, false);
  };
  while (events.length) {
    // earliest event first; ties by request number so runs are reproducible
    let bi = 0;
    for (let i = 1; i < events.length; i++) {
      const a = events[i];
      const b = events[bi];
      if (a.at < b.at || (a.at === b.at && (a.kind === "result" ? 0 : 1) < (b.kind === "result" ? 0 : 1)) || (a.at === b.at && a.kind === b.kind && a.req < b.req)) bi = i;
    }
    const [e] = events.splice(bi, 1);
    const now = e.at;
    if (e.kind === "start") {
      if (tg.breaker) {
        if (bState === "open" && now - bOpenedAt >= CLIENT.cooldown) bState = "half";
        if (bState === "open" || (bState === "half" && probing)) {
          // refused at once: no call is made
          finish(e.req, now, false);
          continue;
        }
        if (bState === "half") probing = true;
      }
      calls += 1;
      const d = dependency(scn, now, roll);
      const limit = tg.timeout ? CLIENT.timeout : CLIENT.patience;
      const wasProbe = tg.breaker && bState === "half";
      if (d.latency > limit) {
        // gave up waiting (or the user left first)
        events.push({ at: now + Math.min(limit, CLIENT.patience), req: e.req, kind: "result", ok: false, wasProbe, attempt: e.attempt });
      } else {
        events.push({ at: now + d.latency, req: e.req, kind: "result", ok: d.ok, wasProbe, attempt: e.attempt });
      }
    } else {
      if (tg.breaker) {
        if (e.ok) {
          bFail = 0;
          if (e.wasProbe) {
            bState = "closed";
            probing = false;
          }
        } else {
          bFail += 1;
          if (e.wasProbe) {
            bState = "open";
            bOpenedAt = now;
            probing = false;
          } else if (bState === "closed" && bFail >= CLIENT.threshold) {
            bState = "open";
            bOpenedAt = now;
          }
        }
      }
      if (e.ok) finish(e.req, now, true);
      else failAttempt(e, now);
    }
  }
  const served = outcomes.filter((o) => o !== "error").length;
  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    outcomes,
    latencies,
    served,
    okPct: served / n,
    errors: outcomes.filter((o) => o === "error").length,
    fallbacks: outcomes.filter((o) => o === "fallback").length,
    amplification: calls / n,
    p95: sorted[Math.floor(n * 0.95)] / 10,
    badFrom: Math.floor(CLIENT.bad[0] / CLIENT.every),
    badTo: Math.floor(CLIENT.bad[1] / CLIENT.every),
  };
}
