"use client";

import { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Ground, Junction, LED, Resistor, Switch, Wire } from "../elec-kit/symbols";
import { BUGS, BUG_ORDER, remaining, type BugId, type ErcState } from "./ercrules";
import { Btn, Caption, Note, ToyNote } from "./ui";

export interface ErcProps {
  /** Which mistakes are seeded (default all four). */
  bugs?: BugId[];
}

const INK = "var(--ink)";
const BAD = "var(--bad)";
const WARN = "#d9a21b";

function report(seeded: BugId[], fixed: string[], ran: boolean, wrongTries: number): ErcState {
  return { errors: remaining(seeded, fixed).length, fixed, ran, wrongTries };
}

export function Erc({ props, onChange, revealed }: WidgetProps<ErcProps>) {
  const seeded = (props.bugs && props.bugs.length ? props.bugs : BUG_ORDER).filter((b) => BUG_ORDER.includes(b));
  const [fixed, setFixed] = useState<string[]>([]);
  const [ran, setRan] = useState(false);
  const [wrong, setWrong] = useState(0);
  const [msg, setMsg] = useState<{ good: boolean; text: string } | null>(null);
  const locked = Boolean(revealed);

  const left = remaining(seeded, fixed);
  const has = (b: BugId) => !seeded.includes(b) || fixed.includes(b); // "this part of the circuit is correct"
  const ercLeft = left.filter((b) => BUGS[b].kind === "erc");
  const reviewLeft = left.filter((b) => BUGS[b].kind === "review");

  const run = () => {
    setRan(true);
    onChange?.(report(seeded, fixed, true, wrong));
  };
  const reset = () => {
    setFixed([]);
    setRan(false);
    setWrong(0);
    setMsg(null);
    onChange?.(report(seeded, [], false, 0));
  };
  const tryFix = (bug: BugId, optId: string) => {
    const o = BUGS[bug].options.find((x) => x.id === optId);
    if (!o) return;
    if (o.right) {
      const nf = [...fixed, bug];
      setFixed(nf);
      setMsg({ good: true, text: o.why });
      onChange?.(report(seeded, nf, true, wrong));
    } else {
      const w = wrong + 1;
      setWrong(w);
      setMsg({ good: false, text: o.why });
      onChange?.(report(seeded, fixed, true, w));
    }
  };

  const vddOk = has("vdd");
  const nrstOk = has("nrst");
  const decapOk = has("decap");
  const dataOk = has("contention");
  const mark = (b: BugId) => ran && left.includes(b);

  return (
    <div className="w-full">
      <div className="rounded-xl border border-line bg-surface p-2">
        <svg viewBox="0 0 344 324" className="block w-full" role="img" aria-label={`Schematic of a sensor board. Regulator U2 makes the 3V3 rail. MCU U1 has pins VDD, NRST, GND, PA0, PA1 and PA2. ${vddOk ? "VDD is wired to 3V3." : "VDD is not wired to anything."} ${nrstOk ? "NRST is pulled up by R2." : "NRST floats."} ${decapOk ? "A 100 nF capacitor sits at VDD." : "There is no decoupling capacitor."} ${dataOk ? "Only the sensor drives net DATA." : "Sensor U3 and buffer U4 both drive net DATA."}`}>
          {/* 3V3 rail and regulator */}
          <g fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round">
            <rect x={26} y={8} width={48} height={44} rx={4} fill="var(--surface)" />
            <line x1={74} y1={30} x2={344} y2={30} />
            <line x1={20} y1={30} x2={26} y2={30} />
          </g>
          <g fontSize={14} fill={INK}>
            <text x={50} y={26} textAnchor="middle" fontWeight={600}>U2</text>
            <text x={50} y={44} textAnchor="middle" fill="var(--ink-2)">3.3V</text>
            <text x={0} y={25} fill="var(--ink-2)">5V</text>
            <text x={344} y={22} textAnchor="end" fill="var(--ink-2)">3V3</text>
          </g>

          {/* MCU */}
          <rect x={110} y={100} width={104} height={150} rx={4} fill="var(--surface)" stroke={INK} strokeWidth={2} />
          <g fontSize={14} fill={INK}>
            <text x={162} y={163} textAnchor="middle" fontWeight={600}>U1 MCU</text>
            <text x={162} y={119} textAnchor="middle">VDD</text>
            <text x={116} y={140}>NRST</text>
            <text x={208} y={135} textAnchor="end">PA0</text>
            <text x={208} y={180} textAnchor="end">PA1</text>
            <text x={135} y={243} textAnchor="middle">GND</text>
            <text x={190} y={243} textAnchor="middle">PA2</text>
          </g>

          {/* VDD */}
          {vddOk ? (
            <>
              <Wire points={[[162, 100], [162, 30]]} />
              <Junction x={162} y={30} />
            </>
          ) : (
            <>
              <Wire points={[[162, 100], [162, 80]]} />
              <circle cx={162} cy={74} r={5} fill="var(--surface)" stroke={BAD} strokeWidth={2} />
              <text x={172} y={86} fontSize={14} fill={BAD}>open</text>
            </>
          )}
          {mark("vdd") && <circle cx={162} cy={74} r={12} fill="none" stroke={BAD} strokeWidth={2} />}

          {/* decoupling capacitor on the rail, next to VDD */}
          {decapOk ? (
            <>
              <g stroke={INK} strokeWidth={2} strokeLinecap="round" fill="none">
                <line x1={214} y1={30} x2={214} y2={46} />
                <line x1={203} y1={46} x2={225} y2={46} />
                <line x1={203} y1={52} x2={225} y2={52} />
                <line x1={214} y1={52} x2={214} y2={66} />
                <line x1={203} y1={66} x2={225} y2={66} />
                <line x1={207} y1={71} x2={221} y2={71} />
                <line x1={211} y1={76} x2={217} y2={76} />
              </g>
              <Junction x={214} y={30} />
              <text x={230} y={55} fontSize={14} fill={INK} fontWeight={600}>C1</text>
              <text x={230} y={72} fontSize={14} fill="var(--ink-2)">100 nF</text>
            </>
          ) : (
            <text x={224} y={62} fontSize={14} fill={BAD}>no 100 nF</text>
          )}
          {mark("decap") && <rect x={220} y={46} width={72} height={22} rx={4} fill="none" stroke={WARN} strokeWidth={2} strokeDasharray="5 3" />}

          {/* NRST */}
          {nrstOk ? (
            <>
              <Wire points={[[100, 30], [100, 50]]} />
              <Resistor x={100} y={50} rot={90} label="R2" value="10 kΩ" labelFlip />
              <Wire points={[[100, 110], [100, 135], [110, 135]]} />
              <Junction x={100} y={30} />
            </>
          ) : (
            <>
              <Wire points={[[110, 135], [86, 135]]} />
              <circle cx={80} cy={135} r={5} fill="var(--surface)" stroke={BAD} strokeWidth={2} />
              <text x={40} y={162} fontSize={14} fill={BAD}>floating</text>
            </>
          )}
          {mark("nrst") && <circle cx={80} cy={135} r={12} fill="none" stroke={BAD} strokeWidth={2} />}

          {/* LED on PA0 */}
          <Wire points={[[214, 130], [220, 130]]} />
          <Resistor x={220} y={130} label="R1" value="330 Ω" />
          <Wire points={[[280, 130], [300, 130]]} />
          <LED x={300} y={130} rot={90} label="D1" />
          <Ground x={300} y={190} />

          {/* button on PA1 */}
          <Wire points={[[214, 175], [232, 175]]} />
          <Switch x={232} y={175} rot={90} label="SW1" />
          <Ground x={232} y={235} />

          {/* GND */}
          <Ground x={135} y={250} />

          {/* DATA net */}
          <Wire points={[[190, 250], [190, 290]]} />
          <rect x={20} y={270} width={70} height={40} rx={4} fill="var(--surface)" stroke={INK} strokeWidth={2} />
          <rect x={270} y={270} width={70} height={40} rx={4} fill="var(--surface)" stroke={INK} strokeWidth={2} strokeDasharray={dataOk ? "5 4" : undefined} opacity={dataOk ? 0.5 : 1} />
          <g fontSize={14} fill={INK}>
            <text x={55} y={262} textAnchor="middle" fontWeight={600}>U3 sensor</text>
            <text x={305} y={262} textAnchor="middle" fontWeight={600} opacity={dataOk ? 0.5 : 1}>U4 buffer</text>
            <text x={84} y={295} textAnchor="end">OUT</text>
            <text x={276} y={295} opacity={dataOk ? 0.5 : 1}>OUT</text>
            <text x={218} y={282} fill="var(--ink-2)">DATA</text>
          </g>
          <Wire points={[[90, 290], [dataOk ? 240 : 270, 290]]} />
          {dataOk && <line x1={240} y1={290} x2={270} y2={290} stroke="var(--ink-3)" strokeWidth={2} strokeDasharray="4 4" />}
          <Junction x={190} y={290} />
          {mark("contention") && <circle cx={190} cy={290} r={12} fill="none" stroke={BAD} strokeWidth={2} />}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn onClick={run} primary disabled={locked}>
          Run ERC
        </Btn>
        <Btn onClick={reset} disabled={locked || (!ran && fixed.length === 0)}>
          Reset
        </Btn>
        {ran && (
          <span className="text-[0.88rem] text-ink-2" aria-live="polite">
            ERC: <b className="text-ink">{ercLeft.length}</b> {ercLeft.length === 1 ? "error" : "errors"} · Review: <b className="text-ink">{reviewLeft.length}</b> {reviewLeft.length === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      {ran && (
        <div className="mt-3 space-y-3">
          {left.length === 0 && <Note tone="accent">ERC found 0 errors and the review checklist is clean. (That does not prove the design is right: it only proves these checks pass.)</Note>}
          {left.map((b) => {
            const bug = BUGS[b];
            return (
              <div key={b} className="rounded-xl border border-line bg-surface p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] ${bug.kind === "erc" ? "border-[var(--bad)] text-[var(--bad)]" : "border-line text-ink-2"}`}>{bug.kind === "erc" ? "ERC error" : "Design review"}</span>
                  <b className="text-[0.92rem] text-ink">{bug.title}</b>
                </div>
                {bug.lines.map((l) => (
                  <p key={l} className="mt-1.5 font-mono text-[0.8rem] leading-snug text-ink-2">
                    {l}
                  </p>
                ))}
                <p className="mt-1.5 text-[0.85rem] leading-snug text-ink-2">{bug.detail}</p>
                <Caption className="mb-1 mt-2.5">Pick a fix</Caption>
                <div className="flex flex-col gap-1.5">
                  {bug.options.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      disabled={locked}
                      onClick={() => tryFix(b, o.id)}
                      className="min-h-10 w-full rounded-xl border border-line bg-surface px-3 py-2 text-left text-[0.85rem] leading-snug text-ink transition-colors hover:border-[var(--line-strong)] hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {msg && <Note tone={msg.good ? "accent" : "plain"}>{msg.good ? "Fixed. " : "Not quite. "}{msg.text}</Note>}
          <p className="text-[0.82rem] leading-snug text-ink-2">
            Honest note: real ERC checks pin types and connections (an output on an output, an input nobody drives, a power pin left open). A forgotten decoupling capacitor is a legal netlist, so it shows up in a design review or checklist, not in every ERC.
          </p>
        </div>
      )}
      <ToyNote>Toy ERC: four seeded mistakes and simplified pin-type rules. Real tools check far more, and you can set each rule to error, warning or ignore.</ToyNote>
    </div>
  );
}

/** goal: { maxErrors, ran, fixed: string[] } */
export function checkErc(state: unknown, goal: Record<string, unknown>) {
  const s = state as ErcState | undefined;
  if (!s) return false;
  if (goal.ran === true && !s.ran) return false;
  if (typeof goal.maxErrors === "number" && s.errors > goal.maxErrors) return false;
  if (Array.isArray(goal.fixed) && !(goal.fixed as string[]).every((f) => s.fixed.includes(f))) return false;
  return true;
}
