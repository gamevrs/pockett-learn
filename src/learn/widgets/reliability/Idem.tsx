"use client";

import React, { useState } from "react";
import { RotateCcw, Send, Smartphone, Server } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Pill, Readout, Segmented, useInitialReport } from "./ui";

/**
 * Buying a €40 stadium ticket on a phone. The ticket service charges the card and replies; the
 * learner can make that reply vanish. Without an idempotency key a retry charges the card again;
 * with a key the server recognises the repeat and hands back the first result.
 */

type Mode = "none" | "key";
const KEYS = ["8f3a", "c19d", "27be", "e05a", "9b41", "41dc", "d7e2", "03af"];

interface Order {
  n: number;
  key: string;
}
interface Charge {
  n: number;
  key: string;
  note: string;
}

export interface IdemState {
  mode: Mode;
  charges: number;
  retried: boolean;
  sees: "idle" | "paid" | "timeout";
  /** A retry arrived at the server after a lost reply. */
  duplicateArrived: boolean;
}

export function Idem({ props, onChange }: WidgetProps<{ mode?: Mode; lockMode?: boolean }>) {
  const [mode, setMode] = useState<Mode>(props.mode ?? "none");
  const [lose, setLose] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState(0);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [store, setStore] = useState<Record<string, number>>({});
  const [sees, setSees] = useState<"idle" | "paid" | "timeout">("idle");
  const [retried, setRetried] = useState(false);
  const [dup, setDup] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const emit = (next: Partial<IdemState> & { charges: number }) =>
    onChange?.({ mode, retried, sees, duplicateArrived: dup, ...next } satisfies IdemState);

  const send = (o: Order, isRetry: boolean) => {
    const lines: string[] = [`phone → server: pay €40${mode === "key" ? ` (key ${o.key})` : ""}${isRetry ? " [retry]" : ""}`];
    let nextCharges = charges;
    let nextStore = store;
    let duplicate = isRetry ? dup : false;
    if (mode === "key" && store[o.key] !== undefined) {
      lines.push(`server: key ${o.key} already seen → returning charge #${store[o.key]}, card not touched`);
      duplicate = true;
    } else {
      const n = charges.length + 1;
      nextCharges = [...charges, { n, key: o.key, note: isRetry ? "from the retry" : "first request" }];
      if (mode === "key") nextStore = { ...store, [o.key]: n };
      lines.push(`server: charged the card (charge #${n}), ticket issued`);
      if (isRetry) duplicate = true;
    }
    let outcome: "paid" | "timeout" = "paid";
    if (lose) {
      lines.push("server → phone: reply lost on the way");
      outcome = "timeout";
      setLose(false);
    } else {
      lines.push("server → phone: OK, ticket issued");
    }
    setCharges(nextCharges);
    setStore(nextStore);
    setSees(outcome);
    setDup(duplicate);
    setLog([...lines.reverse(), ...log].slice(0, 6));
    emit({ charges: nextCharges.length, sees: outcome, retried: isRetry, duplicateArrived: duplicate });
  };

  const buy = () => {
    const o = { n: orders + 1, key: KEYS[orders % KEYS.length] };
    setOrder(o);
    setOrders(orders + 1);
    setRetried(false);
    send(o, false);
  };
  const retry = () => {
    if (!order) return;
    setRetried(true);
    send(order, true);
  };
  const reset = (m: Mode = mode) => {
    setOrder(null);
    setOrders(0);
    setCharges([]);
    setStore({});
    setSees("idle");
    setRetried(false);
    setDup(false);
    setLog([]);
    setLose(false);
    onChange?.({ mode: m, charges: 0, retried: false, sees: "idle", duplicateArrived: false } satisfies IdemState);
  };
  const changeMode = (m: Mode) => {
    setMode(m);
    reset(m);
  };

  useInitialReport(() => onChange?.({ mode, charges: 0, retried: false, sees: "idle", duplicateArrived: false } satisfies IdemState));
  const total = charges.length * 40;
  return (
    <div className="w-full max-w-2xl">
      {!props.lockMode && (
        <Segmented
          label="Does the request carry an idempotency key?"
          value={mode}
          options={[
            { id: "none", label: "No key" },
            { id: "key", label: "With a key" },
          ]}
          onChange={changeMode}
        />
      )}

      <div className="mt-3 grid gap-2 min-[560px]:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Smartphone className="h-4 w-4 text-ink-2" /> Fan&apos;s phone
          </p>
          <p className="mt-2 min-h-10 text-sm text-ink-2" aria-live="polite">
            {sees === "idle" && "Ready to buy."}
            {sees === "paid" && "Payment confirmed. Enjoy the match!"}
            {sees === "timeout" && "Spinner… “Something went wrong. Try again?”"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Pill on onClick={buy}>
              <Send className="h-4 w-4" /> Buy ticket €40
            </Pill>
            <Pill onClick={retry} disabled={sees !== "timeout"}>
              Retry
            </Pill>
            <Pill on={lose} onClick={() => setLose(!lose)} label="Lose the next reply">
              Lose next reply
            </Pill>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Server className="h-4 w-4 text-ink-2" /> Ticket service
          </p>
          <Caption className="mt-2">Card charges</Caption>
          <ul className="mt-1 min-h-10 space-y-1 text-sm">
            {charges.length === 0 && <li className="text-ink-3">none yet</li>}
            {charges.map((c) => (
              <li key={c.n} className="flex items-baseline justify-between gap-2 rounded-lg bg-surface-2 px-2.5 py-1">
                <span className="font-mono text-[13px] text-ink">
                  #{c.n} €40
                </span>
                <span className="truncate text-xs text-ink-3">{c.note}</span>
              </li>
            ))}
          </ul>
          {mode === "key" && (
            <>
              <Caption className="mt-2">Keys remembered</Caption>
              <p className="mt-1 font-mono text-[12px] text-ink-2">{Object.keys(store).length === 0 ? "none yet" : Object.entries(store).map(([k, n]) => `${k} → #${n}`).join("  ·  ")}</p>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Readout label="Card charged" value={`€${total}`} accent={charges.length <= Math.max(1, orders)} />
        <Readout label="Tickets bought" value={orders} />
        <button type="button" onClick={() => reset()} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-medium text-ink hover:bg-surface-2">
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-2.5">
        <Caption>Wire log (newest first)</Caption>
        <ol className="mt-1 min-h-[3.5rem] space-y-0.5 font-mono text-[11.5px] leading-snug text-ink-2">
          {log.length === 0 && <li className="text-ink-3">Press “Buy ticket”. Turn on “Lose next reply” first to see the trouble.</li>}
          {log.map((l, i) => (
            <li key={i} className={i < 2 ? "text-ink" : ""}>
              {l}
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-3" aria-live="polite">
        {charges.length > orders && orders > 0 ? (
          <Note tone="bad">
            The fan bought {orders === 1 ? "one ticket" : `${orders} tickets`} and was charged €{total}. The retry looked like a brand-new purchase.
          </Note>
        ) : dup && mode === "key" ? (
          <Note tone="good">The server saw the key again and returned the stored result. The retry was safe.</Note>
        ) : null}
      </div>
    </div>
  );
}

export function checkIdem(state: unknown, goal: Record<string, unknown>) {
  const st = state as IdemState | undefined;
  if (!st) return false;
  if (goal.mode !== undefined && st.mode !== goal.mode) return false;
  if (typeof goal.charges === "number" && st.charges !== goal.charges) return false;
  if (typeof goal.retried === "boolean" && st.retried !== goal.retried) return false;
  if (typeof goal.duplicateArrived === "boolean" && st.duplicateArrived !== goal.duplicateArrived) return false;
  return true;
}
