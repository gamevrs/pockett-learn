"use client";

import React, { useState } from "react";
import { RotateCcw, Send, StepForward } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout } from "./ui";

/**
 * A small internet: your laptop, five routers and a server. Send a packet and step it hop by hop;
 * at every router the forwarding table picks the next hop. Break a link and the tables update,
 * so the next packet takes another way round.
 */

const POS: Record<string, [number, number]> = {
  A: [38, 105],
  R1: [96, 105],
  R2: [176, 42],
  R3: [176, 168],
  R4: [262, 42],
  R5: [262, 168],
  B: [322, 105],
};
const ORDER = ["A", "R1", "R2", "R3", "R4", "R5", "B"];
const LINKS = ["A-R1", "R1-R2", "R1-R3", "R2-R4", "R2-R5", "R3-R5", "R4-B", "R5-B"];
const NETS: Record<"A" | "B", string> = { A: "192.168.1.0/24", B: "203.0.113.0/24" };
const NAME: Record<string, string> = { A: "Your laptop", B: "Server" };
const START_TTL = 64;

const ends = (l: string) => l.split("-") as [string, string];

function neighbours(node: string, up: string[]) {
  const out: string[] = [];
  for (const l of up) {
    const [a, b] = ends(l);
    if (a === node) out.push(b);
    else if (b === node) out.push(a);
  }
  return out.sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y));
}

/** Hop counts from every node to `dest` over working links (what routing protocols work out). */
function distances(dest: string, up: string[]) {
  const dist: Record<string, number> = { [dest]: 0 };
  const queue = [dest];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of neighbours(cur, up)) {
      if (dist[n] === undefined) {
        dist[n] = dist[cur] + 1;
        queue.push(n);
      }
    }
  }
  return dist;
}

function nextHop(node: string, dest: string, up: string[]) {
  const dist = distances(dest, up);
  if (dist[node] === undefined || node === dest) return null;
  return neighbours(node, up).find((n) => dist[n] === dist[node] - 1) ?? null;
}

export interface RouterMapProps {
  /** Links that start broken, e.g. ["R2-R4"]. */
  broken?: string[];
  /** Links can't be broken (just watch). */
  lockLinks?: boolean;
  showTables?: boolean;
}

export interface RouterMapState {
  path: string[];
  delivered: boolean;
  dropped: boolean;
  broken: string[];
  hops: number;
}

export function RouterMap({ props, onChange, revealed }: WidgetProps<RouterMapProps>) {
  const [broken, setBroken] = useState<string[]>(() => (props.broken ?? []).filter((l) => LINKS.includes(l)));
  const [path, setPath] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<"delivered" | "dropped" | null>(null);
  const [focus, setFocus] = useState<string>("R1");
  const up = LINKS.filter((l) => !broken.includes(l));
  const pos = path.length ? path[path.length - 1] : null;
  // each router lowers the TTL by one as it forwards the packet
  const routersPassed = path.filter((p) => p.startsWith("R") && p !== pos).length;
  const ttl = START_TTL - routersPassed;

  const report = (p: string[], b: string[], o: "delivered" | "dropped" | null) =>
    onChange?.({ path: p, delivered: o === "delivered", dropped: o === "dropped", broken: b, hops: Math.max(0, p.length - 1) } satisfies RouterMapState);

  const toggleLink = (l: string) => {
    if (revealed || props.lockLinks) return;
    const next = broken.includes(l) ? broken.filter((x) => x !== l) : [...broken, l];
    setBroken(next);
    report(path, next, outcome);
  };
  const send = () => {
    if (revealed) return;
    setPath(["A"]);
    setOutcome(null);
    report(["A"], broken, null);
  };
  const step = () => {
    if (revealed || !pos || outcome) return;
    // the laptop always hands packets to its default gateway, R1; routers use their tables
    const nh = pos === "A" ? (up.includes("A-R1") ? "R1" : null) : nextHop(pos, "B", up);
    if (!nh) {
      setOutcome("dropped");
      report(path, broken, "dropped");
      return;
    }
    const next = [...path, nh];
    const o = nh === "B" ? "delivered" : null;
    setPath(next);
    setOutcome(o);
    if (nh.startsWith("R")) setFocus(nh);
    report(next, broken, o);
  };
  const reset = () => {
    setPath([]);
    setOutcome(null);
    report([], broken, null);
  };

  // where the packet would go from here, given today's tables
  const ahead: string[] = [];
  if (pos && !outcome) {
    let cur: string | null = pos;
    for (let i = 0; cur && cur !== "B" && i < 10; i++) {
      const nh: string | null = nextHop(cur, "B", up);
      if (!nh) break;
      ahead.push(`${cur}-${nh}`);
      cur = nh;
    }
  }
  const travelled = path.slice(1).map((n, i) => [path[i], n].sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y)).join("-"));
  const norm = (l: string) => ends(l).sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y)).join("-");
  const aheadN = ahead.map(norm);

  const tableNode = focus;
  const tableRows = (["A", "B"] as const).map((dest) => {
    const d = distances(dest, up)[tableNode];
    const nh = nextHop(tableNode, dest, up);
    return { net: NETS[dest], who: NAME[dest], nh, hops: d };
  });

  return (
    <div className="w-full max-w-2xl">
      <svg viewBox="0 0 360 210" className="w-full select-none" role="img" aria-label="Network of routers between your laptop and a server">
        {LINKS.map((l) => {
          const [a, b] = ends(l);
          const [x1, y1] = POS[a];
          const [x2, y2] = POS[b];
          const isBroken = broken.includes(l);
          const done = travelled.includes(l);
          const next = aheadN.includes(l);
          const stroke = isBroken ? "var(--bad)" : done ? "var(--brand)" : next ? "var(--brand)" : "var(--line-strong)";
          return (
            <g key={l} onClick={() => toggleLink(l)} style={{ cursor: props.lockLinks || revealed ? "default" : "pointer" }}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={22} />
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                style={{ stroke }}
                strokeWidth={done ? 4 : 3}
                strokeDasharray={isBroken ? "5 5" : next && !done ? "2 6" : undefined}
                strokeLinecap="round"
                opacity={next && !done ? 0.9 : 1}
              />
              {isBroken && (
                <g transform={`translate(${(x1 + x2) / 2} ${(y1 + y2) / 2})`}>
                  <circle r={9} style={{ fill: "var(--surface)", stroke: "var(--bad)" }} strokeWidth={1.5} />
                  <path d="M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5" style={{ stroke: "var(--bad)" }} strokeWidth={1.8} strokeLinecap="round" />
                </g>
              )}
            </g>
          );
        })}
        {ORDER.map((n) => {
          const [x, y] = POS[n];
          const here = pos === n;
          const host = n === "A" || n === "B";
          const visited = path.includes(n);
          return (
            <g
              key={n}
              transform={`translate(${x} ${y})`}
              onClick={() => n.startsWith("R") && setFocus(n)}
              style={{ cursor: n.startsWith("R") ? "pointer" : "default" }}
            >
              {host ? (
                <rect x={-32} y={-17} width={64} height={34} rx={8} style={{ fill: here ? "var(--tint)" : "var(--surface)", stroke: here || visited ? "var(--brand)" : "var(--line-strong)" }} strokeWidth={here ? 2.5 : 1.5} />
              ) : (
                <circle r={17} style={{ fill: here ? "var(--tint)" : "var(--surface)", stroke: here || visited ? "var(--brand)" : focus === n ? "var(--ink-3)" : "var(--line-strong)" }} strokeWidth={here ? 2.5 : 1.5} />
              )}
              <text textAnchor="middle" dy={host ? "-0.15em" : "0.35em"} style={{ fill: "var(--ink)" }} fontSize={host ? 10 : 11} fontWeight={600} fontFamily="ui-monospace, monospace">
                {host ? (n === "A" ? "You" : "Server") : n}
              </text>
              {host && (
                <text textAnchor="middle" y={10} style={{ fill: "var(--ink-3)" }} fontSize={7.5} fontFamily="ui-monospace, monospace">
                  {n === "A" ? "192.168.1.20" : "203.0.113.80"}
                </text>
              )}
              {here && <circle r={5} cx={host ? 29 : 13} cy={host ? -15 : -13} style={{ fill: "var(--primary)", stroke: "var(--primary-ink)" }} strokeWidth={1} />}
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {path.length === 0 ? (
          <button type="button" className="btn btn-primary !h-10" onClick={send} disabled={revealed}>
            <Send className="h-4 w-4" /> Send a packet to the server
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-primary !h-10" onClick={step} disabled={revealed || Boolean(outcome)}>
              <StepForward className="h-4 w-4" /> Next hop
            </button>
            <button type="button" className="btn !h-10" onClick={reset} disabled={revealed}>
              <RotateCcw className="h-4 w-4" /> New packet
            </button>
          </>
        )}
        {path.length > 0 && <Readout label="TTL" value={ttl} />}
        {path.length > 0 && <Readout label="Routers passed" value={routersPassed} />}
      </div>

      <div className="mt-3" aria-live="polite">
        {outcome === "delivered" ? (
          <Note tone="good" className="pop-in">
            Delivered: <span className="font-mono text-ink">{path.map((p) => (p === "A" ? "You" : p === "B" ? "Server" : p)).join(" → ")}</span>, {path.length - 1} hops.
          </Note>
        ) : outcome === "dropped" ? (
          <Note tone="bad" className="pop-in">
            {pos === "A" ? "Your laptop has no way out: its link to R1 is down, so the packet can't be sent." : `${pos} has no route to ${NETS.B}. The packet is dropped, and ${pos} sends back a “destination unreachable” message.`}
          </Note>
        ) : pos ? (
          <Note>
            The packet is at <strong>{pos === "A" ? "your laptop" : pos}</strong>.{" "}
            {pos === "A" ? "Your laptop hands it to its router, R1." : `${pos} looks up ${NETS.B} in its table.`}
          </Note>
        ) : (
          <Note>{props.lockLinks ? "Send a packet and step it along." : "Send a packet and step it along. Tap a link (or the buttons below) to break it."}</Note>
        )}
      </div>

      {(props.showTables ?? true) && (
        <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Caption>Forwarding table of {tableNode}</Caption>
            <div className="flex gap-1">
              {["R1", "R2", "R3", "R4", "R5"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFocus(r)}
                  aria-pressed={focus === r}
                  className={`h-10 min-w-10 rounded-full px-2 font-mono text-xs font-semibold transition-colors ${focus === r ? "bg-surface text-ink ring-1 ring-[var(--line-strong)]" : "text-ink-3 hover:text-ink"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <table className="mt-2 w-full table-fixed text-left font-mono text-[12px]">
            <thead className="text-ink-3">
              <tr>
                <th className="w-[46%] py-1 font-medium">Destination</th>
                <th className="py-1 font-medium">Next hop</th>
                <th className="w-[18%] py-1 text-right font-medium">Hops</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.net} className={`border-t border-line ${pos === tableNode && r.net === NETS.B ? "bg-tint" : ""}`}>
                  <td className="truncate py-1.5 text-ink">{r.net}</td>
                  <td className={`py-1.5 ${r.nh ? "text-ink" : "text-bad"}`}>{r.nh ? (r.nh === "A" || r.nh === "B" ? `${r.nh === "A" ? "laptop" : "server"} (direct)` : r.nh) : "no route"}</td>
                  <td className="py-1.5 text-right tabular-nums text-ink-2">{r.hops ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!props.lockLinks && (
        <div className="mt-3">
          <Caption>Links (tap to break or repair)</Caption>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {LINKS.map((l) => {
              const isBroken = broken.includes(l);
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => toggleLink(l)}
                  disabled={revealed}
                  aria-pressed={isBroken}
                  className={`min-h-10 rounded-full border px-3 font-mono text-xs font-medium transition-colors disabled:cursor-default ${
                    isBroken ? "border-[var(--bad)] bg-[var(--bad)]/[0.07] text-bad line-through" : "border-line bg-surface text-ink hover:border-[var(--line-strong)]"
                  }`}
                >
                  {l.replace("A", "You").replace("B", "Server")}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function checkRouterMap(state: unknown, goal: Record<string, unknown>) {
  const st = state as RouterMapState | undefined;
  if (!st) return false;
  if (goal.delivered === true && !st.delivered) return false;
  if (goal.dropped === true && !st.dropped) return false;
  if (typeof goal.avoid === "string" && st.path.includes(goal.avoid)) return false;
  if (typeof goal.via === "string" && !st.path.includes(goal.via)) return false;
  if (typeof goal.minBroken === "number" && st.broken.length < goal.minBroken) return false;
  if (typeof goal.hops === "number" && st.hops !== goal.hops) return false;
  return true;
}
