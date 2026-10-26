/**
 * Pure simulations behind the traffic widgets (rate limiters, queues, shedding, dead letters,
 * delivery). No DOM and no imports, so they run (and get tuned) straight from Node.
 */

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

export const r1 = (v: number) => Math.round(v * 10) / 10;

// ───────────────────────── Little's law and utilisation ─────────────────────────

/** Average response time as a multiple of the work itself, for one server at utilisation `rho` (0..1). */
export function responseFactor(rho: number): number {
  return 1 / (1 - Math.min(0.995, rho));
}

// ───────────────────────── rate limiters ─────────────────────────

export type Algo = "fixed" | "slog" | "scount" | "token" | "leaky";
export const HORIZON = 30;

export interface Verdict {
  t: number;
  allowed: boolean;
  /** When the request actually goes through (leaky bucket delays it). */
  at: number;
}

/** Run one algorithm over request times (seconds, ascending) with a contract of `limit` per `windowSec`. */
export function runLimiter(algo: Algo, limit: number, windowSec: number, times: number[]): Verdict[] {
  const out: Verdict[] = [];
  const rate = limit / windowSec;
  if (algo === "fixed") {
    const counts = new Map<number, number>();
    for (const t of times) {
      const w = Math.floor(t / windowSec);
      const c = counts.get(w) ?? 0;
      const ok = c < limit;
      if (ok) counts.set(w, c + 1);
      out.push({ t, allowed: ok, at: t });
    }
  } else if (algo === "slog") {
    const log: number[] = [];
    for (const t of times) {
      while (log.length && log[0] <= t - windowSec) log.shift();
      const ok = log.length < limit;
      if (ok) log.push(t);
      out.push({ t, allowed: ok, at: t });
    }
  } else if (algo === "scount") {
    const counts = new Map<number, number>();
    for (const t of times) {
      const w = Math.floor(t / windowSec);
      const cur = counts.get(w) ?? 0;
      const prev = counts.get(w - 1) ?? 0;
      const overlap = 1 - (t - w * windowSec) / windowSec;
      const estimate = prev * overlap + cur;
      const ok = estimate < limit;
      if (ok) counts.set(w, cur + 1);
      out.push({ t, allowed: ok, at: t });
    }
  } else if (algo === "token") {
    let tokens = limit;
    let last = 0;
    for (const t of times) {
      tokens = Math.min(limit, tokens + (t - last) * rate);
      last = t;
      const ok = tokens >= 1 - 1e-9;
      if (ok) tokens -= 1;
      out.push({ t, allowed: ok, at: t });
    }
  } else {
    // leaky bucket as a queue: accepted requests leave at a steady rate
    let nextFree = 0;
    const leaves: number[] = [];
    for (const t of times) {
      const waiting = leaves.filter((x) => x > t).length;
      const ok = waiting < limit;
      let at = t;
      if (ok) {
        at = Math.max(t, nextFree);
        nextFree = at + 1 / rate;
        leaves.push(at);
      }
      out.push({ t, allowed: ok, at });
    }
  }
  return out;
}

/** The most requests let through inside any span of `windowSec` seconds. */
export function worstSpan(through: number[], windowSec: number): number {
  const ts = [...through].sort((a, b) => a - b);
  let best = 0;
  for (let i = 0; i < ts.length; i++) {
    let n = 0;
    for (let j = i; j < ts.length && ts[j] < ts[i] + windowSec - 1e-9; j++) n++;
    best = Math.max(best, n);
  }
  return best;
}

export type Pattern = "slow" | "edge" | "spiky" | "flood" | "own";

export function patternTimes(p: Pattern): number[] {
  if (p === "slow") return Array.from({ length: 18 }, (_, i) => r1(0.8 + i * 1.6));
  if (p === "edge") return [8.0, 8.4, 8.8, 9.2, 9.6, 10.0, 10.4, 10.8, 11.2, 11.6];
  if (p === "spiky") return [2, 2.3, 2.6, 2.9, 13, 13.3, 13.6, 13.9, 24, 24.3, 24.6, 24.9];
  if (p === "flood") return Array.from({ length: 36 }, (_, i) => r1(3 + i * 0.25));
  return [];
}

// ───────────────────────── token and leaky bucket traces ─────────────────────────

export interface BucketTrace {
  /** Level sampled every 0.1 s: tokens left (token bucket) or items queued (leaky bucket). */
  level: number[];
  verdicts: Verdict[];
  /** Requests reaching the backend, per second. */
  backend: number[];
  allowed: number;
  blocked: number;
  peakBackend: number;
}

export function bucketTrace(kind: "token" | "leaky", capacity: number, rate: number, times: number[]): BucketTrace {
  const dt = 0.1;
  const steps = Math.round(HORIZON / dt);
  const level: number[] = [];
  const verdicts: Verdict[] = [];
  let lvl = kind === "token" ? capacity : 0;
  let nextFree = 0;
  const leaves: number[] = [];
  let ti = 0;
  for (let s = 0; s < steps; s++) {
    const now = s * dt;
    // drain or refill over this slice
    if (kind === "token") lvl = Math.min(capacity, lvl + rate * dt);
    else lvl = Math.max(0, lvl - rate * dt);
    while (ti < times.length && times[ti] < now + dt - 1e-9) {
      const t = times[ti++];
      if (kind === "token") {
        const ok = lvl >= 1 - 1e-9;
        if (ok) lvl -= 1;
        verdicts.push({ t, allowed: ok, at: t });
      } else {
        const ok = lvl + 1 <= capacity + 1e-9;
        let at = t;
        if (ok) {
          lvl += 1;
          at = Math.max(t, nextFree);
          nextFree = at + 1 / rate;
          leaves.push(at);
        }
        verdicts.push({ t, allowed: ok, at });
      }
    }
    level.push(lvl);
  }
  const backend: number[] = new Array(HORIZON).fill(0);
  for (const v of verdicts) if (v.allowed && v.at < HORIZON) backend[Math.floor(v.at)] += 1;
  const allowed = verdicts.filter((v) => v.allowed).length;
  return { level, verdicts, backend, allowed, blocked: verdicts.length - allowed, peakBackend: Math.max(0, ...backend) };
}

export type BucketPattern = "calm" | "burst" | "steady-high" | "bursty";
export function bucketTimes(p: BucketPattern): number[] {
  if (p === "calm") return Array.from({ length: 12 }, (_, i) => r1(1 + i * 2.2));
  if (p === "burst") return [...Array.from({ length: 4 }, (_, i) => r1(2 + i * 1.5)), ...Array.from({ length: 16 }, (_, i) => r1(15 + i * 0.1)), ...Array.from({ length: 4 }, (_, i) => r1(22 + i * 1.5))];
  if (p === "steady-high") return Array.from({ length: 40 }, (_, i) => r1(0.5 + i * 0.7));
  return [...Array.from({ length: 10 }, (_, i) => r1(1 + i * 0.1)), ...Array.from({ length: 10 }, (_, i) => r1(11 + i * 0.1)), ...Array.from({ length: 10 }, (_, i) => r1(21 + i * 0.1))];
}

// ───────────────────────── queues ─────────────────────────

export type QueuePolicy = "unbounded" | "block" | "dropnew" | "dropold";
export type Traffic = "steady" | "burst" | "overload";
export const QUEUE = { seconds: 60 };

export function arrivals(p: Traffic, t: number): number {
  if (p === "steady") return 8;
  if (p === "burst") return t >= 10 && t < 15 ? 40 : 4;
  return 14;
}

export interface QueueResult {
  depth: number[];
  /** Work held back at the producer (blocking policy). */
  held: number[];
  dropped: number;
  served: number;
  peak: number;
  /** Seconds the last item in the queue would wait at its deepest. */
  maxWait: number;
  heldPeak: number;
}

export function simQueue(traffic: Traffic, service: number, policy: QueuePolicy, bound: number): QueueResult {
  const depth: number[] = [];
  const held: number[] = [];
  let q = 0;
  let w = 0;
  let dropped = 0;
  let served = 0;
  let peak = 0;
  for (let t = 0; t < QUEUE.seconds; t++) {
    const a = arrivals(traffic, t);
    if (policy === "unbounded") q += a;
    else if (policy === "block") {
      const incoming = a + w;
      const take = Math.min(incoming, bound - q);
      q += take;
      w = incoming - take;
    } else if (policy === "dropnew") {
      const take = Math.min(a, bound - q);
      q += take;
      dropped += a - take;
    } else {
      q += a;
      if (q > bound) {
        dropped += q - bound;
        q = bound;
      }
    }
    peak = Math.max(peak, q);
    const s = Math.min(q, service);
    q -= s;
    served += s;
    depth.push(q);
    held.push(w);
  }
  return { depth, held, dropped, served, peak, maxWait: peak / service, heldPeak: Math.max(0, ...held) };
}

// ───────────────────────── load shedding ─────────────────────────

export type ShedPolicy = "fifo" | "newest" | "priority";
export type Cls = "checkout" | "browse" | "bots";
export const SHED = { ticks: 40, capacity: 10, queue: 30, patience: 1, rates: { checkout: 2, browse: 8, bots: 8 } as Record<Cls, number> };
const RANK: Record<Cls, number> = { checkout: 0, browse: 1, bots: 2 };

export interface ShedResult {
  /** Fraction of each class served in time. */
  rate: Record<Cls, number>;
  served: Record<Cls, number>;
  sent: Record<Cls, number>;
  stale: number;
  refused: number;
  goodput: number;
}

export function simShed(policy: ShedPolicy, capacity = SHED.capacity, seed = 5): ShedResult {
  const roll = rng(seed);
  type Item = { cls: Cls; born: number };
  let q: Item[] = [];
  const sent: Record<Cls, number> = { checkout: 0, browse: 0, bots: 0 };
  const served: Record<Cls, number> = { checkout: 0, browse: 0, bots: 0 };
  let stale = 0;
  let refused = 0;
  for (let t = 0; t < SHED.ticks; t++) {
    const arr: Item[] = [];
    (Object.keys(SHED.rates) as Cls[]).forEach((c) => {
      for (let i = 0; i < SHED.rates[c]; i++) {
        arr.push({ cls: c, born: t });
        sent[c] += 1;
      }
    });
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(roll() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    for (const it of arr) q.push(it);
    // the queue only holds so many: the rest are refused
    if (q.length > SHED.queue) {
      if (policy === "priority") {
        // keep the most important, oldest first within a class
        q.sort((a, b) => RANK[a.cls] - RANK[b.cls] || a.born - b.born);
        refused += q.length - SHED.queue;
        q = q.slice(0, SHED.queue);
      } else if (policy === "fifo") {
        refused += q.length - SHED.queue;
        q = q.slice(0, SHED.queue); // newest arrivals (end of the list) are turned away
      } else {
        refused += q.length - SHED.queue;
        q = q.slice(q.length - SHED.queue); // newest-first service keeps the newest, drops the oldest
      }
    }
    // serve
    if (policy === "priority") q.sort((a, b) => RANK[a.cls] - RANK[b.cls] || a.born - b.born);
    let slots = capacity;
    while (slots > 0 && q.length) {
      const it = policy === "newest" ? q.pop()! : q.shift()!;
      slots -= 1;
      if (t - it.born > SHED.patience) {
        stale += 1; // the caller gave up before we got to it
        continue;
      }
      served[it.cls] += 1;
    }
  }
  const rate = { checkout: served.checkout / sent.checkout, browse: served.browse / sent.browse, bots: served.bots / sent.bots };
  const total = sent.checkout + sent.browse + sent.bots;
  return { rate, served, sent, stale, refused, goodput: (served.checkout + served.browse + served.bots) / total };
}

// ───────────────────────── dead-letter queue ─────────────────────────

export type DlqPolicy = "forever" | "drop" | "dead";
export interface DlqState {
  queue: number[];
  dead: number[];
  done: number[];
  dropped: number[];
  /** Id being worked on and how many times it has failed so far. */
  current: { id: number; failures: number } | null;
  fixed: boolean;
  steps: number;
  log: string[];
}

export const POISON = [3, 6];
export const MESSAGES = [1, 2, 3, 4, 5, 6, 7, 8];
export const newDlq = (): DlqState => ({ queue: [...MESSAGES], dead: [], done: [], dropped: [], current: null, fixed: false, steps: 0, log: [] });

/** One attempt by the consumer at the message at the head of the queue. */
export function dlqStep(s: DlqState, policy: DlqPolicy, maxAttempts: number): DlqState {
  if (s.queue.length === 0) return s;
  const id = s.queue[0];
  const failures = s.current?.id === id ? s.current.failures : 0;
  const poison = POISON.includes(id) && !s.fixed;
  const log = (m: string) => [m, ...s.log].slice(0, 6);
  if (!poison) {
    return { ...s, queue: s.queue.slice(1), done: [...s.done, id], current: null, steps: s.steps + 1, log: log(`#${id} processed`) };
  }
  const f = failures + 1;
  if (policy === "forever" || f < maxAttempts) {
    return { ...s, current: { id, failures: f }, steps: s.steps + 1, log: log(`#${id} crashed the consumer (failure ${f}); back to the front of the queue`) };
  }
  if (policy === "drop") {
    return { ...s, queue: s.queue.slice(1), dropped: [...s.dropped, id], current: null, steps: s.steps + 1, log: log(`#${id} failed ${f} times: thrown away`) };
  }
  return { ...s, queue: s.queue.slice(1), dead: [...s.dead, id], current: null, steps: s.steps + 1, log: log(`#${id} failed ${f} times: moved to the dead-letter queue`) };
}

export function dlqRedrive(s: DlqState): DlqState {
  return { ...s, queue: [...s.queue, ...s.dead], dead: [], log: [`dead letters sent back to the main queue`, ...s.log].slice(0, 6) };
}

// ───────────────────────── delivery guarantees ─────────────────────────

export type AckMode = "first" | "after";
export interface DeliveryState {
  queue: number[];
  /** How many times each message's work has run. */
  effects: Record<number, number>;
  seen: number[];
  deliveries: number;
  crashes: number;
  log: string[];
}
export const newDelivery = (): DeliveryState => ({ queue: [1, 2, 3, 4, 5], effects: {}, seen: [], deliveries: 0, crashes: 0, log: [] });

/** The broker hands the next message to the consumer; `crash` makes the consumer die between its two steps. */
export function deliver(s: DeliveryState, ack: AckMode, dedupe: boolean, crash: boolean): DeliveryState {
  if (s.queue.length === 0) return s;
  const id = s.queue[0];
  const rest = s.queue.slice(1);
  const log = (m: string) => [m, ...s.log].slice(0, 6);
  const base = { ...s, deliveries: s.deliveries + 1 };
  const already = dedupe && s.seen.includes(id);
  const work = (st: DeliveryState): DeliveryState => ({ ...st, effects: { ...st.effects, [id]: (st.effects[id] ?? 0) + 1 }, seen: dedupe ? [...st.seen, id] : st.seen });
  if (ack === "first") {
    if (crash) return { ...base, queue: rest, crashes: s.crashes + 1, log: log(`#${id}: acked, then the consumer crashed before doing the work: gone for good`) };
    if (already) return { ...base, queue: rest, log: log(`#${id}: acked, already seen so the work is skipped`) };
    return { ...work(base), queue: rest, log: log(`#${id}: acked, then work done`) };
  }
  // ack after the work
  if (crash) {
    if (already) return { ...base, queue: [...rest, id], crashes: s.crashes + 1, log: log(`#${id}: skipped the work (already done) but crashed before the ack: it comes back`) };
    return { ...work(base), queue: [...rest, id], crashes: s.crashes + 1, log: log(`#${id}: work done, then the consumer crashed before the ack: the broker will redeliver`) };
  }
  if (already) return { ...base, queue: rest, log: log(`#${id}: already seen, work skipped, acked`) };
  return { ...work(base), queue: rest, log: log(`#${id}: work done, then acked`) };
}
