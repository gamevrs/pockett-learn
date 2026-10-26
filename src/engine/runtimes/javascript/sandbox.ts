import { SimNetwork, type Route } from "./sim-network.ts";
import { DEFAULT_ROUTES } from "./sim-api.ts";
import { hmacSha256 } from "./crypto-shim.ts";

/**
 * The asynchronous world a learner's program lives in: timers, a clock and a network, all
 * controllable so lessons and tests about setTimeout, debounce, retries and fetch run instantly
 * and deterministically.
 *
 * The scheduler has two modes:
 *  - virtual (while the file runs and while tests run): nothing waits. A driver advances time to
 *    the next timer whenever the program is idle, so `await sleep(5000)` costs a millisecond;
 *  - live (after the run, for the scene): timers use real time, so the demo behaves like a real app.
 *
 * Free of browser-only APIs so Node can use it for content validation.
 */

const perfNow = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

const realSetTimeout = globalThis.setTimeout.bind(globalThis);
const realClearTimeout = globalThis.clearTimeout.bind(globalThis);

/** Resolves on a fresh macrotask: every pending promise callback has run by then. */
const macrotask: () => Promise<void> = (() => {
  const g = globalThis as unknown as { setImmediate?: (cb: () => void) => void };
  if (typeof g.setImmediate === "function") return () => new Promise<void>((r) => g.setImmediate!(r));
  if (typeof MessageChannel !== "undefined") {
    const channel = new MessageChannel();
    const waiting: (() => void)[] = [];
    channel.port1.onmessage = () => waiting.shift()?.();
    return () =>
      new Promise<void>((r) => {
        waiting.push(r);
        channel.port2.postMessage(0);
      });
  }
  return () => new Promise<void>((r) => realSetTimeout(r, 0));
})();

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

/** Raised when a Promise can never settle: nothing is pending that could resolve it. */
export class StuckPromiseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StuckPromiseError";
  }
}

interface TimerRec {
  id: number;
  due: number;
  seq: number;
  cb: (...args: unknown[]) => void;
  args: unknown[];
  every: number;
  handle?: ReturnType<typeof realSetTimeout>;
}

export interface SchedulerHooks {
  /** Called right before a timer callback runs (re-arms the loop guard). */
  beforeCallback(): void;
  /** A timer callback threw. */
  onUncaught(err: unknown): void;
}

export class Scheduler {
  private timers = new Map<number, TimerRec>();
  private seq = 0;
  private nextId = 1;
  private t = 0;
  private live = false;
  private liveAnchor = 0;
  private realAnchor = 0;
  private dead = false;
  /** Timer callbacks run so far. */
  fired = 0;
  /** > 0 while `tick`/`run` is advancing time by hand: the driver must not also advance it. */
  ticking = 0;
  private hooks: SchedulerHooks;

  constructor(hooks: SchedulerHooks) {
    this.hooks = hooks;
  }

  now(): number {
    return this.live ? this.liveAnchor + (perfNow() - this.realAnchor) : this.t;
  }

  get pending(): number {
    return this.timers.size;
  }

  get isLive() {
    return this.live;
  }

  ids(): number[] {
    return [...this.timers.keys()];
  }

  private add(cb: unknown, delay: unknown, args: unknown[], repeat: boolean): number {
    if (typeof cb !== "function") {
      throw new TypeError(`The first argument to ${repeat ? "setInterval" : "setTimeout"} must be a function (got ${typeof cb}). Pass a function, not the result of calling one.`);
    }
    let d = Number(delay);
    if (!Number.isFinite(d) || d < 0) d = 0;
    if (repeat && d < 1) d = 1;
    const rec: TimerRec = { id: this.nextId++, due: this.now() + d, seq: this.seq++, cb: cb as TimerRec["cb"], args, every: repeat ? d : 0 };
    if (this.dead) return rec.id;
    this.timers.set(rec.id, rec);
    if (this.live) this.arm(rec);
    return rec.id;
  }

  setTimeout = (cb: unknown, delay?: unknown, ...args: unknown[]): number => this.add(cb, delay, args, false);
  setInterval = (cb: unknown, delay?: unknown, ...args: unknown[]): number => this.add(cb, delay, args, true);
  clear = (id?: unknown): void => {
    const rec = typeof id === "number" ? this.timers.get(id) : undefined;
    if (!rec) return;
    if (rec.handle !== undefined) realClearTimeout(rec.handle);
    this.timers.delete(rec.id);
  };

  private run(rec: TimerRec) {
    this.hooks.beforeCallback();
    this.fired++;
    try {
      rec.cb(...rec.args);
    } catch (err) {
      this.hooks.onUncaught(err);
    }
  }

  private arm(rec: TimerRec) {
    rec.handle = realSetTimeout(() => {
      if (this.dead || !this.timers.has(rec.id)) return;
      if (rec.every) {
        rec.due = this.now() + rec.every;
        this.arm(rec);
      } else this.timers.delete(rec.id);
      this.run(rec);
    }, Math.max(0, rec.due - this.now()));
  }

  /** The timer that fires next in virtual time, if any. */
  peek(): TimerRec | undefined {
    let best: TimerRec | undefined;
    for (const rec of this.timers.values()) {
      if (!best || rec.due < best.due || (rec.due === best.due && rec.seq < best.seq)) best = rec;
    }
    return best;
  }

  /** Virtual mode: jump to the next timer (no later than `limit`) and run it. Returns false if there was none. */
  advanceOne(limit = Infinity): boolean {
    if (this.live) return false;
    const rec = this.peek();
    if (!rec || rec.due > limit) return false;
    this.t = Math.max(this.t, rec.due);
    if (rec.every) {
      rec.due = this.t + rec.every;
      rec.seq = this.seq++;
    } else this.timers.delete(rec.id);
    this.run(rec);
    return true;
  }

  /** Move the clock forward without running timers (used by tick to land exactly on its target). */
  jumpTo(time: number) {
    if (!this.live && time > this.t) this.t = time;
  }

  /** Switch to real time: pending timers keep their remaining delay. */
  goLive() {
    if (this.live || this.dead) return;
    this.live = true;
    this.liveAnchor = this.t;
    this.realAnchor = perfNow();
    for (const rec of this.timers.values()) this.arm(rec);
  }

  cancelAll(except?: Set<number>) {
    for (const rec of [...this.timers.values()]) {
      if (except?.has(rec.id)) continue;
      this.clear(rec.id);
    }
  }

  dispose() {
    this.dead = true;
    this.cancelAll();
  }
}

/** The AbortSignal learner code sees: like the real one, but `timeout()` follows the sandbox clock. */
function makeAbortSignal(sched: Scheduler) {
  const Native = AbortSignal;
  const Shim = function () {
    throw new TypeError("Illegal constructor");
  } as unknown as {
    (): never;
    abort(reason?: unknown): AbortSignal;
    timeout(ms: number): AbortSignal;
    any(signals: AbortSignal[]): AbortSignal;
    prototype: AbortSignal;
  };
  Shim.abort = (reason?: unknown) => Native.abort(reason);
  Shim.timeout = (ms: number) => {
    const c = new AbortController();
    sched.setTimeout(() => c.abort(new DOMException("The operation timed out.", "TimeoutError")), ms);
    return c.signal;
  };
  Shim.any = (signals: AbortSignal[]) => {
    const anyFn = (Native as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any;
    if (anyFn) return anyFn.call(Native, signals);
    const c = new AbortController();
    for (const s of signals) {
      if (s.aborted) {
        c.abort(s.reason);
        break;
      }
      s.addEventListener("abort", () => c.abort(s.reason), { once: true });
    }
    return c.signal;
  };
  Shim.prototype = Native.prototype;
  Object.defineProperty(Shim, Symbol.hasInstance, { value: (x: unknown) => x instanceof Native });
  return Shim;
}

/** Kick-off time shown by `Date.now()` at the start of every run, so output is deterministic. */
export const EPOCH = Date.UTC(2026, 0, 15, 18, 0, 0);

function makeDate(sched: Scheduler): DateConstructor {
  class SimDate extends Date {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(EPOCH + Math.floor(sched.now()));
      else super(...(args as [number]));
    }
    static now() {
      return EPOCH + Math.floor(sched.now());
    }
  }
  return SimDate as unknown as DateConstructor;
}

/** Budgets (ms) for the asynchronous side of a run. */
export const ASYNC_BUDGET = {
  /** Real time one drive may take in total. */
  wall: 10_000,
  /** Timer callbacks one drive may fire (a runaway setInterval or retry loop). */
  fires: 10_000,
  /** After the file finishes, leftover timers due within this much virtual time still run. */
  drainMs: 30_000,
  drainFires: 2_000,
  /** callAsync on a live program. */
  call: 8_000,
};

export interface SimControls {
  now(): number;
  tick(ms: number): Promise<void>;
  run(): Promise<void>;
  flush(): Promise<void>;
  pending(): number;
  network: SimNetwork;
}

/** Everything the learner's code can reach beyond plain JavaScript, plus the driver that animates it. */
export class Sandbox {
  readonly scheduler: Scheduler;
  readonly network: SimNetwork;
  readonly controls: SimControls;
  /** Errors thrown inside timer callbacks. */
  uncaught: unknown[] = [];
  /** Promise rejections nobody handled. */
  unhandled: { promise: Promise<unknown>; reason: unknown }[] = [];
  private armGuard: () => void;
  private watchers = 0;
  private detach: (() => void) | null = null;

  /** The names injected into the learner's scope (see executeJs). */
  readonly globals: Record<string, unknown>;

  constructor(arm: () => void, routes: Route[] = DEFAULT_ROUTES) {
    this.armGuard = arm;
    this.scheduler = new Scheduler({
      beforeCallback: arm,
      onUncaught: (err) => this.uncaught.push(err),
    });
    const sched = this.scheduler;
    this.network = new SimNetwork(
      {
        now: () => sched.now(),
        setTimeout: (cb, ms) => sched.setTimeout(cb, ms),
        clearTimeout: (id) => sched.clear(id),
      },
      routes,
    );

    const controls: SimControls = {
      now: () => sched.now(),
      pending: () => sched.pending,
      flush: () => macrotask(),
      tick: async (ms: number) => {
        const target = sched.now() + Math.max(0, Number(ms) || 0);
        sched.ticking++;
        try {
          let guardFires = 0;
          for (;;) {
            await macrotask();
            this.armGuard();
            const next = sched.peek();
            if (!next || next.due > target) break;
            if (++guardFires > ASYNC_BUDGET.fires) throw new TimeoutError("Too many timers fired: a setInterval that is never cleared, a retry loop that never stops, or a Promise that never settles while a timer keeps running.");
            sched.advanceOne(target);
          }
          sched.jumpTo(target);
          await macrotask();
        } finally {
          sched.ticking--;
        }
      },
      run: async () => {
        sched.ticking++;
        try {
          let guardFires = 0;
          for (;;) {
            await macrotask();
            this.armGuard();
            if (++guardFires > ASYNC_BUDGET.fires) throw new TimeoutError("Too many timers fired: a setInterval that is never cleared, a retry loop that never stops, or a Promise that never settles while a timer keeps running.");
            if (!sched.advanceOne()) break;
          }
        } finally {
          sched.ticking--;
        }
      },
      network: this.network,
    };
    this.controls = controls;

    const PerformanceShim = { now: () => sched.now(), timeOrigin: EPOCH };
    this.globals = {
      setTimeout: sched.setTimeout,
      setInterval: sched.setInterval,
      clearTimeout: sched.clear,
      clearInterval: sched.clear,
      fetch: this.network.fetch,
      Date: makeDate(sched),
      performance: PerformanceShim,
      AbortSignal: makeAbortSignal(sched),
      hmacSha256,
    };
  }

  /** Watch for unhandled rejections while something is being driven. Reference counted. */
  private watch() {
    if (this.watchers++ > 0) return;
    const g = globalThis as unknown as {
      addEventListener?: (n: string, h: (e: never) => void) => void;
      removeEventListener?: (n: string, h: (e: never) => void) => void;
    };
    const proc = (globalThis as unknown as { process?: { on?: (n: string, h: (...a: never[]) => void) => void; off?: (n: string, h: (...a: never[]) => void) => void } }).process;
    const onRejected = (reason: unknown, promise: Promise<unknown>) => {
      this.unhandled.push({ promise, reason });
    };
    const onHandled = (promise: Promise<unknown>) => {
      this.unhandled = this.unhandled.filter((u) => u.promise !== promise);
    };
    if (typeof window === "undefined" && proc?.on && proc.off) {
      proc.on("unhandledRejection", onRejected as never);
      proc.on("rejectionHandled", onHandled as never);
      this.detach = () => {
        proc.off!("unhandledRejection", onRejected as never);
        proc.off!("rejectionHandled", onHandled as never);
      };
    } else if (g.addEventListener && g.removeEventListener) {
      const a = (e: { promise: Promise<unknown>; reason: unknown; preventDefault(): void }) => {
        e.preventDefault();
        onRejected(e.reason, e.promise);
      };
      const b = (e: { promise: Promise<unknown> }) => onHandled(e.promise);
      g.addEventListener("unhandledrejection", a as never);
      g.addEventListener("rejectionhandled", b as never);
      this.detach = () => {
        g.removeEventListener!("unhandledrejection", a as never);
        g.removeEventListener!("rejectionhandled", b as never);
      };
    }
  }

  private unwatch() {
    if (--this.watchers > 0) return;
    this.watchers = 0;
    this.detach?.();
    this.detach = null;
  }

  /**
   * Waits for `work` to settle while moving virtual time forward whenever the program is idle.
   * Rejects with a clear error when it can never settle or takes too long.
   */
  async drive<T>(work: Promise<T> | T, label = "Your code"): Promise<T> {
    const sched = this.scheduler;
    this.watch();
    try {
      let settled = false;
      let rejected = false;
      let value: T | undefined;
      let error: unknown;
      Promise.resolve(work).then(
        (v) => {
          settled = true;
          value = v;
        },
        (e) => {
          settled = true;
          rejected = true;
          error = e;
        },
      );
      const started = perfNow();
      const firesAtStart = sched.fired;
      let idle = 0;
      for (;;) {
        await macrotask();
        if (settled) break;
        if (sched.isLive) {
          // real time: just wait for the timers to do their job
          if (perfNow() - started > ASYNC_BUDGET.wall) throw new TimeoutError(`${label} did not finish within ${ASYNC_BUDGET.wall / 1000} seconds.`);
          await new Promise<void>((r) => realSetTimeout(r, 4));
          continue;
        }
        if (sched.ticking > 0) {
          idle = 0;
          continue;
        }
        if (perfNow() - started > ASYNC_BUDGET.wall) throw new TimeoutError(`${label} ran for too long. Is something looping forever?`);
        if (sched.fired - firesAtStart > ASYNC_BUDGET.fires) {
          throw new TimeoutError("Too many timers fired: a setInterval that is never cleared, a retry loop that never stops, or a Promise that never settles while a timer keeps running.");
        }
        this.armGuard();
        if (sched.advanceOne()) idle = 0;
        else if (++idle >= 3) {
          throw new StuckPromiseError(
            "A Promise never settled: your code is waiting for something that can no longer happen (no timer or request is left to resolve it). Check that every path calls resolve() or reject(), and that you await the right thing.",
          );
        }
      }
      if (rejected) throw error;
      return value as T;
    } finally {
      this.unwatch();
    }
  }

  /** After the file finished: run timers due soon (so "later" console.log lines appear), leave the rest for live mode. */
  async drain(): Promise<void> {
    const sched = this.scheduler;
    this.watch();
    try {
      const limit = sched.now() + ASYNC_BUDGET.drainMs;
      const firesAtStart = sched.fired;
      for (;;) {
        await macrotask();
        this.armGuard();
        if (sched.fired - firesAtStart > ASYNC_BUDGET.drainFires) break;
        if (!sched.advanceOne(limit)) break;
      }
      await macrotask();
    } finally {
      this.unwatch();
    }
  }

  goLive() {
    this.scheduler.goLive();
  }

  dispose() {
    this.scheduler.dispose();
  }
}
