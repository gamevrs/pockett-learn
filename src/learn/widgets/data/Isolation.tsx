"use client";

import React, { useState } from "react";
import { Check, Lock, Play, RotateCcw, X } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note } from "../dsa/ui";
import { Choice } from "./ui";

/**
 * Two transactions, stepped one statement at a time in an order *you* choose. A small model of a
 * database applies the rules of each isolation level:
 *   uncommitted  reads see other transactions' unfinished writes
 *   committed    reads see whatever is committed at that moment
 *   repeatable   reads see the snapshot from when the transaction began; a write to a row that
 *                changed since then is rejected (first updater wins)
 *   serializable repeatable + a transaction that wrote something is rejected at commit if a row
 *                it read was changed by someone else meanwhile
 * Writes to a row another open transaction has already written wait for that lock.
 */

type Level = "ru" | "rc" | "rr" | "ser";
type Vars = Record<string, number>;
type Step =
  | { kind: "begin" | "commit" | "rollback"; sql: string }
  | { kind: "read"; sql: string; keys: string[]; as: string }
  | { kind: "write"; sql: string; key: string; val: (v: Vars) => number | null };

interface Scenario {
  id: string;
  title: string;
  /** Plain-language setup. */
  intro: string;
  db: Record<string, number>;
  names: { 1: string; 2: string };
  steps: { 1: Step[]; 2: Step[] };
  /** An order of steps that goes wrong on weaker levels. */
  unlucky: (1 | 2)[];
  verdict: (db: Record<string, number>, vars: { 1: Vars; 2: Vars }) => { ok: boolean; bad: string; good: string };
}

export const SCENARIOS: Scenario[] = [
  {
    id: "dirty",
    title: "Dirty read",
    intro: "The box office raises a seat's price to 90 and then changes its mind. Meanwhile a customer asks what it costs.",
    db: { price: 60 },
    names: { 1: "Box office", 2: "Customer" },
    steps: {
      1: [
        { kind: "begin", sql: "BEGIN" },
        { kind: "write", sql: "UPDATE seat SET price = 90", key: "price", val: () => 90 },
        { kind: "rollback", sql: "ROLLBACK" },
      ],
      2: [
        { kind: "begin", sql: "BEGIN" },
        { kind: "read", sql: "SELECT price FROM seat", keys: ["price"], as: "quote" },
        { kind: "commit", sql: "COMMIT" },
      ],
    },
    unlucky: [1, 1, 2, 2, 2, 1],
    verdict: (db, v) => ({
      ok: v[2].quote === db.price,
      bad: `The customer was quoted ${v[2].quote}, a price that never officially existed: it was rolled back.`,
      good: `The customer was quoted ${v[2].quote}, the price that is really in the database.`,
    }),
  },
  {
    id: "repeat",
    title: "Non-repeatable read",
    intro: "A sales report reads the day's ticket count twice while a sale lands in between.",
    db: { sold: 100 },
    names: { 1: "Report", 2: "Sale" },
    steps: {
      1: [
        { kind: "begin", sql: "BEGIN" },
        { kind: "read", sql: "SELECT sold  -- headline", keys: ["sold"], as: "first" },
        { kind: "read", sql: "SELECT sold  -- chart footer", keys: ["sold"], as: "second" },
        { kind: "commit", sql: "COMMIT" },
      ],
      2: [
        { kind: "begin", sql: "BEGIN" },
        { kind: "write", sql: "UPDATE stats SET sold = 110", key: "sold", val: () => 110 },
        { kind: "commit", sql: "COMMIT" },
      ],
    },
    unlucky: [1, 1, 2, 2, 2, 1, 1],
    verdict: (_db, v) => ({
      ok: v[1].first === v[1].second,
      bad: `One report shows ${v[1].first} sold in the headline and ${v[1].second} in the footer: the same query gave two answers inside one transaction.`,
      good: `Both reads said ${v[1].first}: the report is consistent with itself.`,
    }),
  },
  {
    id: "lost",
    title: "Lost update",
    intro: "Two buyers each read how many tickets are left (10), subtract one in the app, and write the result back.",
    db: { seats_left: 10 },
    names: { 1: "Buyer A", 2: "Buyer B" },
    steps: {
      1: [
        { kind: "begin", sql: "BEGIN" },
        { kind: "read", sql: "SELECT seats_left FROM stock", keys: ["seats_left"], as: "n" },
        { kind: "write", sql: "UPDATE stock SET seats_left = n - 1", key: "seats_left", val: (v) => v.n - 1 },
        { kind: "commit", sql: "COMMIT" },
      ],
      2: [
        { kind: "begin", sql: "BEGIN" },
        { kind: "read", sql: "SELECT seats_left FROM stock", keys: ["seats_left"], as: "n" },
        { kind: "write", sql: "UPDATE stock SET seats_left = n - 1", key: "seats_left", val: (v) => v.n - 1 },
        { kind: "commit", sql: "COMMIT" },
      ],
    },
    unlucky: [1, 2, 1, 2, 1, 1, 2, 2],
    // the verdict is computed from the commits in outcome()
    verdict: () => ({ ok: true, bad: "", good: "" }),
  },
  {
    id: "skew",
    title: "Write skew",
    intro: "The gate rule: at least one scanner must stay on duty. Ana and Ben each check that someone else is on, then each walks off.",
    db: { ana: 1, ben: 1 },
    names: { 1: "Ana", 2: "Ben" },
    steps: {
      1: [
        { kind: "begin", sql: "BEGIN" },
        { kind: "read", sql: "SELECT SUM(on_duty) FROM scanners", keys: ["ana", "ben"], as: "n" },
        { kind: "write", sql: "UPDATE scanners SET on_duty = 0 WHERE who = 'ana'  -- if n >= 2", key: "ana", val: (v) => (v.n >= 2 ? 0 : null) },
        { kind: "commit", sql: "COMMIT" },
      ],
      2: [
        { kind: "begin", sql: "BEGIN" },
        { kind: "read", sql: "SELECT SUM(on_duty) FROM scanners", keys: ["ana", "ben"], as: "n" },
        { kind: "write", sql: "UPDATE scanners SET on_duty = 0 WHERE who = 'ben'  -- if n >= 2", key: "ben", val: (v) => (v.n >= 2 ? 0 : null) },
        { kind: "commit", sql: "COMMIT" },
      ],
    },
    unlucky: [1, 2, 1, 2, 1, 2, 1, 2],
    verdict: (db) => ({
      ok: db.ana + db.ben >= 1,
      bad: "Nobody is on the gate. Each transaction was correct on its own, they wrote to different rows, and still the rule broke.",
      good: `${db.ana + db.ben} scanner stays on duty: the rule holds.`,
    }),
  },
];

const LEVELS: { id: Level; label: string; line: string }[] = [
  { id: "ru", label: "Uncommitted", line: "Read uncommitted: reads can see other transactions' unfinished work." },
  { id: "rc", label: "Committed", line: "Read committed: reads see only committed data, but it can change between two reads." },
  { id: "rr", label: "Repeatable", line: "Repeatable read: reads come from a snapshot taken at BEGIN; writes to rows changed since then are rejected." },
  { id: "ser", label: "Serializable", line: "Serializable: as if the transactions ran one at a time. If that can't be arranged, one is rejected." },
];

interface Tx {
  pos: number;
  status: "idle" | "active" | "committed" | "aborted" | "rolled back";
  snapSeq: number;
  snap: Record<string, number>;
  pending: Record<string, number>;
  vars: Vars;
  readSet: string[];
  wrote: boolean;
}
interface Sim {
  db: Record<string, number>;
  ver: Record<string, number>;
  seq: number;
  tx: { 1: Tx; 2: Tx };
  log: { tx: 1 | 2; text: string; tone: "plain" | "bad" | "good" }[];
}

const blank = (): Tx => ({ pos: 0, status: "idle", snapSeq: 0, snap: {}, pending: {}, vars: {}, readSet: [], wrote: false });
const finished = (t: Tx, len: number) => t.pos >= len || t.status === "aborted" || t.status === "committed" || t.status === "rolled back";

export function canRun(sim: Sim, sc: Scenario, t: 1 | 2): { ok: boolean; why?: string } {
  const tx = sim.tx[t];
  if (finished(tx, sc.steps[t].length)) return { ok: false };
  const step = sc.steps[t][tx.pos];
  if (step.kind === "write") {
    const other = sim.tx[t === 1 ? 2 : 1];
    if (other.status === "active" && other.pending[step.key] !== undefined) return { ok: false, why: `waits: ${sc.names[t === 1 ? 2 : 1]} holds the lock on this row until it commits or rolls back` };
  }
  return { ok: true };
}

function exec(sim: Sim, sc: Scenario, level: Level, t: 1 | 2) {
  const tx = sim.tx[t];
  const other = sim.tx[t === 1 ? 2 : 1];
  const step = sc.steps[t][tx.pos];
  const say = (text: string, tone: "plain" | "bad" | "good" = "plain") => sim.log.push({ tx: t, text, tone });
  tx.pos += 1;
  const abort = (why: string) => {
    tx.status = "aborted";
    tx.pending = {};
    say(`rejected: ${why}. The app must retry the whole transaction.`, "bad");
  };
  if (step.kind === "begin") {
    tx.status = "active";
    tx.snapSeq = sim.seq;
    tx.snap = { ...sim.db };
    say("begins");
  } else if (step.kind === "read") {
    const vals = step.keys.map((k) => {
      if (tx.pending[k] !== undefined) return tx.pending[k];
      if (level === "ru" && other.status === "active" && other.pending[k] !== undefined) return other.pending[k];
      return level === "rc" || level === "ru" ? sim.db[k] : tx.snap[k];
    });
    const sum = vals.reduce((a, b) => a + b, 0);
    tx.vars[step.as] = sum;
    for (const k of step.keys) if (!tx.readSet.includes(k)) tx.readSet.push(k);
    const dirty = level === "ru" && step.keys.some((k) => other.status === "active" && other.pending[k] !== undefined);
    say(`reads ${step.as} = ${sum}${dirty ? " (the other transaction's unfinished write!)" : ""}`, dirty ? "bad" : "plain");
  } else if (step.kind === "write") {
    const v = step.val(tx.vars);
    if (v === null) {
      say("sees the condition is false and writes nothing");
    } else if ((level === "rr" || level === "ser") && (sim.ver[step.key] ?? 0) > tx.snapSeq) {
      abort("the row was changed by a committed transaction after this one began");
    } else {
      tx.pending[step.key] = v;
      tx.wrote = true;
      say(`writes ${step.key} = ${v} (not committed yet)`);
    }
  } else if (step.kind === "commit") {
    if (level === "ser" && tx.wrote && tx.readSet.some((k) => (sim.ver[k] ?? 0) > tx.snapSeq)) {
      abort("a row it read was changed by someone else, so no serial order explains the result");
    } else {
      sim.seq += 1;
      for (const [k, v] of Object.entries(tx.pending)) {
        sim.db[k] = v;
        sim.ver[k] = sim.seq;
      }
      tx.pending = {};
      tx.status = "committed";
      say("commits", "good");
    }
  } else {
    tx.pending = {};
    tx.status = "rolled back";
    say("rolls back: its writes vanish");
  }
}

export function replay(sc: Scenario, level: Level, order: (1 | 2)[]): Sim {
  const sim: Sim = { db: { ...sc.db }, ver: {}, seq: 0, tx: { 1: blank(), 2: blank() }, log: [] };
  for (const t of order) if (canRun(sim, sc, t).ok) exec(sim, sc, level, t);
  return sim;
}

export function outcome(sc: Scenario, sim: Sim) {
  const done = finished(sim.tx[1], sc.steps[1].length) && finished(sim.tx[2], sc.steps[2].length);
  if (!done) return { done, anomaly: false, text: "" };
  const aborted = sim.tx[1].status === "aborted" || sim.tx[2].status === "aborted";
  if (sc.id === "lost") {
    const commits = [sim.tx[1], sim.tx[2]].filter((x) => x.status === "committed").length;
    const want = 10 - commits;
    const ok = sim.db.seats_left === want;
    return {
      done,
      anomaly: !ok,
      text: ok
        ? aborted
          ? `Tickets left: ${sim.db.seats_left}. One buyer was rejected and has to try again; no sale was silently lost.`
          : `Tickets left: ${sim.db.seats_left}. Both sales are counted.`
        : `Two buyers were told "success", but only one ticket left the shelf: ${sim.db.seats_left} left instead of 8. One sale was overwritten.`,
    };
  }
  const v = sc.verdict(sim.db, { 1: sim.tx[1].vars, 2: sim.tx[2].vars });
  const base = v.ok ? v.good : v.bad;
  return { done, anomaly: !v.ok, text: v.ok && aborted ? `${base} One transaction was rejected so the rule could hold; the app retries it.` : base };
}

export interface IsolationProps {
  /** Which scenario to show; leave out to offer all four. */
  scenario?: string;
  /** Starting level. */
  level?: Level;
  /** Hide the level switch (the scenario is then fixed to `level`). */
  fixedLevel?: boolean;
}

export interface IsolationState {
  scenario: string;
  level: Level;
  done: boolean;
  anomaly: boolean;
  aborted: boolean;
}

export function Isolation({ props, onChange, revealed }: WidgetProps<IsolationProps>) {
  const list = props.scenario ? SCENARIOS.filter((s) => s.id === props.scenario) : SCENARIOS;
  const [sid, setSid] = useState(list[0].id);
  const [level, setLevel] = useState<Level>(props.level ?? "rc");
  const [order, setOrder] = useState<(1 | 2)[]>([]);
  const sc = list.find((s) => s.id === sid) ?? list[0];
  const sim = replay(sc, level, order);
  const out = outcome(sc, sim);

  const report = (s: Scenario, l: Level, o: (1 | 2)[]) => {
    const sm = replay(s, l, o);
    const oc = outcome(s, sm);
    onChange?.({ scenario: s.id, level: l, done: oc.done, anomaly: oc.anomaly, aborted: sm.tx[1].status === "aborted" || sm.tx[2].status === "aborted" } satisfies IsolationState);
  };
  const run = (t: 1 | 2) => {
    if (revealed || !canRun(sim, sc, t).ok) return;
    const o = [...order, t];
    setOrder(o);
    report(sc, level, o);
  };
  const reset = (s = sc, l = level) => {
    setOrder([]);
    report(s, l, []);
  };
  const play = () => {
    if (revealed) return;
    setOrder(sc.unlucky);
    report(sc, level, sc.unlucky);
  };

  const levelInfo = LEVELS.find((l) => l.id === level)!;

  return (
    <div className="w-full min-w-0">
      {list.length > 1 && (
        <div className="mb-3">
          <Choice
            label="Scenario"
            value={sid}
            onChange={(id) => {
              const s = list.find((x) => x.id === id)!;
              setSid(id);
              reset(s, level);
            }}
            options={list.map((s) => ({ id: s.id, label: s.title }))}
          />
        </div>
      )}
      <p className="text-sm text-ink-2">{sc.intro}</p>

      {!props.fixedLevel && (
        <div className="mt-3">
          <Choice
            label="Isolation level"
            value={level}
            disabled={revealed}
            onChange={(l) => {
              setLevel(l);
              reset(sc, l);
            }}
            options={LEVELS.map((l) => ({ id: l.id, label: l.label }))}
          />
        </div>
      )}
      <p className="mt-1.5 text-[0.8rem] text-ink-3">{levelInfo.line}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2">
        <Caption className="!mb-0">Committed data</Caption>
        {Object.entries(sim.db).map(([k, v]) => (
          <span key={k} className="rounded-md border border-line bg-surface px-2 py-0.5 font-mono text-[12.5px] tabular-nums text-ink">
            {k} = {v}
          </span>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {([1, 2] as const).map((t) => {
          const tx = sim.tx[t];
          const can = canRun(sim, sc, t);
          const steps = sc.steps[t];
          return (
            <div key={t} className="min-w-0 rounded-xl border border-line bg-surface p-2.5">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">
                  <span className="mr-1.5 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-2">T{t}</span>
                  {sc.names[t]}
                </p>
                {tx.status !== "idle" && (
                  <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${tx.status === "aborted" ? "bg-[var(--bad)]/15 text-bad" : tx.status === "committed" ? "bg-tint text-brand" : "bg-surface-2 text-ink-3"}`}>{tx.status}</span>
                )}
              </div>
              <div className="grid gap-1">
                {steps.map((s, i) => {
                  const doneStep = i < tx.pos;
                  const next = i === tx.pos && !finished(tx, steps.length);
                  const skipped = finished(tx, steps.length) && i >= tx.pos;
                  const body = (
                    <>
                      <span className="mt-0.5 shrink-0">
                        {doneStep ? <Check className="h-3.5 w-3.5 text-brand" strokeWidth={3} /> : next ? (can.ok ? <Play className="h-3.5 w-3.5 text-brand" /> : <Lock className="h-3.5 w-3.5 text-ink-3" />) : skipped ? <X className="h-3.5 w-3.5 text-ink-3" /> : <span className="block h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 break-words text-left">{s.sql}</span>
                    </>
                  );
                  const cls = `flex min-h-10 items-start gap-2 rounded-lg border px-2 py-2 font-mono text-[11.5px] leading-snug`;
                  return next ? (
                    <button
                      key={i}
                      type="button"
                      onClick={() => run(t)}
                      disabled={revealed || !can.ok}
                      className={`${cls} transition-colors ${can.ok ? "border-[var(--brand)] bg-tint text-ink hover:brightness-95" : "border-dashed border-line bg-surface-2 text-ink-3"} disabled:cursor-not-allowed`}
                      title={can.why}
                    >
                      {body}
                    </button>
                  ) : (
                    <div key={i} className={`${cls} ${doneStep ? "border-line bg-surface-2 text-ink-2" : "border-transparent text-ink-3 opacity-70"} ${skipped ? "line-through" : ""}`}>
                      {body}
                    </div>
                  );
                })}
              </div>
              {!can.ok && can.why && <p className="mt-1.5 text-[11.5px] text-ink-3">{can.why}.</p>}
              {Object.keys(tx.pending).length > 0 && <p className="mt-1.5 font-mono text-[11.5px] text-ink-3">uncommitted: {Object.entries(tx.pending).map(([k, v]) => `${k} = ${v}`).join(", ")}</p>}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn !h-10" onClick={play} disabled={revealed}>
          <Play className="h-4 w-4" /> Play the unlucky order
        </button>
        <button type="button" className="btn btn-ghost !h-10" onClick={() => reset()} disabled={revealed || order.length === 0}>
          <RotateCcw className="h-4 w-4" /> Start over
        </button>
      </div>

      {sim.log.length > 0 && (
        <ol className="mt-3 grid gap-1 rounded-xl border border-line bg-surface-2 p-2.5 text-[0.8rem]">
          {sim.log.map((l, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-6 shrink-0 font-mono text-[11px] text-ink-3">T{l.tx}</span>
              <span className={l.tone === "bad" ? "text-bad" : l.tone === "good" ? "text-brand" : "text-ink-2"}>{l.text}</span>
            </li>
          ))}
        </ol>
      )}
      <Note tone={out.done ? (out.anomaly ? "bad" : "good") : "plain"}>
        {out.done ? out.text : order.length === 0 ? "Click a highlighted statement to run it. You decide which transaction moves next." : "Keep going until both transactions have finished."}
      </Note>
    </div>
  );
}

export function checkIsolation(state: unknown, goal: Record<string, unknown>) {
  const s = state as IsolationState | undefined;
  if (!s) return false;
  if (goal.done === true && !s.done) return false;
  if (typeof goal.anomaly === "boolean" && (!s.done || s.anomaly !== goal.anomaly)) return false;
  if (typeof goal.level === "string" && s.level !== goal.level) return false;
  if (typeof goal.scenario === "string" && s.scenario !== goal.scenario) return false;
  if (typeof goal.aborted === "boolean" && s.aborted !== goal.aborted) return false;
  return true;
}
