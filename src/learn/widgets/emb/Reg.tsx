"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { toHex, u32 } from "./sim";
import { Btn, Caption, Note, Readout, Seg, Stepper, ToyNote } from "./ui";

function Lock({ disabled, children }: { disabled?: boolean; children: React.ReactNode }) {
  return (
    <fieldset disabled={disabled} className={`m-0 min-w-0 border-0 p-0 ${disabled ? "opacity-60" : ""}`}>
      {children}
    </fieldset>
  );
}

const GLOW = "var(--elec-glow, #f5c518)";

// ───────────────────────────── emb-reg: register bit editor ─────────────────────────────

type Op = "set" | "clear" | "toggle" | "assign";

export interface RegProps {
  initial?: number;
  bits?: number;
  allowAssign?: boolean;
  task?: string;
  reg?: string;
}

export interface RegState {
  value: number;
  ops: number;
  usedAssign: boolean;
  usedOps: Op[];
}

const OP_TEXT: Record<Op, string> = { set: "|=", clear: "&= ~", toggle: "^=", assign: "=" };

const bitsMask = (bits: number) => (bits >= 32 ? 0xffffffff : (1 << bits) - 1);
const hexDigits = (bits: number) => Math.max(2, Math.ceil(bits / 4));
const hexOf = (v: number, bits: number) => toHex(v, hexDigits(bits));
/** Binary grouped 4 by 4: 1000 0001. */
const binOf = (v: number, bits: number) =>
  (u32(v) & bitsMask(bits))
    .toString(2)
    .padStart(bits, "0")
    .replace(/(?=(?:.{4})+$)/g, " ")
    .trim();

function applyOp(v: number, op: Op, mask: number, bits: number): number {
  const m = u32(mask) & bitsMask(bits);
  const r = op === "set" ? v | m : op === "clear" ? v & ~m : op === "toggle" ? v ^ m : m;
  return u32(r) & bitsMask(bits);
}

function singleBit(mask: number): number | null {
  return mask !== 0 && (mask & (mask - 1)) === 0 ? 31 - Math.clz32(mask) : null;
}

function statement(reg: string, op: Op, mask: number, bits: number): string {
  const n = singleBit(mask);
  const m = n !== null ? `(1u << ${n})` : toHex(mask, hexDigits(bits)).replace(/^0x0*(?=.)/, "0x");
  if (op === "assign") return `${reg} = ${m};`;
  if (op === "clear") return `${reg} &= ~${m};`;
  return `${reg} ${OP_TEXT[op]} ${m};`;
}

interface HistoryItem {
  stmt: string;
  before: number;
  after: number;
}

function BitRow({ label, bits, value, onToggle, leds, disabled }: { label: string; bits: number; value: number; onToggle?: (n: number) => void; leds?: boolean; disabled?: boolean }) {
  const nibbles: number[][] = [];
  for (let hi = bits - 1; hi >= 0; hi -= 4) {
    const g: number[] = [];
    for (let n = hi; n > hi - 4 && n >= 0; n--) g.push(n);
    nibbles.push(g);
  }
  return (
    <div>
      <Caption className="mb-1">{label}</Caption>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {nibbles.map((g) => (
          <div key={g[0]} className="flex gap-0.5">
            {g.map((n) => {
              const on = ((value >>> n) & 1) === 1;
              return (
                <div key={n} className="flex w-10 flex-col items-center">
                  <span className="text-[0.75rem] text-ink-2">{n}</span>
                  {onToggle ? (
                    <button
                      type="button"
                      disabled={disabled}
                      aria-pressed={on}
                      aria-label={`${label} bit ${n}`}
                      onClick={() => onToggle(n)}
                      className={`grid h-10 w-10 place-items-center rounded-lg border font-mono text-[1rem] font-semibold transition-colors disabled:cursor-not-allowed ${on ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface-2 text-ink-2 hover:border-[var(--line-strong)]"}`}
                    >
                      {on ? 1 : 0}
                    </button>
                  ) : (
                    <div role="img" aria-label={`Bit ${n} is ${on ? 1 : 0}`} className={`grid h-10 w-10 place-items-center rounded-lg border font-mono text-[1rem] font-semibold ${on ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface-2 text-ink-2"}`}>
                      {on ? 1 : 0}
                    </div>
                  )}
                  {leds && (
                    <span aria-hidden className="mt-1 h-3.5 w-3.5 rounded-full border border-[var(--line-strong)]" style={{ background: on ? GLOW : "var(--surface-2)", boxShadow: on ? `0 0 6px ${GLOW}` : undefined }} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Reg({ props, onChange, revealed }: WidgetProps<RegProps>) {
  const bits = Math.min(32, Math.max(1, Math.round(props.bits ?? 8)));
  const regName = props.reg ?? "GPIOA->ODR";
  const initial = u32(props.initial ?? 0b1000_0001) & bitsMask(bits);
  const [value, setValue] = useState(initial);
  const [mask, setMask] = useState(0);
  const [op, setOp] = useState<Op>("set");
  const [n, setN] = useState(0);
  const [ops, setOps] = useState(0);
  const [usedOps, setUsedOps] = useState<Op[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const locked = Boolean(revealed);
  const allowAssign = Boolean(props.allowAssign);
  const activeOp: Op = op === "assign" && !allowAssign ? "set" : op;

  const preview = applyOp(value, activeOp, mask, bits);
  const canApply = activeOp === "assign" || mask !== 0;
  const toggleMask = (b: number) => setMask((m) => u32(m ^ (1 << b)));

  const apply = () => {
    if (!canApply) return;
    const after = preview;
    const nOps = ops + 1;
    const used = [...usedOps, activeOp];
    setValue(after);
    setOps(nOps);
    setUsedOps(used);
    setHistory([{ stmt: statement(regName, activeOp, mask, bits), before: value, after }, ...history].slice(0, 4));
    onChange?.({ value: after, ops: nOps, usedAssign: used.includes("assign"), usedOps: used } satisfies RegState);
  };
  const reset = () => {
    setValue(initial);
    setMask(0);
    setOps(0);
    setUsedOps([]);
    setHistory([]);
    onChange?.({ value: initial, ops: 0, usedAssign: false, usedOps: [] } satisfies RegState);
  };

  const opOptions: { value: Op; label: string }[] = [
    { value: "set", label: "Set |=" },
    { value: "clear", label: "Clear &= ~" },
    { value: "toggle", label: "Toggle ^=" },
    ...(allowAssign ? [{ value: "assign" as Op, label: "Assign =" }] : []),
  ];

  return (
    <div className="w-full">
      {props.task && <p className="mb-2 text-center text-[0.9rem] text-ink-2">{props.task}</p>}
      <div className="rounded-xl border border-line bg-surface p-2.5">
        <BitRow label={`${regName} (pins ${bits - 1} to 0)`} bits={bits} value={value} leds />
      </div>

      <Lock disabled={locked}>
        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-surface p-2.5">
          <div>
            <Caption className="mb-1">Operation</Caption>
            <Seg label="Operation" value={activeOp} onChange={setOp} options={opOptions} />
          </div>
          <BitRow label="Mask (tap bits)" bits={bits} value={mask} onToggle={toggleMask} />
          <div className="flex flex-wrap items-center gap-2">
            <Stepper label="Bit number n" value={Math.min(n, bits - 1)} min={0} max={bits - 1} onChange={setN} />
            <Btn onClick={() => setMask(1 << Math.min(n, bits - 1))}>Use 1u &lt;&lt; {Math.min(n, bits - 1)}</Btn>
            <Btn onClick={() => setMask(0)}>Clear mask</Btn>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-line bg-surface-2 p-2.5">
          <code className="block whitespace-pre-wrap break-words font-mono text-[0.85rem] text-ink">{mask === 0 && activeOp !== "assign" ? `${regName} ${OP_TEXT[activeOp]} …;` : statement(regName, activeOp, mask, bits)}</code>
          <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 font-mono text-[0.78rem] text-ink-2">
            <span>before</span>
            <span className="break-words text-ink">
              {hexOf(value, bits)} = {binOf(value, bits)}
            </span>
            <span>after</span>
            <span className="break-words text-ink">
              {hexOf(preview, bits)} = {binOf(preview, bits)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Btn primary onClick={apply} disabled={!canApply}>
              Apply
            </Btn>
            <Btn onClick={reset}>Reset</Btn>
          </div>
        </div>
      </Lock>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Value" value={hexOf(value, bits)} accent />
        <Readout label="Writes" value={ops} />
      </div>

      {history.length > 0 && (
        <ul className="mt-2 space-y-0.5 rounded-xl border border-line bg-surface p-2.5 font-mono text-[0.75rem] text-ink-2" aria-label="Last writes">
          {history.map((h, i) => (
            <li key={`${i}-${h.stmt}`} className="break-words">
              <span className="text-ink">{h.stmt}</span> {hexOf(h.before, bits)} → {hexOf(h.after, bits)}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2">
        <Note>{activeOp === "assign" ? "= replaces every bit, including pins other code was using." : "Each write changes only the bits in the mask; the others keep their value."}</Note>
      </div>
      <ToyNote>Simplified: a plain 32-bit register that you read, change and write back. Real hardware can also offer BSRR-style set/reset registers.</ToyNote>
    </div>
  );
}

/** goal: { value?, maxOps?, noAssign?, mustUse? } */
export function checkReg(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as RegState | undefined;
  if (!s) return false;
  if (typeof goal.value === "number" && s.value !== goal.value) return false;
  if (typeof goal.maxOps === "number" && s.ops > goal.maxOps) return false;
  if (goal.noAssign === true && s.usedAssign) return false;
  if (typeof goal.mustUse === "string" && !s.usedOps.includes(goal.mustUse as Op)) return false;
  return true;
}

// ───────────────────────────── emb-volatile ─────────────────────────────

export interface VolatileProps {
  initialVolatile?: boolean;
  initialOpt?: "O0" | "O2";
}

export interface VolatileState {
  isVolatile: boolean;
  opt: "O0" | "O2";
  ran: boolean;
  exits: boolean;
}

export function Volatile({ props, onChange, revealed }: WidgetProps<VolatileProps>) {
  const [isVolatile, setVolatile] = useState(Boolean(props.initialVolatile));
  const [opt, setOpt] = useState<"O0" | "O2">(props.initialOpt === "O2" ? "O2" : "O0");
  const [ran, setRan] = useState(false);
  const locked = Boolean(revealed);
  const exits = isVolatile || opt === "O0";
  const hoisted = !exits;

  const report = (v: boolean, o: "O0" | "O2", r: boolean) => onChange?.({ isVolatile: v, opt: o, ran: r, exits: v || o === "O0" } satisfies VolatileState);
  const toggle = () => {
    setVolatile(!isVolatile);
    setRan(false);
    report(!isVolatile, opt, false);
  };
  const pickOpt = (o: "O0" | "O2") => {
    setOpt(o);
    setRan(false);
    report(isVolatile, o, false);
  };
  const run = () => {
    setRan(true);
    report(isVolatile, opt, true);
  };

  const asm = hoisted ? ["LDR r0, [ready]", "loop:", "  CMP r0, #0", "  BEQ loop"] : ["loop:", "  LDR r0, [ready]", "  CMP r0, #0", "  BEQ loop"];

  return (
    <div className="w-full">
      <pre className="overflow-hidden whitespace-pre-wrap break-words rounded-xl border border-line bg-surface-2 p-3 font-mono text-[0.8rem] leading-relaxed text-ink" aria-label="C code">
        {[
          isVolatile ? "volatile bool ready = false;" : "bool ready = false;",
          "void UART_IRQHandler(void) {",
          "  ready = true;",
          "}",
          "int main(void) {",
          "  while (!ready) { }",
          "  // ... continues",
          "}",
        ].map((l, i) => (
          <span key={i} className="block">
            {l}
          </span>
        ))}
      </pre>

      <Lock disabled={locked}>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Btn on={isVolatile} onClick={toggle}>
            volatile: {isVolatile ? "on" : "off"}
          </Btn>
          <Seg
            label="Optimisation level"
            value={opt}
            onChange={pickOpt}
            options={[
              { value: "O0", label: "-O0" },
              { value: "O2", label: "-O2" },
            ]}
          />
        </div>
      </Lock>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2.5">
        <Caption className="mb-1">What the compiler made of the loop ({opt === "O0" ? "-O0" : "-O2"})</Caption>
        <pre className="overflow-hidden whitespace-pre-wrap break-words font-mono text-[0.8rem] leading-relaxed text-ink">
          {asm.map((l, i) => (
            <span key={i} className="block">
              {l}
            </span>
          ))}
        </pre>
        <p className="mt-1.5 text-[0.85rem] leading-snug text-ink-2">{hoisted ? "The compiler sees nothing in the loop that changes ready, so it reads it once, before the loop. The test now uses a stale copy in r0." : "The load is inside the loop, so every pass reads ready from memory again."}</p>
      </div>

      <div className="mt-3 flex justify-center">
        <Btn primary onClick={run} disabled={locked}>
          Run
        </Btn>
      </div>
      {ran && (
        <ol className="mt-2 space-y-1 rounded-xl border border-line bg-surface p-2.5 text-[0.85rem] text-ink-2" aria-live="polite">
          <li>
            <span className="font-mono text-ink">t = 0</span> main starts waiting.
          </li>
          <li>
            <span className="font-mono text-ink">t = 1 ms</span> the interrupt sets ready = true in memory.
          </li>
          <li className={exits ? "text-ink" : "font-semibold text-ink"} style={exits ? undefined : { borderLeft: "3px solid var(--bad)", paddingLeft: 8 }}>
            {exits ? "main sees ready = 1 and continues." : "main keeps testing r0, which still holds 0: it waits forever."}
          </li>
        </ol>
      )}

      <div className="mt-3">
        <Note>volatile tells the compiler: every read and write in the source must really happen. It does NOT make count++ atomic and does not order accesses between cores; for those you need interrupts off, atomics or barriers.</Note>
      </div>
      <ToyNote>Illustration: real compiler output differs in detail; the hoisted load is real behaviour at -O2.</ToyNote>
    </div>
  );
}

/** goal: { exits?, opt?, ran? } */
export function checkVolatile(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as VolatileState | undefined;
  if (!s) return false;
  if (typeof goal.exits === "boolean" && s.exits !== goal.exits) return false;
  if (typeof goal.opt === "string" && s.opt !== goal.opt) return false;
  if (typeof goal.ran === "boolean" && s.ran !== goal.ran) return false;
  return true;
}
