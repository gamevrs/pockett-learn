"use client";

import React, { useState } from "react";
import { AppWindow, Cpu, Globe, HardDrive, Keyboard, MemoryStick, Music, NotebookPen, ShieldCheck, Speaker } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";

type AppId = "editor" | "music" | "browser";
type KernelId = "procs" | "memory" | "files" | "devices";
type HwId = "cpu" | "ram" | "disk" | "keyboard" | "speaker" | "network";

interface Request {
  label: string;
  app: AppId;
  call: string | null;
  kernel: KernelId | null;
  hw: HwId;
  note: string;
}

const REQUESTS: Record<string, Request> = {
  save: {
    label: "Save notes.txt",
    app: "editor",
    call: "write()",
    kernel: "files",
    hw: "disk",
    note: "The editor may not touch the disk. It makes a system call, write(), and the kernel's file system code decides where the bytes go and puts them on the disk.",
  },
  sound: {
    label: "Play a sound",
    app: "music",
    call: "write()",
    kernel: "devices",
    hw: "speaker",
    note: "Sound samples go to the kernel with write(), and the sound card's driver (kernel code that knows that exact chip) feeds them to the speaker.",
  },
  memory: {
    label: "Get more memory",
    app: "browser",
    call: "mmap()",
    kernel: "memory",
    hw: "ram",
    note: "The browser asks for memory with mmap(). The kernel finds free RAM and maps it into the browser's own address space, where no other program can see it.",
  },
  key: {
    label: "Read a key press",
    app: "editor",
    call: "read()",
    kernel: "devices",
    hw: "keyboard",
    note: "The editor calls read() and waits. The keyboard driver collects the key press and the kernel hands it to the program that has focus.",
  },
  web: {
    label: "Load a web page",
    app: "browser",
    call: "connect()",
    kernel: "devices",
    hw: "network",
    note: "connect() asks the kernel to open a network connection. The kernel's network code and the network card's driver do the actual talking.",
  },
  start: {
    label: "Open another program",
    app: "music",
    call: "fork() + exec()",
    kernel: "procs",
    hw: "cpu",
    note: "Starting a program is a system call too: the kernel creates a new process, loads the program into memory and adds it to the list of processes that take turns on the CPU.",
  },
  add: {
    label: "Add 2 + 3",
    app: "editor",
    call: null,
    kernel: null,
    hw: "cpu",
    note: "No system call needed. Arithmetic on the program's own memory is allowed in user mode, so the CPU just runs the program's add instruction directly. The kernel only steps in for shared things.",
  },
};

const APPS: { id: AppId; label: string; Icon: typeof Cpu }[] = [
  { id: "editor", label: "Text editor", Icon: NotebookPen },
  { id: "music", label: "Music player", Icon: Music },
  { id: "browser", label: "Browser", Icon: AppWindow },
];
const KERNEL: { id: KernelId; label: string }[] = [
  { id: "procs", label: "Processes" },
  { id: "memory", label: "Memory" },
  { id: "files", label: "Files" },
  { id: "devices", label: "Drivers" },
];
const HW: { id: HwId; label: string; Icon: typeof Cpu }[] = [
  { id: "cpu", label: "CPU", Icon: Cpu },
  { id: "ram", label: "RAM", Icon: MemoryStick },
  { id: "disk", label: "Disk", Icon: HardDrive },
  { id: "keyboard", label: "Keyboard", Icon: Keyboard },
  { id: "speaker", label: "Speaker", Icon: Speaker },
  { id: "network", label: "Network", Icon: Globe },
];

export interface KernelProps {
  /** Which requests to offer (ids: save, sound, memory, key, web, start, add). Default: all. */
  requests?: string[];
}

export interface KernelState {
  tried: string[];
  last: string | null;
}

function Step({ n }: { n: number }) {
  return (
    <span
      className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[10.5px] font-semibold text-primary-ink [animation:pop-in_0.3s_ease-out_both]"
      style={{ animationDelay: `${(n - 1) * 140}ms` }}
    >
      {n}
    </span>
  );
}

/** Programs above, hardware below, the kernel in between: see which requests cross into the kernel. */
export function Kernel({ props, onChange }: WidgetProps<KernelProps>) {
  const ids = (props.requests ?? Object.keys(REQUESTS)).filter((id) => REQUESTS[id]);
  const [tried, setTried] = useState<string[]>([]);
  const [last, setLast] = useState<string | null>(null);
  const [n, setN] = useState(0);
  const r = last ? REQUESTS[last] : null;

  const pick = (id: string) => {
    const next = tried.includes(id) ? tried : [...tried, id];
    setTried(next);
    setLast(id);
    setN((x) => x + 1);
    onChange?.({ tried: next, last: id } satisfies KernelState);
  };

  const on = (cls: string, active: boolean) => (active ? `${cls} border-[var(--brand)] bg-tint text-ink ring-1 ring-[var(--brand)]/40` : `${cls} border-line bg-surface text-ink-2`);
  const order = r ? (r.call ? { app: 1, call: 2, kernel: 3, hw: 4 } : { app: 1, call: 0, kernel: 0, hw: 2 }) : null;

  return (
    <div className="w-full min-w-0">
      <p className="mb-2 text-center text-xs text-ink-3">Ask for something</p>
      <div className="flex flex-wrap justify-center gap-2">
        {ids.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => pick(id)}
            aria-pressed={last === id}
            className={`min-h-10 rounded-full border px-3.5 text-sm font-medium transition-colors ${
              last === id ? "border-transparent bg-primary text-primary-ink" : tried.includes(id) ? "border-[var(--line-strong)] bg-surface-2 text-ink" : "border-line bg-surface text-ink hover:bg-surface-2"
            }`}
          >
            {REQUESTS[id].label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-2">
        {/* user space */}
        <div className="rounded-xl border border-dashed border-line p-2.5">
          <p className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">
            <span>Programs</span>
            <span className="normal-case tracking-normal">user mode: limited</span>
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {APPS.map((a) => (
              <div key={a.id} className={on("flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-1.5 text-center text-xs sm:text-sm", r?.app === a.id)}>
                {r?.app === a.id && order && <Step key={`a${n}`} n={order.app} />}
                <a.Icon className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                <span className="min-w-0 truncate">{a.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* the boundary */}
        <div className="flex items-center gap-2 px-1">
          <span className="h-px flex-1 bg-[var(--line-strong)]" />
          <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 font-mono text-xs ${r?.call ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface-2 text-ink-3"}`}>
            {r?.call && order ? <Step key={`c${n}`} n={order.call} /> : null}
            {r ? (r.call ? `system call: ${r.call}` : "no system call") : "system call boundary"}
          </span>
          <span className="h-px flex-1 bg-[var(--line-strong)]" />
        </div>

        {/* kernel */}
        <div className={`rounded-xl border p-2.5 ${r?.kernel ? "border-[var(--brand)]/50" : "border-line"} bg-surface-2`}>
          <p className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Kernel
            </span>
            <span className="normal-case tracking-normal">kernel mode: full control</span>
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {KERNEL.map((k) => (
              <div key={k.id} className={on("flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs sm:text-sm", r?.kernel === k.id)}>
                {r?.kernel === k.id && order ? <Step key={`k${n}`} n={order.kernel} /> : null}
                {k.label}
              </div>
            ))}
          </div>
        </div>

        {/* hardware */}
        <div className="rounded-xl border border-line p-2.5">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">Hardware</p>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {HW.map((h) => (
              <div key={h.id} className={on("flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1 text-[11px] sm:text-xs", r?.hw === h.id)}>
                <span className="flex items-center gap-1">
                  {r?.hw === h.id && order ? <Step key={`h${n}`} n={order.hw} /> : null}
                  <h.Icon className="h-4 w-4 text-ink-3" aria-hidden />
                </span>
                {h.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 min-h-16 text-center text-sm text-ink-2" aria-live="polite">
        {r ? r.note : "Pick a request and follow its path from the program down to the hardware."}
      </p>
    </div>
  );
}

/** goal: { tried: ["save", "add"] } (all of them sent at least once) or { count: 3 }. */
export function checkKernel(state: unknown, goal: Record<string, unknown>) {
  const s = state as KernelState | undefined;
  if (!s) return false;
  if (Array.isArray(goal.tried) && !goal.tried.every((id) => s.tried.includes(id as string))) return false;
  if (typeof goal.count === "number" && s.tried.length < goal.count) return false;
  return Array.isArray(goal.tried) || typeof goal.count === "number";
}
