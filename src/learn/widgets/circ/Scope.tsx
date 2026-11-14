"use client";

import React, { useId, useMemo, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { formatSI } from "../elec-kit/format";
import {
  GHOST_PHASES,
  SCOPE,
  TDIVS,
  VDIVS,
  columnsToPolyline,
  findTrigger,
  measure,
  overshootPct,
  scaleFor,
  scopeSim,
  traceColumns,
  type Edge,
  type Ground,
  type ProbeX,
} from "./scopesim";
import { Caption, Note, Readout, Seg, Slider, ToyNote } from "./ui";

type Control = "vdiv" | "tdiv" | "level" | "edge" | "probe" | "setting" | "ground";

export interface ScopeProps {
  /** starting volts per division (as the scope labels it) */
  vdiv?: number;
  /** starting seconds per division */
  tdiv?: number;
  /** starting trigger level, volts as the scope displays them */
  level?: number;
  edge?: Edge;
  /** the probe's real attenuation switch */
  probe?: ProbeX;
  /** what the scope channel thinks the probe is */
  setting?: ProbeX;
  ground?: Ground;
  /** controls to leave off the panel (they keep their starting value) */
  hide?: Control[];
}

export interface ScopeState {
  vdiv: number;
  tdiv: number;
  level: number;
  edge: Edge;
  probe: ProbeX;
  setting: ProbeX;
  ground: Ground;
  /** did the trigger find the signal, so the picture holds still */
  triggered: boolean;
  /** the scope's peak-to-peak reading, volts */
  vpp: number;
  /** the trace is taller than the screen */
  clipped: boolean;
  /** how tall the trace is on the screen, divisions */
  heightDiv: number;
  /** signal periods across the whole screen */
  cycles: number;
  /** overshoot of the ringing above the settled high level, percent (0 when under 2%) */
  ring: number;
  /** the channel setting matches the probe, so readings are true */
  probeOk: boolean;
}

/** goal: { triggered, probeOk, ground, probe, edge, minVpp, maxVpp, minHeight, maxHeight, minCycles, maxCycles, maxRing, minRing, clipped, vdiv, tdiv }. */
export function checkScope(state: unknown, goal: Record<string, unknown>) {
  const s = state as ScopeState | undefined;
  if (!s) return false;
  const g = goal as Partial<Record<keyof ScopeState | "minVpp" | "maxVpp" | "minHeight" | "maxHeight" | "minCycles" | "maxCycles" | "maxRing" | "minRing", unknown>>;
  const num = (k: string) => (typeof g[k as keyof typeof g] === "number" ? (g[k as keyof typeof g] as number) : undefined);
  if (g.triggered !== undefined && s.triggered !== g.triggered) return false;
  if (g.probeOk !== undefined && s.probeOk !== g.probeOk) return false;
  if (g.ground !== undefined && s.ground !== g.ground) return false;
  if (g.probe !== undefined && s.probe !== g.probe) return false;
  if (g.edge !== undefined && s.edge !== g.edge) return false;
  if (g.clipped !== undefined && s.clipped !== g.clipped) return false;
  if (g.vdiv !== undefined && s.vdiv !== g.vdiv) return false;
  if (g.tdiv !== undefined && s.tdiv !== g.tdiv) return false;
  const lt = (k: string, v: number) => num(k) !== undefined && v < (num(k) as number);
  const gt = (k: string, v: number) => num(k) !== undefined && v > (num(k) as number);
  if (lt("minVpp", s.vpp) || gt("maxVpp", s.vpp)) return false;
  if (lt("minHeight", s.heightDiv) || gt("maxHeight", s.heightDiv)) return false;
  if (lt("minCycles", s.cycles) || gt("maxCycles", s.cycles)) return false;
  if (lt("minRing", s.ring) || gt("maxRing", s.ring)) return false;
  return true;
}

const nearest = (list: number[], x: number) => list.reduce((best, v, i) => (Math.abs(Math.log(v / x)) < Math.abs(Math.log(list[best] / x)) ? i : best), 0);
const fmtV = (v: number) => formatSI(v, "V", { digits: 3 });

/** A toy oscilloscope: V/div, time/div, trigger, the probe's 1x/10x switch and the channel's setting for it, and a long clip ground against a short spring. */
export function Scope({ props, onChange }: WidgetProps<ScopeProps>) {
  const hide = props.hide ?? [];
  const has = (c: Control) => !hide.includes(c);
  const [vi, setVi] = useState(() => nearest(VDIVS, props.vdiv ?? 1));
  const [ti, setTi] = useState(() => nearest(TDIVS, props.tdiv ?? 200e-9));
  const [level, setLevel] = useState(props.level ?? 5);
  const [edge, setEdge] = useState<Edge>(props.edge ?? "rise");
  const [probe, setProbe] = useState<ProbeX>(props.probe ?? 10);
  const [setting, setSetting] = useState<ProbeX>(props.setting ?? 10);
  const [ground, setGround] = useState<Ground>(props.ground ?? "spring");
  const clipId = `scope-${useId().replace(/:/g, "")}`;

  const vdiv = VDIVS[vi];
  const tdiv = TDIVS[ti];
  const scale = scaleFor(probe, setting);

  const view = useMemo(() => {
    const sim = scopeSim(ground, probe);
    const trig = findTrigger(sim, level, edge, scale);
    const main = traceColumns(sim, scale, trig.triggered ? trig.time : 0, tdiv);
    const ghosts = trig.triggered ? [] : GHOST_PHASES.map((ph) => columnsToPolyline(traceColumns(sim, scale, ph, tdiv)));
    return { trig, line: columnsToPolyline(main), ghosts, main, ring: overshootPct(sim) };
  }, [ground, probe, level, edge, scale, tdiv]);

  const m = measure(view.main, vdiv);
  /** Recompute the derived fields for a changed setting, then report. */
  const emit = (patch: { vi?: number; ti?: number; level?: number; edge?: Edge; probe?: ProbeX; setting?: ProbeX; ground?: Ground }) => {
    const n = { vi, ti, level, edge, probe, setting, ground, ...patch };
    const sim = scopeSim(n.ground, n.probe);
    const sc = scaleFor(n.probe, n.setting);
    const trig = findTrigger(sim, n.level, n.edge, sc);
    const cols = traceColumns(sim, sc, trig.triggered ? trig.time : 0, TDIVS[n.ti]);
    const mm = measure(cols, VDIVS[n.vi]);
    onChange?.({
      vdiv: VDIVS[n.vi],
      tdiv: TDIVS[n.ti],
      level: n.level,
      edge: n.edge,
      probe: n.probe,
      setting: n.setting,
      ground: n.ground,
      triggered: trig.triggered,
      vpp: mm.vpp,
      clipped: mm.clipped,
      heightDiv: mm.heightDiv,
      cycles: (SCOPE.divsX * TDIVS[n.ti]) / SCOPE.period,
      ring: overshootPct(sim),
      probeOk: n.probe === n.setting,
    } satisfies ScopeState);
  };

  /* screen geometry (viewBox units) */
  const W = 360;
  const H = 250;
  const L = 62;
  const R = 8;
  const T = 8;
  const B = 30;
  const pw = W - L - R;
  const ph = H - T - B;
  const px = (f: number) => L + f * pw;
  const py = (v: number) => T + ph * (1 - (v / vdiv + SCOPE.zeroDiv) / SCOPE.divsY);
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const path = (pts: [number, number][]) => pts.map(([x, v], i) => `${i ? "L" : "M"}${r1(px(x))} ${r1(py(v))}`).join("");
  const levelOn = py(level) >= T && py(level) <= T + ph;
  const trigX = px(SCOPE.trigDiv / SCOPE.divsX);

  const yLabels = [0, 2, 4, 6].map((j) => ({ y: py(j * vdiv), text: j === 0 ? "0 V" : fmtV(j * vdiv) }));
  const xLabels = [2, 6, 10].map((k) => ({ x: px(k / SCOPE.divsX), text: k === 2 ? "0" : `+${formatSI((k - SCOPE.trigDiv) * tdiv, "s")}`, anchor: k === 10 ? "end" : "middle" }));

  const trigNote = view.trig.triggered
    ? `Triggered on the ${edge === "rise" ? "rising" : "falling"} edge at ${fmtV(level)}: every sweep starts at the same point, so the picture holds still.`
    : `Not triggered: the signal never crosses ${fmtV(level)} on a ${edge === "rise" ? "rising" : "falling"} edge, so each sweep starts at a different point and the picture smears.`;
  const probeNote =
    probe === setting
      ? null
      : `The probe is ${probe}x but the channel is set to ${setting}x, so the scope scales every reading by the wrong factor (${scale > 1 ? "too big" : "too small"} by ${Math.round(scale > 1 ? scale : 1 / scale)}x).`;

  return (
    <div data-widget="circ-scope" className="w-full">
      <div className="mx-auto max-w-[480px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          style={{ display: "block", maxWidth: "100%", height: "auto" }}
          aria-label={`Oscilloscope screen, ${fmtV(vdiv)} per division and ${formatSI(tdiv, "s")} per division. ${view.trig.triggered ? "The trace is steady." : "The trace is smeared because the trigger found nothing."} It reads ${fmtV(m.vpp)} peak to peak${view.ring > 0 && probe === 10 ? `, with ${Math.round(view.ring)} percent ringing after each edge` : ""}.`}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={L} y={T} width={pw} height={ph} />
            </clipPath>
          </defs>
          <rect x={L} y={T} width={pw} height={ph} fill="var(--surface-2)" stroke="var(--line-strong)" />
          {Array.from({ length: SCOPE.divsX + 1 }, (_, k) => (
            <line key={`gx${k}`} x1={px(k / SCOPE.divsX)} x2={px(k / SCOPE.divsX)} y1={T} y2={T + ph} stroke="var(--line)" />
          ))}
          {Array.from({ length: SCOPE.divsY + 1 }, (_, k) => (
            <line key={`gy${k}`} x1={L} x2={L + pw} y1={T + (ph * k) / SCOPE.divsY} y2={T + (ph * k) / SCOPE.divsY} stroke="var(--line)" />
          ))}
          <g clipPath={`url(#${clipId})`}>
            {levelOn && <line x1={L} x2={L + pw} y1={py(level)} y2={py(level)} stroke="#e8924a" strokeDasharray="5 4" />}
            <line x1={L} x2={L + pw} y1={py(0)} y2={py(0)} stroke="var(--ink-3)" strokeDasharray="2 3" />
            {view.ghosts.map((g, i) => (
              <path key={i} d={path(g)} fill="none" stroke="var(--brand)" strokeOpacity={0.3} strokeWidth={1.6} strokeLinejoin="round" />
            ))}
            {view.trig.triggered && <path d={path(view.line)} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
            {!view.trig.triggered && <path d={path(view.line)} fill="none" stroke="var(--brand)" strokeOpacity={0.3} strokeWidth={1.6} strokeLinejoin="round" />}
          </g>
          {view.trig.triggered && <path d={`M${r1(trigX - 6)} ${T}H${r1(trigX + 6)}L${r1(trigX)} ${T + 9}Z`} fill="#e8924a" />}
          {yLabels.map((t) => (
            <text key={t.text} x={L - 5} y={r1(t.y + 5)} textAnchor="end" fontSize={14} fill="var(--ink-3)">
              {t.text}
            </text>
          ))}
          {xLabels.map((t) => (
            <text key={t.text} x={r1(t.x)} y={H - 9} textAnchor={t.anchor as "middle" | "end"} fontSize={14} fill="var(--ink-3)">
              {t.text}
            </text>
          ))}
        </svg>
      </div>
      <p className="mt-1 text-center text-xs text-ink-3">The orange dashed line is the trigger level; the dotted line is 0 V.</p>

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="Peak to peak" value={m.clipped ? `${fmtV(m.vpp)} (clipped)` : fmtV(m.vpp)} accent />
        <Readout label="Height" value={`${m.heightDiv.toFixed(1)} div`} />
        <Readout label="Cycles on screen" value={String(Math.round(((SCOPE.divsX * tdiv) / SCOPE.period) * 10) / 10)} />
        <Readout label="Ringing" value={probe === 10 && view.ring > 0 ? `+${Math.round(view.ring)}%` : "none"} />
      </div>


      {(has("vdiv") || has("tdiv")) && (
        <div className="mt-3 flex flex-col items-center gap-2">
          {has("vdiv") && (
            <Seg
              label="Volts per division"
              value={vi}
              options={VDIVS.map((v, i) => ({ value: i, label: v >= 1 ? `${v} V` : `${v * 1000} mV` }))}
              onChange={(i) => {
                setVi(i);
                emit({ vi: i });
              }}
            />
          )}
          {has("tdiv") && (
            <Seg
              label="Time per division"
              value={ti}
              options={TDIVS.map((v, i) => ({ value: i, label: formatSI(v, "s", { digits: 2 }) }))}
              onChange={(i) => {
                setTi(i);
                emit({ ti: i });
              }}
            />
          )}
        </div>
      )}

      {(has("level") || has("edge")) && (
        <div className="mt-3 rounded-xl border border-line p-3">
          <Caption>Trigger</Caption>
          {has("edge") && (
            <div className="mt-1">
              <Seg
                label="Trigger edge"
                value={edge}
                options={[
                  { value: "rise" as Edge, label: "Rising" },
                  { value: "fall" as Edge, label: "Falling" },
                ]}
                onChange={(e) => {
                  setEdge(e);
                  emit({ edge: e });
                }}
              />
            </div>
          )}
          {has("level") && (
            <Slider
              className="mt-1"
              label="Trigger level"
              value={level}
              min={-2}
              max={12}
              step={0.05}
              format={(v) => fmtV(v)}
              onChange={(v) => {
                setLevel(v);
                emit({ level: v });
              }}
            />
          )}
          <div className="mt-2">
            <Note tone={view.trig.triggered ? "good" : "neutral"}>{trigNote}</Note>
          </div>
        </div>
      )}

      {(has("probe") || has("setting") || has("ground")) && (
        <div className="mt-3 grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-2">
          {has("probe") && (
            <div>
              <Caption>Probe switch (the real attenuation)</Caption>
              <div className="mt-1">
                <Seg
                  label="Probe switch"
                  value={probe}
                  options={[
                    { value: 1 as ProbeX, label: "1x" },
                    { value: 10 as ProbeX, label: "10x" },
                  ]}
                  onChange={(p) => {
                    setProbe(p);
                    emit({ probe: p });
                  }}
                />
              </div>
            </div>
          )}
          {has("setting") && (
            <div>
              <Caption>Scope channel setting</Caption>
              <div className="mt-1">
                <Seg
                  label="Scope channel probe setting"
                  value={setting}
                  options={[
                    { value: 1 as ProbeX, label: "1x" },
                    { value: 10 as ProbeX, label: "10x" },
                  ]}
                  onChange={(p) => {
                    setSetting(p);
                    emit({ setting: p });
                  }}
                />
              </div>
            </div>
          )}
          {has("ground") && (
            <div className="sm:col-span-2">
              <Caption>Ground lead</Caption>
              <div className="mt-1">
                <Seg
                  label="Ground lead"
                  value={ground}
                  options={[
                    { value: "clip" as Ground, label: "Long clip lead (about 15 cm)" },
                    { value: "spring" as Ground, label: "Short spring ground (about 1 cm)" },
                  ]}
                  onChange={(gnd) => {
                    setGround(gnd);
                    emit({ ground: gnd });
                  }}
                />
              </div>
            </div>
          )}
          {probeNote && (
            <div className="sm:col-span-2">
              <Note tone="bad">{probeNote}</Note>
            </div>
          )}
        </div>
      )}
      {!(has("probe") || has("setting") || has("ground")) && probeNote && (
        <div className="mt-3">
          <Note tone="bad">{probeNote}</Note>
        </div>
      )}

      <ToyNote>
        A toy scope: a 3.3 V, 1 MHz square wave with 3 ns edges, a 100 MHz scope, and typical probe and lead values (about 150 nH for a long clip lead, 12 nH for a spring ground, 12 pF at the
        probe tip; a 1x probe is limited to about 6 MHz). Real ones differ.
      </ToyNote>
    </div>
  );
}
