"use client";

import React, { useState } from "react";
import { Anchor, Bell, BellOff, Radio, ScrollText, Ship, Waves } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption } from "./ui";

/**
 * Observer: a subject (a lighthouse broadcasting fog levels) with observers you can subscribe and
 * unsubscribe. "Publish" sends the next reading, and only current subscribers get an update() call.
 */

const ICONS = { ship: Ship, harbour: Anchor, logbook: ScrollText, ferry: Waves } as const;

const DEFAULT_OBSERVERS = [
  { id: "ship", name: "Ship radio" },
  { id: "harbour", name: "Harbour office" },
  { id: "logbook", name: "Keeper's logbook" },
  { id: "ferry", name: "Ferry company" },
];

const READINGS = [21, 34, 48, 29, 56, 40, 18, 62];

export interface ObserverProps {
  observers?: { id: string; name: string }[];
  /** Ids subscribed at the start. */
  initial?: string[];
  /** Subject name shown on the subject card. */
  subject?: string;
  unit?: string;
}

export interface ObserverState {
  subscribed: string[];
  /** Who got update() on the most recent publish. */
  lastDelivered: string[];
  published: number;
}

export function Observer({ props, onChange, revealed }: WidgetProps<ObserverProps>) {
  const observers = props.observers ?? DEFAULT_OBSERVERS;
  const unit = props.unit ?? "%";
  const [subscribed, setSubscribed] = useState<string[]>(() => (props.initial ?? []).filter((id) => observers.some((o) => o.id === id)));
  const [published, setPublished] = useState(0);
  const [lastDelivered, setLastDelivered] = useState<string[]>([]);
  const [received, setReceived] = useState<Record<string, number>>({});
  const value = READINGS[published % READINGS.length];
  const lastValue = published > 0 ? READINGS[(published - 1) % READINGS.length] : null;

  const report = (subs: string[], delivered: string[], count: number) => onChange?.({ subscribed: subs, lastDelivered: delivered, published: count } satisfies ObserverState);

  const toggle = (id: string) => {
    if (revealed) return;
    // keep the subject's list in subscription order, like a real list.append()
    const next = subscribed.includes(id) ? subscribed.filter((x) => x !== id) : [...subscribed, id];
    setSubscribed(next);
    report(next, lastDelivered, published);
  };
  const publish = () => {
    if (revealed) return;
    const delivered = [...subscribed];
    const nextReceived = { ...received };
    for (const id of delivered) nextReceived[id] = value;
    setReceived(nextReceived);
    setLastDelivered(delivered);
    setPublished(published + 1);
    report(subscribed, delivered, published + 1);
  };

  const nameOf = (id: string) => observers.find((o) => o.id === id)?.name ?? id;
  const varOf = (id: string) => id.replace(/[^a-z0-9_]/gi, "_");

  return (
    <div className="w-full">
      {/* subject */}
      <div className="rounded-xl border border-line bg-surface-2 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-ink-2 ring-1 ring-[var(--line)]">
              <Radio className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <Caption>Subject</Caption>
              <p className="truncate font-semibold text-ink">{props.subject ?? "Lighthouse"}</p>
            </div>
          </div>
          <button type="button" className="btn btn-primary !h-10 shrink-0" onClick={publish} disabled={revealed}>
            Publish <span className="font-mono tabular-nums">{value}{unit}</span>
          </button>
        </div>
        <p className="mt-3 overflow-x-auto whitespace-nowrap rounded-lg bg-surface px-3 py-2 font-mono text-[12px] text-ink-2 ring-1 ring-[var(--line)]">
          observers = [<span className="text-ink">{subscribed.map(varOf).join(", ")}</span>]
        </p>
      </div>

      {/* observers */}
      <div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
        {observers.map((o) => {
          const Icon = ICONS[o.id as keyof typeof ICONS] ?? Bell;
          const on = subscribed.includes(o.id);
          const hit = lastDelivered.includes(o.id);
          return (
            <div key={o.id} className={`rounded-xl border p-3 transition-colors ${hit ? "border-[var(--brand)] bg-tint" : "border-line bg-surface"}`}>
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 shrink-0 ${on ? "text-ink" : "text-ink-3"}`} />
                <p className={`min-w-0 flex-1 truncate text-sm font-semibold ${on ? "text-ink" : "text-ink-3"}`}>{o.name}</p>
                <span className="font-mono text-sm tabular-nums text-ink">{received[o.id] !== undefined ? `${received[o.id]}${unit}` : "—"}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggle(o.id)}
                  disabled={revealed}
                  aria-pressed={on}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors disabled:cursor-default ${
                    on ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface-2 text-ink-2 hover:text-ink"
                  }`}
                >
                  {on ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                  {on ? "Subscribed" : "Subscribe"}
                </button>
                {hit && (
                  <span key={published} className="pop-in truncate font-mono text-[11px] text-brand">
                    update({lastValue})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* call log */}
      <div className="mt-3 rounded-xl border border-line bg-surface-2 px-3 py-2" aria-live="polite">
        <Caption>Last publish</Caption>
        {published === 0 ? (
          <p className="mt-1 text-sm text-ink-3">Nothing published yet.</p>
        ) : lastDelivered.length === 0 ? (
          <p key={published} className="pop-in mt-1 text-sm text-ink-2">{lastValue}{unit} published to nobody: the list was empty.</p>
        ) : (
          <ul key={published} className="pop-in mt-1 grid gap-0.5 font-mono text-[12px] text-ink-2">
            {lastDelivered.map((id) => (
              <li key={id}>
                <span className="text-ink">{varOf(id)}</span>.update({lastValue}) <span className="text-ink-3"># {nameOf(id)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function checkObserver(state: unknown, goal: Record<string, unknown>) {
  const st = state as ObserverState | undefined;
  if (!st) return false;
  const same = (a: string[], b: unknown) => Array.isArray(b) && a.length === b.length && b.every((x) => a.includes(String(x)));
  if (goal.lastDelivered !== undefined && !(st.published > 0 && same(st.lastDelivered, goal.lastDelivered))) return false;
  if (goal.subscribed !== undefined && !same(st.subscribed, goal.subscribed)) return false;
  if (typeof goal.published === "number" && st.published < goal.published) return false;
  return goal.lastDelivered !== undefined || goal.subscribed !== undefined || typeof goal.published === "number";
}
