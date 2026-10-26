import { createStaticProgram, type ProgramHandle } from "@/engine/program";
import { DEFAULT_ROUTES } from "@/engine/runtimes/javascript/sim-api";
import { SimNetwork } from "@/engine/runtimes/javascript/sim-network";
import { trace, type Step } from "./loop";
import { TEAMS, TEAM_IDS, type ArenaEvent, type MatchResult } from "./sim";

/**
 * What the finished Event Arena exposes, written in plain TypeScript so the landing page needs no
 * JavaScript sandbox. It mirrors the reference solution: same hooks, same behaviour.
 */

type Listener = (type: string, event: Record<string, unknown>) => void;

const textOf = (e: Record<string, unknown>) => {
  const team = (e.teamName as string) ?? TEAMS[e.team as string]?.name ?? "Unknown team";
  switch (e.type) {
    case "goal":
      return `GOAL! ${e.player} scores for ${team} (${e.minute}')`;
    case "foul":
      return `Foul by ${e.player} (${team}) at ${e.minute}'`;
    case "timeout":
      return `Timeout: ${team} at ${e.minute}'`;
    case "card":
      return `${e.detail === "red" ? "Red" : "Yellow"} card: ${e.player} (${team}) at ${e.minute}'`;
    default:
      return typeof e.type === "string" ? `Unknown event: ${e.type}` : "Unknown event";
  }
};

export function eventArenaDemoProgram(): ProgramHandle {
  const scores: Record<string, number> = Object.fromEntries(TEAM_IDS.map((id) => [id, 0]));
  let seconds = 0;
  const count = (): Record<string, number> => ({});
  const goals = count();
  const fouls = count();
  const yellow = count();
  const red = count();
  const timeouts = count();
  const bump = (m: Record<string, number>, k: string) => (m[k] = (m[k] ?? 0) + 1);
  const letters: { type: string; message: string }[] = [];
  const listeners: Record<string, Listener[]> = { goal: [], foul: [], timeout: [], card: [], "*": [] };

  const reportAll = (e: ArenaEvent) => {
    if (e.type === "goal") goals[e.team] = (goals[e.team] ?? 0) + (e.points ?? 1);
    if (e.type === "foul") bump(fouls, e.team);
    if (e.type === "card") bump(e.detail === "red" ? red : yellow, e.team);
    if (e.type === "timeout") bump(timeouts, e.team);
  };
  const addGoal = (e: ArenaEvent) => {
    if (!(e.team in scores)) throw new RangeError(`Unknown team: ${e.team}`);
    scores[e.team] += e.points ?? 1;
  };
  listeners.goal.push((_t, e) => addGoal(e as unknown as ArenaEvent));
  for (const type of ["goal", "foul", "timeout", "card"]) listeners[type].push((_t, e) => reportAll(e as unknown as ArenaEvent));

  const emit = (type: string, payload: Record<string, unknown>) => {
    if (type === "error" && !(listeners.error?.length > 0)) throw new Error(`Unhandled "error" event: ${String(payload)}`);
    let ran = 0;
    for (const l of [...(listeners[type] ?? []), ...(type === "*" ? [] : listeners["*"])]) {
      try {
        l(type, payload);
      } catch (err) {
        letters.push({ type, message: (err as Error).message });
      }
      ran++;
    }
    return ran;
  };

  const isHighlight = (e: ArenaEvent) => e.type === "goal" || (e.type === "card" && e.detail === "red") || e.minute >= 85;

  const standings = (results: MatchResult[]) => {
    const rows = TEAM_IDS.map((id) => ({ team: id, name: TEAMS[id].name, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }));
    const by = Object.fromEntries(rows.map((r) => [r.team, r]));
    for (const r of results ?? []) {
      const h = by[r.home];
      const a = by[r.away];
      if (!h || !a) continue;
      for (const [t, f, g] of [
        [h, r.homeGoals, r.awayGoals],
        [a, r.awayGoals, r.homeGoals],
      ] as const) {
        t.played++;
        t.goalsFor += f;
        t.goalsAgainst += g;
        if (f > g) t.won++;
        else if (f === g) t.drawn++;
        else t.lost++;
      }
    }
    for (const r of rows) {
      r.goalDifference = r.goalsFor - r.goalsAgainst;
      r.points = r.won * 3 + r.drawn;
    }
    return rows.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name));
  };

  // ── a real-time network, so the Network panel has something to draw ──
  const net = new SimNetwork(
    { now: () => performance.now(), setTimeout: (cb, ms) => window.setTimeout(cb, ms), clearTimeout: (id) => window.clearTimeout(id) },
    DEFAULT_ROUTES,
  );
  const getJson = async (url: string, signal?: AbortSignal) => {
    const res = await net.fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  };
  const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
  const controllers = new Map<number, AbortController>();
  const fetchWithRetry = async (url: string): Promise<unknown> => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await getJson(url);
      } catch (err) {
        if (attempt > 3 || /HTTP 4/.test((err as Error).message)) throw err;
        await sleep(100 * 2 ** (attempt - 1));
      }
    }
  };
  const loadCentre = async (id: number, signal: AbortSignal) => {
    const match = (await getJson(`/api/matches/${id}`, signal)) as { home: string; away: string };
    const [teams, page] = await Promise.all([getJson("/api/teams", signal) as Promise<{ id: string; name: string }[]>, getJson(`/api/matches/${id}/events?limit=5`, signal) as Promise<{ items: unknown[]; total: number }>]);
    return { match, home: teams.find((t) => t.id === match.home), away: teams.find((t) => t.id === match.away), events: page.items, total: page.total };
  };

  const search = { query: "", results: [] as unknown[], loading: false, error: null as string | null, keystrokes: 0, searches: 0 };
  let searchTimer = 0;
  const refreshStats = { clicks: 0, runs: 0, rows: 0, error: null as string | null };
  let lastRefresh = 0;
  const replay = { matchId: null as number | null, events: [] as unknown[], done: true, error: null as string | null };
  const pipe = { received: 0, delivered: 0, dropped: 0, failed: 0 };
  const failures: { stage: string; message: string; eventId: number | null }[] = [];
  const seen = new Set<number>();

  return createStaticProgram({
    hooks: {
      describeEvent: ((e: ArenaEvent) => textOf(e as unknown as Record<string, unknown>)) as never,
      "scoreboard.add": ((team: string, points = 1) => {
        if (!(team in scores)) throw new RangeError(`Unknown team: ${team}`);
        return (scores[team] += points);
      }) as never,
      "scoreboard.snapshot": (() => ({ ...scores })) as never,
      "scoreboard.reset": (() => {
        for (const k of Object.keys(scores)) scores[k] = 0;
      }) as never,
      tickClock: ((s = 1) => (seconds += s)) as never,
      "matchClock.display": (() => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`) as never,
      "matchClock.reset": (() => {
        seconds = 0;
      }) as never,
      isHighlight: isHighlight as never,
      standings: standings as never,
      reportAll: reportAll as never,
      summaries: (() => ({ goals: { ...goals }, discipline: { fouls: { ...fouls }, yellow: { ...yellow }, red: { ...red } }, timeouts: { ...timeouts } })) as never,
      resetReporters: (() => {
        for (const m of [goals, fouls, yellow, red, timeouts]) for (const k of Object.keys(m)) delete m[k];
      }) as never,
      "arena.emit": emit as never,
      "arena.listenerCount": ((type: string) => listeners[type]?.length ?? 0) as never,
      deadLetters: (() => letters.slice(-50)) as never,
      busWarnings: (() => []) as never,
      runLoop: ((script: Step[]) => trace(script).output) as never,
      inFlight: (() => net.entries().filter((e) => e.status === "pending").length) as never,
      cancelLoad: ((id: number) => {
        const c = controllers.get(id);
        if (!c) return false;
        controllers.delete(id);
        c.abort();
        return true;
      }) as never,
      onSearchInput: ((q: string) => {
        search.keystrokes++;
        search.query = q;
        window.clearTimeout(searchTimer);
        if (!q.trim()) {
          search.results = [];
          return;
        }
        searchTimer = window.setTimeout(async () => {
          search.searches++;
          search.loading = true;
          try {
            search.results = (await fetchWithRetry(`/api/players?q=${encodeURIComponent(q)}`)) as unknown[];
          } catch (err) {
            search.error = (err as Error).message;
          }
          search.loading = false;
        }, 300);
      }) as never,
      getSearchState: (() => ({ ...search, results: [...search.results] })) as never,
      refreshStandings: (() => {
        refreshStats.clicks++;
        if (Date.now() - lastRefresh < 2000) return;
        lastRefresh = Date.now();
        refreshStats.runs++;
        void fetchWithRetry("/api/standings").then((rows) => (refreshStats.rows = (rows as unknown[]).length));
      }) as never,
      getRefreshStats: (() => ({ ...refreshStats })) as never,
      getReplay: (() => ({ ...replay, events: [...replay.events] })) as never,
      pipelineStats: (() => ({ ...pipe })) as never,
      recentFailures: (() => failures.slice(-20)) as never,
      stopFeed: (() => false) as never,
    },
    asyncHooks: {
      loadDashboard: (async () => {
        const [matches, standingsRows, teams] = await Promise.all([getJson("/api/matches"), getJson("/api/standings"), getJson("/api/teams")]);
        return { matches, standings: standingsRows, teams };
      }) as never,
      loadAvailable: (async (urls: string[]) => {
        const results = await Promise.allSettled(urls.map((u) => getJson(u)));
        const data: unknown[] = [];
        const failed: { url: string; reason: string }[] = [];
        results.forEach((r, i) => (r.status === "fulfilled" ? data.push(r.value) : failed.push({ url: urls[i], reason: (r.reason as Error).message })));
        return { data, failed };
      }) as never,
      fastest: ((urls: string[]) => Promise.any(urls.map((u) => getJson(u)))) as never,
      safeLoad: (async (id: number) => {
        controllers.get(id)?.abort();
        const controller = new AbortController();
        controllers.set(id, controller);
        const started = Date.now();
        try {
          return { ok: true, data: await loadCentre(id, controller.signal), ms: Date.now() - started };
        } catch (err) {
          const e = err as Error;
          if (e.name === "AbortError") return { ok: false, cancelled: true, error: "Cancelled", ms: Date.now() - started };
          return { ok: false, cancelled: false, error: `Could not load match ${id}: ${e.message}`, ms: Date.now() - started };
        } finally {
          if (controllers.get(id) === controller) controllers.delete(id);
        }
      }) as never,
      fetchWithTimeout: (async (url: string, ms: number) => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(new DOMException(`Timed out after ${ms}ms`, "TimeoutError")), ms);
        try {
          return await getJson(url, controller.signal);
        } finally {
          window.clearTimeout(timer);
        }
      }) as never,
      fetchWithRetry: fetchWithRetry as never,
      startReplay: (async (matchId: number, pace = 0) => {
        Object.assign(replay, { matchId, events: [], done: false, error: null });
        try {
          let cursor: number | null = 0;
          while (cursor !== null) {
            const page = (await getJson(`/api/matches/${matchId}/events?cursor=${cursor}&limit=4`)) as { items: unknown[]; next: number | null };
            for (const e of page.items) {
              replay.events.push(e);
              if (pace) await sleep(pace);
            }
            cursor = page.next;
          }
        } catch (err) {
          replay.error = (err as Error).message;
        }
        replay.done = true;
        return replay.events.length;
      }) as never,
      processEvent: (async (e: ArenaEvent) => {
        pipe.received++;
        const bad = !e || !Number.isInteger(e.id) || !(e.team in scores) || !(e.minute >= 0 && e.minute <= 130);
        if (bad) {
          pipe.failed++;
          failures.push({ stage: "validate", message: `Stage "validate" failed: invalid event`, eventId: Number.isInteger(e?.id) ? e.id : null });
          return "failed";
        }
        if (seen.has(e.id)) {
          pipe.dropped++;
          return "dropped";
        }
        seen.add(e.id);
        await sleep(0);
        emit(e.type, { ...e, teamName: TEAMS[e.team]?.name });
        pipe.delivered++;
        return "delivered";
      }) as never,
      startFeed: (async () => ({ ...pipe, stopped: false })) as never,
    },
    env: {
      network: {
        entries: () => net.entries(),
        subscribe: (l) => net.subscribe(l),
        configure: (o) => net.configure(o),
        failNext: (m, t, k) => net.failNext(m, t, k),
        clearLog: () => net.clearLog(),
      },
    },
  });
}
