"use client";

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Note, Readout, Seg } from "./ui";
import {
  DATA_POS,
  DEFAULT_WRITE_SEQ,
  ECC_LABELS,
  ECC_NEW_DATA,
  LINES,
  dirtyCount,
  eccDecode,
  eccStore,
  flashWrite,
  freshFlash,
  freshWriteSim,
  isStale,
  prefilledFlash,
  staleCount,
  stepWrite,
  validIn,
  writeAmp,
  type FlashSim,
  type FlashWriteInfo,
  type WritePolicyKind,
  type WriteSim,
  type WriteStepInfo,
} from "./techsim";

const bin = (n: number, digits: number) => n.toString(2).padStart(digits, "0");

// ───────────────────────────── memsys-writes: write-through vs write-back ─────────────────────────────

export interface WritePolicyProps {
  /** Starting policy (default "through"). */
  policy?: WritePolicyKind;
  /** Accesses to run, like "rA" (read line A) or "wA" (write line A). */
  sequence?: string[];
  /** Hide the policy switch. */
  lockPolicy?: boolean;
}

export interface WritePolicyState {
  policy: WritePolicyKind;
  done: boolean;
  step: number;
  ramWrites: number;
  ramReads: number;
  dirtyLines: number;
  staleLines: number;
}

function describeAccess(i: WriteStepInfo, policy: WritePolicyKind): string {
  const verb = i.kind === "r" ? "Read" : "Write";
  const parts = [`${verb} ${i.line}: ${i.hit ? "hit" : "miss"}.`];
  if (!i.hit) {
    if (i.evicted) {
      parts.push(
        i.evicted.wroteBack
          ? `The least recently used slot holds ${i.evicted.line}, which is dirty, so ${i.evicted.line} is written back to RAM first.`
          : `The least recently used slot holds ${i.evicted.line}, which is clean, so it is simply dropped. Nothing is written.`,
      );
      parts.push(`Then ${i.line} is read from RAM into that slot.`);
    } else {
      parts.push(`${i.line} is read from RAM into an empty slot.`);
    }
  }
  if (i.kind === "w") {
    parts.push(policy === "through" ? "Write-through updates the cache and RAM together." : "Write-back marks the line dirty; RAM is not touched.");
  }
  return parts.join(" ");
}

export function WritePolicy({ props, onChange, revealed }: WidgetProps<WritePolicyProps>) {
  const seq = props.sequence && props.sequence.length ? props.sequence : DEFAULT_WRITE_SEQ;
  const [sim, setSim] = useState<WriteSim>(() => freshWriteSim(props.policy ?? "through"));
  const [info, setInfo] = useState<WriteStepInfo | null>(null);
  const locked = Boolean(revealed);
  const done = sim.step >= seq.length;

  const report = (s: WriteSim) =>
    onChange?.({
      policy: s.policy,
      done: s.step >= seq.length,
      step: s.step,
      ramWrites: s.ramWrites,
      ramReads: s.ramReads,
      dirtyLines: dirtyCount(s),
      staleLines: staleCount(s),
    } satisfies WritePolicyState);

  const next = (all: boolean) => {
    if (locked || done) return;
    let s = sim;
    let last: WriteStepInfo | null = null;
    do {
      const r = stepWrite(s, seq[s.step]);
      s = r.sim;
      last = r.info;
    } while (all && s.step < seq.length);
    setSim(s);
    setInfo(last);
    report(s);
  };
  const reset = (policy: WritePolicyKind) => {
    if (locked) return;
    const s = freshWriteSim(policy);
    setSim(s);
    setInfo(null);
    report(s);
  };

  const msg = info
    ? describeAccess(info, sim.policy)
    : "Two cache slots sit in front of RAM. Press Next access to send the accesses in the list, one at a time.";
  const nextOp = done ? null : seq[sim.step];

  return (
    <div className="w-full">
      {!props.lockPolicy && (
        <div className="mb-3">
          <Seg
            label="Write policy"
            value={sim.policy}
            onChange={(v) => reset(v)}
            disabled={locked}
            options={[
              { value: "through", label: "Write-through" },
              { value: "back", label: "Write-back" },
            ]}
          />
        </div>
      )}

      <Caption className="mb-1.5">Accesses · done ones are ticked, the next one is filled in</Caption>
      <ol className="flex flex-wrap gap-1.5" aria-label="Access list">
        {seq.map((op, i) => {
          const isDone = i < sim.step;
          const isNext = i === sim.step;
          const label = `${op[0] === "r" ? "Read" : "Write"} ${op.slice(1)}`;
          return (
            <li
              key={i}
              className={`rounded-md border px-2 py-1 font-mono text-[0.78rem] font-semibold ${
                isNext ? "border-transparent bg-primary text-primary-ink" : isDone ? "border-line bg-surface-2 text-ink-2" : "border-line bg-surface text-ink"
              }`}
            >
              {isDone ? "✓ " : ""}
              {label}
              <span className="sr-only">{isDone ? " (done)" : isNext ? " (next)" : " (later)"}</span>
            </li>
          );
        })}
      </ol>

      <Caption className="mb-1.5 mt-3">Cache · 2 slots · least recently used leaves first</Caption>
      <div className="grid grid-cols-2 gap-2">
        {sim.slots.map((sl, i) =>
          sl ? (
            <div key={i} className={`rounded-xl border p-2.5 text-ink ${sl.dirty ? "border-[var(--brand)] bg-tint" : "border-line bg-surface-2"}`}>
              <p className="text-[0.78rem] text-ink-2">Slot {i + 1}</p>
              <p className="font-mono text-lg font-semibold">
                Line {sl.line} = {sl.value}
              </p>
              <p className="mt-0.5 text-[0.78rem] font-semibold text-ink">{sl.dirty ? "dirty: newer than RAM" : "clean"}</p>
            </div>
          ) : (
            <div key={i} className="rounded-xl border border-dashed border-[var(--line-strong)] bg-surface p-2.5">
              <p className="text-[0.78rem] text-ink-2">Slot {i + 1}</p>
              <p className="font-mono text-lg font-semibold text-ink-2">empty</p>
            </div>
          ),
        )}
      </div>

      <Caption className="mb-1.5 mt-3">RAM</Caption>
      <div className="grid grid-cols-3 gap-2">
        {LINES.map((l) => (
          <div key={l} className="rounded-xl border border-line bg-surface p-2.5 text-ink">
            <p className="font-mono text-lg font-semibold">
              {l} = {sim.ram[l]}
            </p>
            <p className={`text-[0.78rem] font-semibold ${isStale(sim, l) ? "text-bad" : "text-ink-2"}`}>{isStale(sim, l) ? "stale: cache has newer" : "up to date"}</p>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Note tone={info ? "accent" : "plain"}>{msg}</Note>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="RAM writes" value={sim.ramWrites} accent />
        <Readout label="RAM reads" value={sim.ramReads} />
        <Readout label="Step" value={`${sim.step} of ${seq.length}`} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Btn primary onClick={() => next(false)} disabled={locked || done} label={nextOp ? `Next access: ${nextOp[0] === "r" ? "read" : "write"} ${nextOp.slice(1)}` : "Next access"}>
          Next access
        </Btn>
        <Btn onClick={() => next(true)} disabled={locked || done}>
          Run to the end
        </Btn>
        <Btn onClick={() => reset(sim.policy)} disabled={locked}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Btn>
      </div>
      <p className="mt-2 text-center text-[11px] text-ink-3">Toy cache: 2 slots, LRU, write-allocate. Real caches have many sets, and the CPU also queues stores in a store buffer first.</p>
    </div>
  );
}

/** goal: { policy, done, maxRamWrites, minRamWrites } */
export function checkWritePolicy(state: unknown, goal: Record<string, unknown>) {
  const s = state as WritePolicyState | undefined;
  if (!s) return false;
  if (typeof goal.policy === "string" && s.policy !== goal.policy) return false;
  if (typeof goal.done === "boolean" && s.done !== goal.done) return false;
  if (typeof goal.maxRamWrites === "number" && s.ramWrites > goal.maxRamWrites) return false;
  if (typeof goal.minRamWrites === "number" && s.ramWrites < goal.minRamWrites) return false;
  return true;
}

// ───────────────────────────── memsys-ecc: SEC-DED on one byte ─────────────────────────────

export interface EccProps {
  /** The byte to protect (0..255, default 0b10110010). */
  data?: number;
  /** Stored-bit positions (0 = overall parity, 1..12) already flipped at the start. */
  flip?: number[];
}

export interface EccState {
  flips: number;
  verdict: "clean" | "corrected" | "detected";
  syndrome: number;
  dataOk: boolean;
  data: number;
}

function eccState(data: number, flipped: boolean[]): EccState {
  const d = eccDecode(eccStore(data, flipped));
  return { flips: flipped.filter(Boolean).length, verdict: d.verdict, syndrome: d.syndrome, dataOk: d.decoded === data, data };
}

export function Ecc({ props, onChange, revealed }: WidgetProps<EccProps>) {
  const [data, setData] = useState(() => (typeof props.data === "number" ? props.data & 255 : 0b10110010));
  const [flipped, setFlipped] = useState<boolean[]>(() => {
    const f = new Array<boolean>(13).fill(false);
    for (const p of props.flip ?? []) if (Number.isInteger(p) && p >= 0 && p <= 12) f[p] = true;
    return f;
  });
  const locked = Boolean(revealed);

  const stored = eccStore(data, flipped);
  const dec = eccDecode(stored);
  const st = eccState(data, flipped);
  const fooled = st.flips >= 3 && dec.verdict !== "detected";

  const apply = (d: number, f: boolean[]) => {
    setData(d);
    setFlipped(f);
    onChange?.(eccState(d, f));
  };
  const flip = (i: number) => {
    if (locked) return;
    const f = flipped.slice();
    f[i] = !f[i];
    apply(data, f);
  };
  const reset = () => apply(data, new Array<boolean>(13).fill(false));
  const newData = () => {
    const at = ECC_NEW_DATA.indexOf(data);
    apply(ECC_NEW_DATA[(at + 1) % ECC_NEW_DATA.length], new Array<boolean>(13).fill(false));
  };

  const verdictText = dec.verdict === "clean" ? "No error" : dec.verdict === "corrected" ? `Corrected bit ${dec.fixed === 0 ? "P" : dec.fixed}` : "Detected, can't fix";
  const note =
    st.flips === 0
      ? "Tap any stored bit to flip it, like a cosmic ray hitting the chip. Try one flip, then two, then three."
      : fooled && !st.dataOk
        ? dec.verdict === "corrected"
          ? `SEC-DED is only promised for 1 error (fixed) or 2 (detected). With ${st.flips} flips it was fooled: it thinks it fixed bit ${dec.fixed === 0 ? "P" : dec.fixed}, and the data read is wrong.`
          : `SEC-DED is only promised for 1 error (fixed) or 2 (detected). With ${st.flips} flips it was fooled: it sees no error at all, and the data read is wrong.`
        : fooled
          ? `With ${st.flips} flips SEC-DED is outside its promise. Here the data read is still right, but only because the damage landed where it did not matter.`
          : dec.verdict === "corrected"
            ? `One flipped bit: the syndrome ${dec.syndrome} points at position ${dec.fixed === 0 ? "P (the overall parity bit)" : dec.fixed}, so the decoder flips it back. The data read is correct.`
            : dec.verdict === "detected"
              ? "The parity bits disagree in a way no single flip can explain. The decoder knows something is wrong but cannot say which bits, so it reports an error instead of guessing."
              : "The flips cancelled out in every check, so nothing looks wrong.";

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Readout label="Data written" value={<span aria-label={`${bin(data, 8)}`}>{bin(data, 8)}</span>} />
        <Readout label="Data read" value={bin(dec.decoded, 8)} accent={st.dataOk} />
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${st.dataOk ? "border-line bg-surface text-ink" : "border-[var(--bad)]/60 bg-surface text-bad"}`}>
          {st.dataOk ? "Matches" : "Does not match"}
        </span>
      </div>

      <Caption className="mb-1.5 mt-3">13 stored bits · tap one to flip it · p = check bit, d = data bit</Caption>
      <div className="grid grid-cols-5 gap-1.5 min-[480px]:grid-cols-7 sm:grid-cols-[repeat(13,minmax(0,1fr))]">
        {stored.map((b, i) => {
          const label = ECC_LABELS[i];
          const check = !label.startsWith("d");
          const on = flipped[i];
          const role = check ? (i === 0 ? "overall parity bit" : `check bit at position ${i}`) : `data bit ${label.slice(1)} at position ${DATA_POS[Number(label.slice(1)) - 1]}`;
          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              aria-pressed={on}
              aria-label={`Stored bit ${label}, ${role}, is ${b}${on ? ", flipped" : ""}. Tap to flip it.`}
              onClick={() => flip(i)}
              className={`flex min-h-14 min-w-10 flex-col items-center justify-center rounded-lg border-2 px-0.5 py-1 text-ink transition-colors disabled:cursor-default ${
                on ? "border-[var(--bad)]" : "border-transparent"
              } ${check ? "bg-tint ring-1 ring-[var(--brand)]/40" : "bg-surface-2 ring-1 ring-[var(--line)]"}`}
            >
              <span className="font-mono text-lg font-semibold leading-none">{b}</span>
              <span className="mt-0.5 font-mono text-[11px] font-semibold">{label}</span>
              <span className={`text-[10px] font-semibold leading-tight ${on ? "text-bad" : "text-transparent"}`} aria-hidden>
                flipped
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Bits flipped" value={st.flips} />
        <Readout label="Syndrome" value={`${dec.syndrome} (${bin(dec.syndrome, 4)})`} />
        <Readout label="Overall parity" value={dec.overall ? "odd" : "even"} />
        <Readout label="Verdict" value={verdictText} accent={dec.verdict !== "clean"} />
      </div>

      <div className="mt-3">
        <Note tone={fooled || st.flips > 0 ? "accent" : "plain"}>{note}</Note>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Btn onClick={reset} disabled={locked}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Btn>
        <Btn onClick={newData} disabled={locked}>
          New data
        </Btn>
      </div>
      <p className="mt-2 text-center text-[11px] text-ink-3">Toy: 8 data bits and 5 check bits. Real ECC memory protects 64 data bits with 8 check bits (72 in all).</p>
    </div>
  );
}

/** goal: { verdict, minFlips, maxFlips, dataOk } */
export function checkEcc(state: unknown, goal: Record<string, unknown>) {
  const s = state as EccState | undefined;
  if (!s) return false;
  if (typeof goal.verdict === "string" && s.verdict !== goal.verdict) return false;
  if (typeof goal.minFlips === "number" && s.flips < goal.minFlips) return false;
  if (typeof goal.maxFlips === "number" && s.flips > goal.maxFlips) return false;
  if (typeof goal.dataOk === "boolean" && s.dataOk !== goal.dataOk) return false;
  return true;
}

// ───────────────────────────── memsys-flash: NAND blocks, FTL, garbage collection ─────────────────────────────

export interface FlashProps {
  /** Number of logical pages, named L0, L1, ... (default 6). */
  logical?: number;
  /** Start with every logical page written once (counters at zero). Default true. */
  prefill?: boolean;
  blocksN?: number;
  pagesPerBlock?: number;
}

export interface FlashState {
  hostWrites: number;
  nandWrites: number;
  gcCopies: number;
  erases: number;
  /** nandWrites / hostWrites, or 0 before the first host write. */
  wa: number;
  maxErase: number;
  minErase: number;
}

function flashState(s: FlashSim): FlashState {
  return { hostWrites: s.hostWrites, nandWrites: s.nandWrites, gcCopies: s.gcCopies, erases: s.erases, wa: writeAmp(s), maxErase: Math.max(...s.erase), minErase: Math.min(...s.erase) };
}

function describeFlash(i: FlashWriteInfo): string {
  const parts: string[] = [];
  for (const g of i.gc) {
    parts.push(
      g.copied.length
        ? `No free block left to write into, so the drive garbage-collected block ${g.victim}: it copied ${g.copied.length} still-valid page${g.copied.length > 1 ? "s" : ""} (${g.copied.map((l) => `L${l}`).join(", ")}) and erased the block. Those copies are extra flash writes the host never asked for.`
        : `No free block left to write into, so the drive garbage-collected block ${g.victim}: every page in it was stale, so it just erased the block. No copies were needed.`,
    );
  }
  parts.push(
    i.oldBlock >= 0
      ? `Wrote L${i.l} into block ${i.block}. Its old copy in block ${i.oldBlock} is now stale: flash cannot overwrite a page in place.`
      : `Wrote L${i.l} into block ${i.block}. It had no earlier copy.`,
  );
  return parts.join(" ");
}

export function Flash({ props, onChange, revealed }: WidgetProps<FlashProps>) {
  const make = () =>
    props.prefill === false ? freshFlash(props.logical ?? 6, props.blocksN ?? 4, props.pagesPerBlock ?? 4) : prefilledFlash(props.logical ?? 6, props.blocksN ?? 4, props.pagesPerBlock ?? 4);
  const [sim, setSim] = useState<FlashSim>(make);
  const [info, setInfo] = useState<FlashWriteInfo | null>(null);
  const locked = Boolean(revealed);

  const write = (l: number) => {
    if (locked) return;
    const r = flashWrite(sim, l);
    setSim(r.sim);
    setInfo(r.info);
    onChange?.(flashState(r.sim));
  };
  const reset = () => {
    if (locked) return;
    const s = make();
    setSim(s);
    setInfo(null);
    onChange?.(flashState(s));
  };

  const wa = writeAmp(sim);
  const msg = info
    ? describeFlash(info)
    : "Flash can write a free page, but it cannot overwrite a page in place: it must erase a whole block first. Tap a Write button.";

  return (
    <div className="w-full">
      <Caption className="mb-1.5">Host writes · tap a logical page to rewrite it</Caption>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: sim.logical }, (_, l) => (
          <Btn key={l} onClick={() => write(l)} disabled={locked}>
            Write L{l}
          </Btn>
        ))}
      </div>

      <Caption className="mb-1.5 mt-3">Flash · {sim.blocksN} blocks × {sim.pagesPerBlock} pages</Caption>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: sim.blocksN }, (_, b) => (
          <div key={b} className={`rounded-xl border p-2 text-ink ${sim.open === b ? "border-[var(--brand)] bg-tint" : "border-line bg-surface-2"}`}>
            <p className="text-[0.8rem] font-semibold">
              Block {b}
              {sim.open === b ? " · open" : ""}
            </p>
            <p className="text-[0.75rem] text-ink-2">
              erased {sim.erase[b]}× · {validIn(sim, b)} valid
            </p>
            <div className="mt-1.5 grid grid-cols-2 gap-1">
              {sim.pages.slice(b * sim.pagesPerBlock, (b + 1) * sim.pagesPerBlock).map((p, k) =>
                p.st === "free" ? (
                  <span key={k} className="grid min-h-10 place-items-center rounded-md border border-dashed border-[var(--line-strong)] bg-surface font-mono text-[0.75rem] text-ink-2">
                    free
                  </span>
                ) : p.st === "valid" ? (
                  <span key={k} className="grid min-h-10 place-items-center rounded-md border border-transparent bg-primary font-mono text-[0.85rem] font-semibold text-primary-ink">
                    L{p.l}
                  </span>
                ) : (
                  <span key={k} className="grid min-h-10 place-items-center rounded-md border border-line bg-surface font-mono text-[0.85rem] leading-tight text-ink-2">
                    <s>L{p.l}</s>
                    <span className="text-[0.7rem]">stale</span>
                  </span>
                ),
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Note tone={info && info.gc.length ? "accent" : "plain"}>{msg}</Note>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Host writes" value={sim.hostWrites} />
        <Readout label="Flash writes" value={sim.nandWrites} />
        <Readout label="Write amplification" value={sim.hostWrites > 0 ? wa.toFixed(2) : "–"} accent={wa > 1} />
        <Readout label="GC copies" value={sim.gcCopies} />
        <Readout label="Erases" value={sim.erases} />
      </div>

      <div className="mt-3 flex justify-center">
        <Btn onClick={reset} disabled={locked}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Btn>
      </div>
      <p className="mt-2 text-center text-[11px] text-ink-3">Toy SSD: 4 blocks of 4 pages. Real drives have blocks of hundreds of pages and several MiB, and spare blocks the host never sees.</p>
    </div>
  );
}

/** goal: { minHost, minGcCopies, minErases, maxWa, minWa } */
export function checkFlash(state: unknown, goal: Record<string, unknown>) {
  const s = state as FlashState | undefined;
  if (!s) return false;
  if (typeof goal.minHost === "number" && s.hostWrites < goal.minHost) return false;
  if (typeof goal.minGcCopies === "number" && s.gcCopies < goal.minGcCopies) return false;
  if (typeof goal.minErases === "number" && s.erases < goal.minErases) return false;
  if (typeof goal.maxWa === "number" && !(s.hostWrites > 0 && s.wa <= goal.maxWa)) return false;
  if (typeof goal.minWa === "number" && s.wa < goal.minWa) return false;
  return true;
}
