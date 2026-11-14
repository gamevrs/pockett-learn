"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, ToyNote } from "./ui";

// ───────────────────────────── emb-soc: a phone-class SoC and where work runs ─────────────────────────────

interface Block {
  id: string;
  name: string;
  /** What it is good at. */
  good: string;
  /** Typical programming route. */
  route: string;
}

const BLOCKS: Block[] = [
  { id: "big", name: "Big CPU cores", good: "Fast, flexible cores for work that is hard to split up: app code, scripting, layout. They use the most power.", route: "C, C++ or any language on Linux or Android." },
  { id: "little", name: "Little CPU cores", good: "Slower cores that sip power. Good for background chores that must run all day without draining the battery.", route: "The same code as the big cores; the operating system chooses where it runs." },
  { id: "gpu", name: "GPU", good: "Thousands of small lanes doing the same maths on many pixels or numbers at once: 3D graphics and parallel compute.", route: "OpenGL ES, Vulkan, OpenCL, or a vendor compute API." },
  { id: "npu", name: "NPU", good: "Neural-network engine: huge numbers of multiply-adds on small integers, for very little energy per operation.", route: "Through an ML framework's delegate or execution provider and the vendor SDK; models are usually int8." },
  { id: "dsp", name: "DSP", good: "A processor built for streams of samples (audio, sensors) at very low power, so it can listen while everything else sleeps.", route: "Vendor SDK; often used for audio and sensor hubs." },
  { id: "isp", name: "Image processor (ISP)", good: "Fixed hardware that turns the camera's raw sensor data into a picture: demosaic, noise reduction, colour.", route: "Fixed-function: configured by drivers through the camera framework." },
  { id: "video", name: "Video codec", good: "Fixed hardware that encodes and decodes H.264, H.265 and similar, using a fraction of the power software would.", route: "Fixed-function: used through the media framework (the player asks for hardware decoding)." },
  { id: "mem", name: "Memory controller", good: "Talks to the RAM chip and shares its bandwidth between every block on the chip.", route: "Not programmed directly; set up by boot firmware and the kernel." },
  { id: "noc", name: "Interconnect", good: "The on-chip network that carries data between the blocks and the memory controller.", route: "Not programmed directly; its bandwidth is shared, so busy blocks slow each other down." },
  { id: "io", name: "I/O: USB, PCIe, display", good: "Controllers that connect the chip to the outside world: storage, USB, the screen, radios.", route: "Operating-system drivers." },
  { id: "ram", name: "LPDDR RAM (off-chip)", good: "Low-power DRAM in a separate chip (often stacked on top of the SoC). Holds data for all the blocks.", route: "Just memory: the blocks share it, so avoiding copies between them saves time and power." },
];
const BLOCK_BY_ID: Record<string, Block> = Object.fromEntries(BLOCKS.map((b) => [b.id, b]));

interface Workload {
  id: string;
  name: string;
  answer: string;
  why: string;
  /** Reasons for specific wrong picks; `fallback` otherwise. */
  wrong: Record<string, string>;
  fallback: string;
}

const WORKLOADS: Workload[] = [
  {
    id: "ui",
    name: "Run the app's JavaScript and layout",
    answer: "big",
    why: "Branchy, hard-to-parallelise code needs fast general-purpose cores.",
    wrong: {
      little: "The little cores can run it, but it would feel slow: this work is latency-sensitive and needs the fast cores.",
      gpu: "A GPU is built for the same maths on many pixels; branchy app code does not fit it.",
      npu: "An NPU only does neural-network maths; it cannot run general code.",
    },
    fallback: "That block is built for something else; ordinary app code runs on the big CPU cores.",
  },
  {
    id: "sync",
    name: "Check for new email in the background",
    answer: "little",
    why: "A small, patient chore: the little cores do it at a fraction of the power.",
    wrong: {
      big: "It would work, but it wastes battery: waking a big core for a quick chore costs far more energy.",
      gpu: "A GPU is for massively parallel work; this is a small sequential task.",
    },
    fallback: "That block is not meant for this; background chores belong on the low-power little cores.",
  },
  {
    id: "game",
    name: "Draw a 3D game scene at 60 fps",
    answer: "gpu",
    why: "Millions of pixels, each needing the same kind of maths: exactly what thousands of GPU lanes are for.",
    wrong: {
      big: "The CPU could, but a GPU has thousands of lanes built for exactly this.",
      little: "The little cores are far too slow for this; they would manage a few frames per second at best.",
      npu: "An NPU does neural-network maths, not 3D drawing.",
    },
    fallback: "That block is not built for drawing 3D scenes; the GPU is.",
  },
  {
    id: "ml",
    name: "Find faces in camera frames with a neural network (int8)",
    answer: "npu",
    why: "int8 neural networks are what the NPU is made for, at the lowest energy per operation.",
    wrong: {
      big: "It works, but slowly and with high power; an NPU does this for a fraction of the energy.",
      gpu: "A GPU can run it, but the NPU does the same job faster for much less power.",
      dsp: "A DSP is built for sample streams like audio; the NPU is the match for neural networks.",
    },
    fallback: "That block is not the match for neural networks; the NPU is.",
  },
  {
    id: "wake",
    name: "Listen for a wake word with the screen off",
    answer: "dsp",
    why: "It runs all day, so it needs a tiny always-on processor for audio: the DSP.",
    wrong: {
      big: "It would work, but a big core running all day would flatten the battery.",
      little: "Closer, but a DSP does always-on audio for even less power.",
      gpu: "A GPU is for big parallel jobs and would waste power listening to a trickle of audio.",
      npu: "The NPU could run the model, but the always-on audio front end sits on the DSP, which uses the least power.",
    },
    fallback: "That block is not meant for always-on audio; the low-power DSP is.",
  },
  {
    id: "photo",
    name: "Turn the raw sensor image into a photo (demosaic, noise)",
    answer: "isp",
    why: "A fixed pipeline built for exactly this, working at the sensor's full speed.",
    wrong: {
      big: "It could, but at full-resolution video rates the CPU would be swamped and hot.",
      gpu: "A GPU can process images, but the ISP is wired for this pipeline and uses far less power.",
    },
    fallback: "That block is not the camera pipeline; the ISP is.",
  },
  {
    id: "movie",
    name: "Play a 4K H.265 video",
    answer: "video",
    why: "Fixed-function decode hardware plays it with very little power; software decoding would drain the battery.",
    wrong: {
      big: "Software decoding works, but at 4K it uses a lot of power; the video codec block does it cheaply.",
      gpu: "The GPU can help draw the frames, but decoding H.265 is the video codec's job.",
    },
    fallback: "That block does not decode video; the video codec block does.",
  },
];

export interface SocProps {
  mode?: "explore" | "assign";
  workloads?: string[];
  task?: string;
}

export interface SocState {
  assign: Record<string, string>;
  correct: number;
  total: number;
  selected: string | null;
  allCorrect: boolean;
}

function score(assign: Record<string, string>, list: Workload[]) {
  const correct = list.filter((w) => assign[w.id] === w.answer).length;
  return { correct, total: list.length, allCorrect: correct === list.length && list.length > 0 };
}

export function Soc({ props, onChange, revealed }: WidgetProps<SocProps>) {
  const mode = props.mode ?? "assign";
  const list = props.workloads ? WORKLOADS.filter((w) => props.workloads!.includes(w.id)) : WORKLOADS;
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(list[0]?.id ?? null);
  const locked = Boolean(revealed);

  const report = (a: Record<string, string>, sel: string | null) => {
    const sc = score(a, list);
    onChange?.({ assign: a, correct: sc.correct, total: sc.total, selected: sel, allCorrect: sc.allCorrect } satisfies SocState);
  };

  const tapBlock = (id: string) => {
    let a = assign;
    if (mode === "assign" && pending && !locked) {
      a = { ...assign, [pending]: id };
      setAssign(a);
      // Move to the next unassigned workload to keep the flow going.
      const next = list.find((w) => w.id !== pending && !a[w.id]);
      if (next) setPending(next.id);
    }
    setSelected(id);
    report(a, id);
  };

  const sc = score(assign, list);
  const info = selected ? BLOCK_BY_ID[selected] : null;

  const tile = (id: string, className = "") => {
    const b = BLOCK_BY_ID[id];
    const on = selected === id;
    const n = list.filter((w) => assign[w.id] === id).length;
    return (
      <button
        key={id}
        type="button"
        aria-pressed={on}
        onClick={() => tapBlock(id)}
        className={`flex min-h-12 min-w-10 flex-col items-start justify-center rounded-lg border px-2.5 py-2 text-left text-[0.82rem] font-medium leading-tight transition-colors ${
          on ? "border-[var(--brand)] bg-tint text-ink shadow-[0_0_0_1px_var(--brand)]" : "border-line bg-surface text-ink hover:bg-surface-2"
        } ${className}`}
      >
        <span>{b.name}</span>
        {mode === "assign" && n > 0 && <span className="mt-0.5 text-[0.75rem] font-normal text-ink-2">{n} assigned</span>}
      </button>
    );
  };

  return (
    <div className="w-full">
      {props.task && <p className="mb-2 text-[0.92rem] leading-snug text-ink">{props.task}</p>}

      {mode === "assign" && (
        <div className="mb-3">
          <Caption className="mb-1.5">1. Pick a job, 2. tap the block that should run it</Caption>
          <ul className="flex flex-col gap-1.5">
            {list.map((w) => {
              const got = assign[w.id];
              const ok = got === w.answer;
              const isPending = pending === w.id;
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    aria-pressed={isPending}
                    disabled={locked}
                    onClick={() => setPending(w.id)}
                    className={`min-h-10 w-full rounded-xl border px-3 py-2 text-left text-[0.88rem] leading-snug transition-colors disabled:cursor-not-allowed ${
                      isPending ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink hover:bg-surface-2"
                    }`}
                  >
                    <span className="block font-medium">{w.name}</span>
                    {got ? (
                      <span className="mt-0.5 block text-ink-2">
                        <span aria-hidden className="font-semibold" style={{ color: ok ? "var(--good)" : "var(--bad)" }}>
                          {ok ? "✓" : "✗"}
                        </span>{" "}
                        <span className="font-medium text-ink">{ok ? "Correct" : "Not the best fit"}</span> on {BLOCK_BY_ID[got]?.name ?? got}: {ok ? w.why : (w.wrong[got] ?? w.fallback)}
                      </span>
                    ) : (
                      <span className="mt-0.5 block text-ink-2">{isPending ? "Now tap a block below." : "Not assigned yet."}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border-2 border-[var(--line-strong)] bg-surface-2 p-2.5">
        <Caption className="mb-2">One chip: a phone-class SoC</Caption>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {["big", "little", "gpu", "npu", "dsp", "isp", "video"].map((id) => tile(id))}
          {tile("io")}
        </div>
        <button
          type="button"
          aria-pressed={selected === "noc"}
          onClick={() => tapBlock("noc")}
          className={`mt-2 flex min-h-10 w-full items-center justify-center rounded-lg border px-3 text-[0.82rem] font-medium transition-colors ${
            selected === "noc" ? "border-[var(--brand)] bg-tint text-ink shadow-[0_0_0_1px_var(--brand)]" : "border-line bg-surface text-ink hover:bg-tint"
          }`}
        >
          Interconnect (shared bus between all blocks)
        </button>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{tile("mem", "col-span-2 sm:col-span-4")}</div>
      </div>
      <div className="flex justify-center" aria-hidden>
        <div className="h-3 w-0.5 bg-[var(--line-strong)]" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{tile("ram", "col-span-2 sm:col-start-2")}</div>
      <p className="mt-1 text-center text-[0.8rem] text-ink-3">RAM is a separate chip, outside the SoC.</p>

      <div className="mt-3">
        {info ? (
          <Note tone="accent">
            <b>{info.name}.</b> {info.good} <span className="block pt-1">
              <b>How you use it:</b> {info.route}
            </span>
          </Note>
        ) : (
          <Note>{mode === "assign" ? "Tap any block to learn what it is for. With a job selected, tapping a block assigns the job to it." : "Tap a block to learn what it is good at and how you program it."}</Note>
        )}
      </div>

      {mode === "assign" && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Readout label="Correct" value={`${sc.correct} of ${sc.total}`} accent={sc.allCorrect} />
        </div>
      )}
      <ToyNote>A generic phone-class SoC; real chips differ (some have no NPU, some run the ISP on the DSP).</ToyNote>
    </div>
  );
}

/** goal: { allCorrect, selected } */
export function checkSoc(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as SocState | undefined;
  if (!s) return false;
  if (typeof goal.allCorrect === "boolean" && s.allCorrect !== goal.allCorrect) return false;
  if (typeof goal.selected === "string" && s.selected !== goal.selected) return false;
  return true;
}
