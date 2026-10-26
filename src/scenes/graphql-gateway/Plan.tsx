"use client";

import React from "react";
import { Gauge, Merge, Play, TriangleAlert } from "lucide-react";
import { asArray, dig, groupSql, type GqlSession, type LogEntry, type Snapshot } from "./session";
import { FEATURE_INFO, PRESETS } from "./operations";
import { Bar, BTN, BTN_ON, Empty, GhostRows, Locked, Notice, PaneFrame, SectionLabel, Stat } from "./ui";

/** The Plan pane: what each request cost (resolver calls, SQL statements) and the N+1 lab. */

interface Props {
  session: GqlSession;
  snap: Snapshot;
  unlocked: ReadonlySet<string>;
  focus: string | null;
  interactive: boolean;
}

const SOURCE_LABEL: Record<string, string> = { explorer: "Explorer", app: "Client app", plan: "N+1 lab", docs: "Docs", lab: "Lab" };

function LastRequest({ entry }: { entry: LogEntry | null }) {
  if (!entry) return <Empty>Send any request (Explorer or Client app) and its cost shows up here.</Empty>;
  const r = entry.result;
  const stats = r.stats;
  const groups = stats ? groupSql(stats.queries) : [];
  return (
    <div className="space-y-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="min-w-0 truncate font-mono text-[11px] text-white/90">{entry.name}</span>
        <span className="rounded-full border border-white/12 px-1.5 py-px text-[9.5px] text-white/50">{SOURCE_LABEL[entry.source] ?? entry.source}</span>
        {!r.ok && <span className="text-[10.5px] text-[#f87171]">no response</span>}
        {r.ok && r.errors.length > 0 && <span className="text-[10.5px] text-[#fbbf24]">{r.errors.length} error{r.errors.length === 1 ? "" : "s"}</span>}
      </div>
      {!stats ? (
        <Notice tone="warn">
          {r.ok
            ? "This response has no extensions.stats. Return {\"extensions\": {\"stats\": {\"resolvers\": n, \"sql\": n, \"queries\": [...]}}} from execute() to fill this panel."
            : "No response to measure."}
        </Notice>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Resolvers" value={stats.resolvers} tone="plain" sub="fields resolved" />
            <Stat label="SQL queries" value={stats.sql} tone={stats.sql > 8 ? "warn" : "good"} sub="to the database" />
            <Stat label="Time" value={stats.ms !== null ? `${stats.ms < 10 ? stats.ms.toFixed(1) : Math.round(stats.ms)}` : `${r.ms}`} sub="ms in execute()" />
          </div>
          <div>
            <SectionLabel>SQL statements</SectionLabel>
            {groups.length === 0 ? (
              <Empty>No SQL statements were recorded (stats.queries is empty).</Empty>
            ) : (
              <ul className="space-y-1.5">
                {groups.slice(0, 6).map((g) => (
                  <li key={g.sql} className="flex min-w-0 items-start gap-2 rounded-md border border-white/[0.08] bg-black/25 px-2 py-1.5">
                    <span className={`hud-value mt-px shrink-0 rounded-full px-1.5 text-[10px] ${g.count >= 4 ? "bg-[#fbbf24]/15 text-[#fbbf24]" : "bg-white/10 text-white/75"}`}>×{g.count}</span>
                    <code className="min-w-0 flex-1 break-words font-mono text-[10px] leading-snug text-white/75">{g.sql}</code>
                    {g.count >= 4 && (
                      <span className="flex shrink-0 items-center gap-1 text-[9.5px] font-medium text-[#fbbf24]">
                        <TriangleAlert className="h-3 w-3" aria-hidden /> N+1 suspect
                      </span>
                    )}
                  </li>
                ))}
                {groups.length > 6 && <li className="text-[10.5px] text-white/40">…and {groups.length - 6} more statement shapes.</li>}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function History({ log }: { log: LogEntry[] }) {
  const rows = log.filter((e) => e.result.ok).slice(0, 12);
  if (rows.length === 0) return null;
  const max = Math.max(1, ...rows.map((e) => e.result.stats?.sql ?? 0));
  return (
    <div>
      <SectionLabel>Recent requests</SectionLabel>
      <ul className="space-y-1">
        {rows.map((e) => {
          const sql = e.result.stats?.sql;
          return (
            <li key={e.id} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_2.5rem] items-center gap-2 text-[10.5px]">
              <span className="truncate font-mono text-white/70">{e.name}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                {sql !== undefined && <div className={`h-full rounded-full ${sql > 8 ? "bg-[#fbbf24]" : "bg-[#c5ee8a]"}`} style={{ width: `${Math.max(3, (sql / max) * 100)}%` }} />}
              </div>
              <span className="hud-value text-right text-white/55">{sql === undefined ? "–" : `${sql} q`}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface LabCase {
  id: string;
  name: string;
  label: string;
  /** Rows in the response, and the queries a naive resolver chain would issue. */
  naive: (data: unknown) => { rows: number; naive: number; text: string };
  ideal: number;
}

const LAB_CASES: LabCase[] = [
  {
    id: "n1-categories",
    name: "CatalogueWithCategories",
    label: "Products + categories",
    ideal: 2,
    naive: (data) => {
      const rows = asArray(dig(data, "products")).length;
      return { rows, naive: 1 + rows, text: `1 for the list + 1 category lookup for each of ${rows} products` };
    },
  },
  {
    id: "n1-reviews",
    name: "ReviewsWithAuthors",
    label: "Products + reviews + authors",
    ideal: 3,
    naive: (data) => {
      const products = asArray(dig(data, "products"));
      const reviews = products.reduce<number>((n, p) => n + asArray(dig(p, "reviews")).length, 0);
      return { rows: products.length, naive: 1 + products.length + reviews, text: `1 + ${products.length} review lookups + ${reviews} author lookups` };
    },
  },
];

function BatchLab({ session, snap, unlocked, focus, interactive }: Props) {
  const on = unlocked.has("gql-batching");
  const info = FEATURE_INFO["gql-batching"];
  if (!on) {
    return (
      <Locked title={info.title} need={info.need} lesson={info.lesson} spot={focus === "gql-batching"} compact>
        <div className="mt-2.5 space-y-2" aria-hidden>
          <div className="h-2 rounded-full bg-white/[0.06]" />
          <div className="h-2 w-[12%] rounded-full bg-white/[0.06]" />
        </div>
      </Locked>
    );
  }
  return (
    <div className="space-y-2.5">
      <SectionLabel right={<Merge className="h-3.5 w-3.5 text-[#c5ee8a]" aria-hidden />}>N+1 lab</SectionLabel>
      <p className="text-[10.5px] leading-snug text-white/45">
        An N+1 is one query for a list and then one more query per row. Run a case: the grey bar is what naive resolvers would issue for the rows returned; the lime bar is what your server actually did.
      </p>
      {LAB_CASES.map((c) => {
        const preset = PRESETS.find((p) => p.id === c.id);
        const entry = snap.log.find((e) => e.source === "plan" && e.name === c.name) ?? null;
        const r = entry?.result;
        const sql = r?.stats?.sql;
        const calc = r?.hasData ? c.naive(r.data) : null;
        let verdict: { tone: "ok" | "warn" | "bad"; text: string } | null = null;
        if (r && !r.ok) verdict = { tone: "bad", text: r.problem ?? "No response." };
        else if (r && !r.hasData) verdict = { tone: "bad", text: r.errors[0]?.message ?? "The request returned no data." };
        else if (r && calc && sql === undefined) verdict = { tone: "warn", text: "Your response has no extensions.stats, so the SQL count is unknown." };
        else if (r && calc && sql !== undefined) {
          if (sql <= c.ideal) verdict = { tone: "ok", text: `Batched: ${sql} queries for ${calc.rows} products. The N+1 is gone.` };
          else if (sql >= calc.naive * 0.8) verdict = { tone: "bad", text: `Still N+1: ${sql} queries. ${calc.text}.` };
          else verdict = { tone: "warn", text: `Better, but ${sql} queries is more than the ${c.ideal} an ideal batch needs.` };
        }
        return (
          <div key={c.id} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-medium text-white/90">{c.label}</div>
                <div className="truncate font-mono text-[10px] text-white/35">{c.name}</div>
              </div>
              <button className={BTN_ON} disabled={!interactive || !preset || !session.hasExecute} onClick={() => preset && session.run({ query: preset.query, operationName: c.name }, "plan")}>
                <Play className="h-3 w-3" aria-hidden /> Run
              </button>
            </div>
            {calc && sql !== undefined && (
              <div className="mt-2.5 space-y-2">
                <Bar value={calc.naive} max={Math.max(calc.naive, sql)} tone="grey" label="Naive resolvers would issue" right={`${calc.naive} queries`} />
                <Bar value={sql} max={Math.max(calc.naive, sql)} tone={sql <= c.ideal ? "lime" : "warn"} label="Your server issued" right={`${sql} queries`} />
              </div>
            )}
            {verdict && (
              <div className="mt-2">
                <Notice tone={verdict.tone}>{verdict.text}</Notice>
              </div>
            )}
          </div>
        );
      })}
      <button className={BTN} onClick={() => session.clearLog()}>
        Clear history
      </button>
    </div>
  );
}

export function PlanPane(props: Props) {
  const { snap, unlocked, focus } = props;
  const on = unlocked.has("gql-plan");
  const info = FEATURE_INFO["gql-plan"];
  // the docs browser's own introspection calls are noise here
  const log = snap.log.filter((e) => e.source !== "docs");
  const last = log[0] ?? null;
  return (
    <PaneFrame
      title="Query plan"
      icon={<Gauge className="h-3.5 w-3.5" aria-hidden />}
      hint="How much work did the last request cost? Fewer SQL queries means a faster, cheaper server."
      meta={on && last?.result.stats ? `${last.result.stats.sql} sql` : undefined}
    >
      <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain p-2.5 [scrollbar-width:thin]">
        {on ? (
          <>
            <LastRequest entry={last} />
            <History log={log} />
          </>
        ) : (
          <Locked title={info.title} need={info.need} lesson={info.lesson} spot={focus === "gql-plan"}>
            <div className="mt-2.5 grid grid-cols-3 gap-2" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 rounded-lg border border-dashed border-white/10 bg-white/[0.02]" />
              ))}
            </div>
            <GhostRows rows={3} />
          </Locked>
        )}
        <BatchLab {...props} />
      </div>
    </PaneFrame>
  );
}
