"use client";

import React, { useState } from "react";
import { Search, X } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Segmented, noise, useReport } from "./kit";

/**
 * The same 36 events from a food-delivery app, shown two ways. As plain text each line is free-form
 * prose, so the only tool is searching for words, and different lines say the same thing in
 * different words. As structured logs every line has the same named fields, so you can filter by
 * field and count exactly. Task: how many checkouts failed in the eu-west region?
 */

export interface LogEvent {
  i: number;
  t: string;
  level: "info" | "warn" | "error";
  route: string;
  status: number;
  region: string;
  ms: number;
  request_id: string;
  msg: string;
  plain: string;
}

const ROUTES = ["/menu", "/cart", "/checkout", "/track"];
const FAIL_WORDS: Record<number, { msg: string; plain: string }> = {
  14: { msg: "payment provider timeout", plain: "ERROR checkout: payment provider timeout after 3012ms [eu-west] req r-1098" },
  22: { msg: "payment provider timeout", plain: "payfast gateway timed out (order 5521, region=eu-west) took 3188ms req=r-1154" },
  26: { msg: "payment provider timeout", plain: "ERROR charge failed: upstream took too long, eu-west, 3340ms r-1182" },
  34: { msg: "payment provider timeout", plain: "ERROR checkout: payment provider timeout after 3079ms [eu-west] req r-1238" },
};

export function makeEvents(): LogEvent[] {
  const out: LogEvent[] = [];
  for (let i = 0; i < 36; i++) {
    const route = ROUTES[i % 4];
    const region = i % 3 === 0 ? "us-east" : "eu-west";
    const sec = i * 5;
    const t = `12:${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
    const request_id = `r-${1000 + i * 7 + 1}`;
    const base: LogEvent = {
      i,
      t,
      level: "info",
      route,
      status: 200,
      region,
      ms: 30 + Math.floor(noise(9, i) * 160),
      request_id,
      msg: "request served",
      plain: `GET ${route} 200 ${30 + Math.floor(noise(9, i) * 160)}ms ${i % 2 ? region : "from " + region}`,
    };
    if (FAIL_WORDS[i]) {
      out.push({ ...base, level: "error", status: 502, ms: 3000 + Math.floor(noise(4, i) * 400), msg: FAIL_WORDS[i].msg, plain: FAIL_WORDS[i].plain });
    } else if (i === 9) {
      out.push({ ...base, level: "error", status: 404, ms: 18, msg: "cart item not found", plain: "ERROR cart: item not found for session (us-east) req r-1064" });
    } else if (i === 17) {
      out.push({ ...base, level: "warn", ms: 1240, msg: "slow response", plain: "WARN slow menu render 1240ms eu-west" });
    } else out.push(base);
  }
  return out;
}

const EVENTS = makeEvents();
const FIELDS: { key: "level" | "route" | "region"; label: string }[] = [
  { key: "level", label: "level" },
  { key: "route", label: "route" },
  { key: "region", label: "region" },
];

type Mode = "plain" | "structured";
export interface LogExplorerState {
  mode: Mode;
  shown: number;
  filters: Record<string, string>;
  query: string;
}

function json(e: LogEvent) {
  return `{"t":"${e.t}","level":"${e.level}","route":"${e.route}","status":${e.status},"region":"${e.region}","ms":${e.ms},"request_id":"${e.request_id}","msg":"${e.msg}"}`;
}

export function LogExplorer({ props, onChange, revealed }: WidgetProps<{ mode?: Mode; lockMode?: boolean }>) {
  const [mode, setMode] = useState<Mode>(props.mode ?? "plain");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const shownList =
    mode === "plain"
      ? EVENTS.filter((e) => !query.trim() || e.plain.toLowerCase().includes(query.trim().toLowerCase()))
      : EVENTS.filter((e) => Object.entries(filters).every(([k, v]) => String(e[k as keyof LogEvent]) === v));
  useReport(onChange, { mode, shown: shownList.length, filters, query: query.trim() } satisfies LogExplorerState, `${mode}|${shownList.length}|${JSON.stringify(filters)}|${query.trim()}`);

  const toggle = (k: string, v: string) => {
    if (revealed) return;
    const next = { ...filters };
    if (next[k] === v) delete next[k];
    else next[k] = v;
    setFilters(next);
  };
  const values = (k: "level" | "route" | "region") => [...new Set(EVENTS.map((e) => e[k]))];

  return (
    <div className="w-full max-w-2xl">
      {!props.lockMode && (
        <div className="flex justify-center">
          <Segmented
            label="Log format"
            value={mode}
            disabled={revealed}
            onChange={setMode}
            options={[
              { id: "plain", label: "Plain text lines" },
              { id: "structured", label: "Structured (JSON)" },
            ]}
          />
        </div>
      )}

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
        {mode === "plain" ? (
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3">
            <Search className="h-4 w-4 shrink-0 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={revealed}
              placeholder="search the text, like grep (try: timeout)"
              aria-label="Search the log text"
              className="min-w-0 flex-1 bg-transparent py-2 font-mono text-[13px] text-ink outline-none placeholder:text-ink-3"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="grid h-7 w-7 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
        ) : (
          <div className="grid gap-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="flex flex-wrap items-center gap-1.5">
                <span className="w-14 shrink-0 font-mono text-[11.5px] text-ink-3">{f.label}</span>
                {values(f.key).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={filters[f.key] === v}
                    disabled={revealed}
                    onClick={() => toggle(f.key, v)}
                    className={`min-h-9 rounded-full border px-2.5 font-mono text-[12px] transition-colors ${filters[f.key] === v ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink-2 hover:text-ink"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <div className="flex items-center justify-between px-1 pb-1.5">
          <Caption>{mode === "plain" ? "Lines" : "Events"} that match</Caption>
          <Readout label="shown" value={`${shownList.length} of ${EVENTS.length}`} accent={shownList.length < EVENTS.length} />
        </div>
        <div className="max-h-64 overflow-auto rounded-lg bg-surface-2 p-2" tabIndex={0} aria-label="Log lines">
          {shownList.length === 0 && <p className="p-2 text-sm text-ink-3">No lines match.</p>}
          {shownList.map((e) => (
            <p key={e.i} className={`whitespace-pre-wrap break-all py-0.5 font-mono text-[11.5px] leading-snug ${e.level === "error" ? "text-bad" : e.level === "warn" ? "text-[#d97706]" : "text-ink-2"}`}>
              {mode === "plain" ? <><span className="text-ink-3">{e.t} </span>{e.plain}</> : json(e)}
            </p>
          ))}
        </div>
      </div>

      <Note className="mt-2">
        {mode === "plain"
          ? "Every line is written differently: some say “timeout”, some “timed out”, some “took too long”, and the region appears in a different spot each time. A text search finds only the wording you guessed."
          : "Every event has the same named fields. Choosing level, route and region narrows to exactly the events you mean, and the count is trustworthy."}
      </Note>
    </div>
  );
}

/** goal: { mode: "structured", shown: 4 } */
export function checkLogExplorer(state: unknown, goal: Record<string, unknown>) {
  const s = state as LogExplorerState | undefined;
  if (!s) return false;
  if (typeof goal.mode === "string" && s.mode !== goal.mode) return false;
  if (typeof goal.shown === "number" && s.shown !== goal.shown) return false;
  if (typeof goal.maxShown === "number" && s.shown > goal.maxShown) return false;
  return ["mode", "shown", "maxShown"].some((k) => k in goal);
}
