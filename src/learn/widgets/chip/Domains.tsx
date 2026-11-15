"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Seg, Toy } from "../semi/ui";
import { CELL_LABEL, CELL_OPTIONS, CROSSINGS, DOMAINS, ISO_AREA, LS_AREA, checkDomains, domainOf, required, stateOfDomains, verdict, type Cells } from "./domains-model.ts";

// ───────────── chip-domains: power intent, isolation cells and level shifters on domain crossings ─────────────

export interface DomainsProps {
  title?: string;
}

export { checkDomains };

const volts = (lo: number, hi: number) => (lo === hi ? `${lo.toFixed(1)} V` : `${lo.toFixed(1)} to ${hi.toFixed(1)} V (DVFS)`);

/** The learner picks the cells for each crossing; verdicts appear only once the step has been checked. */
export function Domains({ props, onChange, status }: WidgetProps<DomainsProps>) {
  const [cells, setCells] = useState<Record<string, Cells>>(() => Object.fromEntries(CROSSINGS.map((c) => [c.id, "none" as Cells])));
  const st = stateOfDomains(cells);
  const judged = status === "wrong" || status === "correct" || status === "revealed";
  const set = (id: string, v: Cells) => {
    const next = { ...cells, [id]: v };
    setCells(next);
    onChange?.(stateOfDomains(next));
  };

  return (
    <div className="w-full" data-widget>
      {props.title && <Caption className="mb-1.5">{props.title}</Caption>}
      <p className="text-[0.88rem] leading-snug text-ink-2">A small SoC with four power domains. Pick the special cells each signal needs where it crosses from one domain into another.</p>

      <div className="mt-2 overflow-x-auto rounded-xl border border-line">
        <table className="w-full border-collapse text-left text-[0.86rem]">
          <caption className="sr-only">The four power domains, their supply voltage and whether they can be switched off</caption>
          <thead>
            <tr className="bg-surface-2 text-xs text-ink-3">
              <th className="px-2 py-1.5 font-medium">Domain</th>
              <th className="px-2 py-1.5 font-medium">Supply</th>
              <th className="px-2 py-1.5 font-medium">Switched off?</th>
            </tr>
          </thead>
          <tbody>
            {DOMAINS.map((d) => (
              <tr key={d.id} className="border-t border-line">
                <td className="px-2 py-1.5 font-semibold text-ink">{d.name}</td>
                <td className="px-2 py-1.5 font-mono text-ink">{volts(d.vMin, d.vMax)}</td>
                <td className="px-2 py-1.5 text-ink-2">{d.switchable ? "Can be (power gated)" : "Always on"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {CROSSINGS.map((c) => {
          const v = verdict(c, cells[c.id] ?? "none");
          const show = judged;
          const need = required(c);
          return (
            <div key={c.id} className={`rounded-xl border p-2.5 ${show ? (v.ok ? "border-line bg-surface" : "border-[var(--bad)] bg-surface") : "border-line bg-surface"}`}>
              <p className="text-[0.9rem] text-ink">
                <span className="font-mono font-semibold">{c.signal}</span>
                <span className="text-ink-2">
                  {" "}
                  : {domainOf(c.from).name} → {domainOf(c.to).name}
                </span>
              </p>
              <div className="mt-1.5">
                <Seg label={`Cells for ${c.signal}, from ${domainOf(c.from).name} to ${domainOf(c.to).name}`} value={cells[c.id] ?? "none"} options={CELL_OPTIONS.map((o) => ({ value: o, label: CELL_LABEL[o] }))} onChange={(x) => set(c.id, x)} />
              </div>
              {show && !v.ok && (
                <p className="mt-1.5 text-[0.84rem] leading-snug text-bad">
                  {status === "revealed"
                    ? `Needs: ${CELL_LABEL[need].toLowerCase()}.`
                    : [v.missingIso && "missing isolation", v.missingLs && "missing level shifter", v.extraIso && "isolation not needed", v.extraLs && "level shifter not needed"].filter(Boolean).join("; ") + "."}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Isolation cells" value={st.isoCount} />
        <Readout label="Level shifters" value={st.lsCount} />
        <Readout label="Extra area" value={`${st.areaUm2} µm²`} accent />
      </div>
      <div className="mt-2">
        <Note>Every cell costs area and a little delay ({ISO_AREA} µm² per isolation cell, {LS_AREA} µm² per level shifter here), so the goal is exactly what each crossing needs: no more, no less. The verdicts appear after you press Check.</Note>
      </div>
      <Toy>
        Toy power intent. Rule used: isolation where the sending domain can be switched off while the receiver stays on; a level shifter wherever the two sides can be at different voltages (real libraries sometimes skip high-to-low shifters). Real designs describe this in UPF and add retention flops, power switches and sequencing.
      </Toy>
    </div>
  );
}
