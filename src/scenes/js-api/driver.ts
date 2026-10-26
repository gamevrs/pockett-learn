import type { ProgramHandle } from "@/engine/program";
import { observe } from "./observe";
import { initialSnap, type Exchange, type Hooks, type Snap } from "./state";
import { readBreaker, readLifecycle, readLogs, readResponse, readRoutes, readStrings, type RawRequest } from "./types";
import { decodeJwt, pathOf } from "./util";

/**
 * The traffic driver: a small external store that fires plain-object requests at the learner's
 * handle() and remembers what came back. It only reaches the program through `program.call` and
 * `program.callAsync`, and only when the matching feature is unlocked and the hook exists.
 *
 * Hooks used (all optional): handle, listMiddleware, listRoutes, recentLogs, breakerState,
 * lifecycleState, shutdown, restart, runSuite, parseGraph.
 */

export const CALL_TIMEOUT = 4000;
const BASE_TICK = 1400;
const POLL_EVERY = 700;
const DOT_LIFE = 2600;

type Plan = (d: DocklineDriver) => Promise<{ req: RawRequest; label: string } | null>;

export class DocklineDriver {
  readonly program: ProgramHandle | null;
  readonly autoplay: boolean;
  private unlockedSet: ReadonlySet<string>;
  private snap: Snap;
  private listeners = new Set<() => void>();
  private notifyTimer: ReturnType<typeof setTimeout> | null = null;
  private tickTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private seq = 0;
  private plan: Plan | null = null;
  disposed = false;
  /** Count of traffic ticks since the program started (scheduled scenarios key off it). */
  tickN = 0;
  /** ETags seen per URL, for conditional GETs. */
  etags = new Map<string, string>();
  /** Rentals the traffic opened and has not returned yet. */
  openRentals: { id: string; riderId: string; tick: number }[] = [];
  /** Rentals seen in GET /rentals listings. */
  knownRentals: { id: string; riderId: string }[] = [];

  constructor(program: ProgramHandle | null, unlocked: ReadonlySet<string>, autoplay: boolean) {
    this.program = program;
    this.unlockedSet = unlocked;
    this.autoplay = autoplay;
    this.snap = initialSnap(!!program, program?.generation ?? 0);
  }

  // ── store plumbing ──
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snap;

  update(fn: (s: Snap) => Partial<Snap>) {
    if (this.disposed) return;
    this.snap = { ...this.snap, ...fn(this.snap) };
    if (this.notifyTimer === null) {
      this.notifyTimer = setTimeout(() => {
        this.notifyTimer = null;
        this.listeners.forEach((l) => l());
      }, 40);
    }
  }

  /** A timer that is cleared on stop(). */
  later(fn: () => void, ms: number) {
    const t = setTimeout(() => {
      this.timers.delete(t);
      if (!this.disposed) fn();
    }, ms);
    this.timers.add(t);
  }

  // ── lifecycle ──
  start(planner: Plan) {
    this.plan = planner;
    this.disposed = false;
    if (!this.program) return;
    this.poll();
    this.pollTimer = setInterval(() => this.poll(), POLL_EVERY);
    this.later(() => this.tick(), 350);
  }

  stop() {
    this.disposed = true;
    if (this.tickTimer) clearTimeout(this.tickTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.notifyTimer) clearTimeout(this.notifyTimer);
    this.tickTimer = null;
    this.pollTimer = null;
    this.notifyTimer = null;
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    if (this.snap.slow) this.program?.env?.network.configure({ slow: 1 });
  }

  has(feature: string) {
    return this.unlockedSet.has(feature);
  }

  /** True when this feature is unlocked and the learner's function exists. */
  can(feature: string, hook: string) {
    return !this.disposed && !!this.program && this.unlockedSet.has(feature) && this.program.hasHook(hook);
  }

  setUnlocked(next: ReadonlySet<string>) {
    const grew = [...next].some((f) => !this.unlockedSet.has(f));
    this.unlockedSet = next;
    if (grew && !this.disposed) this.later(() => this.tick(true), 250);
  }

  setRunning(running: boolean) {
    this.update(() => ({ running }));
    if (running) this.later(() => this.tick(true), 100);
  }

  setSpeed(speed: number) {
    this.update(() => ({ speed }));
  }

  // ── traffic ──
  private schedule() {
    if (this.disposed) return;
    const jitter = 0.8 + Math.random() * 0.5;
    const base = this.autoplay ? BASE_TICK * 0.8 : BASE_TICK;
    this.tickTimer = setTimeout(() => this.tick(), (base * jitter) / this.snap.speed);
  }

  private async tick(extra = false) {
    if (this.disposed) return;
    if (this.snap.running && this.snap.inFlight < 3 && !(typeof document !== "undefined" && document.hidden && !extra) && this.program?.hasHook("handle") && this.plan) {
      this.tickN++;
      try {
        const planned = await this.plan(this);
        if (planned && !this.disposed) void this.send(planned.req, planned.label, "auto");
      } catch {
        // a failed plan must never stop the traffic
      }
    }
    if (!extra) this.schedule();
  }

  /** Send one request through the learner's handle(), raced against a timeout. */
  async send(req: RawRequest, label = "manual", source: "auto" | "user" = "user"): Promise<Exchange> {
    const base = { id: ++this.seq, at: Date.now(), label, source, req, path: pathOf(req.url), status: 0, headers: {}, body: null, trace: [] as string[], ms: 0 };
    const program = this.program;
    if (!program || this.disposed || !program.hasHook("handle")) return { ...base, outcome: "junk" };

    this.update((s) => ({ inFlight: s.inFlight + 1 }));
    const t0 = performance.now();
    let raw: unknown;
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      raw = await Promise.race([
        program.callAsync("handle", structuredClone(req)),
        new Promise<undefined>((resolve) => {
          timer = setTimeout(() => {
            timedOut = true;
            resolve(undefined);
          }, CALL_TIMEOUT);
        }),
      ]);
    } catch {
      raw = undefined;
    } finally {
      clearTimeout(timer);
    }
    const ms = performance.now() - t0;
    if (this.disposed) return { ...base, outcome: "junk", ms };

    const resp = readResponse(raw);
    const ex: Exchange = resp
      ? { ...base, outcome: "ok", status: resp.status, headers: resp.headers, body: resp.body, trace: resp.trace, ms }
      : { ...base, outcome: timedOut ? "timeout" : "junk", ms };
    this.record(ex);
    return ex;
  }

  private record(ex: Exchange) {
    const etag = ex.headers.etag;
    if (ex.req.method === "GET" && ex.status === 200 && etag) this.etags.set(ex.req.url, etag);
    if (ex.req.method === "GET" && ex.path === "/rentals" && ex.status === 200) this.rememberRentals(ex.body);
    if (ex.req.method === "POST" && ex.path === "/rentals" && ex.status === 201) {
      const id = (ex.body as { id?: unknown } | null)?.id;
      const bikeId = (ex.req.body as { bikeId?: unknown } | null)?.bikeId;
      if (typeof id === "string" && typeof bikeId === "string" && !this.openRentals.some((r) => r.id === id)) {
        const sub = decodeJwt((ex.req.headers?.authorization ?? "").replace(/^Bearer\s+/i, "")).payload?.sub;
        this.openRentals.push({ id, riderId: typeof sub === "string" ? sub : "", tick: this.tickN });
      }
    }
    const lastError = this.program?.lastError ?? null;
    this.update((s) => ({
      ...observe(s, ex),
      inFlight: Math.max(0, s.inFlight - 1),
      error:
        ex.outcome === "ok"
          ? null
          : ex.outcome === "timeout"
            ? "handle() did not answer within 4 seconds."
            : `handle() did not return a response object${lastError ? `: ${lastError}` : "."}`,
    }));
    this.later(() => this.update((s) => ({ dots: s.dots.filter((d) => d.id !== ex.id) })), DOT_LIFE);
  }

  private rememberRentals(body: unknown) {
    const items = (body as { items?: unknown } | null)?.items;
    if (!Array.isArray(items)) return;
    for (const r of items) {
      const o = r as { id?: unknown; riderId?: unknown };
      if (typeof o?.id === "string" && typeof o.riderId === "string" && !this.knownRentals.some((k) => k.id === o.id)) this.knownRentals.push({ id: o.id, riderId: o.riderId });
    }
    this.knownRentals = this.knownRentals.slice(-40);
  }

  // ── reading the learner's hooks ──
  private poll() {
    const p = this.program;
    if (!p || this.disposed) return;
    const read = <T,>(feature: string, hook: string, ...args: unknown[]): T | undefined => (this.can(feature, hook) ? p.call<T>(hook, ...args) : undefined);
    const next: Hooks = {
      middleware: readStrings(read("api-pipeline", "listMiddleware")),
      routes: readRoutes(read("api-routes", "listRoutes")),
      logs: readLogs(read("api-logs", "recentLogs", 14)),
      breaker: readBreaker(read("api-breaker", "breakerState")),
      lifecycle: readLifecycle(read("api-shutdown", "lifecycleState")),
    };
    const prev = this.snap.hooks;
    const changed = (Object.keys(next) as (keyof Hooks)[]).filter((k) => JSON.stringify(next[k]) !== JSON.stringify(prev[k]));
    const now = Date.now();
    const trail = this.snap.breakerTrail;
    const last = trail[trail.length - 1];
    const sample = next.breaker && (!last || last.state !== next.breaker.state || now - last.t > 1500);
    if (changed.length === 0 && !sample) return;
    this.update((s) => ({
      hooks: changed.length ? { ...s.hooks, ...Object.fromEntries(changed.map((k) => [k, next[k]])) } : s.hooks,
      breakerTrail: sample && next.breaker ? [...s.breakerTrail, { t: now, state: next.breaker.state }].slice(-90) : s.breakerTrail,
    }));
  }

  /** Refresh the hooks right now (after an action that changes them). */
  refreshHooks() {
    this.poll();
  }
}
