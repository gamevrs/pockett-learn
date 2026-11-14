"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Meter, Note, Seg, Toy } from "./ui";

export interface StagesProps {
  stage?: StageId;
}

type StageId = "proto" | "evt" | "dvt" | "pvt" | "mp";

export interface StagesState {
  stage: StageId;
  visited: StageId[];
}

const STAGES: { id: StageId; short: string; name: string; question: string; builds: string; sprout: string; frozen: string; change: number }[] = [
  {
    id: "proto",
    short: "Proto",
    name: "Prototype",
    question: "Can this work at all?",
    builds: "One or a few, on dev boards and breadboards. Anything goes.",
    sprout: "A dev board with a BLE chip, a bought moisture sensor and a coin cell. Does the reading make sense, and does the battery last?",
    frozen: "Nothing yet.",
    change: 100,
  },
  {
    id: "evt",
    short: "EVT",
    name: "Engineering validation (EVT)",
    question: "Does our own board work?",
    builds: "A small batch of the first custom boards (often tens), hand-assembled or built by a prototype house.",
    sprout: "Sprout Rev A: first custom PCB. Bring it up, find the mistakes, prove each block works.",
    frozen: "The architecture and main parts.",
    change: 75,
  },
  {
    id: "dvt",
    short: "DVT",
    name: "Design validation (DVT)",
    question: "Does the design meet the requirements?",
    builds: "A larger batch (often tens to a few hundred) close to the final design and enclosure. Used for reliability and certification tests.",
    sprout: "Sprout Rev B: final-looking board and case. Temperature, drop and battery-life tests; the certification lab gets units.",
    frozen: "The schematic and board layout, apart from fixes the tests demand.",
    change: 35,
  },
  {
    id: "pvt",
    short: "PVT",
    name: "Production validation (PVT)",
    question: "Can the factory build it well, over and over?",
    builds: "A pilot run on the real production line, with the real fixtures, to measure yield and process.",
    sprout: "Sprout Rev B built on the factory line. Test fixtures are proven, and first-pass yield is measured.",
    frozen: "Everything: only process fixes remain.",
    change: 10,
  },
  {
    id: "mp",
    short: "Ship",
    name: "Mass production",
    question: "Can we ship, and keep it good?",
    builds: "The real volumes, with sample checks and field data coming back.",
    sprout: "Boxes leave the factory. Returns, firmware updates and the next hardware revision start here.",
    frozen: "Hardware changes need a formal change process.",
    change: 3,
  },
];

/** Step through prototype, EVT, DVT, PVT and mass production: what each proves, what is frozen, how easy changes are. */
export function Stages({ props, onChange }: WidgetProps<StagesProps>) {
  const [stage, setStage] = useState<StageId>(props.stage ?? "proto");
  const [visited, setVisited] = useState<StageId[]>([props.stage ?? "proto"]);
  const cur = STAGES.find((s) => s.id === stage)!;

  const go = (s: StageId) => {
    setStage(s);
    const v = visited.includes(s) ? visited : [...visited, s];
    setVisited(v);
    onChange?.({ stage: s, visited: v } satisfies StagesState);
  };

  return (
    <div className="w-full" data-widget>
      <Seg label="Build stage" value={stage} onChange={go} options={STAGES.map((s) => ({ value: s.id, label: s.short }))} />
      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3.5">
        <p className="text-[0.95rem] font-semibold text-ink">{cur.name}</p>
        <p className="mt-0.5 text-[0.9rem] text-[var(--brand)]">{cur.question}</p>
        <dl className="mt-2 space-y-2 text-[0.86rem] leading-snug text-ink-2">
          <div>
            <dt className="font-medium text-ink">What gets built</dt>
            <dd>{cur.builds}</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">For Sprout</dt>
            <dd>{cur.sprout}</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">What is frozen</dt>
            <dd>{cur.frozen}</dd>
          </div>
        </dl>
      </div>
      <div className="mt-3">
        <Caption>How easy is it to change the design now?</Caption>
        <div className="mt-1">
          <Meter frac={cur.change / 100} tone={cur.change < 20 ? "bad" : cur.change < 50 ? "warn" : "brand"} label="Freedom to change the design" />
        </div>
      </div>
      <div className="mt-3">
        <Note>Mistakes cost more the later you find them: a changed wire on a breadboard is free, a changed part on a factory line can mean scrapped stock and lost weeks.</Note>
      </div>
      <Toy>EVT, DVT and PVT are common industry names. Companies use them differently (some skip a stage, some add more), and the batch sizes shown are typical orders of magnitude, not rules.</Toy>
    </div>
  );
}

/** goal: { visited: [..stage ids..] } or { stage }. */
export function checkStages(state: unknown, goal: Record<string, unknown>) {
  const s = state as StagesState | undefined;
  if (!s) return false;
  if (typeof goal.stage === "string" && s.stage !== goal.stage) return false;
  if (Array.isArray(goal.visited)) for (const v of goal.visited) if (!s.visited.includes(v as StageId)) return false;
  return true;
}
