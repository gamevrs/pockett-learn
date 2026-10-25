"use client";

import React, { useState } from "react";
import { ArrowDown, ArrowRight, Check, X } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Segmented } from "./ui";

/**
 * Adapter: Checkout calls gateway.pay(dollars); the old bank only has
 * send_payment(cents, currency). Plug the bank in directly (it breaks) or through an adapter,
 * and choose what the adapter's pay() does inside.
 */

const MAPPINGS = {
  raw: { code: 'self.bank.send_payment(amount, "USD")', run: (amt: number) => ({ cents: amt, currency: "USD" }) },
  int: { code: 'self.bank.send_payment(int(amount), "USD")', run: (amt: number) => ({ cents: Math.trunc(amt), currency: "USD" }) },
  cents: { code: 'self.bank.send_payment(round(amount * 100), "USD")', run: (amt: number) => ({ cents: Math.round(amt * 100), currency: "USD" }) },
  eur: { code: 'self.bank.send_payment(round(amount * 100), "EUR")', run: (amt: number) => ({ cents: Math.round(amt * 100), currency: "EUR" }) },
} as const;
type MappingId = keyof typeof MAPPINGS;

export interface AdapterProps {
  /** Amount the checkout charges, in dollars. Default 12.50. */
  amount?: number;
  /** Start with the adapter plugged in. */
  adapter?: boolean;
  /** Offer only these adapter bodies (default all four). */
  mappings?: MappingId[];
}

export interface AdapterState {
  adapter: boolean;
  mapping: MappingId | null;
  /** True when the customer was charged exactly the amount, in USD. */
  ok: boolean;
  charged: number | null;
  currency: string | null;
  error: string | null;
}

interface Run {
  n: number;
  trace: string[];
  ok: boolean;
  outcome: string;
}

export function Adapter({ props, onChange, revealed }: WidgetProps<AdapterProps>) {
  const amount = props.amount ?? 12.5;
  const options = (props.mappings ?? (Object.keys(MAPPINGS) as MappingId[])).filter((m) => m in MAPPINGS);
  const [adapter, setAdapter] = useState(Boolean(props.adapter));
  const [mapping, setMapping] = useState<MappingId | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const amt = amount.toFixed(2);

  const pay = () => {
    if (revealed) return;
    let state: AdapterState;
    let r: Run;
    const n = (run?.n ?? 0) + 1;
    if (!adapter) {
      const error = "AttributeError: 'LegacyBank' object has no attribute 'pay'";
      r = { n, ok: false, trace: [`checkout → gateway.pay(${amt})`], outcome: error };
      state = { adapter, mapping, ok: false, charged: null, currency: null, error };
    } else if (!mapping) {
      return;
    } else {
      const { cents, currency } = MAPPINGS[mapping].run(amount);
      const trace = [`checkout → gateway.pay(${amt})`, `adapter → bank.send_payment(${Number.isInteger(cents) ? cents : cents.toFixed(2)}, "${currency}")`];
      if (!Number.isInteger(cents)) {
        const error = "TypeError: cents must be a whole number";
        r = { n, ok: false, trace, outcome: error };
        state = { adapter, mapping, ok: false, charged: null, currency: null, error };
      } else {
        const charged = cents / 100;
        const ok = currency === "USD" && Math.abs(charged - amount) < 0.001;
        trace.push("bank → status 0", `adapter → return True`);
        const sym = currency === "USD" ? "$" : "€";
        r = { n, ok, trace, outcome: `Customer charged ${sym}${charged.toFixed(2)}${ok ? "" : ` (expected $${amt})`}` };
        state = { adapter, mapping, ok, charged, currency, error: null };
      }
    }
    setRun(r);
    onChange?.(state);
  };

  const choose = (m: MappingId) => {
    if (revealed) return;
    setMapping(m);
    setRun(null);
  };
  const plug = (v: "direct" | "adapter") => {
    if (revealed) return;
    setAdapter(v === "adapter");
    setRun(null);
  };

  return (
    <div className="w-full">
      <Segmented
        label="How the bank is plugged in"
        value={adapter ? "adapter" : "direct"}
        onChange={plug}
        disabled={revealed}
        options={[
          { id: "direct", label: "Plug in directly" },
          { id: "adapter", label: "Use an adapter" },
        ]}
      />

      {/* wiring */}
      <div className="mt-4 flex flex-col items-stretch gap-1 sm:flex-row sm:items-center">
        <Part caption="Client" name="Checkout" face={`gateway.pay(${amt})`} note="calls pay(dollars)" />
        <Joint ok={adapter} />
        {adapter && (
          <>
            <Part caption="Adapter" name="BankAdapter" face="pay(amount)" note="translates" accent />
            <Joint ok />
          </>
        )}
        <Part caption="Adaptee" name="LegacyBank" face="send_payment(cents, currency)" note="can't be changed" />
      </div>

      {adapter && (
        <div className="mt-4">
          <Caption>Inside BankAdapter.pay(self, amount)</Caption>
          <div className="mt-2 grid gap-1.5" role="radiogroup" aria-label="Adapter body">
            {options.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mapping === m}
                disabled={revealed}
                onClick={() => choose(m)}
                className={`flex min-h-10 items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-default ${
                  mapping === m ? "border-ink bg-surface ring-1 ring-ink" : "border-line bg-surface hover:border-[var(--line-strong)]"
                }`}
              >
                <span className={`h-4 w-4 shrink-0 rounded-full border ${mapping === m ? "border-[5px] border-ink" : "border-[var(--line-strong)]"}`} />
                <code className="min-w-0 break-all font-mono text-[12px] text-ink">{MAPPINGS[m].code}</code>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary !h-10" onClick={pay} disabled={revealed || (adapter && !mapping)}>
          Pay ${amt}
        </button>
        {adapter && !mapping && <span className="text-xs text-ink-3">Pick what pay() does first.</span>}
      </div>

      {run && (
        <div key={run.n} className={`pop-in mt-3 rounded-xl border p-3 ${run.ok ? "border-[var(--brand)] bg-tint" : "border-bad/40 bg-bad/[0.05]"}`} aria-live="polite">
          <ol className="grid gap-0.5 font-mono text-[12px] text-ink-2">
            {run.trace.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
          <p className={`mt-2 flex items-start gap-2 text-sm font-semibold ${run.ok ? "text-ink" : "text-bad"}`}>
            {run.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={3} /> : <X className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={3} />}
            <span className="min-w-0 break-words">{run.outcome}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function Part({ caption, name, face, note, accent }: { caption: string; name: string; face: string; note: string; accent?: boolean }) {
  return (
    <div className={`min-w-0 flex-1 rounded-xl border px-3 py-2 ${accent ? "border-[var(--brand)] bg-tint" : "border-line bg-surface-2"}`}>
      <Caption>{caption}</Caption>
      <p className="text-sm font-semibold text-ink">{name}</p>
      <p className="break-words font-mono text-[11.5px] text-ink">{face}</p>
      <p className="text-[11px] text-ink-3">{note}</p>
    </div>
  );
}

function Joint({ ok }: { ok: boolean }) {
  return (
    <span className={`flex shrink-0 items-center justify-center py-0.5 ${ok ? "text-brand" : "text-bad"}`} aria-hidden>
      {ok ? (
        <>
          <ArrowDown className="h-4 w-4 sm:hidden" />
          <ArrowRight className="hidden h-4 w-4 sm:block" />
        </>
      ) : (
        <span className="flex items-center gap-1 rounded-full border border-dashed border-bad/60 px-2 py-0.5 text-[11px] font-medium">
          <X className="h-3 w-3" strokeWidth={3} /> doesn&apos;t fit
        </span>
      )}
    </span>
  );
}

export function checkAdapter(state: unknown, goal: Record<string, unknown>) {
  const st = state as AdapterState | undefined;
  if (!st) return false;
  if (typeof goal.ok === "boolean") return st.ok === goal.ok;
  if (typeof goal.mapping === "string") return st.mapping === goal.mapping;
  return false;
}
