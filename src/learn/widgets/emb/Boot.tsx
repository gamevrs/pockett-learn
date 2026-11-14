"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Meter, Note, Readout, Seg, ToyNote } from "./ui";
import { BOOT_STEPS, linkLayout, toHex, toHexGrouped, type Placed, type SectionSizes } from "./sim";

const DEFAULT_SIZES: SectionSizes = { vectors: 0x188, text: 12000, rodata: 1000, data: 256, bss: 1024, heap: 0, stack: 2048 };
const GARBAGE = 0xa5a5a5a5;
const KIB = 1024;

const BSS_OPTS = [1, 16, 64, 126].map((k) => ({ value: k * KIB, label: `${k} KiB` }));
const STACK_OPTS = [1, 2, 8].map((k) => ({ value: k * KIB, label: `${k} KiB` }));

export interface BootProps {
  sizes?: Partial<SectionSizes>;
  editable?: ("bss" | "stack")[];
  skip?: boolean;
  task?: string;
}

export interface BootState {
  step: number;
  reachedMain: boolean;
  /** null = still the power-on garbage. */
  counter: number | null;
  total: number | null;
  linkOk: boolean;
  error: string | null;
  ramUsed: number;
  bss: number;
  skipData: boolean;
  skipBss: boolean;
}

/** Locks every control inside it (the lesson was answered). */
function Lock({ locked, children, className = "" }: { locked: boolean; children: React.ReactNode; className?: string }) {
  return (
    <fieldset disabled={locked} className={`m-0 min-w-0 border-0 p-0 ${locked ? "opacity-70" : ""} ${className}`}>
      {children}
    </fieldset>
  );
}

const fmtSize = (n: number) => (n < KIB ? `${n} B` : `${+(n / KIB).toFixed(n >= 10 * KIB ? 0 : 1)} KiB`);

/** The linker's own wording for an overflow. */
const ldError = (e: string) => `ld: ${e.replace(/region (\w+)/, "region `$1'")}`;

function Section({ p, regionSize, hot }: { p: Placed; regionSize: number; hot?: boolean }) {
  const h = Math.round(48 + 70 * Math.sqrt(Math.min(1, p.size / regionSize)));
  return (
    <div
      className={`min-w-0 rounded-lg border bg-surface-2 px-2 py-1.5 ${hot ? "border-[var(--brand)]" : "border-line"}`}
      style={{ minHeight: h }}
    >
      <p className="break-words font-mono text-[0.78rem] font-semibold text-ink">{p.name}</p>
      <p className="font-mono text-[0.72rem] text-ink-2">{toHexGrouped(p.vma)}</p>
      {p.name === ".data" && <p className="font-mono text-[0.72rem] text-ink-2">loads from {toHexGrouped(p.lma)}</p>}
      <p className="text-[0.75rem] text-ink-2">{fmtSize(p.size)}</p>
    </div>
  );
}

export function Boot({ props, onChange, revealed }: WidgetProps<BootProps>) {
  const [sizes, setSizes] = useState<SectionSizes>({ ...DEFAULT_SIZES, ...props.sizes });
  const [step, setStep] = useState(0);
  const [skipData, setSkipData] = useState(false);
  const [skipBss, setSkipBss] = useState(false);
  const locked = Boolean(revealed);
  const editable = props.editable ?? [];

  const link = linkLayout(sizes);

  const stateOf = (sz: SectionSizes, st: number, sd: boolean, sb: boolean): BootState => {
    const l = linkLayout(sz);
    return {
      step: st,
      reachedMain: st >= 6,
      counter: st >= 3 && !sd ? 42 : null,
      total: st >= 4 && !sb ? 0 : null,
      linkOk: l.ok,
      error: l.error ? ldError(l.error) : null,
      ramUsed: l.ramUsed,
      bss: sz.bss,
      skipData: sd,
      skipBss: sb,
    };
  };
  const apply = (sz: SectionSizes, st: number, sd: boolean, sb: boolean) => {
    setSizes(sz);
    setStep(st);
    setSkipData(sd);
    setSkipBss(sb);
    onChange?.(stateOf(sz, st, sd, sb));
  };

  const cur = stateOf(sizes, step, skipData, skipBss);
  const showVal = (v: number | null) => (v === null ? `${toHex(GARBAGE)} (garbage)` : String(v));
  const flashRev = [...link.flash].filter((p) => p.size > 0).reverse();
  const ramRev = [...link.ram].filter((p) => p.size > 0).reverse();

  const steps: { text: string; skipped: boolean }[] = BOOT_STEPS.map((t, i) => ({ text: t, skipped: (i === 2 && skipData) || (i === 3 && skipBss) }));
  const mainNote = cur.reachedMain && (skipData || skipBss);

  return (
    <div className="w-full">
      {props.task && <p className="mb-2 text-[0.9rem] text-ink">{props.task}</p>}

      <Caption className="mb-1.5">Part 1: the linker map</Caption>
      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-0">
          <p className="mb-1 text-[0.8rem] font-medium text-ink">Flash ({toHexGrouped(0)})</p>
          <div className="flex flex-col gap-1.5">
            {flashRev.map((p) => (
              <Section key={p.name} p={p} regionSize={link.flashSize} hot={p.name.startsWith(".data")} />
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-[0.8rem] font-medium text-ink">RAM ({toHexGrouped(0x2000_0000)})</p>
          <div className="flex flex-col gap-1.5">
            {ramRev.map((p) => (
              <Section key={p.name} p={p} regionSize={link.ramSize} hot={p.name === ".data"} />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-1 text-center text-[0.75rem] text-ink-3">High addresses at the top. Not to scale.</p>
      <p className="mt-2 rounded-lg border border-[var(--brand)]/40 bg-tint px-3 py-1.5 text-center text-[0.82rem] text-ink">
        .data (initial values) in flash → .data in RAM: <b>copied at startup</b>
      </p>

      <div className="mt-3 flex flex-col gap-2.5">
        <div>
          <p className="mb-1 text-[0.82rem] text-ink-2">
            Flash used {fmtSize(link.flashUsed)} of {fmtSize(link.flashSize)}
          </p>
          <Meter frac={link.flashUsed / link.flashSize} tone={link.flashUsed > link.flashSize ? "bad" : "brand"} label={`Flash used ${link.flashUsed} of ${link.flashSize} bytes`} />
        </div>
        <div>
          <p className="mb-1 text-[0.82rem] text-ink-2">
            RAM used {fmtSize(link.ramUsed)} of {fmtSize(link.ramSize)}
          </p>
          <Meter frac={link.ramUsed / link.ramSize} tone={link.ramUsed > link.ramSize ? "bad" : "brand"} label={`RAM used ${link.ramUsed} of ${link.ramSize} bytes`} />
        </div>
      </div>

      {editable.length > 0 && (
        <Lock locked={locked} className="mt-3">
          <div className="flex flex-col gap-2.5">
            {editable.includes("bss") && (
              <div>
                <Caption className="mb-1">.bss size</Caption>
                <Seg options={BSS_OPTS} value={sizes.bss} onChange={(v) => apply({ ...sizes, bss: v }, step, skipData, skipBss)} label=".bss size" />
              </div>
            )}
            {editable.includes("stack") && (
              <div>
                <Caption className="mb-1">Stack size</Caption>
                <Seg options={STACK_OPTS} value={sizes.stack} onChange={(v) => apply({ ...sizes, stack: v }, step, skipData, skipBss)} label="Stack size" />
              </div>
            )}
          </div>
        </Lock>
      )}

      {link.error && (
        <p className="mt-3 break-words rounded-xl border border-[var(--bad)] bg-surface px-3.5 py-2.5 font-mono text-[0.82rem] leading-snug text-[var(--bad)]" role="alert">
          {ldError(link.error)}
        </p>
      )}

      <Caption className="mb-1.5 mt-5">Part 2: the boot sequence</Caption>
      <Lock locked={locked}>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => apply(sizes, 0, skipData, skipBss)}>Reset</Btn>
          <Btn primary disabled={step >= 6} onClick={() => apply(sizes, Math.min(step + 1, 6), skipData, skipBss)}>
            Next step
          </Btn>
          {props.skip && (
            <>
              <Btn on={skipData} onClick={() => apply(sizes, step, !skipData, skipBss)}>
                Skip .data copy
              </Btn>
              <Btn on={skipBss} onClick={() => apply(sizes, step, skipData, !skipBss)}>
                Skip .bss zeroing
              </Btn>
            </>
          )}
        </div>
      </Lock>

      <ol className="mt-3 flex flex-col gap-1" aria-label="Boot steps">
        {steps.map((s, i) => {
          const done = step > i;
          const now = step === i + 1;
          return (
            <li
              key={i}
              aria-current={now ? "step" : undefined}
              className={`flex gap-2 rounded-lg border px-2.5 py-1.5 text-[0.84rem] leading-snug ${now ? "border-[var(--brand)] bg-tint text-ink" : done ? "border-line bg-surface text-ink-2" : "border-line bg-surface text-ink-3"}`}
            >
              <span className="font-mono tabular-nums">{i + 1}.</span>
              <span className={s.skipped ? "line-through" : ""}>
                {s.text}
                {s.skipped && <span className="ml-1 no-underline">(skipped)</span>}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface px-3 py-2">
          <p className="text-xs text-ink-2">SP (stack pointer)</p>
          <p className="font-mono text-[0.88rem] font-semibold text-ink">{step >= 1 ? toHexGrouped(link.initialSp) : "not set yet"}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface px-3 py-2">
          <p className="text-xs text-ink-2">PC (program counter)</p>
          <p className="font-mono text-[0.88rem] font-semibold text-ink">{step >= 6 ? "in main" : step >= 2 ? toHexGrouped(link.resetVector) : "not set yet"}</p>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-2">
        {[
          { decl: "int counter = 42;", sec: ".data", val: showVal(cur.counter), bad: cur.counter === null },
          { decl: "int total;", sec: ".bss", val: showVal(cur.total), bad: cur.total === null },
          { decl: 'const char msg[] = "hi";', sec: ".rodata", val: '"hi" (read from flash)', bad: false },
        ].map((v) => (
          <div key={v.decl} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-xl border border-line bg-surface px-3 py-2">
            <div className="min-w-0">
              <p className="break-words font-mono text-[0.82rem] text-ink">{v.decl}</p>
              <p className="text-xs text-ink-2">lives in {v.sec}</p>
            </div>
            <p className={`break-all font-mono text-[0.84rem] font-semibold ${v.bad ? "text-[var(--bad)]" : "text-ink"}`}>{v.val}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Step" value={`${step} of 6`} />
        <Readout label="main running" value={cur.reachedMain ? "yes" : "no"} accent={cur.reachedMain} />
      </div>

      <div className="mt-3">
        {mainNote ? (
          <p className="rounded-xl border border-[var(--bad)] bg-surface px-3.5 py-2.5 text-[0.88rem] leading-snug text-[var(--bad)]" role="status">
            {skipData ? `main starts with counter = ${toHex(GARBAGE)}: the C promise that initialised globals have their values is broken.` : `main starts with total = ${toHex(GARBAGE)}: the C promise that uninitialised globals are zero is broken.`}
            {skipData && skipBss ? ` The same goes for total = ${toHex(GARBAGE)}.` : ""}
          </p>
        ) : (
          <Note>
            {step === 0
              ? "Power is on but nothing has run. RAM holds random leftovers, shown here as 0xA5A5A5A5. Press Next step."
              : cur.reachedMain
                ? "main() runs with every global set up the way C promises."
                : "Each step runs before main(). Watch the variables change."}
          </Note>
        )}
      </div>
      <ToyNote>Toy layout from a minimal linker script; real startup code (from your vendor or toolchain) does the same steps.</ToyNote>
    </div>
  );
}

/** goal: { reachedMain, counter, total, linkOk, minBss } */
export function checkBoot(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as BootState | undefined;
  if (!s) return false;
  if (typeof goal.reachedMain === "boolean" && s.reachedMain !== goal.reachedMain) return false;
  if (typeof goal.counter === "number" && s.counter !== goal.counter) return false;
  if (typeof goal.total === "number" && s.total !== goal.total) return false;
  if (typeof goal.linkOk === "boolean" && s.linkOk !== goal.linkOk) return false;
  if (typeof goal.minBss === "number" && s.bss < goal.minBss) return false;
  return true;
}
