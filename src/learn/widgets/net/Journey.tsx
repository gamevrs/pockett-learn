"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Laptop, Search, Server } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption } from "./ui";

/**
 * "What happens when you type a URL": the whole trip as stages you step through, each tagged with
 * its layer and the machines involved.
 */

type Actor = "browser" | "resolver" | "server";
interface Stage {
  title: string;
  layer: string;
  actors: Actor[];
  lines: string[];
  note: string;
}

function stagesFor(url: string): Stage[] {
  let host = "shop.example.com";
  let path = "/cart";
  let scheme = "https";
  try {
    const u = new URL(url);
    host = u.hostname;
    path = u.pathname || "/";
    scheme = u.protocol.replace(":", "");
  } catch {
    /* keep the defaults */
  }
  const port = scheme === "https" ? 443 : 80;
  const ip = "203.0.113.80";
  return [
    {
      title: "Read the URL",
      layer: "Browser",
      actors: ["browser"],
      lines: [`scheme  ${scheme}   → port ${port}`, `host    ${host}`, `path    ${path}`],
      note: "The browser splits the address into its parts before anything touches the network.",
    },
    {
      title: "Find the address (DNS)",
      layer: "Application · UDP port 53",
      actors: ["browser", "resolver"],
      lines: [`${host} ?`, "resolver → root → .com → ns1.example.com", `${host} = ${ip}  (TTL 300 s)`],
      note: "Skipped entirely if the answer is still in a cache.",
    },
    {
      title: "Open a connection (TCP)",
      layer: "Transport",
      actors: ["browser", "server"],
      lines: [`192.168.1.20:51514 → ${ip}:${port}`, "SYN  →", "     ← SYN-ACK", "ACK  →"],
      note: "The three-way handshake. One round trip before any data moves.",
    },
    ...(scheme === "https"
      ? [
          {
            title: "Make it private (TLS)",
            layer: "Between transport and application",
            actors: ["browser", "server"] as Actor[],
            lines: ["ClientHello  →", "     ← ServerHello, certificate", "certificate checked ✓", "shared key ready, never sent"],
            note: "From here on, everything inside the connection is encrypted.",
          },
        ]
      : []),
    {
      title: "Ask for the page (HTTP)",
      layer: "Application",
      actors: ["browser", "server"],
      lines: [`GET ${path} HTTP/1.1`, `Host: ${host}`, "Cookie: session=7f3a9c"],
      note: "The cookie tells the stateless server who you are.",
    },
    {
      title: "Cross the internet (IP)",
      layer: "Internet + Link",
      actors: ["browser", "server"],
      lines: ["HTTP inside TCP inside IP inside Ethernet", "router → router → router … (TTL 64, 63, 62 …)", "new Ethernet frame on every link"],
      note: "Each router reads only the IP header and picks the next hop from its table.",
    },
    {
      title: "Get the answer",
      layer: "Application + Transport",
      actors: ["server", "browser"],
      lines: ["HTTP/1.1 200 OK", "Content-Type: text/html", "… split into packets, ACKed, any lost ones resent"],
      note: "TCP puts the packets back in order, so the browser sees one clean response.",
    },
    {
      title: "Draw the page",
      layer: "Browser",
      actors: ["browser", "server"],
      lines: ["read the HTML", "need style.css, logo.png, app.js", "fetch them on the same connection"],
      note: "One page is often dozens of requests. The DNS answer and the connection are reused.",
    },
  ];
}

const ACTORS: { id: Actor; name: string; icon: typeof Laptop }[] = [
  { id: "browser", name: "Your browser", icon: Laptop },
  { id: "resolver", name: "DNS resolver", icon: Search },
  { id: "server", name: "Web server", icon: Server },
];

export interface JourneyProps {
  url?: string;
}

export interface JourneyState {
  stage: number;
  finished: boolean;
}

export function Journey({ props, onChange, revealed }: WidgetProps<JourneyProps>) {
  const url = props.url ?? "https://shop.example.com/cart";
  const list = stagesFor(url);
  const [stage, setStage] = useState(0);
  const [seenAll, setSeenAll] = useState(false);
  const st = list[stage];

  const go = (n: number) => {
    if (revealed) return;
    const s = Math.max(0, Math.min(list.length - 1, n));
    const done = seenAll || s === list.length - 1;
    setStage(s);
    setSeenAll(done);
    onChange?.({ stage: s, finished: done } satisfies JourneyState);
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="rounded-xl border border-line bg-surface-2 px-3 py-2 font-mono text-[13px] text-ink">{url}</div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {ACTORS.map((a) => {
          const Icon = a.icon;
          const on = st.actors.includes(a.id);
          return (
            <div key={a.id} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-1 text-center transition-colors ${on ? "border-[var(--brand)] bg-tint" : "border-line bg-surface"}`}>
              <Icon className={`h-4 w-4 ${on ? "text-brand" : "text-ink-3"}`} />
              <span className={`text-[11.5px] font-medium ${on ? "text-ink" : "text-ink-3"}`}>{a.name}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex gap-1" aria-hidden>
        {list.map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= stage ? "bg-primary" : "bg-surface-2 ring-1 ring-[var(--line)]"}`} />
        ))}
      </div>

      <div key={stage} className="pop-in mt-3 rounded-xl border border-line bg-surface p-3" aria-live="polite">
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary font-mono text-xs font-bold text-primary-ink">{stage + 1}</span>
          <p className="font-semibold text-ink">{st.title}</p>
          <span className="chip ml-auto">{st.layer}</span>
        </div>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-2 px-3 py-2 font-mono text-[12px] leading-[1.6] text-ink">{st.lines.join("\n")}</pre>
        <p className="mt-2 text-sm text-ink-2">{st.note}</p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button type="button" className="btn !h-10" onClick={() => go(stage - 1)} disabled={revealed || stage === 0}>
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <Caption>
          Stage {stage + 1} of {list.length}
        </Caption>
        <button type="button" className="btn btn-primary !h-10" onClick={() => go(stage + 1)} disabled={revealed || stage === list.length - 1}>
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function checkJourney(state: unknown, goal: Record<string, unknown>) {
  const st = state as JourneyState | undefined;
  if (!st) return false;
  if (goal.finished === true && !st.finished) return false;
  if (typeof goal.stage === "number" && st.stage !== goal.stage) return false;
  return true;
}
