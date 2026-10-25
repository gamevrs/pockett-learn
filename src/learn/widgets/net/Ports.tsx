"use client";

import React, { useState } from "react";
import { Ban, CheckCircle2, Globe, Lock, Mail, Server, Signpost, Terminal } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout } from "./ui";

/**
 * One machine, one IP address, several programs each listening on its own port. Packets arrive
 * one at a time; the learner delivers each to the program whose port matches (or rejects it when
 * nothing listens there). Each program lists its open conversations (sockets).
 */

interface App {
  id: string;
  name: string;
  port: number;
}
interface Packet {
  from: string;
  port: number;
  data: string;
}

const DEFAULT_APPS: App[] = [
  { id: "https", name: "Web server (HTTPS)", port: 443 },
  { id: "http", name: "Web server (HTTP)", port: 80 },
  { id: "ssh", name: "Remote login (SSH)", port: 22 },
  { id: "dns", name: "DNS server", port: 53 },
];

const DEFAULT_PACKETS: Packet[] = [
  { from: "198.51.100.23:51200", port: 443, data: "encrypted web request" },
  { from: "192.0.2.14:40022", port: 22, data: "login as sam" },
  { from: "198.51.100.23:51201", port: 443, data: "encrypted web request" },
  { from: "192.0.2.99:41000", port: 53, data: "where is example.com?" },
  { from: "198.51.100.40:61000", port: 8080, data: "hello?" },
  { from: "192.0.2.7:49152", port: 80, data: "GET / HTTP/1.1" },
];

const ICON: Record<string, typeof Globe> = { https: Lock, http: Globe, ssh: Terminal, dns: Signpost, mail: Mail };

export interface PortsProps {
  host?: string;
  apps?: App[];
  packets?: Packet[];
  /** Hide the port numbers on the programs, so the learner has to know them. */
  hidePorts?: boolean;
}

export interface PortsState {
  delivered: number;
  total: number;
  mistakes: number;
  done: boolean;
}

export function Ports({ props, onChange, revealed, status }: WidgetProps<PortsProps>) {
  const host = props.host ?? "203.0.113.7";
  const apps = props.apps ?? DEFAULT_APPS;
  const packets = props.packets ?? DEFAULT_PACKETS;
  const [index, setIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [miss, setMiss] = useState<string | null>(null);
  const [inbox, setInbox] = useState<Record<string, string[]>>({});
  const [rejected, setRejected] = useState<number[]>([]);
  const done = index >= packets.length;
  const pkt = packets[Math.min(index, packets.length - 1)];
  const target = apps.find((a) => a.port === pkt.port)?.id ?? "reject";
  const showAnswer = status === "revealed" && !done;

  const deliver = (choice: string) => {
    if (revealed || done) return;
    if (choice !== target) {
      const app = apps.find((a) => a.id === choice);
      setMiss(choice === "reject" ? `Something is listening on port ${pkt.port}.` : `${app?.name} listens on port ${app?.port}, but this packet is for port ${pkt.port}.`);
      setMistakes(mistakes + 1);
      onChange?.({ delivered: index, total: packets.length, mistakes: mistakes + 1, done: false } satisfies PortsState);
      return;
    }
    if (choice === "reject") setRejected([...rejected, index]);
    else setInbox({ ...inbox, [choice]: [...(inbox[choice] ?? []), pkt.from] });
    setMiss(null);
    setIndex(index + 1);
    onChange?.({ delivered: index + 1, total: packets.length, mistakes, done: index + 1 >= packets.length } satisfies PortsState);
  };

  return (
    <div className="w-full max-w-2xl">
      {/* incoming packet */}
      <div className="rounded-xl border border-line bg-surface-2 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Caption>{done ? "Inbox empty" : `Incoming packet ${index + 1} of ${packets.length}`}</Caption>
          <Readout label="Mistakes" value={mistakes} />
        </div>
        {done ? (
          <Note tone="good" className="pop-in mt-2">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-good" /> Every packet reached the right program.
            </span>
          </Note>
        ) : (
          <div key={index} className="pop-in mt-2 rounded-lg border border-line bg-surface p-3 font-mono text-[12.5px]">
            <div className="grid gap-1 min-[480px]:grid-cols-2">
              <p className="min-w-0 truncate text-ink-2">
                from <span className="text-ink">{pkt.from}</span>
              </p>
              <p className="min-w-0 truncate text-ink-2">
                to <span className="text-ink">{host}</span>:<span className="rounded bg-tint px-1 font-bold text-ink ring-1 ring-[var(--brand)]/40">{pkt.port}</span>
              </p>
            </div>
            <p className="mt-1.5 truncate text-ink-3">data: &ldquo;{pkt.data}&rdquo;</p>
          </div>
        )}
      </div>

      {/* the machine */}
      <div className="mt-3 rounded-2xl border border-line p-3">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-ink-2" />
          <p className="text-sm font-semibold text-ink">
            One machine: <span className="font-mono">{host}</span>
          </p>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 min-[440px]:grid-cols-2">
          {apps.map((a) => {
            const Icon = ICON[a.id] ?? Globe;
            const conns = inbox[a.id] ?? [];
            const hint = showAnswer && target === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => deliver(a.id)}
                disabled={revealed || done}
                className={`flex min-h-[64px] flex-col items-stretch rounded-xl border p-2.5 text-left transition-colors disabled:cursor-default ${
                  hint ? "border-[var(--brand)] bg-tint" : "border-line bg-surface hover:border-[var(--line-strong)] hover:bg-surface-2"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-ink-2" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{a.name}</span>
                  <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink-2 ring-1 ring-[var(--line)]">{props.hidePorts && !done ? "port ?" : `:${a.port}`}</span>
                </span>
                {conns.length > 0 && (
                  <span className="mt-1.5 grid gap-0.5 font-mono text-[11px] text-ink-3">
                    {conns.map((c, i) => (
                      <span key={i} className="truncate">
                        socket ↔ {c}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => deliver("reject")}
          disabled={revealed || done}
          className={`mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 text-sm font-medium transition-colors disabled:cursor-default ${
            showAnswer && target === "reject" ? "border-[var(--brand)] bg-tint text-ink" : "border-[var(--line-strong)] text-ink-2 hover:text-ink"
          }`}
        >
          <Ban className="h-4 w-4" /> Nothing listens on that port: reject it
          {rejected.length > 0 && <span className="font-mono text-xs text-ink-3">({rejected.length})</span>}
        </button>
      </div>

      <div className="mt-3 min-h-10" aria-live="polite">
        {miss ? (
          <Note tone="bad" className="pop-in" key={`${index}-${mistakes}`}>
            {miss}
          </Note>
        ) : !done ? (
          <Note>Read the packet&apos;s destination port, then tap the program it belongs to.</Note>
        ) : null}
      </div>
    </div>
  );
}

export function checkPorts(state: unknown, goal: Record<string, unknown>) {
  const st = state as PortsState | undefined;
  if (!st) return false;
  if (goal.done === true && !st.done) return false;
  if (typeof goal.maxMistakes === "number" && st.mistakes > goal.maxMistakes) return false;
  return true;
}
