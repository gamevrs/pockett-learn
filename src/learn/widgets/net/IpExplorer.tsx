"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout } from "./ui";

/**
 * An IPv4 address as four bytes: dotted decimal you can edit, the 32 bits underneath, what kind of
 * address it is (private, public, loopback…), and optionally a second address to test whether
 * the two share a /24 network.
 */

export type IpKind = "private" | "public" | "loopback" | "link-local" | "multicast" | "reserved";

export function ipKind(o: number[]): IpKind {
  const [a, b] = o;
  if (a === 10) return "private";
  if (a === 172 && b >= 16 && b <= 31) return "private";
  if (a === 192 && b === 168) return "private";
  if (a === 127) return "loopback";
  if (a === 169 && b === 254) return "link-local";
  if (a >= 224 && a <= 239) return "multicast";
  if (a === 0 || a >= 240) return "reserved";
  return "public";
}

const KIND_TEXT: Record<IpKind, string> = {
  private: "Private: used inside homes and offices. Many networks reuse it, so it can't be reached from the internet directly.",
  public: "Public: unique on the whole internet, so any machine can send to it.",
  loopback: "Loopback: always means *this machine itself*. Packets never leave the computer.",
  "link-local": "Link-local: a device gave itself this when it couldn't get a proper address.",
  multicast: "Multicast: one packet delivered to a group of listeners.",
  reserved: "Reserved: not handed out to normal devices.",
};

const isExample = (o: number[]) =>
  (o[0] === 192 && o[1] === 0 && o[2] === 2) || (o[0] === 198 && o[1] === 51 && o[2] === 100) || (o[0] === 203 && o[1] === 0 && o[2] === 113);

const parse = (s: string[]) => s.map((x) => (/^\d{1,3}$/.test(x) && Number(x) <= 255 ? Number(x) : NaN));
const valid = (o: number[]) => o.every((n) => Number.isInteger(n));
const fmt = (o: number[]) => o.join(".");
const toBin = (n: number) => n.toString(2).padStart(8, "0");

export interface IpExplorerProps {
  initial?: number[];
  /** A second address: shows the /24 comparison. */
  compare?: number[];
  /** Which addresses can be edited. Default "a". */
  editable?: "a" | "b" | "both" | "none";
  showBinary?: boolean;
  /** Mark the first three bytes as the network part (a /24). Default: on when comparing. */
  showMask?: boolean;
  showKind?: boolean;
  labelA?: string;
  labelB?: string;
}

export interface IpExplorerState {
  a: string | null;
  b: string | null;
  kindA: IpKind | null;
  kindB: IpKind | null;
  same: boolean | null;
}

function AddressRow({
  label,
  text,
  setText,
  editable,
  showBinary,
  showMask,
  match,
}: {
  label: string;
  text: string[];
  setText: (i: number, v: string) => void;
  editable: boolean;
  showBinary: boolean;
  showMask: boolean;
  match?: boolean[];
}) {
  const octets = parse(text);
  return (
    <div className="min-w-0">
      <Caption>{label}</Caption>
      <div className="mt-1.5 flex items-center justify-center gap-1 sm:justify-start">
        {text.map((t, i) => {
          const bad = !Number.isInteger(octets[i]);
          return (
            <React.Fragment key={i}>
              {i > 0 && <span className="font-mono text-xl font-bold text-ink-3">.</span>}
              {editable ? (
                <input
                  value={t}
                  inputMode="numeric"
                  maxLength={3}
                  aria-label={`${label} byte ${i + 1}`}
                  onChange={(e) => setText(i, e.target.value.replace(/\D/g, "").slice(0, 3))}
                  className={`h-12 w-[3.6rem] rounded-lg border bg-surface text-center font-mono text-lg font-semibold tabular-nums text-ink outline-none transition-colors focus:border-[var(--brand)] sm:w-16 ${
                    bad ? "border-[var(--bad)]" : showMask && i < 3 ? "border-[var(--brand)]/50" : "border-line"
                  }`}
                />
              ) : (
                <span
                  className={`grid h-12 w-[3.6rem] place-items-center rounded-lg border font-mono text-lg font-semibold tabular-nums text-ink sm:w-16 ${
                    showMask && i < 3 ? "border-[var(--brand)]/50 bg-tint" : "border-line bg-surface-2"
                  }`}
                >
                  {t}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>
      {showBinary && (
        <div className="mt-2 grid grid-cols-2 gap-1.5 min-[480px]:grid-cols-4">
          {octets.map((n, i) => (
            <div
              key={i}
              className={`rounded-md border px-1.5 py-1 text-center font-mono text-[12px] tracking-[0.12em] tabular-nums ${
                showMask ? (i < 3 ? "border-[var(--brand)]/40 bg-tint text-ink" : "border-dashed border-[var(--line-strong)] bg-surface text-ink-2") : "border-line bg-surface-2 text-ink-2"
              } ${match && !match[i] ? "!border-[var(--bad)]" : ""}`}
            >
              {Number.isInteger(n) ? toBin(n) : "????????"}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function IpExplorer({ props, onChange, revealed, status, goal }: WidgetProps<IpExplorerProps>) {
  const editable = props.editable ?? "a";
  const comparing = Array.isArray(props.compare);
  const showMask = props.showMask ?? comparing;
  const showBinary = props.showBinary ?? true;
  const [ta, setTa] = useState<string[]>(() => (props.initial ?? [192, 168, 1, 20]).map(String));
  const [tb, setTb] = useState<string[]>(() => (props.compare ?? [192, 168, 1, 30]).map(String));

  // reveal: show the goal address when one is given
  const showGoal = status === "revealed" && goal;
  const va = showGoal && typeof goal.a === "string" ? goal.a.split(".") : ta;
  const vb = showGoal && typeof goal.b === "string" ? goal.b.split(".") : tb;

  const state = (a: string[], b: string[]): IpExplorerState => {
    const oa = parse(a);
    const ob = parse(b);
    const okA = valid(oa);
    const okB = comparing && valid(ob);
    return {
      a: okA ? fmt(oa) : null,
      b: okB ? fmt(ob) : null,
      kindA: okA ? ipKind(oa) : null,
      kindB: okB ? ipKind(ob) : null,
      same: okA && okB ? oa.slice(0, 3).every((v, i) => v === ob[i]) : null,
    };
  };

  const edit = (which: "a" | "b") => (i: number, v: string) => {
    if (revealed) return;
    const src = which === "a" ? ta : tb;
    const next = src.map((x, j) => (j === i ? v : x));
    if (which === "a") setTa(next);
    else setTb(next);
    onChange?.(which === "a" ? state(next, tb) : state(ta, next));
  };

  const oa = parse(va);
  const ob = parse(vb);
  const okA = valid(oa);
  const okB = valid(ob);
  const kind = okA ? ipKind(oa) : null;
  const same = comparing && okA && okB ? oa.slice(0, 3).every((v, i) => v === ob[i]) : null;
  const match = comparing && okA && okB ? oa.map((v, i) => i === 3 || v === ob[i]) : undefined;

  return (
    <div className="w-full max-w-xl">
      <div className={`grid gap-4 ${comparing ? "" : ""}`}>
        <AddressRow
          label={props.labelA ?? (comparing ? "Address A" : "IPv4 address")}
          text={va}
          setText={edit("a")}
          editable={!revealed && (editable === "a" || editable === "both")}
          showBinary={showBinary}
          showMask={showMask}
          match={match}
        />
        {comparing && (
          <AddressRow label={props.labelB ?? "Address B"} text={vb} setText={edit("b")} editable={!revealed && (editable === "b" || editable === "both")} showBinary={showBinary} showMask={showMask} match={match} />
        )}
      </div>

      {showMask && (
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-ink-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-[var(--brand)]/50 bg-tint" /> network part (first 24 bits)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-dashed border-[var(--line-strong)] bg-surface" /> host part (last 8 bits)
          </span>
        </div>
      )}

      <div className="mt-3 grid gap-2" aria-live="polite">
        {!comparing && (
          <div className="flex flex-wrap gap-2">
            <Readout label="Bytes" value="4" />
            <Readout label="Bits" value="32" />
            {okA && <Readout label="As one number" value={(((oa[0] * 256 + oa[1]) * 256 + oa[2]) * 256 + oa[3]).toLocaleString("en-US")} />}
          </div>
        )}
        {!okA || (comparing && !okB) ? (
          <Note tone="bad">Each byte must be a whole number from 0 to 255.</Note>
        ) : comparing ? (
          <Note tone={same ? "good" : "neutral"} className="pop-in" key={String(same)}>
            <p className="font-mono text-[12.5px] text-ink">
              {oa.slice(0, 3).join(".")} {same ? "=" : "≠"} {ob.slice(0, 3).join(".")}
            </p>
            <p className="mt-1 text-ink-2">
              {same ? "Same /24 network: A can send to B directly, no router needed." : "Different networks: the packet has to go through a router."}
            </p>
          </Note>
        ) : (
          (props.showKind ?? true) &&
          kind && (
            <Note tone={kind === "private" ? "accent" : "neutral"} className="pop-in" key={kind}>
              <span className="chip mr-2">{kind}</span>
              {KIND_TEXT[kind].replace(/\*/g, "")}
              {kind === "public" && isExample(oa) && <span className="text-ink-3"> (This range is set aside for examples like this one.)</span>}
            </Note>
          )
        )}
      </div>
    </div>
  );
}

export function checkIpExplorer(state: unknown, goal: Record<string, unknown>) {
  const st = state as IpExplorerState | undefined;
  if (!st) return false;
  if (typeof goal.a === "string" && st.a !== goal.a) return false;
  if (typeof goal.b === "string" && st.b !== goal.b) return false;
  if (typeof goal.kind === "string" && st.kindA !== goal.kind) return false;
  if (typeof goal.same === "boolean" && st.same !== goal.same) return false;
  if (typeof goal.firstByte === "number" && (!st.a || Number(st.a.split(".")[0]) !== goal.firstByte)) return false;
  return st.a !== null;
}
