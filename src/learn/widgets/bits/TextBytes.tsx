"use client";

import React, { useState } from "react";
import { Delete } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Segmented, toBin, toHex } from "./shared";

type ByteFormat = "dec" | "hex" | "bin";

export interface TextBytesProps {
  /** Starting text. Default "Hi". */
  initial?: string;
  /** Show a text box. Default true. */
  editable?: boolean;
  /** Characters the learner can tap to insert (handy for é, €, emoji on any keyboard). */
  palette?: string[];
  /** "ascii" shows only the ASCII code (and flags characters outside it); "utf8" (default) shows code points and UTF-8 bytes. */
  mode?: "ascii" | "utf8";
  /** How bytes are written. Default "dec". */
  byteFormat?: ByteFormat;
  /** Let the learner switch dec / hex / bin. Default true. */
  showFormatToggle?: boolean;
  /** Show the UTF-8 bytes at all (utf8 mode). Default true. */
  showBytes?: boolean;
  /** Hide the UTF-8 bytes until the step is answered. */
  hideBytes?: boolean;
  /** Maximum characters. Default 10. */
  maxChars?: number;
  locked?: boolean;
}

export interface TextBytesState {
  text: string;
  /** Characters (Unicode code points). */
  chars: number;
  /** UTF-8 bytes. */
  bytes: number;
}

const encoder = new TextEncoder();
const chars = (s: string) => Array.from(s);
const fmtByte = (b: number, f: ByteFormat) => (f === "hex" ? toHex(b) : f === "bin" ? toBin(b) : String(b));
const shown = (ch: string) => (ch === " " ? "␣" : ch === "\t" ? "⇥" : ch);

const stateOf = (text: string): TextBytesState => ({ text, chars: chars(text).length, bytes: encoder.encode(text).length });

/** Type text and see every character as a code point and as the UTF-8 bytes stored for it. */
export function TextBytes({ props, onChange, revealed }: WidgetProps<TextBytesProps>) {
  const max = props.maxChars ?? 10;
  const [text, setText] = useState(() => chars(props.initial ?? "Hi").slice(0, max).join(""));
  const [format, setFormat] = useState<ByteFormat>(props.byteFormat ?? "dec");
  const locked = Boolean(props.locked || revealed);
  const editable = (props.editable ?? true) && !props.locked;
  const ascii = props.mode === "ascii";
  const showBytes = !ascii && (props.showBytes ?? true);
  const hideBytes = Boolean(props.hideBytes && !revealed);

  const update = (next: string) => {
    if (locked) return;
    const clipped = chars(next).slice(0, max).join("");
    setText(clipped);
    onChange?.(stateOf(clipped));
  };

  const list = chars(text);
  const total = encoder.encode(text).length;

  return (
    <div className="w-full">
      {editable && (
        <div className="mx-auto flex max-w-md items-center gap-2">
          <input
            className="input !h-11 !rounded-xl font-mono !text-base"
            value={text}
            onChange={(e) => update(e.target.value)}
            disabled={locked}
            aria-label="Text to encode"
            placeholder="Type something"
            autoComplete="off"
            spellCheck={false}
          />
          {props.palette && (
            <button type="button" className="btn !h-11 !w-11 shrink-0 !p-0" onClick={() => update(list.slice(0, -1).join(""))} disabled={locked || list.length === 0} aria-label="Delete last character" title="Delete last character">
              <Delete className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      {editable && props.palette && (
        <div className="mx-auto mt-2 flex max-w-md flex-wrap justify-center gap-1.5">
          {props.palette.map((ch) => (
            <button
              key={ch}
              type="button"
              className="btn !h-10 !min-w-10 !rounded-lg !px-2.5 font-mono !text-base"
              onClick={() => update(text + ch)}
              disabled={locked || list.length >= max}
              aria-label={`Insert ${ch}`}
            >
              {ch}
            </button>
          ))}
        </div>
      )}

      {showBytes && !hideBytes && (props.showFormatToggle ?? true) && (
        <div className="mt-4 flex justify-center">
          <Segmented
            label="Byte format"
            value={format}
            onChange={setFormat}
            options={[
              { value: "dec", label: "Decimal" },
              { value: "hex", label: "Hex" },
              { value: "bin", label: "Binary" },
            ]}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {list.length === 0 && <p className="py-6 text-sm text-ink-3">Nothing to encode yet.</p>}
        {list.map((ch, i) => {
          const cp = ch.codePointAt(0) ?? 0;
          const bytes = Array.from(encoder.encode(ch));
          const outside = ascii && cp > 127;
          return (
            <div
              key={`${i}-${ch}`}
              className={`flex min-w-[4.25rem] flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 ${outside ? "border-dashed border-bad/50 bg-bad/[0.04]" : "border-line bg-surface-2"}`}
            >
              <span className="grid h-10 min-w-10 place-items-center rounded-lg bg-surface px-1.5 text-2xl leading-none text-ink">{shown(ch)}</span>
              {ascii ? (
                <span className="flex flex-col items-center">
                  <span className={`font-mono text-sm font-semibold tabular-nums ${outside ? "text-bad" : "text-ink"}`}>{outside ? "not ASCII" : cp}</span>
                  {!outside && <span className="font-mono text-[10px] tabular-nums text-ink-3">{toBin(cp)}</span>}
                </span>
              ) : (
                <span className="text-center font-mono text-[11px] leading-tight text-ink-2">
                  U+{toHex(cp, 4)}
                  <span className="block text-ink-3">{cp.toLocaleString("en-US")}</span>
                </span>
              )}
              {showBytes && (
                <span className="flex flex-col items-center gap-1">
                  {hideBytes ? (
                    <span className="rounded-md border border-dashed border-[var(--line-strong)] px-2 py-0.5 font-mono text-xs text-ink-3">? bytes</span>
                  ) : (
                    bytes.map((b, j) => (
                      <span key={j} className={`rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums ${bytes.length === 1 ? "bg-surface text-ink" : "bg-primary text-primary-ink"}`}>
                        {fmtByte(b, format)}
                      </span>
                    ))
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-sm text-ink-2" aria-live="polite">
        <span className="font-semibold tabular-nums text-ink">{list.length}</span> {list.length === 1 ? "character" : "characters"}
        {showBytes && (
          <>
            {" · "}
            <span className="font-semibold tabular-nums text-ink">{hideBytes ? "?" : total}</span> {total === 1 ? "byte" : "bytes"} in UTF-8
          </>
        )}
      </p>
    </div>
  );
}

/** goal: any of { text, chars, bytes }; all given ones must match. */
export function checkTextBytes(state: unknown, goal: Record<string, unknown>) {
  const s = state as TextBytesState | undefined;
  if (!s) return false;
  const keys = (["text", "chars", "bytes"] as const).filter((k) => goal[k] !== undefined);
  if (keys.length === 0) return false;
  return keys.every((k) => (k === "text" ? String(goal.text).toLowerCase() === s.text.toLowerCase() : s[k] === goal[k]));
}
