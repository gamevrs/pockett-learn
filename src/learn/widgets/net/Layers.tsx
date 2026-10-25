"use client";

import React, { useState } from "react";
import { ArrowRight, PackageOpen, Package, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Segmented } from "./ui";

/**
 * Encapsulation: the application's data is wrapped in a TCP (or UDP) segment, that in an IP
 * packet, that in an Ethernet frame. Send it, then unwrap layer by layer at the other end. A side
 * panel maps the four TCP/IP layers onto the seven OSI layers.
 */

type LayerId = "app" | "transport" | "internet" | "link";
const STACK: LayerId[] = ["app", "transport", "internet", "link"];

interface LayerInfo {
  name: string;
  unit: string;
  header: number;
  trailer?: number;
  fields: [string, string][];
  wrapVerb: string;
  unwrapNote: string;
}

function layers(proto: "tcp" | "udp"): Record<LayerId, LayerInfo> {
  const tcp = proto === "tcp";
  return {
    app: {
      name: "Application",
      unit: tcp ? "HTTP data" : "DNS query",
      header: 0,
      fields: tcp ? [["", "GET / HTTP/1.1  Host: shop.example.com"]] : [["", "What is the address of www.example.com?"]],
      wrapVerb: "",
      unwrapNote: tcp ? "The web server reads the request: GET /." : "The DNS server reads the question.",
    },
    transport: {
      name: "Transport",
      unit: tcp ? "TCP segment" : "UDP datagram",
      header: tcp ? 20 : 8,
      fields: tcp
        ? [["src port", "51514"], ["dst port", "80"], ["seq", "1"], ["ack", "1"]]
        : [["src port", "50000"], ["dst port", "53"], ["length", "47"]],
      wrapVerb: tcp ? "Add a TCP header" : "Add a UDP header",
      unwrapNote: tcp ? "Port 80: hand the data to the web server program." : "Port 53: hand the data to the DNS server program.",
    },
    internet: {
      name: "Internet",
      unit: "IP packet",
      header: 20,
      fields: [["src", "192.168.1.20"], ["dst", "203.0.113.80"], ["TTL", "64"], ["protocol", tcp ? "6 (TCP)" : "17 (UDP)"]],
      wrapVerb: "Add an IP header",
      unwrapNote: `Destination 203.0.113.80 is this machine. Protocol ${tcp ? "6 means TCP" : "17 means UDP"}: pass it up.`,
    },
    link: {
      name: "Link",
      unit: "Ethernet frame",
      header: 14,
      trailer: 4,
      fields: [["dst MAC", "3c:22:fb:10:5e:01"], ["src MAC", "a4:83:e7:2b:9c:44"], ["type", "IPv4"]],
      wrapVerb: "Add an Ethernet header and checksum",
      unwrapNote: "The MAC address matches and the checksum is right: pass the packet up to IP.",
    },
  };
}

const OSI: { n: number; name: string; tcpip: LayerId }[] = [
  { n: 7, name: "Application", tcpip: "app" },
  { n: 6, name: "Presentation", tcpip: "app" },
  { n: 5, name: "Session", tcpip: "app" },
  { n: 4, name: "Transport", tcpip: "transport" },
  { n: 3, name: "Network", tcpip: "internet" },
  { n: 2, name: "Data link", tcpip: "link" },
  { n: 1, name: "Physical", tcpip: "link" },
];

export interface LayersProps {
  protocol?: "tcp" | "udp";
  /** Which model the side panel shows first, or hide the switch with a fixed one. */
  model?: "tcpip" | "osi";
  fixedModel?: boolean;
  /** Hide the unwrap half (wrap only). */
  wrapOnly?: boolean;
}

export interface LayersState {
  depth: number;
  phase: "sender" | "receiver";
  delivered: boolean;
  model: "tcpip" | "osi";
}

function Box({ id, info, depth, inner, top }: { id: LayerId; info: LayerInfo; depth: number; inner: React.ReactNode; top: boolean }) {
  const shade = id === "app" ? "border-[var(--brand)]/50 bg-tint" : depth % 2 === 0 ? "border-[var(--line-strong)] bg-surface-2" : "border-[var(--line-strong)] bg-surface";
  return (
    <div className={`min-w-0 rounded-xl border p-1.5 sm:p-2 ${shade} ${top ? "pop-in" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1">
        <span className="text-[11.5px] font-semibold text-ink">{info.unit}</span>
        {info.header > 0 && <span className="font-mono text-[10.5px] text-ink-3">header {info.header} B{info.trailer ? ` + checksum ${info.trailer} B` : ""}</span>}
      </div>
      {id === "app" ? (
        <p className="mt-1 break-words px-1 font-mono text-[12px] text-ink">{info.fields[0][1]}</p>
      ) : (
        <>
          <div className="mt-1 flex flex-wrap gap-1 px-1">
            {info.fields.map(([k, v]) => (
              <span key={k} className="inline-flex items-baseline gap-1 rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[10.5px]">
                <span className="text-ink-3">{k}</span>
                <span className="text-ink">{v}</span>
              </span>
            ))}
          </div>
          <div className="mt-1.5">{inner}</div>
          {info.trailer && <div className="mt-1.5 rounded-md border border-dashed border-[var(--line-strong)] px-2 py-0.5 text-center font-mono text-[10.5px] text-ink-3">checksum (FCS)</div>}
        </>
      )}
    </div>
  );
}

export function Layers({ props, onChange, revealed }: WidgetProps<LayersProps>) {
  const proto = props.protocol ?? "tcp";
  const L = layers(proto);
  const [depth, setDepth] = useState(1);
  const [phase, setPhase] = useState<"sender" | "receiver">("sender");
  const [model, setModel] = useState<"tcpip" | "osi">(props.model ?? "tcpip");
  const [delivered, setDelivered] = useState(false);
  const [lastNote, setLastNote] = useState<string | null>(null);

  const appBytes = new TextEncoder().encode(L.app.fields[0][1]).length;
  const total = STACK.slice(0, depth).reduce((t, id) => t + L[id].header + (L[id].trailer ?? 0), 0) + appBytes;
  const report = (d: number, p: "sender" | "receiver", del: boolean, m = model) => onChange?.({ depth: d, phase: p, delivered: del, model: m } satisfies LayersState);

  const wrap = () => {
    if (revealed || depth >= 4) return;
    setDepth(depth + 1);
    setLastNote(null);
    report(depth + 1, phase, false);
  };
  const send = () => {
    if (revealed) return;
    setPhase("receiver");
    setLastNote("The frame travels as bits on the wire (or radio waves on Wi-Fi) and arrives at the server.");
    report(4, "receiver", false);
  };
  const unwrap = () => {
    if (revealed || delivered) return;
    const top = STACK[depth - 1];
    if (depth === 1) {
      setDelivered(true);
      setLastNote(L.app.unwrapNote);
      report(1, "receiver", true);
      return;
    }
    setDepth(depth - 1);
    setLastNote(L[top].unwrapNote);
    report(depth - 1, "receiver", false);
  };
  const reset = () => {
    setDepth(1);
    setPhase("sender");
    setDelivered(false);
    setLastNote(null);
    report(1, "sender", false);
  };

  // build nested boxes from the inside out
  let nested: React.ReactNode = null;
  for (let i = 0; i < depth; i++) {
    const id = STACK[i];
    nested = <Box key={id} id={id} info={L[id]} depth={i} inner={nested} top={i === depth - 1} />;
  }
  const activeLayer = delivered ? "app" : STACK[depth - 1];
  const wrapDone = depth >= 4;

  return (
    <div className="w-full max-w-2xl">
      <div className="grid gap-3 md:grid-cols-[1fr_200px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Caption>{phase === "sender" ? "Sender: your laptop" : "Receiver: the server"}</Caption>
            <Readout label="Size" value={`${total} B`} />
          </div>
          <div className="mt-2">{delivered ? <Note tone="good" className="pop-in">Delivered to the program: <span className="font-mono">{L.app.fields[0][1]}</span></Note> : nested}</div>

          <div className="mt-3 flex flex-wrap gap-2">
            {phase === "sender" ? (
              !wrapDone ? (
                <button type="button" className="btn btn-primary !h-10" onClick={wrap} disabled={revealed}>
                  <Package className="h-4 w-4" /> {L[STACK[depth]].wrapVerb}
                </button>
              ) : props.wrapOnly ? null : (
                <button type="button" className="btn btn-primary !h-10" onClick={send} disabled={revealed}>
                  <ArrowRight className="h-4 w-4" /> Send it
                </button>
              )
            ) : !delivered ? (
              <button type="button" className="btn btn-primary !h-10" onClick={unwrap} disabled={revealed}>
                <PackageOpen className="h-4 w-4" /> {depth === 1 ? "Hand the data to the program" : `Unwrap the ${L[STACK[depth - 1]].unit}`}
              </button>
            ) : null}
            {(depth > 1 || phase === "receiver") && (
              <button type="button" className="btn !h-10" onClick={reset} disabled={revealed}>
                <RotateCcw className="h-4 w-4" /> Start over
              </button>
            )}
          </div>
          {lastNote && (
            <Note className="pop-in mt-2" key={lastNote}>
              {lastNote}
            </Note>
          )}
        </div>

        <div className="rounded-xl border border-line bg-surface-2 p-2.5">
          {!props.fixedModel && (
            <Segmented
              label="Model"
              className="w-full"
              value={model}
              options={[
                { id: "tcpip", label: "TCP/IP" },
                { id: "osi", label: "OSI" },
              ]}
              onChange={(m) => {
                setModel(m);
                report(depth, phase, delivered, m);
              }}
            />
          )}
          <ol className="mt-2 grid gap-1">
            {model === "tcpip"
              ? STACK.map((id, i) => (
                  <li key={id} className={`flex min-h-10 items-center gap-2 rounded-lg border px-2 text-[12.5px] ${activeLayer === id ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink-2"}`}>
                    <span className="font-mono text-[10.5px] text-ink-3">{4 - i}</span>
                    <span className="font-semibold">{L[id].name}</span>
                  </li>
                ))
              : OSI.map((o) => (
                  <li key={o.n} className={`flex min-h-8 items-center gap-2 rounded-lg border px-2 text-[12px] ${activeLayer === o.tcpip ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink-2"}`}>
                    <span className="font-mono text-[10.5px] text-ink-3">{o.n}</span>
                    <span className="font-semibold">{o.name}</span>
                    <span className="ml-auto truncate text-[10.5px] text-ink-3">{L[o.tcpip].name}</span>
                  </li>
                ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export function checkLayers(state: unknown, goal: Record<string, unknown>) {
  const st = state as LayersState | undefined;
  if (!st) return false;
  if (typeof goal.depth === "number" && st.depth !== goal.depth) return false;
  if (typeof goal.phase === "string" && st.phase !== goal.phase) return false;
  if (goal.delivered === true && !st.delivered) return false;
  if (typeof goal.model === "string" && st.model !== goal.model) return false;
  return true;
}
