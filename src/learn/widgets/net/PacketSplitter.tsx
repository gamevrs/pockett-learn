"use client";

import React, { useState } from "react";
import { CheckCircle2, RotateCcw, Send } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Segmented, shuffle } from "./ui";

/**
 * A message is chopped into numbered packets, sent, and arrives out of order (some lost). The
 * learner rebuilds it by tapping packets in number order, and asks again for a missing one.
 */

export interface PacketSplitterProps {
  message?: string;
  /** Characters per packet. Default 6. */
  size?: number;
  /** If given, the learner can pick the packet size from these before sending. */
  sizes?: number[];
  /** Packet numbers (1-based) lost on the first send. */
  lost?: number[];
  /** Changes the (deterministic) arrival order. */
  seed?: number;
  /** Packets carry numbers (default true). Without them the receiver can only glue packets in arrival order. */
  numbered?: boolean;
}

export interface PacketSplitterState {
  size: number;
  packets: number;
  sent: boolean;
  placed: number;
  resent: number[];
  complete: boolean;
}

const show = (s: string) => s.replace(/ /g, "·");

function split(message: string, size: number) {
  const out: string[] = [];
  for (let i = 0; i < message.length; i += size) out.push(message.slice(i, i + size));
  return out;
}

function arrivalOrder(n: number, seed: number) {
  const nums = Array.from({ length: n }, (_, i) => i + 1);
  const order = shuffle(nums, seed);
  if (n > 1 && order.every((v, i) => v === i + 1)) [order[0], order[1]] = [order[1], order[0]];
  return order;
}

function PacketChip({ n, total, text, numbered, onClick, disabled, tone = "idle" }: { n: number; total: number; text: string; numbered: boolean; onClick?: () => void; disabled?: boolean; tone?: "idle" | "placed" | "bad" }) {
  const cls =
    tone === "placed"
      ? "border-[var(--brand)]/60 bg-tint"
      : tone === "bad"
        ? "border-[var(--bad)] bg-[var(--bad)]/[0.07]"
        : "border-line bg-surface hover:border-[var(--line-strong)]";
  const body = (
    <>
      {numbered && (
        <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-ink-2 ring-1 ring-[var(--line)]">
          {n}/{total}
        </span>
      )}
      <span className="font-mono text-[13px] font-semibold tracking-wide text-ink">{show(text)}</span>
    </>
  );
  if (!onClick) return <span className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-2 ${cls}`}>{body}</span>;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-2 transition-colors disabled:cursor-default ${cls}`}>
      {body}
    </button>
  );
}

export function PacketSplitter({ props, onChange, revealed, status }: WidgetProps<PacketSplitterProps>) {
  const message = props.message ?? "MEET ME AT THE LIBRARY AT NOON";
  const numbered = props.numbered ?? true;
  const [size, setSize] = useState(props.size ?? props.sizes?.[0] ?? 6);
  const [sent, setSent] = useState(false);
  const [placed, setPlaced] = useState<number[]>([]);
  const [resent, setResent] = useState<number[]>([]);
  const [miss, setMiss] = useState<{ tapped: number; need: number } | null>(null);

  const packets = split(message, size);
  const total = packets.length;
  const lost = (props.lost ?? []).filter((n) => n >= 1 && n <= total);
  const order = arrivalOrder(total, (props.seed ?? 3) * 31 + size);
  const arrived = [...order.filter((n) => !lost.includes(n)), ...resent];
  const waiting = arrived.filter((n) => !placed.includes(n));
  const need = placed.length + 1;
  const complete = numbered ? placed.length === total : false;
  const giveUp = status === "revealed";

  const report = (next: Partial<PacketSplitterState>) =>
    onChange?.({ size, packets: total, sent, placed: placed.length, resent, complete, ...next } satisfies PacketSplitterState);

  const pickSize = (s: number) => {
    if (revealed || sent) return;
    setSize(s);
    onChange?.({ size: s, packets: split(message, s).length, sent: false, placed: 0, resent: [], complete: false } satisfies PacketSplitterState);
  };
  const send = () => {
    if (revealed) return;
    setSent(true);
    setPlaced([]);
    setResent([]);
    setMiss(null);
    report({ sent: true, placed: 0, resent: [], complete: false });
  };
  const reset = () => {
    setSent(false);
    setPlaced([]);
    setResent([]);
    setMiss(null);
    report({ sent: false, placed: 0, resent: [], complete: false });
  };
  const tap = (n: number) => {
    if (revealed) return;
    if (numbered && n !== need) {
      setMiss({ tapped: n, need });
      return;
    }
    const next = [...placed, n];
    setPlaced(next);
    setMiss(null);
    report({ placed: next.length, complete: numbered && next.length === total });
  };
  const askAgain = () => {
    if (revealed || resent.includes(need)) return;
    const next = [...resent, need];
    setResent(next);
    setMiss(null);
    report({ resent: next });
  };

  const shownPlaced = giveUp && numbered ? Array.from({ length: total }, (_, i) => i + 1) : placed;
  const rebuilt = shownPlaced.map((n) => packets[n - 1]).join("");
  const needIsMissing = numbered && sent && !complete && !arrived.includes(need);

  return (
    <div className="w-full max-w-2xl">
      {/* sender */}
      <div className="rounded-xl border border-line bg-surface-2 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Caption>Sender</Caption>
          <div className="flex flex-wrap items-center gap-2">
            <Readout label="Packets" value={total} />
          </div>
        </div>
        <p className="mt-2 break-words font-mono text-[13px] text-ink">{show(message)}</p>
        {props.sizes && props.sizes.length > 1 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-3">Characters per packet</span>
            <Segmented label="Characters per packet" value={size} disabled={revealed || sent} options={props.sizes.map((s) => ({ id: s, label: String(s) }))} onChange={pickSize} />
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {packets.map((p, i) => (
            <PacketChip key={`${size}-${i}`} n={i + 1} total={total} text={p} numbered={numbered} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {!sent ? (
            <button type="button" className="btn btn-primary !h-10" onClick={send} disabled={revealed}>
              <Send className="h-4 w-4" /> Send packets
            </button>
          ) : (
            <button type="button" className="btn !h-10" onClick={reset} disabled={revealed}>
              <RotateCcw className="h-4 w-4" /> Start over
            </button>
          )}
        </div>
      </div>

      {/* receiver */}
      {sent && (
        <div className="pop-in mt-3 rounded-xl border border-line bg-surface p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Caption>Receiver: arrived, in this order</Caption>
            <span className="font-mono text-xs text-ink-3">
              {arrived.length} of {total} arrived
            </span>
          </div>
          <div className="mt-2 flex min-h-10 flex-wrap gap-1.5">
            {waiting.length === 0 ? (
              <span className="self-center text-sm text-ink-3">{complete ? "All packets used." : "Nothing left in the pile."}</span>
            ) : (
              waiting.map((n) => (
                <PacketChip key={n} n={n} total={total} text={packets[n - 1]} numbered={numbered} onClick={() => tap(n)} disabled={revealed} tone={miss?.tapped === n ? "bad" : "idle"} />
              ))
            )}
          </div>

          <Caption className="mt-4">Rebuilt message</Caption>
          <div className="mt-2 flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-dashed border-[var(--line-strong)] bg-surface-2 p-1.5">
            {shownPlaced.length === 0 ? (
              <span className="px-1 text-sm text-ink-3">{numbered ? "Tap packet 1 first, then 2, then 3…" : "Tap packets to glue them together."}</span>
            ) : (
              shownPlaced.map((n) => <PacketChip key={n} n={n} total={total} text={packets[n - 1]} numbered={numbered} tone="placed" />)
            )}
          </div>

          <div className="mt-3 grid gap-2" aria-live="polite">
            {miss && (
              <Note tone="bad" className="pop-in">
                That&apos;s packet {miss.tapped}. The next one the message needs is <strong>{miss.need}</strong>.
              </Note>
            )}
            {needIsMissing && !giveUp && (
              <Note className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Packet <strong>{need}</strong> never arrived. It was lost on the way.
                </span>
                <button type="button" className="btn btn-primary !h-10" onClick={askAgain} disabled={revealed}>
                  Ask for #{need} again
                </button>
              </Note>
            )}
            {(complete || (giveUp && numbered)) && (
              <Note tone="good" className="pop-in">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-good" />
                  <span className="font-mono text-[13px]">{rebuilt}</span>
                </span>
              </Note>
            )}
            {!numbered && waiting.length === 0 && placed.length > 0 && (
              <Note className="pop-in">
                Glued in the order they came: <span className="font-mono text-ink">{rebuilt}</span>
              </Note>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function checkPacketSplitter(state: unknown, goal: Record<string, unknown>) {
  const st = state as PacketSplitterState | undefined;
  if (!st) return false;
  if (goal.complete === true && !st.complete) return false;
  if (typeof goal.packets === "number" && st.packets !== goal.packets) return false;
  if (typeof goal.size === "number" && st.size !== goal.size) return false;
  if (typeof goal.resent === "number" && st.resent.length < goal.resent) return false;
  return true;
}
