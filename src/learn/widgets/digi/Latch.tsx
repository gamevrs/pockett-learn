"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { BitBtn, Btn, Lamp, Note, Seg, Wave } from "./ui";
import { ffStep, srNext, type Bit, type FfRow, type Q } from "./sim";

type Mode = "sr" | "dlatch" | "dff" | "compare";

export interface LatchProps {
  mode?: Mode;
  /** show a selector between the memory elements */
  pick?: boolean;
}

interface SrRow {
  s: Bit;
  r: Bit;
  q: Q;
  qn: Q;
}

export interface LatchState {
  mode: Mode;
  q: Q;
  qn: Q;
  s: Bit;
  r: Bit;
  d: Bit;
  clk: Bit;
  latch: Q;
  ff: Q;
  /** latch and flip-flop currently disagree */
  differ: boolean;
  forbidden: boolean;
  unknown: boolean;
  /** the latch's output followed D while the clock was high */
  follow: boolean;
  /** D changed while the clock was high and the flip-flop ignored it */
  held: boolean;
  /** the flip-flop captured a new value on a rising edge */
  captured: boolean;
}

const SLOTS = 16;
const trim = <T,>(a: T[]) => a.slice(-SLOTS);

const MODE_NOTE: Record<Mode, string> = {
  sr: "An SR latch is two NOR gates feeding each other. S (set) makes Q = 1, R (reset) makes Q = 0, and with both low it holds the last value: that is the memory. Never raise S and R together.",
  dlatch: "A D latch has one data input. While the enable (here the clock) is 1 it is transparent: Q follows D. When the enable falls, Q freezes at the last value.",
  dff: "An edge-triggered D flip-flop copies D to Q only at the instant the clock rises (0 to 1). At every other time D can change freely and Q does not care.",
  compare: "Same D and same clock, two memories. The latch follows D for as long as the clock is high; the flip-flop looks at D only at the rising edge. Raise the clock, then change D.",
};

/** SR latch, D latch and D flip-flop with a clock you control and a waveform of what just happened. */
export function Latch({ props, onChange }: WidgetProps<LatchProps>) {
  const [mode, setMode] = useState<Mode>(props.mode ?? "sr");
  const [sr, setSr] = useState<SrRow[]>([{ s: 0, r: 0, q: 0, qn: 1 }]);
  const [ff, setFf] = useState<FfRow[]>([{ clk: 0, d: 0, latch: 0, ff: 0 }]);
  const [flags, setFlags] = useState({ forbidden: false, unknown: false, follow: false, held: false, captured: false });

  const lastSr = sr[sr.length - 1];
  const lastFf = ff[ff.length - 1];

  const report = (m: Mode, srRows: SrRow[], ffRows: FfRow[], f: typeof flags) => {
    const a = srRows[srRows.length - 1];
    const b = ffRows[ffRows.length - 1];
    onChange?.({
      mode: m,
      q: m === "sr" ? a.q : m === "dff" ? b.ff : b.latch,
      qn: a.qn,
      s: a.s,
      r: a.r,
      d: b.d,
      clk: b.clk,
      latch: b.latch,
      ff: b.ff,
      differ: b.latch !== b.ff,
      ...f,
    } satisfies LatchState);
  };

  const pushSr = (s: Bit, r: Bit) => {
    const prev = lastSr;
    const n = srNext({ q: prev.q, qn: prev.qn }, prev.s, prev.r, s, r);
    const rows = trim([...sr, { s, r, q: n.q, qn: n.qn }]);
    const f = { ...flags, forbidden: flags.forbidden || (s === 1 && r === 1), unknown: flags.unknown || n.q === "?" };
    setSr(rows);
    setFlags(f);
    report(mode, rows, ff, f);
  };

  const pushFf = (steps: { clk: Bit; d: Bit }[]) => {
    let rows = ff;
    const f = { ...flags };
    for (const st of steps) {
      const prev = rows[rows.length - 1];
      const n = ffStep(prev, st.clk, st.d);
      if (prev.clk === 1 && st.clk === 1 && prev.d !== st.d) {
        if (n.latch === st.d && n.latch !== prev.latch) f.follow = true;
        if (n.ff === prev.ff && n.ff !== st.d) f.held = true;
      }
      if (prev.clk === 0 && st.clk === 1 && n.ff !== prev.ff) f.captured = true;
      rows = trim([...rows, n]);
    }
    setFf(rows);
    setFlags(f);
    report(mode, sr, rows, f);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    const srRows: SrRow[] = [{ s: 0, r: 0, q: 0, qn: 1 }];
    const ffRows: FfRow[] = [{ clk: 0, d: 0, latch: 0, ff: 0 }];
    const f = { forbidden: false, unknown: false, follow: false, held: false, captured: false };
    setSr(srRows);
    setFf(ffRows);
    setFlags(f);
    report(m, srRows, ffRows, f);
  };

  const wave = (vals: (Bit | "?")[]) => vals;
  const signals =
    mode === "sr"
      ? [
          { name: "S", v: wave(sr.map((x) => x.s)) },
          { name: "R", v: wave(sr.map((x) => x.r)) },
          { name: "Q", v: wave(sr.map((x) => x.q)), hot: true },
          { name: "Qn", v: wave(sr.map((x) => x.qn)), hot: false },
        ]
      : [
          { name: "CLK", v: wave(ff.map((x) => x.clk)) },
          { name: "D", v: wave(ff.map((x) => x.d)) },
          ...(mode !== "dff" ? [{ name: "Latch", v: wave(ff.map((x) => x.latch)), hot: true }] : []),
          ...(mode !== "dlatch" ? [{ name: "Flop", v: wave(ff.map((x) => x.ff)), hot: mode === "dff" }] : []),
        ];

  return (
    <div className="w-full" data-widget="digi-latch">
      {props.pick && (
        <div className="mb-2 flex justify-center">
          <Seg
            label="Memory element"
            value={mode}
            onChange={switchMode}
            options={[
              { value: "sr", label: "SR latch" },
              { value: "dlatch", label: "D latch" },
              { value: "dff", label: "D flip-flop" },
              { value: "compare", label: "Compare" },
            ]}
          />
        </div>
      )}

      {mode === "sr" && (
        <div className="mx-auto mb-2 max-w-[26rem] rounded-xl border border-line bg-surface p-1.5">
          <svg viewBox="0 0 360 130" role="img" aria-label="An SR latch: two NOR gates, the output of each feeding an input of the other. S = 1 sets Q and R = 1 resets it." className="block w-full">
            {(() => {
              const c = (v: Q) => (v === 1 ? "var(--brand)" : v === "?" ? "var(--bad)" : "var(--line-strong)");
              const w = (v: Q) => (v === 1 || v === "?" ? 2.6 : 1.6);
              const cs = lastSr.s === 1 ? "var(--brand)" : "var(--line-strong)";
              const cr = lastSr.r === 1 ? "var(--brand)" : "var(--line-strong)";
              return (
                <>
                  <path d="M40 27H128" stroke={cr} strokeWidth={lastSr.r ? 2.6 : 1.6} fill="none" />
                  <path d="M40 109H128" stroke={cs} strokeWidth={lastSr.s ? 2.6 : 1.6} fill="none" />
                  <path d="M212 36H290M236 36V68H104V91H128" stroke={c(lastSr.q)} strokeWidth={w(lastSr.q)} fill="none" />
                  <path d="M212 100H290M224 100V78H112V45H128" stroke={c(lastSr.qn)} strokeWidth={w(lastSr.qn)} fill="none" />
                  {[
                    [128, 19, "NOR"],
                    [128, 83, "NOR"],
                  ].map(([x, y, t]) => (
                    <g key={String(y)}>
                      <rect x={x as number} y={y as number} width={84} height={34} rx={9} fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth={1.6} />
                      <text x={(x as number) + 42} y={(y as number) + 22} textAnchor="middle" fontSize={14} fill="var(--ink)" fontFamily="var(--font-mono, monospace)">
                        {t}
                      </text>
                    </g>
                  ))}
                  <text x={4} y={32} fontSize={14} fill="var(--ink-2)" fontFamily="var(--font-mono, monospace)">R</text>
                  <text x={4} y={114} fontSize={14} fill="var(--ink-2)" fontFamily="var(--font-mono, monospace)">S</text>
                  <text x={296} y={41} fontSize={14} fill="var(--ink)" fontFamily="var(--font-mono, monospace)">Q={String(lastSr.q)}</text>
                  <text x={296} y={105} fontSize={14} fill="var(--ink)" fontFamily="var(--font-mono, monospace)">Qn={String(lastSr.qn)}</text>
                </>
              );
            })()}
          </svg>
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        {mode === "sr" ? (
          <>
            <BitBtn label="S (set)" value={lastSr.s} wide onClick={() => pushSr((1 - lastSr.s) as Bit, lastSr.r)} />
            <BitBtn label="R (reset)" value={lastSr.r} wide onClick={() => pushSr(lastSr.s, (1 - lastSr.r) as Bit)} />
            <Btn onClick={() => pushSr(lastSr.s, lastSr.r)}>Wait a tick</Btn>
          </>
        ) : (
          <>
            <BitBtn label="D" value={lastFf.d} onClick={() => pushFf([{ clk: lastFf.clk, d: (1 - lastFf.d) as Bit }])} />
            <BitBtn label="CLK" value={lastFf.clk} onClick={() => pushFf([{ clk: (1 - lastFf.clk) as Bit, d: lastFf.d }])} />
            <Btn
              onClick={() =>
                pushFf(lastFf.clk ? [{ clk: 0, d: lastFf.d }] : [{ clk: 1, d: lastFf.d }, { clk: 0, d: lastFf.d }])
              }
            >
              Clock pulse
            </Btn>
            <Btn onClick={() => pushFf([{ clk: lastFf.clk, d: lastFf.d }])}>Wait a tick</Btn>
          </>
        )}
      </div>

      <div className="rounded-xl border border-line bg-surface p-2">
        <Wave signals={signals} slots={SLOTS} mark={(mode === "sr" ? sr.length : ff.length) - 1} label={`Waveforms of the ${mode === "sr" ? "SR latch" : mode === "dlatch" ? "D latch" : mode === "dff" ? "D flip-flop" : "latch and flip-flop"}, one column per tick`} labelW={52} />
        <p className="mt-1 text-center text-xs text-ink-3">Each column is one tick of time; the newest is highlighted.</p>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        {mode === "sr" && <><span className="flex items-center gap-1.5 text-sm text-ink-2">Q <Lamp v={lastSr.q} label="Q" /></span><span className="flex items-center gap-1.5 text-sm text-ink-2">Qn <Lamp v={lastSr.qn} label="Q-bar" /></span></>}
        {mode !== "sr" && mode !== "dff" && <span className="flex items-center gap-1.5 text-sm text-ink-2">Latch Q <Lamp v={lastFf.latch} label="Latch Q" /></span>}
        {mode !== "sr" && mode !== "dlatch" && <span className="flex items-center gap-1.5 text-sm text-ink-2">Flip-flop Q <Lamp v={lastFf.ff} label="Flip-flop Q" /></span>}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <Note tone={mode === "sr" && (lastSr.s && lastSr.r || lastSr.q === "?") ? "accent" : "plain"}>
          {mode === "sr" && lastSr.s === 1 && lastSr.r === 1
            ? "Forbidden: S and R are both 1, so both NOR outputs are forced to 0. Q and Qn should be opposites, and now they are not."
            : mode === "sr" && lastSr.q === "?"
              ? "S and R were released together from the forbidden state. Both gates race to flip and which one wins is unpredictable: the latch ends up in a random state (in a real circuit it can even hover in between). Set or reset it to recover."
              : MODE_NOTE[mode]}
        </Note>
        <p className="text-center text-xs text-ink-3">Toy model: ideal gates with no delay; the start state is 0 for simplicity (a real power-up state is random).</p>
      </div>
    </div>
  );
}

/** goal: any of { mode, q, differ, forbidden, unknown, follow, held, captured } */
export function checkLatch(state: unknown, goal: Record<string, unknown>) {
  const s = state as LatchState | undefined;
  if (!s) return false;
  for (const k of ["mode", "q", "differ", "forbidden", "unknown", "follow", "held", "captured", "latch", "ff", "d", "clk"] as const) if (k in goal && s[k] !== goal[k]) return false;
  return Object.keys(goal).length > 0;
}
