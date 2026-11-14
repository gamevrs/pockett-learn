"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { MATERIALS, SI_ATOMS, material, photonCrosses, photonEv, thermalCarriers, type MaterialId } from "./phys";
import { Note, Readout, Seg, Slider, Toy, ORANGE, sci } from "./ui";

// ───────────────────────────── semi-bands: conductor, semiconductor, insulator ─────────────────────────────

export interface BandsProps {
  material?: MaterialId;
  tempK?: number;
  /** Show the light control. */
  light?: boolean;
  /** Only offer these materials. */
  materials?: MaterialId[];
}

export interface BandsState {
  material: MaterialId;
  tempK: number;
  /** 0 = no light. */
  lightNm: number;
  /** Electrons in the conduction band from heat, per cm³. */
  ni: number;
  /** The light is lifting electrons across the gap. */
  photo: boolean;
}

const LIGHTS = [
  { nm: 0, label: "Off" },
  { nm: 1550, label: "Infrared 1550 nm" },
  { nm: 1000, label: "Infrared 1000 nm" },
  { nm: 650, label: "Red 650 nm" },
  { nm: 450, label: "Blue 450 nm" },
  { nm: 250, label: "UV 250 nm" },
  { nm: 120, label: "Far UV 120 nm" },
];

const W = 360;
const H = 236;
const X0 = 22;
const X1 = 300;
const VB_TOP = 176;
const VB_H = 40;
const CB_H = 40;

/** Gap drawn compressed so a 9 eV gap still fits: px = 120 · Eg / (Eg + 1.5). */
const gapPx = (eg: number) => (eg <= 0 ? -16 : Math.round((120 * eg) / (eg + 1.5)));

/** Dots to draw for a carrier density: one per factor of ten above 10², at most 14. */
const dotsFor = (ni: number) => Math.max(0, Math.min(14, Math.round(Math.log10(Math.max(ni, 1)) - 2)));

const dotX = (i: number, n: number) => Math.round(X0 + 16 + ((X1 - X0 - 32) * (i + 0.5)) / Math.max(n, 1));

export function Bands({ props, onChange }: WidgetProps<BandsProps>) {
  const [mat, setMat] = useState<MaterialId>(props.material ?? "si");
  const [tempK, setTempK] = useState(props.tempK ?? 300);
  const [lightNm, setLightNm] = useState(0);

  const m = material(mat);
  const ni = thermalCarriers(m.gap, tempK);
  const photo = lightNm > 0 && photonCrosses(m.gap, lightNm);

  const report = (id: MaterialId, t: number, l: number) => {
    const mm = material(id);
    onChange?.({ material: id, tempK: t, lightNm: l, ni: thermalCarriers(mm.gap, t), photo: l > 0 && photonCrosses(mm.gap, l) } satisfies BandsState);
  };

  const metal = m.gap <= 0;
  const g = gapPx(m.gap);
  const cbBottom = VB_TOP - g;
  const cbTop = cbBottom - CB_H;
  const heat = metal ? 0 : dotsFor(ni);
  const lightDots = photo ? 4 : 0;
  const shown = heat + lightDots;
  const opts = (props.materials ?? MATERIALS.map((x) => x.id)).map((id) => ({ value: id, label: material(id).name }));

  const verdict = metal
    ? "In a metal the bands overlap: a huge number of electrons can move at any temperature. It always conducts."
    : photo
      ? `Each ${lightNm} nm photon carries ${photonEv(lightNm).toFixed(2)} eV, enough to cross the ${m.gap} eV gap, so light lifts extra electrons into the conduction band.`
      : lightNm > 0
        ? `A ${lightNm} nm photon carries only ${photonEv(lightNm).toFixed(2)} eV, less than the ${m.gap} eV gap: the light passes straight through without freeing anything.`
        : m.kind === "insulator"
          ? `A ${m.gap} eV gap is far too wide for heat to cross: practically no electrons reach the conduction band, so it insulates.`
          : `Heat alone lifts about ${sci(ni)} electrons per cm³ across the ${m.gap} eV gap${mat === "si" && ni >= 1 ? `, about 1 for every ${sci(SI_ATOMS / ni)} atoms` : ""}. Each one leaves a hole behind.`;

  return (
    <div className="w-full" data-widget>
      <Seg label="Material" value={mat} onChange={(v) => (setMat(v), report(v, tempK, lightNm))} options={opts} />
      <div className="mt-3">
        <Slider label="Temperature" value={tempK} min={100} max={700} step={25} onChange={(v) => (setTempK(v), report(mat, v, lightNm))} format={(v) => `${v} K (${v - 273} °C)`} />
      </div>
      {props.light && (
        <div className="mt-2">
          <p className="mb-1 text-xs text-ink-3">Shine light</p>
          <Seg label="Light" value={lightNm} onChange={(v) => (setLightNm(v), report(mat, tempK, v))} options={LIGHTS.map((l) => ({ value: l.nm, label: l.label }))} />
        </div>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 block h-auto w-full rounded-xl border border-line bg-surface" role="img" aria-label={`${m.name} energy bands. ${metal ? "The bands overlap." : `Band gap ${m.gap} electronvolts.`} ${verdict}`}>
        {/* energy axis */}
        <line x1={10} y1={H - 14} x2={10} y2={12} stroke="var(--ink-3)" strokeWidth={1.2} />
        <path d="M6 18 L10 10 L14 18" fill="none" stroke="var(--ink-3)" strokeWidth={1.2} />
        {/* conduction band */}
        <rect x={X0} y={metal ? VB_TOP - CB_H + 16 : cbTop} width={X1 - X0} height={CB_H} rx={6} fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth={1.2} />
        <text x={X0 + 8} y={(metal ? VB_TOP - CB_H + 16 : cbTop) + 16} fontSize={14} fill="var(--ink-2)">
          conduction band
        </text>
        {/* valence band */}
        <rect x={X0} y={VB_TOP} width={X1 - X0} height={VB_H} rx={6} fill="var(--tint)" stroke="var(--line-strong)" strokeWidth={1.2} />
        <text x={X0 + 8} y={VB_TOP + VB_H - 7} fontSize={14} fill="var(--ink-2)">
          valence band (full)
        </text>
        {Array.from({ length: 18 }, (_, i) => {
          const x = X0 + 14 + i * 15.5;
          const hole = !metal && i % 3 === 1 && Math.floor(i / 3) < Math.min(shown, 6);
          return <circle key={i} cx={Math.round(x)} cy={VB_TOP + 13} r={4} fill={hole ? "var(--surface)" : "var(--ink-2)"} stroke="var(--ink-2)" strokeWidth={1.2} />;
        })}
        {metal ? (
          <>
            {Array.from({ length: 16 }, (_, i) => (
              <circle key={i} cx={dotX(i, 16)} cy={VB_TOP - (i % 2 ? 8 : 16)} r={4} fill="var(--brand)" />
            ))}
            <text x={X1 + 6} y={VB_TOP - 6} fontSize={14} fill="var(--ink)">
              overlap
            </text>
          </>
        ) : (
          <>
            {/* the gap */}
            <line x1={X1 + 14} y1={cbBottom} x2={X1 + 14} y2={VB_TOP} stroke="var(--ink)" strokeWidth={1.3} />
            <path d={`M${X1 + 10} ${cbBottom + 6} L${X1 + 14} ${cbBottom} L${X1 + 18} ${cbBottom + 6} M${X1 + 10} ${VB_TOP - 6} L${X1 + 14} ${VB_TOP} L${X1 + 18} ${VB_TOP - 6}`} fill="none" stroke="var(--ink)" strokeWidth={1.3} />
            <text x={W - 4} y={Math.round((cbBottom + VB_TOP) / 2) + 5} textAnchor="end" fontSize={14} fontWeight={600} fill="var(--ink)">
              {m.gap} eV
            </text>
            {g > 40 && (
              <text x={(X0 + X1) / 2} y={Math.round((cbBottom + VB_TOP) / 2) + 5} textAnchor="middle" fontSize={14} fill="var(--ink-3)">
                band gap: no states here
              </text>
            )}
            {Array.from({ length: shown }, (_, i) => {
              const isLight = i >= heat;
              return <circle key={i} cx={dotX(i, Math.max(shown, 6))} cy={cbBottom - (i % 2 ? 12 : 26)} r={4.5} fill={isLight ? ORANGE : "var(--brand)"} />;
            })}
            {lightNm > 0 &&
              (photo ? (
                <g>
                  <path d={`M${X0 + 4} ${VB_TOP - 30} q 6 -8 12 0 t 12 0 t 12 0 t 12 0`} fill="none" stroke={ORANGE} strokeWidth={2} />
                  <line x1={X0 + 56} y1={VB_TOP + 6} x2={X0 + 56} y2={cbBottom + 2} stroke={ORANGE} strokeWidth={2} strokeDasharray="4 3" />
                  <path d={`M${X0 + 51} ${cbBottom + 9} L${X0 + 56} ${cbBottom + 1} L${X0 + 61} ${cbBottom + 9}`} fill="none" stroke={ORANGE} strokeWidth={2} />
                </g>
              ) : (
                <path d={`M${X0 + 4} ${Math.round((cbBottom + VB_TOP) / 2) - (g > 40 ? 16 : 0)} q 8 -8 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0`} fill="none" stroke={ORANGE} strokeWidth={2} />
              ))}
          </>
        )}
        <text x={18} y={H - 2} fontSize={14} fill="var(--ink-3)">
          energy ↑
        </text>
        <text x={X1} y={H - 2} textAnchor="end" fontSize={14} fill="var(--ink-3)">
          {metal ? "" : "dot ≈ ×10 more electrons"}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Band gap" value={metal ? "none (bands overlap)" : `${m.gap} eV`} />
        <Readout label="Free electrons from heat" value={`${sci(ni)} /cm³`} accent={!metal && ni > 1e12} />
        {props.light && lightNm > 0 && <Readout label="Photon energy" value={`${photonEv(lightNm).toFixed(2)} eV`} accent={photo} />}
      </div>
      <div className="mt-3">
        <Note tone={photo ? "accent" : "plain"}>{verdict}</Note>
      </div>
      <Toy>
        Toy model: room-temperature gaps held fixed as the material warms, one formula (n ∝ T^1.5 · e^(−Eg/2kT)) tuned so pure silicon has 1 × 10¹⁰ free electrons per cm³ at 300 K. Big gaps are drawn compressed.
      </Toy>
    </div>
  );
}

/** goal: { material, minNi, maxNi, photo, minTemp, maxTemp } */
export function checkBands(state: unknown, goal: Record<string, unknown>) {
  const s = state as BandsState | undefined;
  if (!s) return false;
  if (typeof goal.material === "string" && s.material !== goal.material) return false;
  if (typeof goal.minNi === "number" && s.ni < goal.minNi) return false;
  if (typeof goal.maxNi === "number" && s.ni > goal.maxNi) return false;
  if (typeof goal.photo === "boolean" && s.photo !== goal.photo) return false;
  if (typeof goal.minTemp === "number" && s.tempK < goal.minTemp) return false;
  if (typeof goal.maxTemp === "number" && s.tempK > goal.maxTemp) return false;
  if (typeof goal.light === "boolean" && s.lightNm > 0 !== goal.light) return false;
  return true;
}
