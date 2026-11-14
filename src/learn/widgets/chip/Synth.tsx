"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Meter, Note, Readout, Seg, Toy } from "../semi/ui";
import { CELL_TYPES, LIB, SYNTH_PRESETS, SYNTH_RULES, analyze, bestArch, buildNetlist, checkSynth, presetById, stateFor, tradeoffs } from "./synth-model.ts";

// ───────────── chip-synth: from RTL to a gate netlist, with real area and longest-path timing ─────────────

export interface SynthProps {
  /** "ao" | "mux" | "add4" | "add8" (default "ao"). */
  preset?: string;
  /** Starting architecture (default: the preset's first). */
  arch?: string;
  /** Show the design picker (default true). */
  choosePreset?: boolean;
  /** Show a delay target line ("meet this many ps") above the readouts. */
  targetPs?: number;
  /** Show the "what isn't synthesisable" panel (default true). */
  rules?: boolean;
  title?: string;
}

export { checkSynth };

const TONE: Record<string, string> = { ok: "text-good", ignored: "text-ink-2", no: "text-bad", warn: "text-bad" };

export function Synth({ props, onChange, status, goal }: WidgetProps<SynthProps>) {
  const first = presetById(props.preset ?? "ao") ?? SYNTH_PRESETS[0];
  const [preset, setPreset] = useState(first.id);
  const [arch, setArch] = useState(first.archs.some((a) => a.id === props.arch) ? (props.arch as string) : first.archs[0].id);
  const pdef = presetById(preset) ?? first;
  const nl = buildNetlist(preset, arch) ?? pdef.build(pdef.archs[0].id);
  const an = analyze(nl);
  const rows = tradeoffs(preset);
  const maxArea = Math.max(...rows.map((r) => r.area));
  const maxDelay = Math.max(...rows.map((r) => r.delayPs));
  const onPath = new Set(an.path);
  const archDef = pdef.archs.find((a) => a.id === arch) ?? pdef.archs[0];
  const target = props.targetPs;
  const report = (p: string, a: string) => {
    const s = stateFor(p, a);
    if (s) onChange?.(s);
  };
  const reveal = status === "revealed" && goal ? bestArch(typeof goal.preset === "string" ? goal.preset : preset, typeof goal.maxDelayPs === "number" ? goal.maxDelayPs : undefined) : undefined;
  const revealLabel = reveal ? (presetById(typeof goal?.preset === "string" ? goal.preset : preset)?.archs.find((a) => a.id === reveal)?.label ?? reveal) : undefined;

  return (
    <div className="w-full" data-widget>
      {props.title && <Caption className="mb-1.5">{props.title}</Caption>}
      {props.choosePreset !== false && (
        <div className="mb-2 flex justify-center">
          <Seg
            label="Design"
            value={preset}
            options={SYNTH_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
            onChange={(id) => {
              const np = presetById(id) ?? first;
              setPreset(np.id);
              setArch(np.archs[0].id);
              report(np.id, np.archs[0].id);
            }}
            className="flex-wrap"
          />
        </div>
      )}

      <Caption className="mb-1">RTL (what you write)</Caption>
      <pre className="overflow-x-auto rounded-xl border border-line bg-surface-2 p-2 font-mono text-[14px] leading-6 text-ink">{pdef.rtl}</pre>
      <p className="mt-1 text-xs text-ink-3">The code is the same for every architecture below. Synthesis chooses the cells; your constraints steer it.</p>

      <Caption className="mb-1 mt-3">Architecture (what the tool builds)</Caption>
      <Seg
        label="Architecture"
        value={arch}
        options={pdef.archs.map((a) => ({ value: a.id, label: a.label }))}
        onChange={(a) => {
          setArch(a);
          report(preset, a);
        }}
        className="flex-wrap"
      />
      <p className="mt-1.5 text-[0.88rem] leading-snug text-ink-2">{archDef.note}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Readout label="cells" value={an.cells} />
        <Readout label="area" value={`${an.area} µm²`} accent />
        <Readout label="longest path" value={`${an.delayPs} ps`} accent />
      </div>
      {target !== undefined && (
        <div className="mt-2">
          <Note tone={an.delayPs <= target ? "accent" : "plain"}>
            Target: at most {target} ps. {an.delayPs <= target ? `Met (${an.delayPs} ps).` : `Not met: ${an.delayPs} ps is ${an.delayPs - target} ps too slow.`}
          </Note>
        </div>
      )}
      {reveal && <div className="mt-2"><Note tone="accent">Solution: {revealLabel}. It is the smallest architecture that meets the delay target.</Note></div>}

      <Caption className="mb-1 mt-3">Gate netlist ({an.cells} cell{an.cells === 1 ? "" : "s"}; the longest path is marked)</Caption>
      <div className="max-h-64 overflow-auto rounded-xl border border-line bg-surface" tabIndex={0} role="region" aria-label="Netlist cell list. Scrolls when long.">
        <ol className="min-w-max font-mono text-[14px] leading-6 text-ink">
          {nl.cells.map((c) => {
            const hot = onPath.has(c.id);
            return (
              <li key={c.id} className={`flex gap-3 px-2.5 ${hot ? "bg-tint font-semibold" : ""}`}>
                <span className="w-9 text-ink-3">{c.id}</span>
                <span className="w-14">{c.type}</span>
                <span className="text-ink-2">
                  ({c.ins.join(", ")}) {"→"} {c.out}
                </span>
                {hot && (
                  <span className="text-brand" aria-label="on the longest path">
                    {"◀ path"}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <p className="mt-1 text-[0.88rem] leading-snug text-ink-2">
        Longest path ends at <span className="font-mono font-semibold text-ink">{an.endpoint}</span>: {an.path.map((id) => `${id} (${LIB[nl.cells.find((c) => c.id === id)!.type].delay} ps)`).join(" + ")} = <span className="font-mono font-semibold text-ink">{an.delayPs} ps</span>. Each cell adds its delay to the latest-arriving input.
      </p>

      <Caption className="mb-1 mt-3">Area against speed for this design</Caption>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full border-collapse text-left text-[0.86rem] sm:min-w-[19rem]">
          <caption className="sr-only">Cells, area and longest-path delay for each architecture of this design</caption>
          <thead>
            <tr className="bg-surface-2 text-xs text-ink-3">
              <th className="px-1.5 py-1.5 sm:px-2 font-medium">Architecture</th>
              <th className="hidden px-1.5 py-1.5 font-medium sm:table-cell sm:px-2">Cells</th>
              <th className="px-1.5 py-1.5 sm:px-2 font-medium">Area</th>
              <th className="px-1.5 py-1.5 sm:px-2 font-medium">Delay</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.arch} className={`border-t border-line ${r.arch === arch ? "bg-tint" : ""}`}>
                <td className="px-1.5 py-1.5 sm:px-2 text-ink">
                  <button
                    type="button"
                    onClick={() => {
                      setArch(r.arch);
                      report(preset, r.arch);
                    }}
                    className="min-h-10 text-left font-medium underline-offset-2 hover:underline"
                    aria-label={`Use ${r.label}`}
                  >
                    {r.label}
                  </button>
                </td>
                <td className="hidden px-1.5 py-1.5 font-mono text-ink sm:table-cell sm:px-2">{r.cells}</td>
                <td className="min-w-[5.3rem] sm:min-w-[5.5rem] px-1.5 py-1.5 sm:px-2 font-mono text-ink">
                  {r.area} µm²
                  <Meter frac={r.area / maxArea} tone="muted" label={`Area ${r.area} of at most ${maxArea}`} />
                </td>
                <td className="min-w-[4.6rem] sm:min-w-[5.5rem] px-1.5 py-1.5 sm:px-2 font-mono text-ink">
                  {r.delayPs} ps
                  <Meter frac={r.delayPs / maxDelay} label={`Delay ${r.delayPs} of at most ${maxDelay}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-ink-3">Cell mix here: {CELL_TYPES.filter((t) => an.byType[t]).map((t) => `${an.byType[t]} × ${t}`).join(", ")}.</p>

      <details className="mt-3 rounded-xl border border-line bg-surface p-2.5">
        <summary className="min-h-10 cursor-pointer py-2 text-sm font-semibold text-ink">Toy cell library (area and delay)</summary>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[18rem] border-collapse text-left text-[0.86rem]">
            <thead>
              <tr className="text-xs text-ink-3">
                <th className="px-2 py-1 font-medium">Cell</th>
                <th className="px-2 py-1 font-medium">Function</th>
                <th className="px-2 py-1 font-medium">Area</th>
                <th className="px-2 py-1 font-medium">Delay</th>
              </tr>
            </thead>
            <tbody>
              {CELL_TYPES.map((t) => (
                <tr key={t} className="border-t border-line">
                  <td className="px-2 py-1 font-mono font-semibold text-ink">{t}</td>
                  <td className="px-2 py-1 font-mono text-ink-2">{LIB[t].fn}</td>
                  <td className="px-2 py-1 font-mono text-ink">{LIB[t].area} µm²</td>
                  <td className="px-2 py-1 font-mono text-ink">{LIB[t].delay} ps</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-ink-3">Toy library: made-up but plausible relative values. Real libraries list many sizes of every cell and delays that depend on load and input slew.</p>
      </details>

      {props.rules !== false && (
        <details className="mt-2 rounded-xl border border-line bg-surface p-2.5">
          <summary className="min-h-10 cursor-pointer py-2 text-sm font-semibold text-ink">What synthesis can and cannot turn into hardware</summary>
          <ul className="mt-1 flex flex-col gap-2">
            {SYNTH_RULES.map((r) => (
              <li key={r.code} className="rounded-lg bg-surface-2 p-2">
                <pre className="overflow-x-auto font-mono text-[14px] leading-6 text-ink">{r.code}</pre>
                <p className="text-[0.88rem] leading-snug">
                  <span className={`font-semibold ${TONE[r.tone]}`}>Becomes: {r.becomes}.</span> <span className="text-ink-2">{r.text}</span>
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
      <Toy>Toy synthesis: the netlists are built by hand-written generators, not by a real tool, and the timing walk uses one delay per cell with no wires. The numbers are made up but their relationships (ripple is small and slow, the faster adders are bigger) are real.</Toy>
    </div>
  );
}
