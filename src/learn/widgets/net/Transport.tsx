"use client";

import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, FastForward, RotateCcw, StepForward, X as XIcon } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Segmented, noise } from "./ui";

/**
 * TCP vs UDP on a lossy link, drawn as a timeline between a client and a server. TCP opens with
 * the three-way handshake, numbers its bytes, waits for ACKs and resends after a timeout. UDP just
 * fires datagrams and forgets them. Step through, or run to the end; the loss setting decides how
 * many packets the link eats (deterministic per run, so a replay gives a new roll).
 */

type Row =
  | { kind: "msg"; dir: "right" | "left"; label: string; lost: boolean; tone: "ctrl" | "data" | "ack" }
  | { kind: "note"; side: "client" | "server" | "both"; text: string; tone: "wait" | "good" | "bad" | "info" };

const BYTES = 100;
const TRIP_MS = 20;
const TIMEOUT_MS = 200;

export interface Sim {
  rows: Row[];
  sent: number;
  retransmits: number;
  delivered: number;
  lost: number;
}

export function simulate(mode: "tcp" | "udp", loss: number, segments: number, seed: number): Sim {
  const rows: Row[] = [];
  let k = 0;
  let sent = 0;
  let lostCount = 0;
  let retransmits = 0;
  // a packet is lost when the link's dice say so (never more than 3 times in a row, to keep runs short)
  const drop = (attempt: number) => {
    k += 1;
    return attempt < 3 && noise(seed, k, loss) * 100 < loss;
  };
  const msg = (dir: "right" | "left", label: string, tone: "ctrl" | "data" | "ack", attempt: number) => {
    const lost = drop(attempt);
    sent += 1;
    if (lost) lostCount += 1;
    rows.push({ kind: "msg", dir, label, lost, tone });
    return lost;
  };

  if (mode === "udp") {
    let delivered = 0;
    for (let i = 0; i < segments; i++) {
      if (!msg("right", `datagram ${i + 1} · ${BYTES} bytes`, "data", 0)) delivered += 1;
    }
    rows.push(
      delivered === segments
        ? { kind: "note", side: "server", text: `All ${segments} datagrams arrived. This time.`, tone: "good" }
        : { kind: "note", side: "server", text: `${delivered} of ${segments} arrived. Nobody notices the missing ones, and nobody resends them.`, tone: "bad" },
    );
    return { rows, sent, retransmits: 0, delivered, lost: lostCount };
  }

  // three-way handshake (relative sequence numbers, as packet tools show them)
  for (let attempt = 0; ; attempt++) {
    if (attempt > 0) retransmits += 1;
    if (msg("right", attempt ? "SYN seq=0 (again)" : "SYN seq=0", "ctrl", attempt)) {
      rows.push({ kind: "note", side: "client", text: "No answer. Timeout: send the SYN again.", tone: "wait" });
      continue;
    }
    if (msg("left", "SYN-ACK seq=0 ack=1", "ctrl", attempt)) {
      rows.push({ kind: "note", side: "client", text: "No answer. Timeout: send the SYN again.", tone: "wait" });
      continue;
    }
    break;
  }
  rows.push({ kind: "msg", dir: "right", label: "ACK ack=1", lost: false, tone: "ctrl" });
  sent += 1;
  rows.push({ kind: "note", side: "both", text: "Handshake done: the connection is open.", tone: "info" });

  for (let i = 0; i < segments; i++) {
    const seq = 1 + i * BYTES;
    let serverHas = false;
    for (let attempt = 0; ; attempt++) {
      if (attempt > 0) retransmits += 1;
      if (msg("right", `seq=${seq} · ${BYTES} bytes${attempt ? " (resent)" : ""}`, "data", attempt)) {
        rows.push({ kind: "note", side: "client", text: `No ACK for seq=${seq}. Timeout: resend it.`, tone: "wait" });
        continue;
      }
      if (serverHas) rows.push({ kind: "note", side: "server", text: "Already have these bytes: drop the copy, ACK again.", tone: "info" });
      serverHas = true;
      if (msg("left", `ACK ack=${seq + BYTES}`, "ack", attempt)) {
        rows.push({ kind: "note", side: "client", text: `The ACK got lost, so no ACK for seq=${seq}. Timeout: resend it.`, tone: "wait" });
        continue;
      }
      break;
    }
  }
  rows.push({ kind: "note", side: "server", text: `All ${segments * BYTES} bytes arrived, in order. (A FIN exchange then closes the connection.)`, tone: "good" });
  return { rows, sent, retransmits, delivered: segments, lost: lostCount };
}

function timeOf(rows: Row[]) {
  let ms = 0;
  for (const r of rows) {
    if (r.kind === "msg") ms += TRIP_MS;
    else if (r.tone === "wait") ms += TIMEOUT_MS;
  }
  return ms;
}

export interface TransportProps {
  /** Fixed protocol, or "choose" for a TCP/UDP switch (default). */
  mode?: "tcp" | "udp" | "choose";
  /** Starting loss in percent (0, 10, 25 or 50). */
  loss?: number;
  /** Hide the loss control. */
  fixedLoss?: boolean;
  segments?: number;
  seed?: number;
}

export interface TransportState {
  mode: "tcp" | "udp";
  loss: number;
  finished: boolean;
  delivered: number;
  total: number;
  retransmits: number;
  sent: number;
  lost: number;
}

const LOSSES = [0, 10, 25, 50];

function Arrow({ row, fresh }: { row: Extract<Row, { kind: "msg" }>; fresh: boolean }) {
  const right = row.dir === "right";
  const color = row.lost ? "var(--bad)" : row.tone === "data" ? "var(--brand)" : "var(--ink-3)";
  return (
    <div className={`relative h-10 ${fresh ? "pop-in" : ""}`}>
      <p
        className={`absolute inset-x-0 top-0 truncate px-1 text-center font-mono text-[11px] font-medium sm:text-[12px] ${row.lost ? "text-bad line-through decoration-1" : "text-ink"}`}
      >
        {row.label}
      </p>
      <div
        className="absolute top-[26px] h-[2px] rounded-full"
        style={{ background: color, left: right ? 0 : row.lost ? "45%" : 0, right: right ? (row.lost ? "45%" : 0) : 0, opacity: row.lost ? 0.85 : 1 }}
      />
      {row.lost ? (
        <span className="absolute top-[18px] grid h-[18px] w-[18px] place-items-center rounded-full bg-[var(--bad)] text-white" style={{ left: "calc(50% - 9px)" }}>
          <XIcon className="h-3 w-3" strokeWidth={3} />
        </span>
      ) : (
        <span
          className="absolute top-[21px] h-0 w-0 border-y-[6px] border-y-transparent"
          style={right ? { right: -1, borderLeft: `8px solid ${color}` } : { left: -1, borderRight: `8px solid ${color}` }}
        />
      )}
    </div>
  );
}

export function Transport({ props, onChange, revealed }: WidgetProps<TransportProps>) {
  const choose = (props.mode ?? "choose") === "choose";
  const segments = Math.max(1, Math.min(6, props.segments ?? 3));
  const [mode, setMode] = useState<"tcp" | "udp">(props.mode === "udp" ? "udp" : "tcp");
  const [loss, setLoss] = useState(LOSSES.includes(props.loss ?? 0) ? (props.loss ?? 0) : 0);
  const [run, setRun] = useState(0);
  const [shown, setShown] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  // keep the newest packet in view as the timeline grows
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown, run, mode, loss]);
  const sim = simulate(mode, loss, segments, (props.seed ?? 1) * 101 + run);
  const finished = shown >= sim.rows.length;
  const visible = sim.rows.slice(0, shown);

  const report = (m: "tcp" | "udp", l: number, r: number, s: number) => {
    const x = simulate(m, l, segments, (props.seed ?? 1) * 101 + r);
    const done = s >= x.rows.length;
    onChange?.({ mode: m, loss: l, finished: done, delivered: done ? x.delivered : 0, total: segments, retransmits: done ? x.retransmits : 0, sent: x.sent, lost: done ? x.lost : 0 } satisfies TransportState);
  };

  const pickMode = (m: "tcp" | "udp") => {
    if (revealed) return;
    setMode(m);
    setShown(0);
    report(m, loss, run, 0);
  };
  const pickLoss = (l: number) => {
    if (revealed) return;
    setLoss(l);
    setShown(0);
    report(mode, l, run, 0);
  };
  const step = () => {
    if (revealed || finished) return;
    setShown(shown + 1);
    report(mode, loss, run, shown + 1);
  };
  const all = () => {
    if (revealed) return;
    setShown(sim.rows.length);
    report(mode, loss, run, sim.rows.length);
  };
  const replay = () => {
    if (revealed) return;
    setRun(run + 1);
    setShown(0);
    report(mode, loss, run + 1, 0);
  };

  const ms = timeOf(visible);
  const resentSoFar = visible.filter((r) => r.kind === "msg" && /again|resent/.test(r.label)).length;

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {choose && (
          <Segmented
            label="Protocol"
            value={mode}
            disabled={revealed}
            options={[
              { id: "tcp", label: "TCP" },
              { id: "udp", label: "UDP" },
            ]}
            onChange={pickMode}
          />
        )}
        {!props.fixedLoss && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-3">Packet loss</span>
            <Segmented label="Packet loss" value={loss} disabled={revealed} options={LOSSES.map((l) => ({ id: l, label: `${l}%` }))} onChange={pickLoss} />
          </div>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-2 sm:p-3">
        <div className="grid grid-cols-[60px_1fr_60px] items-center sm:grid-cols-[76px_1fr_76px]">
          <Caption className="text-center">Client</Caption>
          <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">{mode === "tcp" ? "TCP connection" : "UDP: no connection"}</p>
          <Caption className="text-center">Server</Caption>
        </div>
        <div ref={scroller} className="mt-1 max-h-[380px] overflow-y-auto">
        <div className="relative min-h-[120px] pb-1">
          {/* lanes */}
          <div className="pointer-events-none absolute inset-y-0 left-[30px] w-px bg-[var(--line-strong)] sm:left-[38px]" />
          <div className="pointer-events-none absolute inset-y-0 right-[30px] w-px bg-[var(--line-strong)] sm:right-[38px]" />
          {visible.length === 0 && <p className="py-10 text-center text-sm text-ink-3">Press Step to send the first packet.</p>}
          {visible.map((r, i) =>
            r.kind === "msg" ? (
              <div key={`${run}-${i}`} className="grid grid-cols-[30px_1fr_30px] sm:grid-cols-[38px_1fr_38px]">
                <span />
                <Arrow row={r} fresh={i === visible.length - 1} />
                <span />
              </div>
            ) : (
              <div
                key={`${run}-${i}`}
                className={`relative flex px-2 py-1 ${r.side === "server" ? "justify-end" : r.side === "both" ? "justify-center" : "justify-start"} ${i === visible.length - 1 ? "pop-in" : ""}`}
              >
                <span
                  className={`inline-flex max-w-[85%] items-start gap-1.5 rounded-lg border px-2 py-1 text-[12px] leading-snug ${
                    r.tone === "wait"
                      ? "border-line bg-surface text-ink-2"
                      : r.tone === "good"
                        ? "border-[var(--good)]/40 bg-surface text-ink"
                        : r.tone === "bad"
                          ? "border-[var(--bad)]/40 bg-surface text-ink"
                          : "border-[var(--brand)]/40 bg-surface text-ink"
                  }`}
                >
                  {r.tone === "wait" ? <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" /> : r.tone === "good" ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-good" /> : null}
                  {r.text}
                </span>
              </div>
            ),
          )}
        </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary !h-10" onClick={step} disabled={revealed || finished}>
          <StepForward className="h-4 w-4" /> Step
        </button>
        <button type="button" className="btn !h-10" onClick={all} disabled={revealed || finished}>
          <FastForward className="h-4 w-4" /> Run to the end
        </button>
        <button type="button" className="btn !h-10" onClick={replay} disabled={revealed}>
          <RotateCcw className="h-4 w-4" /> New run
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Readout label="Packets sent" value={visible.filter((r) => r.kind === "msg").length} />
        {mode === "tcp" && <Readout label="Resent" value={resentSoFar} />}
        <Readout label="Time" value={`${ms} ms`} />
      </div>
      {finished && (
        <Note tone={mode === "tcp" || sim.delivered === segments ? "good" : "bad"} className="pop-in mt-2">
          {mode === "tcp"
            ? `Delivered ${segments * BYTES} of ${segments * BYTES} bytes${sim.retransmits ? ` after ${sim.retransmits} resend${sim.retransmits === 1 ? "" : "s"}` : ""}.`
            : `Delivered ${sim.delivered * BYTES} of ${segments * BYTES} bytes, with no handshake and no waiting.`}
        </Note>
      )}
    </div>
  );
}

export function checkTransport(state: unknown, goal: Record<string, unknown>) {
  const st = state as TransportState | undefined;
  if (!st) return false;
  if (typeof goal.mode === "string" && st.mode !== goal.mode) return false;
  if (goal.finished === true && !st.finished) return false;
  if (typeof goal.minLoss === "number" && st.loss < goal.minLoss) return false;
  if (typeof goal.minRetransmits === "number" && st.retransmits < goal.minRetransmits) return false;
  if (goal.someLost === true && !(st.finished && st.lost > 0)) return false;
  return true;
}
