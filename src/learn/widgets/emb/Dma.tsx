"use client";

import React, { useId, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { BLUE, Btn, Caption, Note, Readout, Seg, Slider, ToyNote, fmtSec } from "./ui";
import { cacheStart, cacheStep, doubleBuffer, moveCost, type CacheAction, type CacheState, type MoveMethod } from "./sim";

/** Locks every control inside it (the lesson was answered). A fieldset disables all its buttons and inputs. */
function Lock({ locked, children, className = "" }: { locked: boolean; children: React.ReactNode; className?: string }) {
  return (
    <fieldset disabled={locked} className={`m-0 min-w-0 border-0 p-0 ${locked ? "opacity-70" : ""} ${className}`}>
      {children}
    </fieldset>
  );
}

const pct = (x: number) => {
  const p = x * 100;
  return p >= 10 || p === 0 ? `${Math.round(p)}%` : `${p.toFixed(1)}%`;
};

// ───────────────────────────── emb-dma: who moves the samples? ─────────────────────────────

const METHODS: { value: MoveMethod; label: string }[] = [
  { value: "poll", label: "CPU polls" },
  { value: "irq", label: "Interrupt per sample" },
  { value: "dma", label: "DMA" },
];
const RATES = [
  { value: 1_000, label: "1 kHz" },
  { value: 10_000, label: "10 kHz" },
  { value: 100_000, label: "100 kHz" },
  { value: 500_000, label: "500 kHz" },
  { value: 1_000_000, label: "1 MHz" },
];
const BUFFERS = [
  { value: 64, label: "64" },
  { value: 256, label: "256" },
  { value: 1024, label: "1024" },
];

export interface DmaProps {
  method?: MoveMethod;
  rateHz?: number;
  buffer?: number;
  clockHz?: number;
  task?: string;
}

export interface DmaState {
  method: MoveMethod;
  rateHz: number;
  buffer: number;
  /** Share of CPU time spent moving samples, 0..1 (polling is 1). */
  cpuLoad: number;
  overloaded: boolean;
}

export function Dma({ props, onChange, revealed }: WidgetProps<DmaProps>) {
  const clockHz = props.clockHz ?? 48_000_000;
  const [method, setMethod] = useState<MoveMethod>(props.method ?? "poll");
  const [rateHz, setRateHz] = useState(props.rateHz ?? 100_000);
  const [buffer, setBuffer] = useState(props.buffer ?? 256);
  const locked = Boolean(revealed);

  const report = (m: MoveMethod, r: number, b: number) => {
    const c = moveCost(m, r, clockHz, b);
    onChange?.({ method: m, rateHz: r, buffer: b, cpuLoad: c.cpuLoad, overloaded: c.overloaded } satisfies DmaState);
  };
  const pickMethod = (m: MoveMethod) => {
    setMethod(m);
    report(m, rateHz, buffer);
  };
  const pickRate = (r: number) => {
    setRateHz(r);
    report(method, r, buffer);
  };
  const pickBuffer = (b: number) => {
    setBuffer(b);
    report(method, rateHz, b);
  };

  const cost = moveCost(method, rateHz, clockHz, buffer);
  const cyclesBetween = clockHz / rateHz;
  const needed = method === "poll" ? 1 : (cost.cyclesPerSample * rateHz) / clockHz;
  const load = cost.cpuLoad;
  const free = 1 - load;

  // The 1 ms strip.
  const X0 = 12;
  const W = 336;
  const marks: number[] = [];
  let strip = "";
  if (method === "irq") {
    const total = Math.round(rateHz / 1000);
    const n = Math.min(total, 100);
    for (let i = 0; i < n; i++) marks.push((i + 0.5) / n);
    strip = total > n ? `Each sliver is an interrupt (drawn ${n} of ${total} in this millisecond).` : `Each sliver is an interrupt (${total} in this millisecond).`;
  } else if (method === "dma") {
    const halfMs = (buffer / 2 / rateHz) * 1000;
    for (let k = 1; k * halfMs <= 1 + 1e-9; k++) marks.push(Math.min(k * halfMs, 0.995));
    strip = marks.length
      ? `Each sliver is a DMA interrupt (half buffer or whole buffer): ${marks.length} in this millisecond.`
      : `No DMA interrupt in this millisecond: a half buffer takes ${fmtSec(halfMs / 1000)} to fill, and the CPU is free all that time.`;
  } else {
    strip = "The CPU sits in a loop reading the peripheral, so the whole time is spent waiting for samples.";
  }
  const barColor = cost.overloaded ? "var(--bad)" : "var(--brand)";
  const label = `One millisecond of CPU time with ${METHODS.find((m) => m.value === method)!.label} at ${RATES.find((r) => r.value === rateHz)?.label ?? `${rateHz} Hz`}: the CPU is busy moving data ${pct(load)} of the time.`;

  return (
    <div className="w-full">
      {props.task && <p className="mb-2 text-[0.9rem] text-ink">{props.task}</p>}
      <Lock locked={locked}>
        <div className="flex flex-col gap-2.5">
          <div>
            <Caption className="mb-1">Method</Caption>
            <Seg options={METHODS} value={method} onChange={pickMethod} label="Method" />
          </div>
          <div>
            <Caption className="mb-1">Sample rate</Caption>
            <Seg options={RATES} value={rateHz} onChange={pickRate} label="Sample rate" />
          </div>
          {method === "dma" && (
            <div>
              <Caption className="mb-1">DMA buffer (samples)</Caption>
              <Seg options={BUFFERS} value={buffer} onChange={pickBuffer} label="DMA buffer in samples" />
            </div>
          )}
        </div>
      </Lock>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <Caption className="mb-1.5">CPU time at {clockHz / 1e6} MHz</Caption>
        <div className="flex h-5 w-full overflow-hidden rounded-full bg-[var(--line-strong)]" role="img" aria-label={`CPU time: ${pct(load)} moving data, ${pct(free)} free for your code`}>
          <div className="h-full transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${load * 100}%`, background: barColor }} />
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.82rem] text-ink-2">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: barColor }} />
            moving samples
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--line-strong)]" />
            free for your code
          </li>
        </ul>

        <svg viewBox="0 0 360 74" className="mt-2 w-full" role="img" aria-label={label}>
          <text x={X0} y={16} fontSize={14} fill="var(--ink-2)">
            1 ms of CPU time (not to scale)
          </text>
          <rect x={X0} y={24} width={W} height={26} rx={4} fill="var(--surface-2)" stroke="var(--line-strong)" />
          {method === "poll" && <rect x={X0} y={24} width={W} height={26} rx={4} fill={barColor} opacity={0.85} />}
          {method !== "poll" &&
            marks.map((m, i) => (
              <rect key={i} x={(X0 + m * W - 1.25).toFixed(1)} y={24} width={2.5} height={26} fill={barColor} />
            ))}
          <text x={X0} y={70} fontSize={14} fill="var(--ink-3)">
            0
          </text>
          <text x={X0 + W} y={70} fontSize={14} textAnchor="end" fill="var(--ink-3)">
            1 ms
          </text>
        </svg>
        <p className="mt-1 text-[0.82rem] text-ink-2">{strip}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="CPU busy moving data" value={pct(load)} accent />
        <Readout label="Free for your code" value={pct(free)} />
        <Readout label="Cycles per sample" value={method === "poll" ? "all of them: it waits" : `${+cost.cyclesPerSample.toFixed(2)} (every ${+cyclesBetween.toFixed(1)})`} />
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {cost.overloaded && (
          <p className="rounded-xl border border-[var(--bad)] bg-surface px-3.5 py-2.5 text-[0.88rem] leading-snug text-[var(--bad)]" role="alert">
            {method === "poll"
              ? `Can't keep up: a sample arrives every ${+cyclesBetween.toFixed(1)} cycles, too soon to read them one by one; samples get lost.`
              : `Can't keep up: the CPU would need ${Math.round(needed * 100)}% of its time; samples get lost.`}
          </p>
        )}
        <Note>DMA copies each sample from the peripheral to RAM over the bus by itself and interrupts only when half the buffer is full and when all of it is.</Note>
      </div>
      <ToyNote>Toy costs: 60 cycles per interrupt, 100 per DMA block interrupt; DMA also shares the bus with the CPU, ignored here.</ToyNote>
    </div>
  );
}

/** goal: { method, minRate, maxLoad (0..1), overloaded } */
export function checkDma(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as DmaState | undefined;
  if (!s) return false;
  if (typeof goal.method === "string" && s.method !== goal.method) return false;
  if (typeof goal.minRate === "number" && s.rateHz < goal.minRate) return false;
  if (typeof goal.maxLoad === "number" && s.cpuLoad > goal.maxLoad + 1e-12) return false;
  if (typeof goal.overloaded === "boolean" && s.overloaded !== goal.overloaded) return false;
  return true;
}

// ───────────────────────────── emb-dbuf: single vs double buffering ─────────────────────────────

const HALVES = [64, 128, 256, 512].map((n) => ({ value: n, label: String(n) }));
const MODES = [
  { value: "single" as const, label: "Single" },
  { value: "double" as const, label: "Double (ping-pong)" },
];

export interface DBufProps {
  mode?: "single" | "double";
  halfSamples?: number;
  processMs?: number;
  rateHz?: number;
  task?: string;
}

export interface DBufState {
  mode: "single" | "double";
  halfSamples: number;
  processMs: number;
  fillMs: number;
  ok: boolean;
  lostPerBlock: number;
}

export function DBuf({ props, onChange, revealed }: WidgetProps<DBufProps>) {
  const rateHz = props.rateHz ?? 48_000;
  const [mode, setMode] = useState<"single" | "double">(props.mode ?? "single");
  const [half, setHalf] = useState(props.halfSamples ?? 256);
  const [proc, setProc] = useState(props.processMs ?? 2);
  const hatchId = useId().replace(/:/g, "");
  const locked = Boolean(revealed);

  const report = (m: "single" | "double", h: number, p: number) => {
    const r = doubleBuffer(m, h, rateHz, p);
    onChange?.({ mode: m, halfSamples: h, processMs: p, fillMs: r.fillMs, ok: r.ok, lostPerBlock: r.lostPerBlock } satisfies DBufState);
  };

  const r = doubleBuffer(mode, half, rateHz, proc);
  const endMs = Math.max(...r.events.map((e) => e.end));
  const X0 = 10;
  const W = 340;
  const xOf = (t: number) => +(X0 + (t / endMs) * W).toFixed(1);
  const dma = r.events.filter((e) => e.lane === "dma");
  const cpu = r.events.filter((e) => e.lane === "cpu");
  const lateBy = Math.max(0, proc - r.fillMs);
  const verdict = mode === "single" ? "Misses samples" : r.ok ? "Keeps up" : `Too slow by ${+lateBy.toFixed(2)} ms per block`;
  const verdictBad = mode === "single" || !r.ok;

  const bar = (e: (typeof r.events)[number], y: number, key: string, color: string, text: string) => {
    const x = xOf(e.start);
    const w = Math.max(+(xOf(e.end) - x).toFixed(1), 1);
    return (
      <g key={key}>
        <rect x={x} y={y} width={w} height={28} rx={3} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={2} />
        {w >= 20 && (
          <text x={(x + w / 2).toFixed(1)} y={y + 19} fontSize={14} fontWeight={600} textAnchor="middle" fill="var(--ink)">
            {text}
          </text>
        )}
      </g>
    );
  };

  const aria =
    mode === "single"
      ? `Single buffer: DMA fills for ${fmtSec(r.fillMs / 1000)}, then stops while the CPU processes for ${fmtSec(proc / 1000)}. About ${r.lostPerBlock} samples are missed per block.`
      : `Double buffer: DMA fills a half in ${fmtSec(r.fillMs / 1000)} while the CPU processes the other half in ${fmtSec(proc / 1000)}. ${r.ok ? "The CPU keeps up." : `The CPU is late by ${+lateBy.toFixed(2)} ms per block, about ${r.lostPerBlock} samples overwritten.`}`;

  return (
    <div className="w-full">
      {props.task && <p className="mb-2 text-[0.9rem] text-ink">{props.task}</p>}
      <Lock locked={locked}>
        <div className="flex flex-col gap-2.5">
          <div>
            <Caption className="mb-1">Mode</Caption>
            <Seg
              options={MODES}
              value={mode}
              onChange={(v) => {
                setMode(v);
                report(v, half, proc);
              }}
              label="Buffer mode"
            />
          </div>
          <div>
            <Caption className="mb-1">Samples per half buffer</Caption>
            <Seg
              options={HALVES}
              value={half}
              onChange={(v) => {
                setHalf(v);
                report(mode, v, proc);
              }}
              label="Samples per half buffer"
            />
          </div>
          <Slider
            label="CPU processing time per block"
            value={proc}
            min={0.5}
            max={8}
            step={0.25}
            onChange={(v) => {
              setProc(v);
              report(mode, half, v);
            }}
            format={(v) => `${v.toFixed(2)} ms`}
          />
        </div>
      </Lock>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <svg viewBox="0 0 360 168" className="w-full" role="img" aria-label={aria}>
          <defs>
            <pattern id={hatchId} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width={6} height={6} fill="var(--surface-2)" />
              <line x1={0} y1={0} x2={0} y2={6} stroke="var(--bad)" strokeWidth={2} />
            </pattern>
          </defs>
          <text x={X0} y={16} fontSize={14} fill="var(--ink-2)">
            DMA fills ({mode === "double" ? "A / B" : "one buffer"})
          </text>
          {mode === "single" &&
            dma.slice(0, -1).map((e, i) => <rect key={`g${i}`} x={xOf(e.end)} y={22} width={Math.max(+(xOf(dma[i + 1].start) - xOf(e.end)).toFixed(1), 1)} height={28} fill={`url(#${hatchId})`} stroke="var(--bad)" strokeWidth={1} />)}
          {dma.map((e, i) => bar(e, 22, `d${i}`, mode === "double" && e.half === 1 ? BLUE : "var(--brand)", mode === "double" ? (e.half === 0 ? "A" : "B") : "buf"))}
          <text x={X0} y={78} fontSize={14} fill="var(--ink-2)">
            CPU processes
          </text>
          {cpu.map((e, i) => bar(e, 84, `c${i}`, e.bad ? "var(--bad)" : mode === "double" && e.half === 1 ? BLUE : "var(--brand)", mode === "double" ? (e.half === 0 ? "A" : "B") : "buf"))}
          {mode === "double" && !r.ok && (
            <text x={X0} y={134} fontSize={14} fill="var(--bad)">
              late: DMA is already overwriting it
            </text>
          )}
          {mode === "single" && (
            <text x={X0} y={134} fontSize={14} fill="var(--bad)">
              hatched: DMA stopped, samples missed
            </text>
          )}
          <text x={X0} y={160} fontSize={14} fill="var(--ink-3)">
            0
          </text>
          <text x={X0 + W} y={160} fontSize={14} textAnchor="end" fill="var(--ink-3)">
            {fmtSec(endMs / 1000)}
          </text>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Fill time per block" value={fmtSec(r.fillMs / 1000)} />
        <Readout label="Processing" value={fmtSec(proc / 1000)} />
        <Readout label="Verdict" value={<span className={verdictBad ? "text-[var(--bad)]" : ""}>{verdict}</span>} accent />
        <Readout label="Samples lost per block" value={r.lostPerBlock} />
      </div>

      <div className="mt-3">
        <Note>In circular mode the DMA wraps to the start by itself; the half-transfer and transfer-complete interrupts tell the CPU which half is ready.</Note>
      </div>
      <ToyNote>Toy timing: interrupt and start-up costs ignored.</ToyNote>
    </div>
  );
}

/** goal: { mode, ok, minProcessMs, maxHalf } */
export function checkDBuf(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as DBufState | undefined;
  if (!s) return false;
  if (typeof goal.mode === "string" && s.mode !== goal.mode) return false;
  if (typeof goal.ok === "boolean" && s.ok !== goal.ok) return false;
  if (typeof goal.minProcessMs === "number" && s.processMs < goal.minProcessMs) return false;
  if (typeof goal.maxHalf === "number" && s.halfSamples > goal.maxHalf) return false;
  return true;
}

// ───────────────────────────── emb-cache: DMA and the data cache ─────────────────────────────

export interface CacheProps {
  scenario?: "tx" | "rx";
  lockScenario?: boolean;
  task?: string;
}

export interface CacheWidgetState {
  scenario: "tx" | "rx";
  sent: string | null;
  read: string | null;
  correct: boolean;
  actions: string[];
}

const SCENARIOS = [
  { value: "tx" as const, label: "Send (TX)" },
  { value: "rx" as const, label: "Receive (RX)" },
];

function Tile({ title, children, tone = "plain" }: { title: string; children: React.ReactNode; tone?: "plain" | "bad" }) {
  return (
    <div className={`rounded-xl border bg-surface-2 px-3 py-2 ${tone === "bad" ? "border-[var(--bad)]" : "border-line"}`}>
      <p className="text-xs text-ink-2">{title}</p>
      <div className="mt-0.5 flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

const Code = ({ children }: { children: React.ReactNode }) => <span className="break-all rounded bg-surface px-1.5 py-0.5 font-mono text-[0.9rem] font-semibold text-ink">{children}</span>;

function Arrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="my-0.5 text-center text-xs text-ink-2">
      <span aria-hidden>↕ </span>
      {children}
    </p>
  );
}

export function Cache({ props, onChange, revealed }: WidgetProps<CacheProps>) {
  const [scenario, setScenario] = useState<"tx" | "rx">(props.scenario ?? "tx");
  const [st, setSt] = useState<CacheState>(cacheStart());
  const [actions, setActions] = useState<string[]>([]);
  const locked = Boolean(revealed);

  const stateOf = (sc: "tx" | "rx", s: CacheState, acts: string[]): CacheWidgetState => ({
    scenario: sc,
    sent: s.sent,
    read: s.read,
    correct: sc === "tx" ? s.sent === "HI!!" : s.read === "OK!!",
    actions: acts,
  });
  const act = (a: CacheAction, payload?: string) => {
    const next = cacheStep(st, a, payload);
    const acts = [...actions, a];
    setSt(next);
    setActions(acts);
    onChange?.(stateOf(scenario, next, acts));
  };
  const reset = (sc: "tx" | "rx") => {
    const s = cacheStart();
    setSt(s);
    setActions([]);
    onChange?.(stateOf(sc, s, []));
  };
  const pickScenario = (sc: "tx" | "rx") => {
    setScenario(sc);
    reset(sc);
  };

  const stale = st.cache !== null && st.cache !== st.ram;
  const tx = scenario === "tx";
  let result: { ok: boolean; text: string } | null = null;
  if (tx && st.sent !== null) result = st.sent === "HI!!" ? { ok: true, text: "UART sent 'HI!!' ✓" } : { ok: false, text: `UART sent '${st.sent}': the old data! The new bytes were still only in the cache.` };
  if (!tx && st.read !== null) result = st.read === "OK!!" ? { ok: true, text: "CPU got 'OK!!' ✓" } : { ok: false, text: `CPU got '${st.read}': a stale cached copy.` };
  const last = st.log.slice(-5);

  return (
    <div className="w-full">
      {props.task && <p className="mb-2 text-[0.9rem] text-ink">{props.task}</p>}
      {!props.lockScenario && (
        <Lock locked={locked} className="mb-3">
          <Seg options={SCENARIOS} value={scenario} onChange={pickScenario} label="Scenario" />
        </Lock>
      )}

      <div className="rounded-xl border border-line bg-surface p-3">
        <Tile title="CPU">
          <span className="text-[0.88rem] text-ink">{tx ? "writes the message into a buffer, then asks DMA to send it" : "wants to read the bytes the DMA received"}</span>
        </Tile>
        <Arrow>reads and writes go through the cache</Arrow>
        <Tile title="Data cache" tone={stale ? "bad" : "plain"}>
          {st.cache === null ? <span className="text-[0.88rem] text-ink-2">empty</span> : <Code>{st.cache}</Code>}
          {st.dirty && <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs text-ink">dirty</span>}
          {stale && <span className="text-xs text-[var(--bad)]">differs from RAM</span>}
        </Tile>
        <Arrow>clean writes back, invalidate drops the copy</Arrow>
        <Tile title="RAM">
          <Code>{st.ram}</Code>
        </Tile>
        <Arrow>DMA reads and writes RAM only</Arrow>
        <Tile title={tx ? "DMA → UART" : "UART → DMA"}>
          <span className="text-[0.88rem] text-ink">{tx ? (st.sent === null ? "nothing sent yet" : `sent '${st.sent}'`) : "bytes arrive from the wire"}</span>
        </Tile>
      </div>

      <Lock locked={locked} className="mt-3">
        <div className="flex flex-wrap gap-2">
          {tx ? (
            <>
              <Btn onClick={() => act("cpu-write", "HI!!")}>CPU writes HI!!</Btn>
              <Btn onClick={() => act("clean")}>Clean cache</Btn>
              <Btn onClick={() => act("invalidate")}>Invalidate cache</Btn>
              <Btn primary onClick={() => act("dma-tx")}>Start DMA → UART</Btn>
            </>
          ) : (
            <>
              <Btn onClick={() => act("dma-rx", "OK!!")}>DMA receives OK!!</Btn>
              <Btn onClick={() => act("invalidate")}>Invalidate cache</Btn>
              <Btn onClick={() => act("clean")}>Clean cache</Btn>
              <Btn primary onClick={() => act("cpu-read")}>CPU reads buffer</Btn>
            </>
          )}
          <Btn onClick={() => reset(scenario)}>Reset</Btn>
        </div>
      </Lock>

      <ul className="mt-3 flex min-h-[3rem] flex-col gap-1 text-[0.85rem] text-ink-2" aria-live="polite" aria-label="What happened">
        {last.length === 0 ? <li className="text-ink-3">Nothing has happened yet. Press a button.</li> : last.map((l, i) => <li key={`${st.log.length}-${i}`}>{l}</li>)}
      </ul>

      {result && (
        <p className={`mt-2 rounded-xl border px-3.5 py-2.5 text-[0.9rem] font-medium leading-snug ${result.ok ? "border-[var(--brand)]/40 bg-tint text-ink" : "border-[var(--bad)] bg-surface text-[var(--bad)]"}`} role="status">
          {result.text}
        </p>
      )}

      <div className="mt-3">
        <Note>Before DMA reads memory the CPU wrote: clean. Before the CPU reads memory DMA wrote: invalidate. (Or put DMA buffers in non-cacheable memory.)</Note>
      </div>
      <ToyNote>Toy write-back cache with one line. Many small MCUs have no data cache, so the trap appears on bigger ones (Cortex-M7 class) and on application processors; some SoCs make DMA coherent in hardware.</ToyNote>
    </div>
  );
}

/** goal: { scenario, correct } */
export function checkCache(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as CacheWidgetState | undefined;
  if (!s) return false;
  if (typeof goal.scenario === "string" && s.scenario !== goal.scenario) return false;
  if (typeof goal.correct === "boolean" && s.correct !== goal.correct) return false;
  return true;
}
