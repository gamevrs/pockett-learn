"use client";

import React from "react";
import type { WidgetDef, WidgetProps } from "@/learn/widget";
import { Note } from "./ui";

type Goal = Record<string, unknown>;

/**
 * Wraps a widget so that after a wrong Check it shows a nudge under it, written from the goal.
 * The player only says "Not quite"; the widget knows what the task was and can say where to look.
 */
export function withHint(def: WidgetDef, hint: (goal: Goal) => string): WidgetDef {
  const Inner = def.Component;
  function Hinted(p: WidgetProps) {
    return (
      <div className="w-full max-w-2xl">
        <Inner {...p} />
        {p.status === "wrong" && p.goal && (
          <Note tone="bad" className="mt-2">
            <span role="status">{hint(p.goal)}</span>
          </Note>
        )}
      </div>
    );
  }
  return { Component: Hinted, check: def.check };
}

export const HINTS = {
  space: (g: Goal) =>
    g.pure === false
      ? "Not yet. Make “overdue book” the query, then raise k until the list contains a phrase from another topic (the note under the plot names it)."
      : "Not yet. Pick “overdue book” as the query, keep k at 3 and measure by Angle. The note under the plot should say all three neighbours are about the library.",
  ann: (g: Goal) =>
    g.method === "ivf"
      ? "Not yet. Choose query B, then raise nprobe until Recall@5 reads 100%. Red rings are neighbours the search missed."
      : "Not yet. Use query A and raise ef until Recall@5 is 100%, while Distance checks stay under 40 of the 80 points.",
  index: (g: Goal) =>
    g.method === "exact"
      ? "Not yet. Tap each design and read the numbers: a red number breaks a requirement. Choose the simplest design with no red."
      : "Not yet. Tap each design and read the numbers: a red number breaks a requirement. Only one design has no red here.",
  filter: (g: Goal) =>
    g.leaked === true
      ? "Not yet. Choose Quarry Road Co-op as the shop, keep the strategy on No filter, and look at the results from other shops."
      : g.short === true
        ? "Not yet. Choose Hilltop Hub with Filter after and ×1 over-fetch on query A, and look at how many results come back."
        : "Not yet. Choose Quarry Road Co-op and switch to Filter first: you want 5 results and none from other shops.",
  chunker: (g: Goal) =>
    g.mode === "sentence"
      ? "Not yet. Stay on Whole sentences with question 1 and raise the chunk size until the answer is whole, but no higher than 40."
      : "Not yet. Keep the size at 20 and slide the overlap until the badge says “Answer is whole”. More overlap is not always better.",
  rag: () => "Not yet. Keep retrieval on with 3 passages, then press Next until the language model has answered.",
  hybrid: (g: Goal) =>
    g.rerank === true
      ? "Not yet. Stay on query 3 with Fuse ranks, then switch Rerank top 4 on and check that the tick is at #1."
      : g.query === "mixed"
        ? "Not yet. On query 3, find a mix between the two ends where the answering article reaches #1."
        : "Not yet. On query 2 the answering article shares no words with the question. Slide towards Meaning until it reaches #1.",
  eval: (g: Goal) =>
    g.chunks === "large" ? "Not yet. Change only the chunk size to Large, then look for a row marked “regressed”." : "Not yet. Hybrid fixes the code question, a rebuilt index fixes the stale facts, and Cite or decline stops invented answers. Watch the three bars.",
  tokens: () => "Not yet. Short common words cost one token each; long or rare words and numbers cost several. Aim for 60 or more characters in 16 tokens or fewer.",
  budget: () => "Not yet. Keep the window at 8k and trim until the total fits: shorter passages, fewer chat turns, a smaller answer reserve. You still need 6 or more passages and 1,000 reserved for the answer.",
  infer: (g: Goal) =>
    g.cold === false
      ? "Not yet. Streaming must be on, the service must be warm, and the batch must give 20 or more tok/s per user at $3.00 or less per million tokens."
      : "Not yet. Batch size 1 wastes the GPU (too costly) and 32 slows every user. Find the sizes where both goals are met.",
  agent: (g: Goal) =>
    g.leaked === true
      ? "Not yet. With both defences off, press Next until the run finishes and the email has been sent."
      : g.scenario === "poisoned"
        ? "Not yet. The leak must not happen: switch the task allowlist on (or deny the email at the human gate), then run to the end."
        : "Not yet. Keep pressing Next. When the refund reaches the human gate, press Approve, then finish the run.",
  mcp: (g: Goal) =>
    g.selected
      ? "Not yet. Read each tool’s description: which one accepts a date and cancels every booking that day?"
      : "Not yet. Harm done must be 0, no honest request may fail, and at most 2 needless approvals. Ask a person before destructive writes, block the bulk export, and make the server check who is asking.",
};
