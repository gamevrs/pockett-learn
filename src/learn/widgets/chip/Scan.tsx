"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Note, Readout, Seg, Toy } from "../semi/ui";
import { ALL_FAULTS, NETS, captureOf, expectedResponse, faultCoverage, faultFromSeed, observedResponse, patternStr, suggestPattern, type Fault, type NetId } from "./scan-model.ts";

export { checkScan } from "./scan-model.ts";

// ───────────── chip-scan: shift a pattern in, capture, shift out, find the stuck net ─────────────

export interface ScanProps {
  /** The hidden stuck-at fault. goal.fault wins when the step has one. Default: picked from `seed`. */
  fault?: Fault;
  seed?: number;
  title?: string;
}

export interface ScanState {
  patternsApplied: number;
  /** Patterns whose shifted-out response differed from the fault-free one. */
  mismatches: number;
  guessed?: string;
  guessedValue?: 0 | 1;
  correct?: boolean;
}

type Phase = "idle" | "shifting" | "loaded" | "captured" | "done";
interface Anim {
  kind: "in" | "out";
  step: number;
  seq: number[];
  out: number[];
}
interface Row {
  pattern: number;
  observed: string;
}

const GATES: { net: NetId; eq: string }[] = [
  { net: "n1", eq: "Q0 AND Q1" },
  { net: "n2", eq: "Q2 XOR Q3" },
  { net: "n3", eq: "n1 OR n2" },
  { net: "n4", eq: "NOT (Q1 AND Q2)" },
  { net: "n5", eq: "n1 XOR n4" },
  { net: "n6", eq: "n2 AND n4" },
];
const shift = (q: number[], bit: number) => [bit, q[0], q[1], q[2]];
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const bitsToNum = (b: number[]) => parseInt(b.join(""), 2);
const numToBits = (p: number) => [(p >> 3) & 1, (p >> 2) & 1, (p >> 1) & 1, p & 1];
const validFault = (f: unknown): f is Fault => {
  const x = f as Fault | undefined;
  return !!x && (NETS as readonly string[]).includes(x.net) && (x.value === 0 || x.value === 1);
};

export function Scan({ props, onChange, goal, status }: WidgetProps<ScanProps>) {
  const fault: Fault = validFault(goal?.fault) ? goal.fault : validFault(props.fault) ? props.fault : faultFromSeed(props.seed ?? 1);
  const [pattern, setPattern] = useState<number[]>([1, 1, 1, 1]);
  const [q, setQ] = useState<number[]>([0, 0, 0, 0]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [anim, setAnim] = useState<Anim | null>(null);
  const [loaded, setLoaded] = useState<number>(15);
  const [history, setHistory] = useState<Row[]>([]);
  const [mismatches, setMismatches] = useState(0);
  const [pickNet, setPickNet] = useState<NetId>("n1");
  const [pickVal, setPickVal] = useState<0 | 1>(0);
  const [guess, setGuess] = useState<{ net: NetId; value: 0 | 1 } | null>(null);
  const [note, setNote] = useState("");

  const state = useMemo<ScanState>(
    () => ({ patternsApplied: history.length, mismatches, ...(guess ? { guessed: guess.net, guessedValue: guess.value, correct: guess.net === fault.net && guess.value === fault.value } : {}) }),
    [history.length, mismatches, guess, fault.net, fault.value]
  );
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  useEffect(() => {
    cb.current?.(state);
  }, [state]);

  const busy = anim !== null;
  const exp = expectedResponse(loaded);

  const finishOut = (observed: string) => {
    setHistory((h) => [...h, { pattern: loaded, observed }]);
    if (observed !== exp) setMismatches((m) => m + 1);
    setQ([0, 0, 0, 0]);
    setAnim(null);
    setPhase("done");
    setNote(observed === exp ? `Shifted out ${observed}, the same as the fault-free circuit gives. This pattern does not expose the fault (try another).` : `Shifted out ${observed} but a healthy chip gives ${exp}: mismatch. Something in the logic is stuck.`);
  };

  // one clock per tick while animating
  useEffect(() => {
    if (!anim) return;
    const t = setTimeout(() => {
      if (anim.kind === "in") {
        setQ(shift(q, anim.seq[anim.step]));
        if (anim.step + 1 >= 4) {
          setAnim(null);
          setPhase("loaded");
          setNote(`Four clocks with SE = 1 loaded ${patternStr(numToBits(loaded))} into the flops.`);
        } else setAnim({ ...anim, step: anim.step + 1 });
      } else {
        const out = [...anim.out, q[3]];
        setQ(shift(q, 0));
        if (out.length >= 4) finishOut(patternStr([...out].reverse()));
        else setAnim({ ...anim, step: anim.step + 1, out });
      }
    }, 420);
    return () => clearTimeout(t);
    // finishOut closes over loaded/exp, which cannot change while animating
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim, q]);

  const shiftIn = () => {
    const p = bitsToNum(pattern);
    setLoaded(p);
    setPhase("shifting");
    if (reduced()) {
      setQ([...pattern]);
      setPhase("loaded");
      setNote(`Loaded ${patternStr(pattern)} into the flops (SE = 1).`);
    } else {
      setQ([0, 0, 0, 0]);
      setAnim({ kind: "in", step: 0, seq: [pattern[3], pattern[2], pattern[1], pattern[0]], out: [] });
    }
  };
  const capture = () => {
    setQ(captureOf(q, fault));
    setPhase("captured");
    setNote("One functional clock with SE = 0: every flop took the value from the logic instead of from its neighbour.");
  };
  const shiftOut = () => {
    setPhase("shifting");
    if (reduced()) {
      finishOut(patternStr(q));
    } else setAnim({ kind: "out", step: 0, seq: [], out: [] });
  };
  const applyAll = () => {
    const p = bitsToNum(pattern);
    const obs = observedResponse(p, fault);
    setLoaded(p);
    setHistory((h) => [...h, { pattern: p, observed: obs }]);
    const e = expectedResponse(p);
    if (obs !== e) setMismatches((m) => m + 1);
    setQ([0, 0, 0, 0]);
    setPhase("done");
    setNote(obs === e ? `Shifted out ${obs}: same as a healthy chip.` : `Shifted out ${obs}, a healthy chip gives ${e}: mismatch.`);
  };

  const cov = faultCoverage(history.map((h) => h.pattern));
  const last = history.length > 0;
  const guessRight = guess ? guess.net === fault.net && guess.value === fault.value : false;
  const candidates = useMemo(() => ALL_FAULTS.filter((f) => history.every((h) => observedResponse(h.pattern, f) === h.observed)), [history]);
  const se = phase === "captured" ? 0 : 1;

  return (
    <div className="w-full" data-widget>
      {props.title && <Caption className="mb-1.5">{props.title}</Caption>}
      <p className="text-[0.88rem] leading-snug text-ink-2">
        A tiny chip: four flip-flops that can be chained into one long shift register (the scan chain), feeding some logic whose results are captured back into the flops. One internal net may be stuck at 0 or 1. You cannot probe inside; you can only shift patterns in and shift results out.
      </p>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2.5">
        <div className="flex items-stretch gap-1" role="group" aria-label={`The scan chain: flip-flops Q0 to Q3 currently hold ${patternStr(q)}`}>
          <span className="flex shrink-0 items-center text-[0.72rem] font-medium text-ink-3">SI→</span>
          {q.map((v, i) => (
            <React.Fragment key={i}>
              <div className={`flex min-w-0 flex-1 flex-col items-center rounded-lg border px-1 py-1.5 ${busy ? "border-[var(--brand)] bg-tint" : "border-line bg-surface-2"}`}>
                <span className="text-[0.7rem] text-ink-3">FF{i} · Q{i}</span>
                <span className="font-mono text-xl font-bold tabular-nums text-ink">{v}</span>
              </div>
              {i < 3 && <span className="flex shrink-0 items-center text-ink-3" aria-hidden>→</span>}
            </React.Fragment>
          ))}
          <span className="flex shrink-0 items-center text-[0.72rem] font-medium text-ink-3">→SO</span>
        </div>
        <p className="mt-2 text-center text-xs text-ink-2">
          Scan enable <span className="font-mono font-semibold text-ink">SE = {se}</span> ({se === 1 ? "each flop copies its neighbour: shifting" : "each flop copies the logic: capture"}). A 2-way mux in front of each flop picks between the two.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3" aria-label="The logic between the flops">
          {GATES.map((g) => (
            <div key={g.net} className="rounded-lg border border-line bg-surface-2 px-2 py-1 text-[0.78rem] leading-snug">
              <span className="font-mono font-bold text-ink">{g.net}</span> <span className="text-ink-2">= {g.eq}</span>
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-ink-3">The flops capture D0 = n3, D1 = n4, D2 = n5, D3 = n6 (Q0 to Q3 in that order).</p>
      </div>

      <div className="mt-3 flex flex-col items-center gap-2">
        <Caption>1 · Choose a pattern for Q0 Q1 Q2 Q3</Caption>
        <div className="flex flex-wrap justify-center gap-1.5" role="group" aria-label="Pattern bits">
          {pattern.map((b, i) => (
            <button
              key={i}
              type="button"
              disabled={busy}
              aria-pressed={b === 1}
              aria-label={`Bit Q${i} is ${b}. Tap to flip.`}
              onClick={() => setPattern(pattern.map((x, j) => (j === i ? 1 - x : x)))}
              className={`min-h-10 min-w-12 rounded-xl border font-mono text-lg font-bold tabular-nums disabled:opacity-45 ${b ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink"}`}
            >
              {b}
            </button>
          ))}
        </div>
        <Caption>2 · Apply it</Caption>
        <div className="flex flex-wrap justify-center gap-2">
          <Btn disabled={busy} primary={phase === "idle" || phase === "done"} onClick={shiftIn}>
            Shift in
          </Btn>
          <Btn disabled={busy || phase !== "loaded"} primary={phase === "loaded"} onClick={capture}>
            Capture
          </Btn>
          <Btn disabled={busy || phase !== "captured"} primary={phase === "captured"} onClick={shiftOut}>
            Shift out
          </Btn>
          <Btn disabled={busy} onClick={applyAll}>
            Apply all three
          </Btn>
          <Btn disabled={busy} onClick={() => setPattern(numToBits(suggestPattern(history)))}>
            ATPG: suggest a pattern
          </Btn>
        </div>
      </div>

      <div className="mt-3">
        <Note tone={note.includes("mismatch") ? "accent" : "plain"}>{note || "Pick a pattern, then Shift in, Capture, Shift out (or Apply all three). The shifted-out bits are your only view of the logic."}</Note>
      </div>

      {history.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-line text-[0.86rem]">
          <div className="grid grid-cols-[1fr_1fr_1fr_1.1fr] bg-surface-2 px-3 py-1.5 text-xs text-ink-3">
            <span>Pattern</span>
            <span>Healthy</span>
            <span>Observed</span>
            <span className="text-right">Result</span>
          </div>
          {history.slice(-6).map((h, i) => {
            const e = expectedResponse(h.pattern);
            return (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1.1fr] px-3 py-1.5 font-mono tabular-nums text-ink">
                <span>{patternStr(numToBits(h.pattern))}</span>
                <span>{e}</span>
                <span>{h.observed}</span>
                <span className={`text-right font-sans font-semibold ${h.observed === e ? "text-ink-2" : "text-[color-mix(in_srgb,var(--bad)_70%,var(--ink))]"}`}>{h.observed === e ? "match" : "MISMATCH"}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Patterns applied" value={history.length} />
        <Readout label="Mismatches" value={mismatches} accent={mismatches > 0} />
        <Readout label="Fault coverage so far" value={`${cov.detected} of ${cov.total} (${Math.round((cov.detected / cov.total) * 100)} %)`} />
      </div>
      {last && (
        <details className="mt-3 rounded-xl border border-line bg-surface">
          <summary className="flex min-h-10 cursor-pointer items-center px-3 text-sm font-medium text-ink">What your results rule out</summary>
          <p className="px-3 pb-3 pt-1 text-[0.86rem] leading-snug text-ink-2">
            {candidates.length} of the {ALL_FAULTS.length} possible single stuck-at faults (6 nets × stuck at 0 or 1) still explain every result so far{candidates.length <= 4 ? `: ${candidates.map((f) => `${f.net} stuck at ${f.value}`).join(", ")}` : ""}. A pattern generator (ATPG) picks patterns that split this list as fast as possible.
          </p>
        </details>
      )}

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <Caption className="mb-2">3 · Which net is stuck?</Caption>
        <div className="flex flex-col items-center gap-2">
          <Seg label="Net" value={pickNet} onChange={setPickNet} options={NETS.map((n) => ({ value: n, label: n }))} />
          <Seg
            label="Stuck value"
            value={pickVal}
            onChange={setPickVal}
            options={[
              { value: 0, label: "stuck-at-0" },
              { value: 1, label: "stuck-at-1" },
            ]}
          />
          <Btn primary onClick={() => setGuess({ net: pickNet, value: pickVal })}>
            Check my guess
          </Btn>
        </div>
        {guess && (
          <div className="mt-2">
            <Note tone={guessRight ? "accent" : "plain"}>
              {guessRight
                ? history.length > 0
                  ? `Yes: ${fault.net} is stuck at ${fault.value}.`
                  : `That is the fault, but you have not applied any pattern yet: apply one to see how it shows up.`
                : `Not ${guess.net} stuck at ${guess.value}. Check which faults still explain your results, and try a pattern that tells them apart.`}
            </Note>
          </div>
        )}
        {status === "revealed" && !guessRight && (
          <p className="mt-2 text-sm text-ink-2">
            The fault was {fault.net} stuck at {fault.value}.
          </p>
        )}
      </div>

      <details className="mt-3 rounded-xl border border-line bg-surface">
        <summary className="flex min-h-10 cursor-pointer items-center px-3 text-sm font-medium text-ink">ATPG, fault coverage and BIST</summary>
        <div className="flex flex-col gap-2 px-3 pb-3 pt-1 text-[0.86rem] leading-snug text-ink-2">
          <p>
            <strong className="text-ink">ATPG</strong> (automatic test pattern generation) is software that picks patterns so that each modelled fault, such as a net stuck at 0 or 1, produces a different response from a healthy chip. The &quot;ATPG&quot; button here does it for this toy.
          </p>
          <p>
            <strong className="text-ink">Fault coverage</strong> is the share of modelled faults that the pattern set exposes. Here 12 faults (6 nets × 2 values) are covered completely by only 3 well-chosen patterns, but a real chip has millions of faults and production test sets target 95 % or more of them.
          </p>
          <p>
            <strong className="text-ink">BIST</strong> (built-in self-test) puts the tester on the chip: a pattern generator such as an LFSR (linear-feedback shift register) feeds the logic, and a signature compressor squeezes the responses into a short number that is compared with the expected one. Memory BIST for SRAMs is the common example, since memories are too big and regular for scan alone.
          </p>
        </div>
      </details>
      <Toy>
        Toy scan chain: one stuck-at fault on one internal net, four flops and six gates. Real designs have millions of flops split into many chains, scan compression, and fault models beyond stuck-at (delay faults, bridging); scan muxes also cost a little area and delay.
      </Toy>
    </div>
  );
}
