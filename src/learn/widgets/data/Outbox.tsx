"use client";

import React, { useState } from "react";
import { Play, RotateCcw, ShoppingCart } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout } from "../dsa/ui";
import { Choice } from "./ui";

/**
 * Placing an order must (1) save the order and (2) announce "order placed" so the e-mail service
 * can send a confirmation. Two systems, two writes: either can fail without the other.
 *   dual write  save the order, then publish the event, as two separate steps
 *   outbox      save the order AND a row in an `outbox` table in one transaction; a relay later
 *               publishes unsent rows and marks them sent
 * Toggle failures before pressing the buttons and see which promises survive.
 */

type Mode = "dual" | "outbox";
interface Flags {
  crash: boolean;
  broker: boolean;
  relayCrash: boolean;
}
type Action = { kind: "place"; flags: Flags } | { kind: "relay"; flags: Flags };

interface World {
  orders: number[];
  outbox: { id: number; sent: boolean }[];
  delivered: number[];
  emails: Record<number, number>;
  log: string[];
}

export function run(mode: Mode, idempotent: boolean, actions: Action[]): World {
  const w: World = { orders: [], outbox: [], delivered: [], emails: {}, log: [] };
  let next = 1;
  const seen = new Set<number>();
  const deliver = (id: number) => {
    w.delivered.push(id);
    if (idempotent && seen.has(id)) {
      w.log.push(`The mail service sees event #${id} again, recognises it and does nothing.`);
      return;
    }
    seen.add(id);
    w.emails[id] = (w.emails[id] ?? 0) + 1;
    if (w.emails[id] > 1) w.log.push(`The mail service sends a SECOND confirmation for order #${id}.`);
  };
  for (const a of actions) {
    if (a.kind === "place") {
      const id = next++;
      if (mode === "dual") {
        w.orders.push(id);
        if (a.flags.crash) w.log.push(`Order #${id} saved, then the app crashed before publishing. The event is gone for good.`);
        else if (a.flags.broker) w.log.push(`Order #${id} saved, but the broker was down, so publishing failed. Nobody retries.`);
        else {
          w.log.push(`Order #${id} saved and announced.`);
          deliver(id);
        }
      } else if (a.flags.crash) {
        w.log.push(`The app crashed mid-transaction: order #${id} and its outbox row were both rolled back. The customer sees an error and can retry; nothing is half-done.`);
      } else {
        w.orders.push(id);
        w.outbox.push({ id, sent: false });
        w.log.push(`Order #${id} and its outbox row were committed together.`);
      }
    } else {
      const pending = w.outbox.filter((r) => !r.sent);
      if (pending.length === 0) w.log.push("The relay finds nothing to send.");
      for (const row of pending) {
        if (a.flags.broker) {
          w.log.push(`The relay can't reach the broker; event #${row.id} stays in the outbox for the next run.`);
          break;
        }
        deliver(row.id);
        if (a.flags.relayCrash) {
          w.log.push(`The relay sent event #${row.id} and crashed before marking it sent. The row will be sent again.`);
          break;
        }
        row.sent = true;
        w.log.push(`The relay sent event #${row.id} and marked it sent.`);
      }
    }
  }
  return w;
}

export interface OutboxProps {
  mode?: Mode;
  /** Hide the dual-write/outbox switch. */
  fixedMode?: boolean;
}

export interface OutboxState {
  mode: Mode;
  idempotent: boolean;
  orders: number;
  /** Orders whose event can never arrive (not delivered and not waiting in an outbox). */
  missing: number;
  waiting: number;
  duplicates: number;
  /** Events the broker received more than once. */
  repeats: number;
  actions: number;
}

export function summarise(mode: Mode, idempotent: boolean, actions: Action[]): OutboxState {
  const w = run(mode, idempotent, actions);
  const waiting = w.outbox.filter((r) => !r.sent).length;
  const waitingIds = new Set(w.outbox.filter((r) => !r.sent).map((r) => r.id));
  const missing = w.orders.filter((id) => !w.delivered.includes(id) && !waitingIds.has(id)).length;
  const duplicates = Object.values(w.emails).reduce((s, n) => s + Math.max(0, n - 1), 0);
  const repeats = w.delivered.length - new Set(w.delivered).size;
  return { mode, idempotent, orders: w.orders.length, missing, waiting, duplicates, repeats, actions: actions.length };
}

export function Outbox({ props, onChange, revealed }: WidgetProps<OutboxProps>) {
  const [mode, setMode] = useState<Mode>(props.mode ?? "dual");
  const [idem, setIdem] = useState(false);
  const [flags, setFlags] = useState<Flags>({ crash: false, broker: false, relayCrash: false });
  const [actions, setActions] = useState<Action[]>([]);
  const w = run(mode, idem, actions);
  const st = summarise(mode, idem, actions);

  const add = (kind: "place" | "relay") => {
    if (revealed) return;
    const next = [...actions, { kind, flags: { ...flags } }];
    setActions(next);
    onChange?.(summarise(mode, idem, next));
  };
  const reset = (m = mode, i = idem) => {
    setActions([]);
    onChange?.(summarise(m, i, []));
  };
  const toggle = (k: keyof Flags) => {
    if (revealed) return;
    setFlags({ ...flags, [k]: !flags[k] });
    onChange?.(summarise(mode, idem, actions));
  };
  const chips: { key: keyof Flags; label: string; show: boolean }[] = [
    { key: "crash", label: mode === "dual" ? "App crashes after saving" : "App crashes mid-transaction", show: true },
    { key: "broker", label: "Broker is down", show: true },
    { key: "relayCrash", label: "Relay crashes before marking sent", show: mode === "outbox" },
  ];

  return (
    <div className="w-full min-w-0">
      {!props.fixedMode && (
        <Choice label="How the app announces orders" value={mode} disabled={revealed} onChange={(m) => { setMode(m); setActions([]); onChange?.(summarise(m, idem, [])); }} options={[{ id: "dual", label: "Two separate writes" }, { id: "outbox", label: "Outbox table" }]} />
      )}

      <Caption className="mt-4">Make something go wrong (applies to the next button press)</Caption>
      <div className="flex flex-wrap gap-1.5">
        {chips.filter((c) => c.show).map((c) => (
          <button key={c.key} type="button" aria-pressed={flags[c.key]} disabled={revealed} onClick={() => toggle(c.key)}
            className={`min-h-10 rounded-full border px-3.5 text-sm transition-colors disabled:cursor-default ${flags[c.key] ? "border-[var(--bad)]/60 bg-[var(--bad)]/15 font-medium text-bad" : "border-line bg-surface text-ink hover:border-[var(--line-strong)]"}`}>
            {c.label}
          </button>
        ))}
        <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-sm text-ink-2">
          <input type="checkbox" aria-label="Mail service ignores repeats" className="h-4 w-4 accent-[var(--brand)]" checked={idem} disabled={revealed} onChange={(e) => { setIdem(e.target.checked); onChange?.(summarise(mode, e.target.checked, actions)); }} />
          Mail service ignores repeats
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary !h-10" disabled={revealed} onClick={() => add("place")}>
          <ShoppingCart className="h-4 w-4" /> Place an order
        </button>
        {mode === "outbox" && (
          <button type="button" className="btn !h-10" disabled={revealed} onClick={() => add("relay")}>
            <Play className="h-4 w-4" /> Run the relay
          </button>
        )}
        <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" disabled={revealed || actions.length === 0} onClick={() => reset()} aria-label="Start over" title="Start over">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className={`mt-4 grid gap-2 ${mode === "outbox" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
        <Box title="orders table">{w.orders.map((id) => <Chip key={id}>#{id}</Chip>)}</Box>
        {mode === "outbox" && <Box title="outbox table">{w.outbox.map((r) => <Chip key={r.id} dim={r.sent}>#{r.id} {r.sent ? "sent" : "unsent"}</Chip>)}</Box>}
        <Box title="broker received">{w.delivered.map((id, i) => <Chip key={i}>#{id}</Chip>)}</Box>
        <Box title="confirmation e-mails">{Object.entries(w.emails).map(([id, n]) => <Chip key={id} bad={n > 1}>#{id} ×{n}</Chip>)}</Box>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Orders" value={st.orders} />
        <Readout label="Events lost forever" value={st.missing} accent={st.missing > 0} />
        {mode === "outbox" && <Readout label="Waiting in outbox" value={st.waiting} />}
        <Readout label="Extra e-mails" value={st.duplicates} accent={st.duplicates > 0} />
      </div>
      <Note tone={st.missing > 0 || st.duplicates > 0 ? "bad" : "plain"}>
        {w.log.length ? w.log[w.log.length - 1] : mode === "dual" ? "Place an order. Then switch on a failure and place another." : "Place an order, then run the relay to publish it."}
      </Note>
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  const empty = React.Children.count(children) === 0;
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface-2 p-2">
      <Caption className="!mb-1.5 !text-[0.62rem]">{title}</Caption>
      <div className="flex min-h-9 flex-wrap content-start gap-1">{empty ? <span className="text-xs text-ink-3">empty</span> : children}</div>
    </div>
  );
}

function Chip({ children, dim, bad }: { children: React.ReactNode; dim?: boolean; bad?: boolean }) {
  return (
    <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${bad ? "border-[var(--bad)]/60 bg-[var(--bad)]/15 font-semibold text-bad" : dim ? "border-line bg-surface text-ink-3" : "border-[var(--brand)]/50 bg-tint text-ink"}`}>
      {children}
    </span>
  );
}

export function checkOutbox(state: unknown, goal: Record<string, unknown>) {
  const s = state as OutboxState | undefined;
  if (!s) return false;
  if (typeof goal.mode === "string" && s.mode !== goal.mode) return false;
  if (typeof goal.ordersMin === "number" && s.orders < goal.ordersMin) return false;
  if (typeof goal.missingMin === "number" && s.missing < goal.missingMin) return false;
  if (typeof goal.missingMax === "number" && s.missing > goal.missingMax) return false;
  if (typeof goal.duplicatesMin === "number" && s.duplicates < goal.duplicatesMin) return false;
  if (typeof goal.duplicatesMax === "number" && s.duplicates > goal.duplicatesMax) return false;
  if (typeof goal.repeatsMin === "number" && s.repeats < goal.repeatsMin) return false;
  if (typeof goal.idempotent === "boolean" && s.idempotent !== goal.idempotent) return false;
  if (typeof goal.waitingMax === "number" && s.waiting > goal.waitingMax) return false;
  return true;
}
