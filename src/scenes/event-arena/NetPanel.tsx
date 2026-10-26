"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { Globe, Search, WifiOff, Zap } from "lucide-react";
import type { NetworkEntryView, ProgramHandle } from "@/engine/program";
import { BTN, BTN_ON, Chip, Empty, INPUT, Locked, Notice, Panel, fmtMs } from "./ui";

interface Props {
  program: ProgramHandle | null;
  unlocked: ReadonlySet<string>;
  focus: string | null;
  interactive: boolean;
}

const EMPTY: readonly NetworkEntryView[] = [];
const noopSubscribe = () => () => {};
const getEmpty = () => EMPTY;

const STATUS_TONE: Record<NetworkEntryView["status"], { bar: string; chip: "ok" | "warn" | "bad" | "plain"; label: string }> = {
  pending: { bar: "bg-white/35", chip: "plain", label: "pending" },
  ok: { bar: "bg-[#c5ee8a]", chip: "ok", label: "ok" },
  "http-error": { bar: "bg-[#f87171]", chip: "bad", label: "error" },
  failed: { bar: "bg-[#f87171]", chip: "bad", label: "failed" },
  aborted: { bar: "bg-white/20", chip: "warn", label: "aborted" },
};

function Waterfall({ entries }: { entries: readonly NetworkEntryView[] }) {
  const shown = entries.slice(-9);
  if (shown.length === 0) return <Empty>No requests yet. Use the buttons below and watch them appear.</Empty>;
  const t0 = Math.min(...shown.map((e) => e.startedAt));
  const ends = shown.map((e) => e.endedAt ?? e.startedAt + Math.max(e.latency, 60));
  const t1 = Math.max(...ends, t0 + 200);
  const span = t1 - t0;
  return (
    <ul className="space-y-1" aria-label="Requests">
      {shown.map((e, i) => {
        const tone = STATUS_TONE[e.status];
        const end = ends[i];
        const left = ((e.startedAt - t0) / span) * 100;
        const width = Math.max(1.5, ((end - e.startedAt) / span) * 100);
        const took = e.endedAt !== null ? e.endedAt - e.startedAt : null;
        return (
          <li key={e.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 @md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto]">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className={`shrink-0 font-mono text-[10px] font-semibold ${e.method === "GET" ? "text-white/60" : "text-[#fbbf24]"}`}>{e.method}</span>
              <span className="min-w-0 truncate font-mono text-[10.5px] text-white/80" title={e.url}>
                {e.url}
              </span>
              {e.attempt > 1 && <Chip tone="warn">try {e.attempt}</Chip>}
            </div>
            <div className="flex shrink-0 items-center justify-end gap-1 @md:order-3">
              <Chip tone={tone.chip}>{e.code ?? tone.label}</Chip>
              <span className="hud-value w-12 text-right text-[10px] text-white/45">{took !== null ? fmtMs(took) : "…"}</span>
            </div>
            <div className="relative col-span-2 h-2 rounded-full bg-white/[0.06] @md:col-span-1 @md:order-2" aria-hidden>
              <span className={`absolute top-0 h-full rounded-full ${tone.bar} ${e.status === "pending" ? "animate-pulse" : ""}`} style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

interface SearchState {
  query: string;
  results: { name: string; team: string }[];
  loading: boolean;
  error: string | null;
  keystrokes: number;
  searches: number;
}
interface RefreshStats {
  clicks: number;
  runs: number;
  rows: number;
  error: string | null;
}
interface ReplayState {
  matchId: number | null;
  events: { minute: number; type: string; team: string; player?: string }[];
  done: boolean;
  error: string | null;
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

interface ActionResult {
  tone: "ok" | "bad" | "warn";
  text: string;
}

export function NetPanel({ program, unlocked, focus, interactive }: Props) {
  const env = program?.env ?? null;
  const entries = useSyncExternalStore(env ? env.network.subscribe : noopSubscribe, env ? env.network.entries : getEmpty, getEmpty);
  const netOn = unlocked.has("arena-network");
  const cancelOn = unlocked.has("arena-cancel");
  const retryOn = unlocked.has("arena-retry");
  const replayOn = unlocked.has("arena-replay");

  const [offline, setOffline] = useState(false);
  const [slow, setSlow] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ActionResult | undefined>>({});
  const [matchId, setMatchId] = useState(1);
  const [replayId, setReplayId] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState | null>(null);
  const [refresh, setRefresh] = useState<RefreshStats | null>(null);
  const [replay, setReplay] = useState<ReplayState | null>(null);

  const setResult = (key: string, value: ActionResult | undefined) => setResults((r) => ({ ...r, [key]: value }));

  // live state the learner's code keeps: search box, refresh counters, replay list
  useEffect(() => {
    if (!program || (!retryOn && !replayOn)) return;
    const poll = () => {
      if (retryOn && program.hasHook("getSearchState")) {
        const s = program.call<unknown>("getSearchState");
        if (isRecord(s)) setSearch(s as unknown as SearchState);
      }
      if (retryOn && program.hasHook("getRefreshStats")) {
        const r = program.call<unknown>("getRefreshStats");
        if (isRecord(r)) setRefresh(r as unknown as RefreshStats);
      }
      if (replayOn && program.hasHook("getReplay")) {
        const r = program.call<unknown>("getReplay");
        if (isRecord(r)) setReplay(r as unknown as ReplayState);
      }
    };
    const t = setInterval(poll, 140);
    return () => clearInterval(t);
  }, [program, retryOn, replayOn]);

  const act = async (key: string, fn: () => Promise<ActionResult>) => {
    if (!program) return;
    setBusy(key);
    setResult(key, undefined);
    const started = performance.now();
    try {
      const res = await fn();
      setResult(key, { ...res, text: `${res.text} · ${fmtMs(performance.now() - started)}` });
    } catch (err) {
      setResult(key, { tone: "bad", text: (err as Error).message });
    } finally {
      setBusy((b) => (b === key ? null : b));
    }
  };

  const failure = (fallback: string): ActionResult => ({ tone: "bad", text: `✗ ${program?.lastError ?? fallback}` });

  const dashboard = () =>
    act("net", async () => {
      const res = await program!.callAsync<{ matches: unknown[]; standings: unknown[]; teams: unknown[] }>("loadDashboard");
      if (!res || !Array.isArray(res.matches)) return failure("loadDashboard() did not return the data");
      return { tone: "ok", text: `✓ ${res.matches.length} matches, ${res.standings?.length ?? 0} table rows, ${res.teams?.length ?? 0} teams` };
    });

  const available = () =>
    act("net", async () => {
      const res = await program!.callAsync<{ data: unknown[]; failed: { url: string; reason: string }[] }>("loadAvailable", ["/api/teams", "/api/matches/99", "/api/standings"]);
      if (!res || !Array.isArray(res.data)) return failure("loadAvailable() did not return { data, failed }");
      return { tone: res.failed.length ? "warn" : "ok", text: `${res.data.length} loaded · ${res.failed.length} failed${res.failed[0] ? ` (${res.failed[0].url}: ${res.failed[0].reason})` : ""}` };
    });

  const race = () =>
    act("net", async () => {
      const res = await program!.callAsync<unknown>("fastest", ["/api/slow", "/api/teams"]);
      if (res === undefined) return failure("fastest() did not answer");
      return { tone: "ok", text: `✓ first answer: ${Array.isArray(res) ? `${res.length} items` : typeof res}` };
    });

  const loadMatch = () =>
    act("match", async () => {
      const res = await program!.callAsync<{ ok: boolean; cancelled?: boolean; error?: string; data?: { match?: { id: number }; events?: unknown[]; home?: { name: string }; away?: { name: string } }; ms?: number }>("safeLoad", matchId);
      if (!res) return failure("safeLoad() did not return a result");
      if (res.ok) return { tone: "ok", text: `✓ ${res.data?.home?.name ?? "?"} v ${res.data?.away?.name ?? "?"}, ${res.data?.events?.length ?? 0} events` };
      return { tone: res.cancelled ? "warn" : "bad", text: res.cancelled ? "Cancelled" : `✗ ${res.error}` };
    });

  const cancel = () => {
    if (!program) return;
    const ok = program.call<boolean>("cancelLoad", matchId);
    setResult("cancel", { tone: ok ? "warn" : "ok", text: ok ? `Aborted the load of match ${matchId}` : "Nothing was loading" });
  };

  const timeout = () =>
    act("timeout", async () => {
      const res = await program!.callAsync<unknown>("fetchWithTimeout", "/api/slow", 300);
      if (res === undefined) return failure("timed out");
      return { tone: "ok", text: "finished before the limit" };
    });

  const retryFetch = () =>
    act("retry", async () => {
      const before = env?.network.entries().length ?? 0;
      const res = await program!.callAsync<unknown[]>("fetchWithRetry", "/api/standings");
      const attempts = Math.max(0, (env?.network.entries().length ?? 0) - before);
      if (!Array.isArray(res)) return failure("fetchWithRetry() failed");
      return { tone: attempts > 1 ? "warn" : "ok", text: `✓ ${res.length} rows after ${attempts} ${attempts === 1 ? "request" : "requests"}` };
    });

  const breakApi = () => {
    env?.network.failNext("/api/standings", 2, 503);
    setResult("retry", { tone: "warn", text: "The next 2 standings requests will fail with 503. Now fetch with retry." });
  };

  const startReplay = () => {
    if (!program) return;
    setReplay({ matchId: replayId, events: [], done: false, error: null });
    void program.callAsync("startReplay", replayId, 160);
  };

  const toggleOffline = () => {
    const next = !offline;
    setOffline(next);
    env?.network.configure({ offline: next });
  };
  const toggleSlow = () => {
    const next = !slow;
    setSlow(next);
    env?.network.configure({ slow: next ? 4 : 1 });
  };

  const hasProgram = !!program && !!env;
  const off = !interactive || !hasProgram;
  const resultLine = (key: string) => {
    const r = results[key];
    if (busy === key) return <p className="mt-1.5 text-[11px] text-white/45">waiting for your promise to settle…</p>;
    if (!r) return null;
    return <p className={`mt-1.5 break-words text-[11px] ${r.tone === "ok" ? "hud-accent" : r.tone === "warn" ? "hud-warning" : "hud-danger"}`}>{r.text}</p>;
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-2">
      <Panel
        title="Network"
        icon={<Globe className="h-3.5 w-3.5" />}
        meta={netOn ? `${entries.length} requests` : "locked"}
        className={focus === "arena-network" || focus === "arena-cancel" || focus === "arena-retry" ? "pulse-ring" : ""}
        actions={
          netOn ? (
            <>
              <button type="button" aria-pressed={offline} onClick={toggleOffline} disabled={off} className={`${offline ? BTN_ON : BTN} !h-6 !px-2 !text-[10.5px]`}>
                <WifiOff className="h-3 w-3" />
                Offline
              </button>
              <button type="button" aria-pressed={slow} onClick={toggleSlow} disabled={off} className={`${slow ? BTN_ON : BTN} !h-6 !px-2 !text-[10.5px]`}>
                <Zap className="h-3 w-3" />
                Slow ×4
              </button>
            </>
          ) : null
        }
      >
        {!netOn ? (
          <div className="p-2">
            <Locked feature="arena-network" title="Network" need="getJson(), loadDashboard()" spot={focus === "arena-network"} />
          </div>
        ) : (
          <div className="p-3">
            <Waterfall entries={entries} />
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <button type="button" className={BTN_ON} onClick={dashboard} disabled={off || busy === "net"}>
                Load dashboard
              </button>
              <button type="button" className={BTN} onClick={available} disabled={off || busy === "net"}>
                Load what works
              </button>
              <button type="button" className={BTN} onClick={race} disabled={off || busy === "net"}>
                Race two mirrors
              </button>
              <button type="button" className={BTN} onClick={() => env?.network.clearLog()} disabled={off}>
                Clear
              </button>
            </div>
            {resultLine("net")}
            <p className="mt-1 text-[10.5px] text-white/35">
              dashboard = <code className="font-mono">Promise.all</code> · what works = <code className="font-mono">allSettled</code> (one URL is a 404) · mirrors = <code className="font-mono">Promise.any</code> (one takes 3 s)
            </p>
          </div>
        )}
      </Panel>

      {!cancelOn ? (
        <Locked feature="arena-cancel" title="Cancel & time limits" need="async loadMatchCentre(), startLoad(), cancelLoad()" spot={focus === "arena-cancel"} compact />
      ) : (
        <Panel title="Match centre" meta="async / await + AbortController" className={focus === "arena-cancel" ? "pulse-ring" : ""}>
          <div className="space-y-1 p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <label className="hud-label" htmlFor="arena-match">
                Match
              </label>
              <select id="arena-match" value={matchId} onChange={(e) => setMatchId(Number(e.target.value))} className={`${INPUT} pr-1`}>
                {[1, 2, 3, 4, 99].map((id) => (
                  <option key={id} value={id}>
                    {id === 99 ? "99 (does not exist)" : `#${id}`}
                  </option>
                ))}
              </select>
              <button type="button" className={BTN_ON} onClick={loadMatch} disabled={off || busy === "match"}>
                Load
              </button>
              <button type="button" className={BTN} onClick={cancel} disabled={off}>
                Cancel
              </button>
              <button type="button" className={BTN} onClick={timeout} disabled={off || busy === "timeout"}>
                /api/slow with a 300 ms limit
              </button>
            </div>
            {resultLine("match")}
            {results.cancel && <p className="text-[11px] text-white/55">{results.cancel.text}</p>}
            {resultLine("timeout")}
          </div>
        </Panel>
      )}

      {!retryOn ? (
        <Locked feature="arena-retry" title="Retries, search & refresh" need="retry(), fetchWithRetry(), debounce(), throttle()" spot={focus === "arena-retry"} compact />
      ) : (
        <Panel title="Resilience" icon={<Search className="h-3.5 w-3.5" />} meta="retry · debounce · throttle" className={focus === "arena-retry" ? "pulse-ring" : ""}>
          <div className="space-y-3 p-3">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" className={BTN} onClick={breakApi} disabled={off}>
                  Break the API (next 2 fail)
                </button>
                <button type="button" className={BTN_ON} onClick={retryFetch} disabled={off || busy === "retry"}>
                  Fetch standings with retry
                </button>
              </div>
              {resultLine("retry")}
            </div>
            <div>
              <label className="hud-label mb-1 block" htmlFor="arena-search">
                Player search (debounced 300 ms)
              </label>
              <input
                id="arena-search"
                className={`${INPUT} w-full`}
                value={query}
                disabled={off}
                placeholder="try typing “ada”, then “hana”"
                onChange={(e) => {
                  setQuery(e.target.value);
                  program?.call("onSearchInput", e.target.value);
                }}
              />
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10.5px] text-white/50">
                <Chip>keystrokes {search?.keystrokes ?? 0}</Chip>→<Chip tone="ok">requests {search?.searches ?? 0}</Chip>
                {search?.loading && <span className="animate-pulse">searching…</span>}
                {search?.error && <span className="hud-danger">{search.error}</span>}
              </div>
              {search && search.results.length > 0 && (
                <ul className="mt-1.5 flex flex-wrap gap-1">
                  {search.results.slice(0, 8).map((p) => (
                    <li key={p.name} className="rounded-full border border-white/12 px-2 py-px text-[10.5px] text-white/80">
                      {p.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={BTN} onClick={() => program?.call("refreshStandings")} disabled={off}>
                Refresh standings (throttled 2 s)
              </button>
              <div className="flex items-center gap-1.5 text-[10.5px] text-white/50">
                <Chip>clicks {refresh?.clicks ?? 0}</Chip>→<Chip tone="ok">refreshes {refresh?.runs ?? 0}</Chip>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {!replayOn ? (
        <Locked feature="arena-replay" title="Match replay" need="async function* pagedEvents(), startReplay()" spot={focus === "arena-replay"} compact />
      ) : (
        <Panel title="Replay" meta="async generator · one page per request" className={focus === "arena-replay" ? "pulse-ring" : ""}>
          <div className="space-y-1.5 p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <select aria-label="Match to replay" value={replayId} onChange={(e) => setReplayId(Number(e.target.value))} className={`${INPUT} pr-1`}>
                {[1, 2, 3].map((id) => (
                  <option key={id} value={id}>
                    Match #{id}
                  </option>
                ))}
              </select>
              <button type="button" className={BTN_ON} onClick={startReplay} disabled={off || (replay !== null && !replay.done)}>
                Replay
              </button>
              {replay && <Chip tone={replay.done ? "ok" : "warn"}>{replay.done ? "done" : "streaming…"} · {replay.events.length}</Chip>}
            </div>
            {replay?.error && <Notice tone="bad">{replay.error}</Notice>}
            <ul className="max-h-28 space-y-0.5 overflow-y-auto font-mono text-[10.5px] text-white/70" aria-live="polite">
              {replay && replay.events.length === 0 && !replay.error && <li className="text-white/35">{replay.done ? "no events" : "waiting for the first page…"}</li>}
              {replay?.events.map((e, i) => (
                <li key={i} className="arena-slide truncate">
                  <span className="text-white/40">{e.minute}′</span> {e.type} · {e.team}
                  {e.player ? ` · ${e.player}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      )}
    </div>
  );
}
