"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Segmented, Slider } from "./ui";

/**
 * Two small tools for thinking in tokens.
 *  - Tokenizer: a toy tokenizer splits text into pieces so you can see why a word, a number or a
 *    sentence in another script costs what it costs. Real tokenizers learn their own splits, but
 *    they behave the same way: common words are one piece, rare strings are many.
 *  - ContextBudget: everything the model reads (rules, history, retrieved passages, the question)
 *    plus the room reserved for its answer must fit one context window.
 */

const SUFFIXES = ["ation", "ition", "ing", "tion", "able", "ness", "ment", "ly", "ed", "er", "s"];

/** Split one run of letters into 1..n pieces. Short words stay whole. */
function wordPieces(word: string): string[] {
  if (word.length <= 6) return [word];
  let stem = word;
  let tail = "";
  for (const s of SUFFIXES) {
    if (word.toLowerCase().endsWith(s) && word.length - s.length >= 3) {
      stem = word.slice(0, word.length - s.length);
      tail = word.slice(word.length - s.length);
      break;
    }
  }
  const out: string[] = [];
  for (let i = 0; i < stem.length; i += 5) out.push(stem.slice(i, i + 5));
  if (tail) out.push(tail);
  return out;
}

export function tokenize(text: string): string[] {
  const out: string[] = [];
  const re = /(\s*)([A-Za-z]+|\d+|[^\sA-Za-z\d])/g;
  for (const m of text.matchAll(re)) {
    const lead = m[1] ? " " : "";
    const piece = m[2];
    if (/^[A-Za-z]+$/.test(piece)) {
      const parts = wordPieces(piece);
      parts.forEach((p, i) => out.push(i === 0 ? lead + p : p));
    } else if (/^\d+$/.test(piece)) {
      for (let i = 0; i < piece.length; i += 3) out.push((i === 0 ? lead : "") + piece.slice(i, i + 3));
    } else if (/^[\x00-\x7f]$/.test(piece)) {
      out.push(lead + piece);
    } else {
      // outside plain ASCII: assume a character costs about two pieces
      out.push(lead + piece, "·");
    }
  }
  return out;
}

const SAMPLES: Record<string, { label: string; text: string }> = {
  plain: { label: "Plain English", text: "Please move my appointment to Friday morning." },
  rare: { label: "Rare words", text: "Please reschedule my otorhinolaryngology consultation, notwithstanding unprecedented congestion." },
  numbers: { label: "Numbers & codes", text: "Order 4400718235 shipped on 2026-03-17, ref ZX-9041-QQ." },
  code: { label: "Code", text: 'for (i = 0; i < n; i++) { total += prices[i] * 1.2; }' },
  other: { label: "Another script", text: "予約を金曜日の朝に変更してください。" },
};

export interface TokenizerProps {
  sample?: keyof typeof SAMPLES;
  /** Price per million input tokens, in dollars, for the cost readout. Default 0.5. */
  pricePerM?: number;
}

export interface TokenizerState {
  text: string;
  tokens: number;
  chars: number;
}

export function Tokenizer({ props, onChange, revealed }: WidgetProps<TokenizerProps>) {
  const [sample, setSample] = useState<string>(props.sample ?? "plain");
  const [text, setText] = useState(SAMPLES[props.sample ?? "plain"].text);
  const toks = tokenize(text);
  const price = props.pricePerM ?? 0.5;

  const upd = (t: string, key?: string) => {
    if (revealed) return;
    setText(t);
    if (key) setSample(key);
    onChange?.({ text: t, tokens: tokenize(t).length, chars: t.length } satisfies TokenizerState);
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap justify-center gap-2">
        <Segmented
          label="Sample text"
          value={sample}
          disabled={revealed}
          options={Object.entries(SAMPLES).map(([id, s]) => ({ id, label: s.label }))}
          onChange={(k) => upd(SAMPLES[k].text, k)}
          className="max-w-full overflow-x-auto"
        />
      </div>
      <label className="mt-3 block">
        <Caption className="mb-1">Text (edit it)</Caption>
        <textarea
          value={text}
          disabled={revealed}
          maxLength={280}
          rows={2}
          onChange={(e) => upd(e.target.value, "custom")}
          className="w-full rounded-lg border border-line bg-surface p-2 font-mono text-[13px] text-ink"
        />
      </label>
      <div className="mt-2 flex flex-wrap gap-1 rounded-xl border border-line bg-surface-2 p-2" aria-label="The text cut into tokens">
        {toks.length === 0 && <span className="text-sm text-ink-3">Nothing to count.</span>}
        {toks.map((t, i) => (
          <span key={i} className={`whitespace-pre rounded px-1 py-0.5 font-mono text-[12.5px] text-ink ${i % 2 ? "bg-[var(--brand)]/20" : "bg-[var(--brand)]/45"}`}>
            {t === "·" ? "·" : t}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Tokens" value={toks.length} accent />
        <Readout label="Characters" value={text.length} />
        <Readout label="Characters per token" value={toks.length ? (text.length / toks.length).toFixed(1) : "0"} />
        <Readout label={`Cost at $${price}/M`} value={`$${((toks.length * price) / 1e6).toFixed(6)}`} />
      </div>
      <Note className="mt-2">Toy tokenizer: common short words stay whole; long, rare words, numbers and other scripts break into many pieces. Real tokenizers differ in detail, not in spirit.</Note>
    </div>
  );
}

export function checkTokenizer(state: unknown, goal: Record<string, unknown>) {
  const st = state as TokenizerState | undefined;
  if (!st) return false;
  if (typeof goal.maxTokens === "number" && st.tokens > goal.maxTokens) return false;
  if (typeof goal.minTokens === "number" && st.tokens < goal.minTokens) return false;
  if (typeof goal.minChars === "number" && st.chars < goal.minChars) return false;
  return true;
}

// ───────────────────────── context budget ─────────────────────────

const WINDOWS = [8192, 32768, 128000];
const SYSTEM_TOKENS = 400;
const QUESTION_TOKENS = 40;
const TURN_TOKENS = 150;

export interface BudgetProps {
  window?: number;
  chunks?: number;
  chunkTokens?: number;
  turns?: number;
  reserve?: number;
}

export interface BudgetState {
  window: number;
  chunks: number;
  chunkTokens: number;
  turns: number;
  reserve: number;
  used: number;
  fits: boolean;
}

export function ContextBudget({ props, onChange, revealed }: WidgetProps<BudgetProps>) {
  const [win, setWin] = useState(props.window ?? 8192);
  const [chunks, setChunks] = useState(props.chunks ?? 12);
  const [chunkTokens, setChunkTokens] = useState(props.chunkTokens ?? 800);
  const [turns, setTurns] = useState(props.turns ?? 10);
  const [reserve, setReserve] = useState(props.reserve ?? 1000);

  const parts = [
    { id: "system", label: "Rules (system prompt)", tokens: SYSTEM_TOKENS, colour: "var(--ink-3)" },
    { id: "history", label: `Chat history (${turns} turns)`, tokens: turns * TURN_TOKENS, colour: "#4fa3df" },
    { id: "chunks", label: `Retrieved passages (${chunks} × ${chunkTokens})`, tokens: chunks * chunkTokens, colour: "var(--brand)" },
    { id: "question", label: "The question", tokens: QUESTION_TOKENS, colour: "#e8924a" },
    { id: "reserve", label: "Room for the answer", tokens: reserve, colour: "#e0679c" },
  ];
  const used = parts.reduce((s, p) => s + p.tokens, 0);
  const fits = used <= win;
  const scale = Math.max(used, win);

  const upd = (patch: Partial<{ win: number; chunks: number; chunkTokens: number; turns: number; reserve: number }>) => {
    if (revealed) return;
    const n = { win, chunks, chunkTokens, turns, reserve, ...patch };
    setWin(n.win);
    setChunks(n.chunks);
    setChunkTokens(n.chunkTokens);
    setTurns(n.turns);
    setReserve(n.reserve);
    const u = SYSTEM_TOKENS + QUESTION_TOKENS + n.turns * TURN_TOKENS + n.chunks * n.chunkTokens + n.reserve;
    onChange?.({ window: n.win, chunks: n.chunks, chunkTokens: n.chunkTokens, turns: n.turns, reserve: n.reserve, used: u, fits: u <= n.win } satisfies BudgetState);
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs text-ink-3">Context window</span>
        <Segmented label="Context window" value={win} disabled={revealed} options={WINDOWS.map((w) => ({ id: w, label: w >= 1000 ? `${Math.round(w / 1000)}k` : String(w) }))} onChange={(v) => upd({ win: v })} />
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
        <div className="relative h-7 overflow-hidden rounded-md bg-[var(--line-strong)]/60">
          <div className="flex h-full" style={{ width: `${(used / scale) * 100}%` }}>
            {parts.map((p) => (
              <div key={p.id} title={`${p.label}: ${p.tokens}`} style={{ width: `${(p.tokens / used) * 100}%`, background: p.colour }} />
            ))}
          </div>
          <div className="absolute inset-y-0 w-0.5 bg-[var(--ink)]" style={{ left: `${(win / scale) * 100}%` }} aria-hidden />
        </div>
        <p className="relative mt-1 h-4 font-mono text-[11px] text-ink-3">
          <span className="absolute whitespace-nowrap" style={{ left: `${(win / scale) * 100}%`, transform: "translateX(-100%)" }}>
            window limit ▏{win.toLocaleString()}
          </span>
        </p>
        <ul className="mt-1 grid gap-1">
          {parts.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 text-[12.5px]">
              <span className="flex min-w-0 items-center gap-2 text-ink-2">
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: p.colour }} />
                <span className="truncate">{p.label}</span>
              </span>
              <span className="font-mono tabular-nums text-ink">{p.tokens.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 grid gap-x-4 sm:grid-cols-2">
        <Slider label="Passages retrieved (k)" value={chunks} min={0} max={20} disabled={revealed} onChange={(v) => upd({ chunks: v })} />
        <Slider label="Tokens per passage" value={chunkTokens} min={100} max={1000} step={100} disabled={revealed} onChange={(v) => upd({ chunkTokens: v })} />
        <Slider label="Chat turns kept" value={turns} min={0} max={30} disabled={revealed} onChange={(v) => upd({ turns: v })} />
        <Slider label="Reserved for the answer" value={reserve} min={200} max={4000} step={200} disabled={revealed} onChange={(v) => upd({ reserve: v })} />
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <Readout label="Total" value={used.toLocaleString()} accent={fits} />
        <Readout label={fits ? "Spare" : "Over by"} value={Math.abs(win - used).toLocaleString()} />
      </div>
      <Note tone={fits ? "good" : "bad"} className="mt-2">
        {fits ? `It fits, with ${(win - used).toLocaleString()} tokens to spare.` : `${(used - win).toLocaleString()} tokens too many. The request would be rejected or the oldest text silently cut: trim passages, history or the answer reserve.`}
      </Note>
    </div>
  );
}

export function checkContextBudget(state: unknown, goal: Record<string, unknown>) {
  const st = state as BudgetState | undefined;
  if (!st) return false;
  if (goal.fits === true && !st.fits) return false;
  if (typeof goal.window === "number" && st.window !== goal.window) return false;
  if (typeof goal.minChunks === "number" && st.chunks < goal.minChunks) return false;
  if (typeof goal.minReserve === "number" && st.reserve < goal.minReserve) return false;
  if (typeof goal.minTurns === "number" && st.turns < goal.minTurns) return false;
  return true;
}
