"use client";

import React, { useState } from "react";
import { Cloud, Globe, Laptop, Printer, Router, Server, Smartphone, Tv, Building2 } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { InlineProse } from "@/components/ui/Prose";
import { Caption, Note, Segmented } from "./ui";

/**
 * A tiny map of one home network and the internet beyond it. Explore mode: tap a device to see
 * its job (client, server, router). Send mode: tap a sender then a receiver and watch the path the
 * message takes, and whether it ever leaves the home network.
 */

type Role = "Client" | "Server" | "Router" | "Network";
interface NodeInfo {
  name: string;
  role: Role;
  icon: typeof Laptop;
  parent?: string;
  home: boolean;
  about: string;
}

const NODES: Record<string, NodeInfo> = {
  laptop: { name: "Laptop", role: "Client", icon: Laptop, parent: "router", home: true, about: "Opens websites and videos: it *asks* other machines for things." },
  phone: { name: "Phone", role: "Client", icon: Smartphone, parent: "router", home: true, about: "Another client on the same Wi-Fi. It asks, servers answer." },
  tv: { name: "Smart TV", role: "Client", icon: Tv, parent: "router", home: true, about: "Streams video: a client of the video service." },
  printer: { name: "Printer", role: "Server", icon: Printer, parent: "router", home: true, about: "Waits for print jobs from the laptop and phone. It *answers* requests, so it acts as a small server." },
  router: { name: "Home router", role: "Router", icon: Router, parent: "isp", home: true, about: "Links every device in the home together (Wi-Fi and cables) and is the one door to the internet." },
  isp: { name: "Internet provider", role: "Router", icon: Building2, parent: "internet", home: false, about: "Your provider's routers carry traffic between your home and the rest of the internet." },
  internet: { name: "The internet", role: "Network", icon: Cloud, home: false, about: "Thousands of networks run by different companies, joined by routers. A network of networks." },
  web: { name: "News site server", role: "Server", icon: Server, parent: "internet", home: false, about: "A computer in a data centre that waits for requests and sends back web pages." },
  video: { name: "Video server", role: "Server", icon: Globe, parent: "internet", home: false, about: "Sends video to anyone who asks for it, millions of clients at once." },
};

const HOME_DEVICES = ["laptop", "phone", "tv", "printer"];
const REMOTE = ["isp", "internet", "web", "video"];

function chain(id: string): string[] {
  const out = [id];
  let cur = NODES[id]?.parent;
  while (cur) {
    out.push(cur);
    cur = NODES[cur]?.parent;
  }
  return out;
}

/** Path through the tree: up from `a` to the common ancestor, then down to `b`. */
export function netPath(a: string, b: string): string[] {
  if (a === b) return [a];
  const up = chain(a);
  const down = chain(b);
  const common = up.find((n) => down.includes(n)) ?? up[up.length - 1];
  return [...up.slice(0, up.indexOf(common) + 1), ...down.slice(0, down.indexOf(common)).reverse()];
}

export interface NetworkMapProps {
  /** "explore" (tap to read), "send" (tap a sender then a receiver), or "both" (a switch). */
  mode?: "explore" | "send" | "both";
}

export interface NetworkMapState {
  selected: string | null;
  from: string | null;
  to: string | null;
  path: string[];
  viaInternet: boolean;
}

export function NetworkMap({ props, onChange, revealed, status, goal }: WidgetProps<NetworkMapProps>) {
  const both = props.mode === "both";
  const [mode, setMode] = useState<"explore" | "send">(props.mode === "send" ? "send" : "explore");
  const [selected, setSelected] = useState<string | null>(null);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);

  // show the solution when the learner gives up
  const show = status === "revealed" && goal;
  const vSelected = show && typeof goal.selected === "string" ? goal.selected : selected;
  const vFrom = show && typeof goal.from === "string" ? goal.from : from;
  const vTo = show && typeof goal.to === "string" ? goal.to : to;
  const path = vFrom && vTo ? netPath(vFrom, vTo) : [];

  const report = (s: string | null, f: string | null, t: string | null) => {
    const p = f && t ? netPath(f, t) : [];
    onChange?.({ selected: s, from: f, to: t, path: p, viaInternet: p.includes("internet") } satisfies NetworkMapState);
  };

  const tap = (id: string) => {
    if (revealed) return;
    if (mode === "explore") {
      setSelected(id);
      report(id, from, to);
      return;
    }
    if (id === "internet") return;
    // first tap picks the sender, second the receiver; a third starts over
    if (!from || (from && to)) {
      setFrom(id);
      setTo(null);
      report(selected, id, null);
    } else if (id !== from) {
      setTo(id);
      report(selected, from, id);
    }
  };

  const nodeBtn = (id: string, wide = false) => {
    const n = NODES[id];
    const Icon = n.icon;
    const step = path.indexOf(id);
    const onPath = step >= 0;
    const picked = mode === "explore" ? vSelected === id : vFrom === id || vTo === id;
    const disabled = revealed || (mode === "send" && id === "internet");
    return (
      <button
        key={id}
        type="button"
        onClick={() => tap(id)}
        disabled={disabled}
        aria-pressed={picked}
        className={`relative flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center transition-colors disabled:cursor-default ${
          wide ? "col-span-2" : ""
        } ${
          picked
            ? "border-[var(--brand)] bg-tint"
            : onPath
              ? "border-[var(--brand)]/60 bg-surface"
              : "border-line bg-surface hover:border-[var(--line-strong)]"
        }`}
      >
        {onPath && mode === "send" && (
          <span className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-primary font-mono text-[10px] font-bold text-primary-ink">{step + 1}</span>
        )}
        <Icon className={`h-5 w-5 ${picked || onPath ? "text-brand" : "text-ink-2"}`} />
        <span className="text-[12px] font-medium leading-tight text-ink">{n.name}</span>
      </button>
    );
  };

  const info = vSelected ? NODES[vSelected] : null;
  const viaInternet = path.includes("internet");
  const leftHome = path.some((p) => !NODES[p].home);

  return (
    <div className="w-full max-w-2xl">
      {both && (
        <div className="mb-3 flex justify-center">
          <Segmented
            label="Mode"
            value={mode}
            disabled={revealed}
            options={[
              { id: "explore", label: "Explore" },
              { id: "send", label: "Send a message" },
            ]}
            onChange={(m) => setMode(m)}
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-surface-2 p-3">
          <Caption>Your home network (LAN)</Caption>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {HOME_DEVICES.map((id) => nodeBtn(id))}
            {nodeBtn("router", true)}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface-2 p-3">
          <Caption>Beyond your home</Caption>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {REMOTE.map((id) => nodeBtn(id))}
          </div>
        </div>
      </div>

      <div className="mt-3 min-h-[64px]" aria-live="polite">
        {mode === "explore" ? (
          info ? (
            <Note tone="accent" className="pop-in" key={vSelected}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{info.name}</span>
                <span className="chip">{info.role}</span>
                <span className="chip">{info.home ? "inside the LAN" : "outside your home"}</span>
              </div>
              <p className="mt-1 text-ink-2">
                <InlineProse text={info.about} />
              </p>
            </Note>
          ) : (
            <Note>Tap any box to see what it does.</Note>
          )
        ) : !vFrom ? (
          <Note>Tap the device that <strong>sends</strong> the message.</Note>
        ) : !vTo ? (
          <Note>
            Sender: <strong>{NODES[vFrom].name}</strong>. Now tap the <strong>receiver</strong>.
          </Note>
        ) : (
          <Note tone={viaInternet ? "neutral" : "good"} className="pop-in" key={`${vFrom}-${vTo}`}>
            <p className="font-mono text-[12.5px] text-ink">{path.map((p) => NODES[p].name).join(" → ")}</p>
            <p className="mt-1 text-ink-2">
              {path.length - 1} link{path.length === 2 ? "" : "s"}.{" "}
              {leftHome ? (viaInternet ? "The message leaves your home and crosses the internet." : "The message leaves your home network.") : "It never leaves your home network: this is LAN traffic."}
            </p>
          </Note>
        )}
      </div>
    </div>
  );
}

export function checkNetworkMap(state: unknown, goal: Record<string, unknown>) {
  const st = state as NetworkMapState | undefined;
  if (!st) return false;
  if (typeof goal.selected === "string" && st.selected !== goal.selected) return false;
  if (typeof goal.from === "string" && st.from !== goal.from) return false;
  if (typeof goal.to === "string" && st.to !== goal.to) return false;
  if (typeof goal.viaInternet === "boolean" && (!st.to || st.viaInternet !== goal.viaInternet)) return false;
  return true;
}
