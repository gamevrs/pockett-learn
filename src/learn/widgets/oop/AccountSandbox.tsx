"use client";

import React, { useState } from "react";
import { Ban, Check, RotateCcw, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Code } from "./shared";

export interface AccountAction {
  kind: "deposit" | "withdraw" | "set" | "setPrivate";
  amount: number;
}

export interface AccountProps {
  /** "open": a plain class, anything goes. "guarded": encapsulated (checks + read-only balance). */
  mode: "open" | "guarded";
  owner?: string;
  start?: number;
  /** Calls the learner can make. Defaults to a mix of good and bad ones. */
  actions?: AccountAction[];
  /** Show the class source. Default true. */
  showCode?: boolean;
  /** Also offer `acct._balance = …` (guarded mode): Python's underscore is a convention, not a lock. */
  showUnderscore?: boolean;
}

type Outcome = "ok" | "refused" | "blocked" | "sneaky";

interface LogLine {
  id: number;
  code: string;
  outcome: Outcome;
  message: string;
}

export interface AccountState {
  balance: number;
  /** The balance went below zero at some point. */
  negative: boolean;
  refused: number;
  blocked: number;
  sneaky: number;
  ops: number;
}

const DEFAULT_ACTIONS: AccountAction[] = [
  { kind: "deposit", amount: 50 },
  { kind: "withdraw", amount: 30 },
  { kind: "withdraw", amount: 500 },
  { kind: "deposit", amount: -40 },
  { kind: "set", amount: -999 },
];

const OPEN_SOURCE = `class BankAccount:
    def __init__(self, owner, balance):
        self.owner = owner
        self.balance = balance       # anyone can change this

    def deposit(self, amount):
        self.balance += amount

    def withdraw(self, amount):
        self.balance -= amount`;

const GUARDED_SOURCE = `class BankAccount:
    def __init__(self, owner, balance):
        self.owner = owner
        self._balance = balance      # internal: hands off

    @property
    def balance(self):               # read-only view
        return self._balance

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("deposit must be positive")
        self._balance += amount

    def withdraw(self, amount):
        if amount <= 0 or amount > self._balance:
            raise ValueError("not allowed")
        self._balance -= amount`;

const money = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-US")}`;

function codeFor(a: AccountAction) {
  if (a.kind === "set") return `acct.balance = ${a.amount}`;
  if (a.kind === "setPrivate") return `acct._balance = ${a.amount}`;
  return `acct.${a.kind}(${a.amount})`;
}

/** A BankAccount you poke from "outside code": unprotected, or encapsulated with rules enforced. */
export function AccountSandbox({ props, onChange, revealed }: WidgetProps<AccountProps>) {
  const start = props.start ?? 100;
  const guarded = props.mode === "guarded";
  const actions = [...(props.actions ?? DEFAULT_ACTIONS), ...(guarded && props.showUnderscore ? [{ kind: "setPrivate", amount: -999 } as AccountAction] : [])];
  const [state, setState] = useState<AccountState>({ balance: start, negative: start < 0, refused: 0, blocked: 0, sneaky: 0, ops: 0 });
  const [log, setLog] = useState<LogLine[]>([]);
  const locked = Boolean(revealed);

  const run = (a: AccountAction) => {
    if (locked) return;
    let { balance } = state;
    let outcome: Outcome = "ok";
    let message = "";
    if (a.kind === "deposit") {
      if (guarded && a.amount <= 0) [outcome, message] = ["refused", "ValueError: deposit must be positive"];
      else [balance, message] = [balance + a.amount, `balance is now ${money(balance + a.amount)}`];
    } else if (a.kind === "withdraw") {
      if (guarded && (a.amount <= 0 || a.amount > balance)) [outcome, message] = ["refused", "ValueError: not allowed (that would overdraw the account)"];
      else [balance, message] = [balance - a.amount, `balance is now ${money(balance - a.amount)}`];
    } else if (a.kind === "set") {
      if (guarded) [outcome, message] = ["blocked", "AttributeError: property 'balance' has no setter"];
      else [balance, message] = [a.amount, `balance is now ${money(a.amount)}, no questions asked`];
    } else {
      [balance, outcome, message] = [a.amount, "sneaky", "Python allowed it: the underscore is a warning sign, not a lock"];
    }
    const next: AccountState = {
      balance,
      negative: state.negative || balance < 0,
      refused: state.refused + (outcome === "refused" ? 1 : 0),
      blocked: state.blocked + (outcome === "blocked" ? 1 : 0),
      sneaky: state.sneaky + (outcome === "sneaky" ? 1 : 0),
      ops: state.ops + 1,
    };
    setState(next);
    setLog((l) => [{ id: next.ops, code: codeFor(a), outcome, message }, ...l].slice(0, 4));
    onChange?.(next);
  };

  const reset = () => {
    if (locked) return;
    const next: AccountState = { balance: start, negative: start < 0, refused: 0, blocked: 0, sneaky: 0, ops: 0 };
    setState(next);
    setLog([]);
    onChange?.(next);
  };

  const ok = state.balance >= 0;
  return (
    <div className="w-full text-sm">
      {(props.showCode ?? true) && (
        <details className="group mb-4 rounded-xl border border-line bg-surface-2 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex min-h-10 cursor-pointer select-none items-center justify-between gap-2 px-3.5 py-2 font-medium text-ink-2">
            <span>{guarded ? "The encapsulated class" : "The unprotected class"}</span>
            <span className="text-xs text-ink-3 group-open:hidden">Show code</span>
            <span className="hidden text-xs text-ink-3 group-open:inline">Hide code</span>
          </summary>
          <div className="px-2 pb-2">
            <Code code={guarded ? GUARDED_SOURCE : OPEN_SOURCE} />
          </div>
        </details>
      )}

      {/* the object */}
      <div className={`rounded-2xl border p-4 transition-colors ${ok ? "border-line bg-surface" : "border-bad/50 bg-bad/[0.06]"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-ink-3">acct = BankAccount(&quot;{props.owner ?? "Ana"}&quot;, {start})</p>
            <p key={state.balance} className={`pop-in mt-1 font-mono text-3xl font-semibold tabular-nums ${ok ? "" : "text-bad"}`}>{money(state.balance)}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ok ? "bg-tint text-brand" : "bg-bad/15 text-bad"}`}>
            {ok ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
            {ok ? "Rule holds: balance ≥ 0" : "Rule broken: negative balance"}
          </span>
        </div>
        {guarded && <p className="mt-2 text-xs text-ink-3">The only doors in: deposit() and withdraw(). Both check the rule first.</p>}
      </div>

      {/* outside code */}
      <div className="mt-4 flex items-center justify-between">
        <Caption className="!mb-0">Outside code · tap a line to run it</Caption>
        {state.ops > 0 && !locked && (
          <button type="button" onClick={reset} className="btn btn-ghost !h-10 !px-3">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {actions.map((a) => (
          <button
            key={codeFor(a)}
            type="button"
            disabled={locked}
            onClick={() => run(a)}
            className="flex min-h-11 items-center rounded-xl border border-line bg-surface-2 px-3 text-left font-mono text-[0.8rem] transition-colors hover:border-[var(--line-strong)] disabled:cursor-default disabled:opacity-60"
          >
            {codeFor(a)}
          </button>
        ))}
      </div>

      <ul className="mt-3 grid gap-1.5" aria-live="polite">
        {log.map((l) => (
          <li key={l.id} className={`flex items-start gap-2 rounded-lg px-3 py-2 ${l.id === state.ops ? "pop-in" : ""} ${l.outcome === "ok" ? "bg-surface-2" : l.outcome === "sneaky" ? "bg-surface-2" : "bg-tint"}`}>
            <span className="mt-0.5 shrink-0">
              {l.outcome === "ok" && <Check className="h-4 w-4 text-ink-3" />}
              {(l.outcome === "refused" || l.outcome === "blocked") && <Ban className="h-4 w-4 text-brand" />}
              {l.outcome === "sneaky" && <TriangleAlert className="h-4 w-4 text-bad" />}
            </span>
            <span className="min-w-0">
              <span className="block font-mono text-[0.78rem]">{l.code}</span>
              <span className={`block text-xs ${l.outcome === "ok" ? "text-ink-3" : l.outcome === "sneaky" ? "text-bad" : "text-ink-2"}`}>
                {l.outcome === "refused" ? "Refused · " : l.outcome === "blocked" ? "Blocked · " : ""}
                {l.message}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function checkAccount(state: unknown, goal: Record<string, unknown>) {
  const s = state as AccountState | undefined;
  if (!s) return false;
  if (goal.negative === true && !s.negative) return false;
  if (typeof goal.refused === "number" && s.refused < goal.refused) return false;
  if (typeof goal.blocked === "number" && s.blocked < goal.blocked) return false;
  if (typeof goal.sneaky === "number" && s.sneaky < goal.sneaky) return false;
  if (typeof goal.balance === "number" && s.balance !== goal.balance) return false;
  return true;
}
