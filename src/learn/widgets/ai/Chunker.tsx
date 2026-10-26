"use client";

import React, { useState } from "react";
import { Check, X } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Note, Pill, Readout, Segmented, Slider } from "./ui";
import { QUESTIONS, SECTIONS, WORDS, chunk, retrieve, type ChunkMode } from "./chunk-core";

/**
 * A chunking playground over a small bike-shop handbook. Choose how the text is cut (fixed word
 * windows, whole sentences, or section by section), how big the pieces are and how much they
 * overlap; then ask a question and see which chunk a word-overlap retriever returns, and whether
 * the sentences that hold the answer survived intact inside it.
 */

const MODE_LABEL: Record<ChunkMode, string> = { fixed: "Fixed windows", sentence: "Whole sentences", section: "By section" };

export interface ChunkerProps {
  modes?: ChunkMode[];
  size?: number;
  overlap?: number;
  question?: string;
  /** Lock the size and overlap sliders (for questions about the other controls). */
  lockSize?: boolean;
}

export interface ChunkerState {
  mode: ChunkMode;
  size: number;
  overlap: number;
  question: string;
  chunks: number;
  retrievedWords: number;
  intact: boolean;
}

export function Chunker({ props, onChange, revealed }: WidgetProps<ChunkerProps>) {
  const modes = props.modes ?? (["fixed", "sentence", "section"] as ChunkMode[]);
  const [mode, setMode] = useState<ChunkMode>(modes[0]);
  const [size, setSize] = useState(props.size ?? 20);
  const [overlap, setOverlap] = useState(props.overlap ?? 0);
  const [qid, setQid] = useState(props.question ?? "q1");

  const q = QUESTIONS.find((x) => x.id === qid) ?? QUESTIONS[0];
  const chunks = chunk(mode, size, overlap);
  const r = retrieve(chunks, q, mode === "section");
  const top = chunks[r.best];

  const report = (m: ChunkMode, s: number, o: number, qq: string) => {
    const cs = chunk(m, s, o);
    const qu = QUESTIONS.find((x) => x.id === qq) ?? QUESTIONS[0];
    const rr = retrieve(cs, qu, m === "section");
    onChange?.({ mode: m, size: s, overlap: o, question: qq, chunks: cs.length, retrievedWords: cs[rr.best].end - cs[rr.best].start, intact: rr.intact } satisfies ChunkerState);
  };
  const upd = (m: ChunkMode, s: number, o: number, qq: string) => {
    if (revealed) return;
    const oo = Math.min(o, Math.floor(s / 2));
    setMode(m);
    setSize(s);
    setOverlap(oo);
    setQid(qq);
    report(m, s, oo, qq);
  };

  // which words belong to the answer span
  const spanStart = WORDS.findIndex((w) => w.sentence === q.from);
  let spanEnd = spanStart;
  WORDS.forEach((w, i) => {
    if (w.sentence <= q.to) spanEnd = i + 1;
  });

  const card = (c: (typeof chunks)[number], i: number, top: boolean) => (
    <div className={`rounded-lg border bg-surface px-2.5 py-2 text-[12.5px] leading-relaxed ${!top && i === r.best ? "border-[var(--brand)] ring-1 ring-[var(--brand)]" : "border-line"}`}>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="chip">chunk {i + 1}</span>
        <span className="font-mono text-[11px] text-ink-3">{c.end - c.start} words</span>
        {mode === "section" && <span className="font-mono text-[11px] text-ink-3">section: {SECTIONS[c.section].title}</span>}
        {!top && i === r.best && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-ink">retrieved</span>}
      </div>
      <p className="text-ink-2">
        {WORDS.slice(c.start, c.end).map((w, j) => {
          const gi = c.start + j;
          const inAnswer = gi >= spanStart && gi < spanEnd;
          return (
            <span key={gi} className={`${j < c.shared ? "rounded-sm bg-[var(--brand)]/25" : ""} ${inAnswer ? "font-medium text-ink underline decoration-[var(--brand)] decoration-2 underline-offset-[3px]" : ""}`}>
              {w.w}{" "}
            </span>
          );
        })}
      </p>
    </div>
  );

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {modes.length > 1 && <Segmented label="How the text is cut" value={mode} disabled={revealed} options={modes.map((m) => ({ id: m, label: MODE_LABEL[m] }))} onChange={(m) => upd(m, size, overlap, qid)} />}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-ink-3">Question</span>
          {QUESTIONS.map((x) => (
            <Pill key={x.id} on={qid === x.id} disabled={revealed} onClick={() => upd(mode, size, overlap, x.id)} label={`Question ${x.id.slice(1)}`} className="!min-w-10 !px-3">
              {x.id.toUpperCase()}
            </Pill>
          ))}
        </div>
      </div>

      <p className="mt-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink">
        <span className="font-semibold">{q.id.toUpperCase()}</span> &middot; {q.text} <span className="block text-[12px] text-ink-3">{q.note} The words that hold the answer are underlined.</span>
      </p>

      <div className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-2">
        <Slider label="Chunk size (words)" value={size} min={10} max={80} step={5} disabled={revealed || props.lockSize} onChange={(v) => upd(mode, v, overlap, qid)} />
        <Slider label="Overlap (words)" value={overlap} min={0} max={30} step={5} disabled={revealed || mode === "section"} onChange={(v) => upd(mode, size, v, qid)} />
      </div>
      {mode === "section" && <p className="text-[11.5px] text-ink-3">Section chunks never cross a heading, and each one carries its heading as metadata. Size only limits how long a section may grow before it is split.</p>}
      {mode === "sentence" && <p className="text-[11.5px] text-ink-3">Whole sentences are packed until the size is reached; overlap repeats the last sentences that fit.</p>}

      <div className="mt-3 rounded-xl border border-[var(--brand)] bg-tint p-2">
        <p className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-2">The retriever picked chunk {r.best + 1}</p>
        {card(top, r.best, true)}
      </div>
      <p className="mt-3 px-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">All {chunks.length} chunks</p>
      <div className="mt-1 max-h-[17rem] overflow-y-auto rounded-xl border border-line bg-surface-2 p-2" tabIndex={0} aria-label="All the chunks">
        <ol className="grid gap-2">
          {chunks.map((c, i) => (
            <li key={i}>{card(c, i, false)}</li>
          ))}
        </ol>
      </div>
      {overlap > 0 && <p className="mt-1 text-[11.5px] text-ink-3">Tinted words at the start of a chunk repeat the end of the one before.</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Readout label="Chunks" value={chunks.length} />
        <Readout label="Retrieved" value={`${top.end - top.start} words`} />
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${r.intact ? "border-[var(--good)]/50 bg-[var(--good)]/[0.08] text-ink" : "border-[var(--bad)]/50 bg-[var(--bad)]/[0.07] text-ink"}`}>
          {r.intact ? <Check className="h-4 w-4 text-good" /> : <X className="h-4 w-4 text-bad" />}
          {r.intact ? "Answer is whole" : "Answer is cut"}
        </span>
      </div>
      <Note tone={r.intact ? "good" : "bad"} className="mt-2">
        {r.intact
          ? `The retrieved chunk contains every sentence the answer needs.${top.end - top.start > 55 ? " It is also long, so most of what the model reads is noise." : ""}`
          : "The retrieved chunk is missing part of the answer: the model would have to guess the rest."}
      </Note>
      <p className="mt-2 text-center text-[11px] text-ink-3">Retrieval here is plain word overlap, so you are testing the cutting, not an embedding model.</p>
    </div>
  );
}

export function checkChunker(state: unknown, goal: Record<string, unknown>) {
  const st = state as ChunkerState | undefined;
  if (!st) return false;
  if (typeof goal.mode === "string" && st.mode !== goal.mode) return false;
  if (typeof goal.question === "string" && st.question !== goal.question) return false;
  if (typeof goal.size === "number" && st.size !== goal.size) return false;
  if (typeof goal.maxSize === "number" && st.size > goal.maxSize) return false;
  if (typeof goal.maxOverlap === "number" && st.overlap > goal.maxOverlap) return false;
  if (typeof goal.minOverlap === "number" && st.overlap < goal.minOverlap) return false;
  if (goal.intact === true && !st.intact) return false;
  if (goal.intact === false && st.intact) return false;
  return true;
}
