"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { RADIO_KINDS, linkAt, maxRangeM, type RadioKind } from "./logic";
import { Caption, Choice, Note, Readout, Seg, Slider, Toy } from "./ui";

type PlacementId = "clear" | "soil" | "copper";
type Scenario = "explore" | "rooms";

export interface LinkProps {
  /** "explore": every knob free. "rooms": the phone is two rooms away (indoors, 2 walls, 10 m), fixed. */
  scenario?: Scenario;
  radio?: RadioKind;
  txDbm?: number;
  placement?: PlacementId;
}

export interface LinkState {
  radio: RadioKind;
  txDbm: number;
  placement: PlacementId;
  txMa: number;
  distM: number;
  /** margin over the receiver's sensitivity at distM, dB */
  marginDb: number;
  /** distance where the margin falls to the 10 dB fade margin, m */
  rangeM: number;
}

/** Toy antenna losses, dB (typical orders of magnitude, not measurements). */
const PLACEMENTS: { id: PlacementId; title: string; sub: string; lossDb: number }[] = [
  { id: "clear", title: "Keep-out kept clear", sub: "No copper under or beside the antenna, as the module's datasheet asks.", lossDb: 0 },
  { id: "soil", title: "Antenna facing the wet soil", sub: "Water absorbs 2.4 GHz and detunes the antenna. Toy loss: 6 dB.", lossDb: 6 },
  { id: "copper", title: "Ground copper under the antenna", sub: "A ground pour fills the keep-out to 'improve grounding'. Toy loss: 12 dB.", lossDb: 12 },
];

const FADE_MARGIN = 10;
const WALL_DB = 5;
const ROOMS = { n: 3, walls: 2, distM: 10 };

const fmtDbm = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(0)} dBm`;
const fmtDb = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)} dB`;
const fmtM = (m: number) => (m < 1.05 ? "under 1 m" : m >= 1000 ? `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} km` : `${m >= 100 ? m.toFixed(0) : m.toFixed(1)} m`);

function compute(radio: RadioKind, txDbm: number, placement: PlacementId, n: number, walls: number, distM: number): LinkState {
  const r = RADIO_KINDS[radio];
  const p = r.powers.find((x) => x.dbm === txDbm) ?? r.powers[0];
  const ant = PLACEMENTS.find((x) => x.id === placement)!.lossDb;
  const base = { txDbm: p.dbm, gainDb: 0, extraLossDb: ant + walls * WALL_DB, freqMHz: r.freqMHz, sensDbm: r.sensDbm, n };
  const at = linkAt({ ...base, distM });
  return { radio, txDbm: p.dbm, placement, txMa: p.ma, distM, marginDb: at.marginDb, rangeM: maxRangeM(base, FADE_MARGIN) };
}

/** A toy link budget: transmit power, antenna placement, path loss with distance and walls, against the receiver's sensitivity. */
export function Link({ props, onChange }: WidgetProps<LinkProps>) {
  const scenario = props.scenario ?? "explore";
  const fixed = scenario === "rooms";
  const [radio, setRadio] = useState<RadioKind>(props.radio ?? "ble");
  const [txDbm, setTxDbm] = useState<number>(props.txDbm ?? 0);
  const [placement, setPlacement] = useState<PlacementId>(props.placement ?? "clear");
  const [n, setN] = useState<number>(fixed ? ROOMS.n : 2);
  const [walls, setWalls] = useState<number>(fixed ? ROOMS.walls : 0);
  const [logD, setLogD] = useState<number>(fixed ? 1 : Math.log10(20));
  const distM = fixed ? ROOMS.distM : Math.round(10 ** logD * 10) / 10;

  const r = RADIO_KINDS[radio];
  const st = compute(radio, txDbm, placement, n, walls, distM);
  const at = linkAt({ txDbm: st.txDbm, gainDb: 0, extraLossDb: PLACEMENTS.find((x) => x.id === placement)!.lossDb + walls * WALL_DB, freqMHz: r.freqMHz, sensDbm: r.sensDbm, n, distM });
  const ok = st.marginDb >= FADE_MARGIN;

  const update = (rd: RadioKind, tx: number, pl: PlacementId, nn: number, w: number, lg: number) => {
    const rr = RADIO_KINDS[rd];
    const txOk = rr.powers.some((x) => x.dbm === tx) ? tx : rr.powers[Math.floor(rr.powers.length / 2)].dbm;
    setRadio(rd);
    setTxDbm(txOk);
    setPlacement(pl);
    setN(nn);
    setWalls(w);
    setLogD(lg);
    const d = fixed ? ROOMS.distM : Math.round(10 ** lg * 10) / 10;
    onChange?.(compute(rd, txOk, pl, nn, w, d));
  };

  // bar chart: dBm from −140 (left) to +25 (right)
  const X0 = 96;
  const X1 = 290;
  const LO = -140;
  const HI = 25;
  const xOf = (v: number) => X0 + ((Math.max(LO, Math.min(HI, v)) - LO) / (HI - LO)) * (X1 - X0);
  const rows = [
    { label: "Sent", v: st.txDbm, color: "var(--brand)" },
    { label: "Received", v: at.rxDbm, color: ok ? "var(--good)" : "var(--bad)" },
    { label: "Needed", v: r.sensDbm, color: "var(--ink-3)" },
  ];

  return (
    <div className="w-full" data-widget>
      <svg viewBox="0 0 360 112" className="block h-auto w-full rounded-xl border border-line bg-surface" role="img" aria-label={`Link budget at ${fmtM(distM)}: sent ${fmtDbm(st.txDbm)}, received ${at.rxDbm.toFixed(0)} dBm, the receiver needs ${r.sensDbm} dBm, a margin of ${st.marginDb.toFixed(1)} dB.`}>
        {rows.map((row, i) => {
          const y = 10 + i * 32;
          return (
            <g key={row.label}>
              <text x={8} y={y + 15} fontSize={14} fill="var(--ink)">
                {row.label}
              </text>
              <rect x={X0} y={y} width={X1 - X0} height={20} rx={4} fill="var(--surface-2)" />
              <rect x={X0} y={y} width={Math.max(2, xOf(row.v) - X0)} height={20} rx={4} fill={row.color} opacity={row.label === "Needed" ? 0.45 : 0.85} />
              <text x={352} y={y + 15} fontSize={14} textAnchor="end" fill="var(--ink)" className="tabular-nums">
                {`${row.v < 0 ? "−" : row.v > 0 ? "+" : ""}${Math.abs(row.v).toFixed(0)}`}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-xs text-ink-3">Bars in dBm, from −140 dBm at the left to +25 dBm at the right. Further right is more power.</p>

      <div className="mt-3 space-y-3">
        <div>
          <Caption>Radio</Caption>
          <Seg label="Radio" value={radio} onChange={(v) => update(v, txDbm, placement, n, walls, logD)} options={(Object.keys(RADIO_KINDS) as RadioKind[]).map((k) => ({ value: k, label: RADIO_KINDS[k].label }))} className="mt-1" />
        </div>
        <div>
          <Caption>Transmit power</Caption>
          <Seg label="Transmit power" value={st.txDbm} onChange={(v) => update(radio, v, placement, n, walls, logD)} options={r.powers.map((p) => ({ value: p.dbm, label: fmtDbm(p.dbm) }))} className="mt-1" />
        </div>
        <div>
          <Caption>Antenna on Sprout&apos;s board</Caption>
          <div role="radiogroup" aria-label="Antenna placement" className="mt-1 grid gap-1.5">
            {PLACEMENTS.map((p) => (
              <Choice key={p.id} selected={placement === p.id} onClick={() => update(radio, txDbm, p.id, n, walls, logD)} title={p.title} sub={p.sub} />
            ))}
          </div>
        </div>
        {fixed ? (
          <p className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-[0.86rem] leading-snug text-ink-2">
            <strong className="text-ink">Where the phone is:</strong> two rooms away, {ROOMS.distM} m indoors (n = {ROOMS.n}), through {ROOMS.walls} walls at about {WALL_DB} dB each.
          </p>
        ) : (
          <>
            <div>
              <Caption>Surroundings</Caption>
              <Seg
                label="Surroundings"
                value={n}
                onChange={(v) => update(radio, txDbm, placement, v, walls, logD)}
                options={[
                  { value: 2, label: "Open space (n = 2)" },
                  { value: 3, label: "Indoors (n = 3)" },
                ]}
                className="mt-1"
              />
            </div>
            <div>
              <Caption>Walls in the way (about {WALL_DB} dB each)</Caption>
              <Seg label="Walls in the way" value={walls} onChange={(v) => update(radio, txDbm, placement, n, v, logD)} options={[0, 1, 2, 3].map((w) => ({ value: w, label: String(w) }))} className="mt-1" />
            </div>
            <Slider label="Distance to the receiver" value={logD} min={0} max={3.5} step={0.05} onChange={(v) => update(radio, txDbm, placement, n, walls, v)} format={() => fmtM(distM)} />
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Readout label={`Margin at ${fmtM(distM)}`} value={fmtDb(st.marginDb)} accent />
        <Readout label="Range with a 10 dB margin" value={fmtM(st.rangeM)} />
        <Readout label="Current while sending" value={`${st.txMa} mA`} />
      </div>
      <div className="mt-3 space-y-2">
        <Note tone={ok ? "plain" : "accent"}>
          {ok
            ? `The signal arrives ${st.marginDb.toFixed(1)} dB above what the receiver needs, more than the ${FADE_MARGIN} dB fade margin kept for people, doors and a turned phone.`
            : st.marginDb >= 0
              ? `Only ${st.marginDb.toFixed(1)} dB to spare: it works on a good day, but less than the ${FADE_MARGIN} dB fade margin, so a person walking past can drop the link.`
              : `The signal arrives ${Math.abs(st.marginDb).toFixed(1)} dB below what the receiver needs: no link.`}
        </Note>
        {radio !== "ble" && (
          <Note>
            {radio === "wifi"
              ? `Wi-Fi talks to ${r.talksTo}, but it draws about ${st.txMa} mA while sending, far more than a coin cell can deliver in a burst.`
              : `LoRa reaches much further at a low data rate, but it talks to ${r.talksTo}, and a long packet keeps about ${st.txMa} mA flowing for a large part of a second.`}
          </Note>
        )}
      </div>
      <Toy>
        A toy log-distance model: path loss = free-space loss at 1 m (about 40 dB at 2.4 GHz, 31 dB at 868 MHz) + 10·n·log10(distance), plus walls and the antenna loss shown, with 0 dBi antennas. Transmit powers, sensitivities and currents are typical round numbers. Real range depends on the building, people and the phone: measure it.
      </Toy>
    </div>
  );
}

/** goal: { minMarginDb?, maxTxMa?, radio?, placement?, minRangeM? }. */
export function checkLink(state: unknown, goal: Record<string, unknown>) {
  const s = state as LinkState | undefined;
  if (!s) return false;
  if (typeof goal.minMarginDb === "number" && s.marginDb < goal.minMarginDb) return false;
  if (typeof goal.maxTxMa === "number" && s.txMa > goal.maxTxMa) return false;
  if (typeof goal.minRangeM === "number" && s.rangeM < goal.minRangeM) return false;
  if (typeof goal.radio === "string" && s.radio !== goal.radio) return false;
  if (typeof goal.placement === "string" && s.placement !== goal.placement) return false;
  return true;
}
