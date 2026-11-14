"use client";

import { useId, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Seg, Slider, ToyNote } from "./ui";
import { LIQUIDUS_C, RAIL_MM, ROUTE_GAP_MM, overall, panelFit, peakVerdict, profile, soakVerdict, talVerdict, type Separation, type Tone, type VerdictKey } from "./fab";

export interface ReflowProps {
  peakC?: number;
  talS?: number;
  soakS?: number;
  tab?: "profile" | "panel";
}

export interface ReflowState {
  tab: "profile" | "panel";
  peakC: number;
  talS: number;
  soakS: number;
  verdict: VerdictKey;
  ok: boolean;
  panelCount: number;
}

const PANELS = [
  { value: "100x100", label: "100×100", w: 100, h: 100 },
  { value: "200x150", label: "200×150", w: 200, h: 150 },
  { value: "250x200", label: "250×200", w: 250, h: 200 },
  { value: "300x250", label: "300×250", w: 300, h: 250 },
];

const VERDICT_TEXT: Record<VerdictKey, string> = {
  ok: "Inside the typical window: a profile like this is a sensible starting point.",
  cold: "Cold-joint risk: the peak is too low for lead-free solder to melt and wet fully.",
  hot: "Damage risk: the peak is above what most parts and the board are rated for.",
  wetting: "Poor wetting risk: too little time above liquidus.",
  intermetallic: "Too long above liquidus: excessive intermetallic growth and board stress.",
  soak: "Short soak: uneven heating, tombstoning and voids become more likely.",
  marginal: "Close to the edge of the typical window. Workable, but with little margin.",
};

const TONE_LABEL: Record<Tone, string> = { good: "Typical", warn: "Watch", bad: "Risk" };

// Plot geometry.
const FS = 16;
const W = 360;
const H = 290;
const X0 = 44;
const X1 = 352;
const YT = 16;
const YB = 242;
const T_MAX = 420;
const C_MAX = 280;
const tx = (t: number) => X0 + (t / T_MAX) * (X1 - X0);
const cy = (c: number) => YB - (c / C_MAX) * (YB - YT);

export function Reflow({ props, onChange, revealed }: WidgetProps<ReflowProps>) {
  const [tab, setTab] = useState<"profile" | "panel">(props.tab ?? "profile");
  const [peak, setPeak] = useState(props.peakC ?? 225);
  const [tal, setTal] = useState(props.talS ?? 30);
  const [soak, setSoak] = useState(props.soakS ?? 45);
  const [bw, setBw] = useState(40);
  const [bh, setBh] = useState(30);
  const [panelId, setPanelId] = useState("100x100");
  const [sep, setSep] = useState<Separation>("vscore");
  const locked = Boolean(revealed);
  const uid = useId();

  const panel = PANELS.find((p) => p.value === panelId) ?? PANELS[0];
  const pf = panelFit(bw, bh, panel.w, panel.h, sep);
  const prof = profile({ peakC: peak, talS: tal, soakS: soak });
  const ov = overall({ peakC: peak, talS: tal, soakS: soak });

  const emit = (o: Partial<{ tab: "profile" | "panel"; peak: number; tal: number; soak: number; bw: number; bh: number; panelId: string; sep: Separation }>) => {
    const p = o.peak ?? peak;
    const t = o.tal ?? tal;
    const s = o.soak ?? soak;
    const pn = PANELS.find((x) => x.value === (o.panelId ?? panelId)) ?? PANELS[0];
    const f = panelFit(o.bw ?? bw, o.bh ?? bh, pn.w, pn.h, o.sep ?? sep);
    const v = overall({ peakC: p, talS: t, soakS: s });
    onChange?.({ tab: o.tab ?? tab, peakC: p, talS: t, soakS: s, verdict: v.key, ok: v.ok, panelCount: f.count } satisfies ReflowState);
  };

  const pv = peakVerdict(peak);
  const tv = talVerdict(tal);
  const sv = soakVerdict(soak);
  const peakShown = peak <= LIQUIDUS_C ? "never melts the solder" : `${peak} °C`;
  const pathD = prof.points.map((p, i) => `${i === 0 ? "M" : "L"}${tx(p.t).toFixed(1)},${cy(p.c).toFixed(1)}`).join(" ");
  const tL = prof.points.find((p) => p.c === LIQUIDUS_C);
  const tD = [...prof.points].reverse().find((p) => p.c === LIQUIDUS_C);

  return (
    <div className="w-full">
      <div className="flex justify-center">
        <Seg
          label="View"
          value={tab}
          onChange={(v) => {
            setTab(v);
            emit({ tab: v });
          }}
          options={[
            { value: "profile", label: "Reflow profile" },
            { value: "panel", label: "Panel of boards" },
          ]}
        />
      </div>

      {tab === "profile" ? (
        <div className="mt-3">
          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-3">
            <Slider label="Peak temperature" value={peak} min={200} max={270} step={1} disabled={locked} format={(v) => `${v} °C`} onChange={(v) => { setPeak(v); emit({ peak: v }); }} />
            <Slider label="Time above liquidus" value={tal} min={20} max={150} step={5} disabled={locked} format={(v) => `${v} s`} onChange={(v) => { setTal(v); emit({ tal: v }); }} />
            <Slider label="Soak time (150 to 200 °C)" value={soak} min={20} max={160} step={5} disabled={locked} format={(v) => `${v} s`} onChange={(v) => { setSoak(v); emit({ soak: v }); }} />
          </div>

          <div className="mt-3 rounded-xl border border-line bg-surface p-2">
            <Caption className="mb-1 px-1">Temperature against time (lead-free SAC305 paste)</Caption>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={`${uid}-t`}>
              <title id={`${uid}-t`}>{`Reflow profile: peak ${peakShown}, ${prof.tal} seconds above the 217 degree liquidus, soak ${soak} seconds. ${VERDICT_TEXT[ov.key]}`}</title>
              {[0, 100, 200].map((v) => (
                <g key={v}>
                  <line x1={X0} x2={X1} y1={cy(v)} y2={cy(v)} stroke="var(--line)" strokeWidth={1} />
                  <text x={X0 - 5} y={cy(v) + 5} textAnchor="end" fontSize={FS} fill="var(--ink-3)">{v}</text>
                </g>
              ))}
              {[0, 100, 200, 300, 400].map((v) => (
                <text key={v} x={tx(v)} y={YB + 18} textAnchor="middle" fontSize={FS} fill="var(--ink-3)">{v}</text>
              ))}
              <text x={(X0 + X1) / 2} y={H - 8} textAnchor="middle" fontSize={FS} fill="var(--ink-3)">time, s</text>
              <text x={4} y={YT + 12} fontSize={FS} fill="var(--ink-3)">°C</text>
              <rect x={X0} y={cy(250)} width={X1 - X0} height={cy(235) - cy(250)} fill="var(--brand)" opacity={0.16} />
              <text x={X1 - 3} y={cy(250) - 3} textAnchor="end" fontSize={FS} fill="var(--ink-2)">typical peak 235 to 250</text>
              <line x1={X0} x2={X1} y1={cy(LIQUIDUS_C)} y2={cy(LIQUIDUS_C)} stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="6 4" />
              <text x={X1 - 2} y={cy(LIQUIDUS_C) - 5} textAnchor="end" fontSize={FS} fill="var(--ink)">217 liquidus</text>
              <path d={pathD} fill="none" stroke="var(--brand)" strokeWidth={3} strokeLinejoin="round" />
              {tL && tD && tD.t > tL.t && <line x1={tx(tL.t)} x2={tx(tD.t)} y1={cy(LIQUIDUS_C) + 6} y2={cy(LIQUIDUS_C) + 6} stroke="var(--ink)" strokeWidth={3} />}
              
            </svg>
            <p className="px-1 text-[0.78rem] text-ink-3">Shaded band: typical lead-free peak window. Dashed line: liquidus, where SAC305 solder turns liquid. The thick bar under the dashed line is the time above liquidus (TAL).</p>
          </div>

          <ul className="mt-3 flex flex-col gap-1.5">
            {[
              { k: "Peak", v: pv, val: peakShown },
              { k: "Time above liquidus", v: tv, val: `${prof.tal} s` },
              { k: "Soak", v: sv, val: `${soak} s` },
            ].map((row) => (
              <li key={row.k} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[0.84rem] leading-snug text-ink-2">
                <b className={row.v.tone === "bad" ? "text-[var(--bad)]" : "text-ink"}>
                  {TONE_LABEL[row.v.tone]}: {row.k} ({row.val}).
                </b>{" "}
                {row.v.text}
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Readout label="Profile" value={ov.ok ? "In window" : ov.key === "marginal" ? "Marginal" : "Out of window"} accent />
            <Readout label="Climb" value={`${prof.riseRate.toFixed(1)} °C/s`} />
            <Readout label="Cool after peak" value={`${prof.coolRate.toFixed(1)} °C/s`} />
          </div>
          <div className="mt-3">
            <Note tone={ov.ok ? "accent" : "plain"}>
              {VERDICT_TEXT[ov.key]} These are tendencies, not guarantees: the real profile comes from the paste datasheet and the hottest and coolest spots on <i>your</i> board. Cooling is usually kept under about 6 °C/s.
            </Note>
          </div>
          <p className="mt-2 text-[0.8rem] leading-snug text-ink-2">
            <b>Safety:</b> reflow ovens and hot plates reach well over 240 °C, which burns skin instantly. Flux fumes are irritating: ventilate or extract, and let everything cool before touching it.
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            <Slider label="Board width" value={bw} min={15} max={100} step={5} disabled={locked} format={(v) => `${v} mm`} onChange={(v) => { setBw(v); emit({ bw: v }); }} />
            <Slider label="Board height" value={bh} min={15} max={100} step={5} disabled={locked} format={(v) => `${v} mm`} onChange={(v) => { setBh(v); emit({ bh: v }); }} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div>
              <Caption className="mb-1">Panel size, mm</Caption>
              <Seg label="Panel size" value={panelId} onChange={(v) => { if (!locked) { setPanelId(v); emit({ panelId: v }); } }} options={PANELS.map((p) => ({ value: p.value, label: p.label }))} />
            </div>
            <div>
              <Caption className="mb-1">Separation</Caption>
              <Seg label="Separation method" value={sep} onChange={(v) => { if (!locked) { setSep(v); emit({ sep: v }); } }} options={[{ value: "vscore", label: "V-score" }, { value: "tabs", label: "Tabs (mouse bites)" }]} />
            </div>
          </div>
          <PanelView pf={pf} pw={panel.w} ph={panel.h} sep={sep} uid={uid} />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Readout label="Boards per panel" value={pf.count} accent />
            <Readout label="Layout" value={`${pf.cols} × ${pf.rows}${pf.rotated ? " (turned)" : ""}`} />
          </div>
          <div className="mt-3">
            <Note>
              {pf.count === 0
                ? "The board does not fit between the rails of this panel."
                : sep === "vscore"
                  ? "V-score: a V-shaped groove cut partway through from both sides, so boards sit edge to edge and snap apart. It only works for straight cuts."
                  : `Tab routing: a router cuts the outline (about ${ROUTE_GAP_MM} mm gap) and leaves small tabs with drilled holes (mouse bites) that you snap. It handles any outline but wastes more space.`}{" "}
              Rails ({RAIL_MM} mm is typical) give the machines something to grip; fiducials (small bare copper dots) let the placement machine find the panel&apos;s position.
            </Note>
          </div>
        </div>
      )}
      <ToyNote>Typical figures from paste datasheets, simplified: real profiles are measured with thermocouples on your board. Panel rules differ by fab.</ToyNote>
    </div>
  );
}

function PanelView({ pf, pw, ph, sep, uid }: { pf: ReturnType<typeof panelFit>; pw: number; ph: number; sep: Separation; uid: string }) {
  const VW = 360;
  const maxH = 220;
  const s = Math.min((VW - 8) / pw, maxH / ph);
  const w = pw * s;
  const h = ph * s;
  const ox = (VW - w) / 2 + 0;
  const oy = 4;
  const rail = RAIL_MM * s;
  const gridW = pf.cols * pf.bw + (pf.cols - 1) * pf.gap;
  const gridH = pf.rows * pf.bh + (pf.rows - 1) * pf.gap;
  const gx = ox + ((pw - gridW) / 2) * s;
  const gy = oy + rail + ((pf.usableH - gridH) / 2) * s;
  const boards: { x: number; y: number }[] = [];
  for (let r = 0; r < pf.rows; r++) for (let c = 0; c < pf.cols; c++) boards.push({ x: gx + c * (pf.bw + pf.gap) * s, y: gy + r * (pf.bh + pf.gap) * s });
  const fid = [
    [ox + rail * 0.5, oy + rail * 0.5],
    [ox + w - rail * 0.5, oy + rail * 0.5],
    [ox + w - rail * 0.5, oy + h - rail * 0.5],
  ];
  return (
    <div className="mt-3 rounded-xl border border-line bg-surface p-2">
      <svg viewBox={`0 0 ${VW} ${h + 8}`} className="w-full" role="img" aria-labelledby={`${uid}-p`}>
        <title id={`${uid}-p`}>{`A ${pw} by ${ph} millimetre panel with ${pf.count} boards, ${pf.cols} by ${pf.rows}, separated by ${sep === "vscore" ? "V-score" : "routed tabs"}. Rails top and bottom with fiducials.`}</title>
        <rect x={ox} y={oy} width={w} height={h} rx={3} fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth={1.5} />
        <rect x={ox} y={oy} width={w} height={rail} fill="var(--line)" opacity={0.7} />
        <rect x={ox} y={oy + h - rail} width={w} height={rail} fill="var(--line)" opacity={0.7} />
        {boards.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={pf.bw * s} height={pf.bh * s} fill="var(--brand)" opacity={0.35} stroke="var(--brand)" strokeWidth={1} />
        ))}
        {sep === "vscore" &&
          Array.from({ length: Math.max(pf.cols - 1, 0) }, (_, i) => (
            <line key={`v${i}`} x1={gx + (i + 1) * pf.bw * s} x2={gx + (i + 1) * pf.bw * s} y1={gy} y2={gy + gridH * s} stroke="var(--ink)" strokeWidth={1} strokeDasharray="4 3" />
          ))}
        {sep === "vscore" &&
          Array.from({ length: Math.max(pf.rows - 1, 0) }, (_, i) => (
            <line key={`h${i}`} y1={gy + (i + 1) * pf.bh * s} y2={gy + (i + 1) * pf.bh * s} x1={gx} x2={gx + gridW * s} stroke="var(--ink)" strokeWidth={1} strokeDasharray="4 3" />
          ))}
        {sep === "tabs" &&
          boards.map((b, i) => <circle key={`m${i}`} cx={b.x + (pf.bw * s) / 2} cy={b.y + pf.bh * s + (pf.gap * s) / 2} r={Math.max(1, s * 0.6)} fill="var(--ink)" />)}
        {fid.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={Math.max(2.5, rail * 0.22)} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
        ))}
      </svg>
      <p className="px-1 text-[0.78rem] text-ink-3">Grey strips are rails. Circles are fiducials. Dashed lines are V-score grooves; dots are mouse-bite holes.</p>
    </div>
  );
}

/** goal: { ok, minPeak, maxPeak, minPanel } */
export function checkReflow(state: unknown, goal: Record<string, unknown>) {
  const s = state as ReflowState | undefined;
  if (!s || typeof s.peakC !== "number") return false;
  if (typeof goal.ok === "boolean" && s.ok !== goal.ok) return false;
  if (typeof goal.minPeak === "number" && s.peakC < goal.minPeak) return false;
  if (typeof goal.maxPeak === "number" && s.peakC > goal.maxPeak) return false;
  if (typeof goal.minPanel === "number" && s.panelCount < goal.minPanel) return false;
  return true;
}
