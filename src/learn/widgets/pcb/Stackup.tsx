"use client";

import { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { STACKUPS, UM_PER_OZ, ozToUm, umToMil, viaAllowed, viaSpan, type LayerCount, type ViaKind } from "./board";
import { Caption, Note, ORANGE, Readout, Seg, ToyNote } from "./ui";

export interface StackupProps {
  layers?: LayerCount;
  oz?: 0.5 | 1 | 2;
  via?: ViaKind;
}

export interface StackupState {
  layers: number;
  oz: number;
  um: number;
  via: ViaKind;
  viaLayers: [number, number];
}

const VIA_LABEL: Record<ViaKind, string> = { through: "Through", blind: "Blind", buried: "Buried", micro: "Microvia" };

function build(layers: LayerCount, oz: number, via: ViaKind): StackupState {
  const eff: ViaKind = viaAllowed(via, layers) ? via : "through";
  return { layers, oz, um: Math.round(ozToUm(oz) * 10) / 10, via: eff, viaLayers: viaSpan(eff, layers).span };
}

const X0 = 56;
const X1 = 186;
const VX = 121;

export function Stackup({ props, onChange, revealed }: WidgetProps<StackupProps>) {
  const [layers, setLayers] = useState<LayerCount>(props.layers ?? 2);
  const [oz, setOz] = useState<number>(props.oz ?? 1);
  const [viaRaw, setVia] = useState<ViaKind>(props.via ?? "through");
  const locked = Boolean(revealed);
  const s = build(layers, oz, viaRaw);
  const via = s.via;
  const info = viaSpan(via, layers);
  const stack = STACKUPS[layers];

  const push = (l: LayerCount, z: number, v: ViaKind) => onChange?.(build(l, z, v));

  // ── geometry ──
  const cuH = oz === 0.5 ? 3 : oz === 1 ? 5 : 9;
  const SILK = 7;
  const MASK = 9;
  let y = 12;
  const silkTop = y;
  y += SILK;
  const maskTop = y;
  y += MASK;
  const cu: { y: number; h: number }[] = [];
  const gaps: { y: number; h: number }[] = [];
  stack.layers.forEach((_, i) => {
    cu.push({ y, h: cuH });
    y += cuH;
    if (i < stack.gaps.length) {
      const h = 14 + stack.gaps[i].mm * 26;
      gaps.push({ y, h });
      y += h;
    }
  });
  const maskBot = y;
  y += MASK;
  const silkBot = y;
  y += SILK;
  const H = y + 6;

  const [from, to] = info.span;
  const barrelTop = from === 1 ? (info.outside ? maskTop : cu[0].y) : cu[from - 1].y;
  const barrelBot = to === layers ? (info.outside ? maskBot + MASK : cu[to - 1].y + cuH) : cu[to - 1].y + cuH;
  const bw = via === "micro" ? 4 : 8;
  const padW = via === "micro" ? 16 : 26;
  const connected = (i: number) => i + 1 >= from && i + 1 <= to;
  const um = s.um;

  const names = stack.layers.slice(from - 1, to).map((l) => l.name.split(" ")[0]);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <div>
          <Caption className="mb-1">Layers</Caption>
          <Seg label="Layers" value={layers} options={[{ value: 2, label: "2" }, { value: 4, label: "4" }, { value: 6, label: "6" }]} onChange={(v) => { if (locked) return; const l = v as LayerCount; setLayers(l); push(l, oz, viaRaw); }} />
        </div>
        <div>
          <Caption className="mb-1">Copper weight</Caption>
          <Seg label="Copper weight" value={oz} options={[{ value: 0.5, label: "0.5 oz" }, { value: 1, label: "1 oz" }, { value: 2, label: "2 oz" }]} onChange={(v) => { if (locked) return; setOz(v); push(layers, v, viaRaw); }} />
        </div>
      </div>
      <div className="mt-2">
        <Caption className="mb-1">Via type</Caption>
        <Seg
          label="Via type"
          value={via}
          options={(["through", "blind", "buried", "micro"] as ViaKind[]).filter((v) => viaAllowed(v, layers)).map((v) => ({ value: v, label: VIA_LABEL[v] }))}
          onChange={(v) => { if (locked) return; setVia(v); push(layers, oz, v); }}
        />
        {layers === 2 && <p className="mt-1.5 text-[0.82rem] leading-snug text-ink-2">Blind, buried and micro vias need at least 4 layers: there is no inner layer to stop at.</p>}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <svg viewBox={`0 0 310 ${H}`} className="block w-full" role="img" aria-label={`Side view of a ${layers}-layer board with ${oz} ounce copper. A ${VIA_LABEL[via].toLowerCase()} via connects ${names.join(", ")}.`}>
          {/* silkscreen and solder mask, top and bottom */}
          {[
            { t: silkTop, h: SILK, k: "silk" },
            { t: silkBot, h: SILK, k: "silk" },
          ].map((r, i) => (
            <rect key={`s${i}`} x={X0} y={r.t} width={X1 - X0} height={r.h} fill="var(--ink)" fillOpacity={0.12} stroke="var(--ink-3)" strokeWidth={0.8} strokeDasharray="5 3" />
          ))}
          {[maskTop, maskBot].map((t, i) => (
            <rect key={`m${i}`} x={X0} y={t} width={X1 - X0} height={MASK} fill="var(--brand)" fillOpacity={0.35} />
          ))}
          {/* dielectrics */}
          {gaps.map((g, i) => (
            <g key={`g${i}`}>
              <rect x={X0} y={g.y} width={X1 - X0} height={g.h} fill="var(--ink-3)" fillOpacity={stack.gaps[i].kind === "core" ? 0.3 : 0.16} />
              <text x={X1 + 6} y={g.y + g.h / 2 + 5} fill="var(--ink-2)" fontSize={14}>{`${stack.gaps[i].kind} ${stack.gaps[i].mm} mm`}</text>
              {g.h >= 30 && <text x={X0 + 6} y={g.y + g.h / 2 + 5} fill="var(--ink-2)" fontSize={14}>FR-4</text>}
            </g>
          ))}
          {/* copper */}
          {cu.map((c, i) => {
            const on = connected(i);
            return (
              <g key={`c${i}`}>
                <rect x={X0} y={c.y} width={X1 - X0} height={c.h} fill={ORANGE} stroke={on ? "var(--ink)" : "none"} strokeWidth={on ? 1.5 : 0} />
                <text x={4} y={c.y + c.h / 2 + 5} fill={on ? "var(--ink)" : "var(--ink-2)"} fontSize={14} fontWeight={on ? 700 : 400}>{stack.layers[i].name}</text>
              </g>
            );
          })}
          {/* via barrel and pads */}
          <rect x={VX - bw / 2} y={barrelTop} width={bw} height={barrelBot - barrelTop} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} />
          <rect x={VX - bw / 2 + 2} y={barrelTop} width={Math.max(bw - 4, 1)} height={barrelBot - barrelTop} fill={ORANGE} />
          {cu.map((c, i) =>
            connected(i) ? <rect key={`p${i}`} x={VX - padW / 2} y={c.y - 1} width={padW} height={c.h + 2} fill={ORANGE} stroke="var(--ink)" strokeWidth={1.5} /> : null,
          )}
          <text x={4} y={silkTop + 6} fill="var(--ink-2)" fontSize={14}>silk</text>
          <text x={4} y={silkBot + 6} fill="var(--ink-2)" fontSize={14}>silk</text>
          <text x={X1 + 6} y={maskTop + 8} fill="var(--ink-2)" fontSize={14}>solder mask</text>
          <text x={X1 + 6} y={maskBot + 8} fill="var(--ink-2)" fontSize={14}>solder mask</text>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Copper" value={`${oz} oz = ${um} µm = ${umToMil(um).toFixed(2)} mil`} accent />
        <Readout label="Via connects" value={names.length > 1 ? `${names[0]} to ${names[names.length - 1]}` : names[0]} accent />
        <Readout label="Seen from outside" value={info.outside ? "yes" : "no"} />
      </div>

      <div className="mt-3">
        <Note>
          <b>{VIA_LABEL[via]} via.</b> {info.blurb}
          {via === "through" ? " It touches only the layers where it has a pad or a plane connection; planes it should not touch get a clearance gap." : ""}
        </Note>
      </div>
      <p className="mt-2 text-[0.82rem] leading-snug text-ink-2">
        {stack.note} Dielectric: FR-4 glass-epoxy (εr ≈ 4.2 to 4.7, typical). 1 oz of copper per ft² spreads to about {UM_PER_OZ} µm (often rounded to 35 µm). Blind, buried and micro vias add drilling and lamination steps (HDI), so they cost more.
      </p>
      <ToyNote>Thicknesses are typical and not to scale; your fab publishes its own stack-up, and real inner layers are often 0.5 oz.</ToyNote>
    </div>
  );
}

/** goal: { layers, oz, via } */
export function checkStackup(state: unknown, goal: Record<string, unknown>) {
  const s = state as StackupState | undefined;
  if (!s) return false;
  if (typeof goal.layers === "number" && s.layers !== goal.layers) return false;
  if (typeof goal.oz === "number" && s.oz !== goal.oz) return false;
  if (typeof goal.via === "string" && s.via !== goal.via) return false;
  return true;
}
