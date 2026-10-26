"use client";

import React, { useState } from "react";
import { AlertTriangle, Check, ServerCrash } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, useInitialReport } from "./ui";

/**
 * A product page is assembled from five services. Knock services over, then decide per section what
 * the page should do when its service is down: fail the page, hide the section, show a saved copy
 * or show a safe default. The preview shows the shopper's view.
 */

type Fallback = "fail" | "hide" | "cached" | "default";

interface Part {
  id: string;
  name: string;
  service: string;
  live: string;
  cached?: string;
  fallback?: string;
  options: Fallback[];
}

const PARTS: Part[] = [
  { id: "price", name: "Price and Buy button", service: "Pricing", live: "€29.00 · [Buy]", cached: "€29.00 (last known price) · [Buy], confirmed again at checkout", options: ["fail", "cached"] },
  { id: "stock", name: "Stock level", service: "Inventory", live: "In stock: 14 left", fallback: "Availability is confirmed at checkout", options: ["fail", "hide", "default"] },
  { id: "reviews", name: "Reviews", service: "Reviews", live: "4.6 ★ from 312 reviews", cached: "4.6 ★ from 312 reviews (saved this morning)", options: ["fail", "hide", "cached"] },
  { id: "recs", name: "Recommendations", service: "Recommender", live: "Picked for you: gas canister, windshield, mug", fallback: "Best sellers: water bottle, headlamp, mug", options: ["fail", "hide", "default"] },
  { id: "hello", name: "Personal greeting", service: "Profile", live: "Hi Maya!", fallback: "Welcome!", options: ["fail", "hide", "default"] },
];

const LABEL: Record<Fallback, string> = { fail: "Fail the page", hide: "Hide it", cached: "Show a saved copy", default: "Show a safe default" };

export interface DegradeState {
  down: string[];
  pageOk: boolean;
  buyWorks: boolean;
  downCount: number;
}

export function Degrade({ props, onChange }: WidgetProps<{ down?: string[] }>) {
  const [down, setDown] = useState<string[]>(props.down ?? []);
  const [pick, setPick] = useState<Record<string, Fallback>>(Object.fromEntries(PARTS.map((p) => [p.id, "fail" as Fallback])));

  const evaluate = (d: string[], pk: Record<string, Fallback>): DegradeState => {
    const failing = PARTS.some((p) => d.includes(p.id) && pk[p.id] === "fail");
    const priceDown = d.includes("price");
    return { down: d, pageOk: !failing, buyWorks: !failing && (!priceDown || pk.price === "cached"), downCount: d.length };
  };
  const st = evaluate(down, pick);
  const emit = (d: string[], pk: Record<string, Fallback>) => onChange?.(evaluate(d, pk));
  useInitialReport(() => emit(down, pick));

  const toggle = (id: string) => {
    const d = down.includes(id) ? down.filter((x) => x !== id) : [...down, id];
    setDown(d);
    emit(d, pick);
  };
  const choose = (id: string, f: Fallback) => {
    const pk = { ...pick, [id]: f };
    setPick(pk);
    emit(down, pk);
  };

  return (
    <div className="w-full max-w-2xl">
      <Caption>1 · Knock services over, 2 · decide what the page does</Caption>
      <ul className="mt-2 space-y-2">
        {PARTS.map((p) => {
          const isDown = down.includes(p.id);
          return (
            <li key={p.id} className={`rounded-xl border p-2.5 ${isDown ? "border-[var(--bad)]/50 bg-[var(--bad)]/[0.05]" : "border-line bg-surface"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{p.name}</p>
                  <p className="text-xs text-ink-3">from the {p.service} service</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  aria-pressed={isDown}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium ${isDown ? "border-[var(--bad)] bg-[var(--bad)]/10 text-ink" : "border-line bg-surface-2 text-ink hover:border-[var(--line-strong)]"}`}
                >
                  <ServerCrash className="h-4 w-4" /> {isDown ? "Down" : "Up"}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-ink-2">If it&apos;s down:</span>
                {p.options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => choose(p.id, o)}
                    aria-pressed={pick[p.id] === o}
                    className={`min-h-10 rounded-full border px-3 text-[13px] font-medium ${pick[p.id] === o ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface-2 text-ink hover:border-[var(--line-strong)]"}`}
                  >
                    {LABEL[o]}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">What the shopper sees</p>
      <div className="mt-1.5 rounded-xl border border-line bg-surface-2 p-3">
        {!st.pageOk ? (
          <div className="flex items-start gap-2 text-sm text-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--bad)]" />
            <p>
              <span className="font-semibold">Something went wrong.</span> The whole page is an error because{" "}
              {PARTS.filter((p) => down.includes(p.id) && pick[p.id] === "fail")
                .map((p) => p.name.toLowerCase())
                .join(" and ")}{" "}
              could not load.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 text-sm">
            <p className="font-mono text-xs text-ink-3">Pocket camping stove</p>
            {PARTS.map((p) => {
              const isDown = down.includes(p.id);
              let text: string | null = p.live;
              let tag: string | null = null;
              if (isDown) {
                const f = pick[p.id];
                if (f === "hide") text = null;
                else if (f === "cached") {
                  text = p.cached ?? p.live;
                  tag = "saved copy";
                } else if (f === "default") {
                  text = p.fallback ?? p.live;
                  tag = "default";
                }
              }
              if (text === null) return null;
              return (
                <p key={p.id} className="flex flex-wrap items-baseline gap-2 text-ink">
                  <span>{text}</span>
                  {tag && <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10.5px] text-ink-2">{tag}</span>}
                </p>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Readout label="Services down" value={`${st.downCount}/5`} />
        <Readout label="Page loads" value={st.pageOk ? "yes" : "no"} accent={st.pageOk} />
        <Readout label="Shopper can buy" value={st.buyWorks ? "yes" : "no"} accent={st.buyWorks} />
      </div>
      <div className="mt-3" aria-live="polite">
        {st.pageOk && down.length >= 3 && st.buyWorks ? (
          <Note tone="good">
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-good" /> {down.length} of 5 services are down and the shopper can still buy.
            </span>
          </Note>
        ) : null}
      </div>
    </div>
  );
}

export function checkDegrade(state: unknown, goal: Record<string, unknown>) {
  const st = state as DegradeState | undefined;
  if (!st) return false;
  if (typeof goal.pageOk === "boolean" && st.pageOk !== goal.pageOk) return false;
  if (typeof goal.buyWorks === "boolean" && st.buyWorks !== goal.buyWorks) return false;
  if (typeof goal.minDown === "number" && st.downCount < goal.minDown) return false;
  if (Array.isArray(goal.mustBeDown) && !(goal.mustBeDown as string[]).every((id) => st.down.includes(id))) return false;
  return true;
}
