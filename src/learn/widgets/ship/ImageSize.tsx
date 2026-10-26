"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Segmented, Toggle, fmtSecs, useReport } from "./kit";

/**
 * What goes into the image you ship. Choose a base image and whether the compilers and build
 * tools stay in the final image (a single stage) or are left behind in a throw-away build stage
 * (a multi-stage build). The bar shows the size, and the readouts show what that costs every time
 * a fresh server has to pull the image.
 */

type Base = "full" | "slim" | "minimal";

const BASES: Record<Base, { label: string; mb: number; pkgs: number; note: string }> = {
  full: { label: "Full OS image", mb: 950, pkgs: 420, note: "a whole distribution with a shell, package manager and hundreds of utilities" },
  slim: { label: "Slim image", mb: 130, pkgs: 90, note: "just enough OS to run the language runtime" },
  minimal: { label: "Minimal runtime", mb: 28, pkgs: 12, note: "the runtime and little else: no shell, no package manager" },
};
const APP_MB = 45; // the application and its libraries
const TOOLS_MB = 520; // compilers, headers and build caches
const TOOLS_PKGS = 160;
const PULL_MB_PER_SEC = 50;

export interface ImageSizeState {
  base: Base;
  keepTools: boolean;
  mb: number;
  pkgs: number;
}

export function ImageSize({ props, onChange, revealed }: WidgetProps<{ base?: Base; keepTools?: boolean }>) {
  const [base, setBase] = useState<Base>(props.base ?? "full");
  const [keepTools, setKeepTools] = useState(props.keepTools ?? true);
  const mb = BASES[base].mb + APP_MB + (keepTools ? TOOLS_MB : 0);
  const pkgs = BASES[base].pkgs + (keepTools ? TOOLS_PKGS : 0) + 25;
  const pull = mb / PULL_MB_PER_SEC;
  const max = BASES.full.mb + APP_MB + TOOLS_MB;
  useReport(onChange, { base, keepTools, mb, pkgs } satisfies ImageSizeState, `${base}|${keepTools}`);

  const seg = [
    { name: "OS base", mb: BASES[base].mb, cls: "bg-[var(--line-strong)]" },
    { name: "your app + libraries", mb: APP_MB, cls: "bg-primary" },
    ...(keepTools ? [{ name: "compilers & build tools", mb: TOOLS_MB, cls: "bg-[repeating-linear-gradient(135deg,rgba(245,158,11,0.55)_0_3px,rgba(245,158,11,0.18)_3px_6px)]" }] : []),
  ];

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Segmented
          label="Base image"
          value={base}
          disabled={revealed}
          onChange={setBase}
          options={[
            { id: "full", label: "Full OS" },
            { id: "slim", label: "Slim" },
            { id: "minimal", label: "Minimal" },
          ]}
        />
        <Toggle on={!keepTools} onClick={() => setKeepTools(!keepTools)} disabled={revealed}>
          Multi-stage: leave build tools behind
        </Toggle>
      </div>
      <p className="mt-2 text-center text-xs text-ink-3">{BASES[base].label}: {BASES[base].note}.</p>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <Caption>Image size</Caption>
        <div className="mt-2 flex h-9 overflow-hidden rounded-lg bg-surface-2" style={{ width: `${Math.max((mb / max) * 100, 6)}%`, transition: "width 300ms ease" }}>
          {seg.map((s) => (
            <div key={s.name} className={`h-full ${s.cls}`} style={{ width: `${(s.mb / mb) * 100}%` }} title={`${s.name}: ${s.mb} MB`} />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-3">
          {seg.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-[3px] ${s.cls}`} /> {s.name} <span className="font-mono text-ink-2">{s.mb} MB</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" aria-live="polite">
        <Readout label="Total" value={mb >= 1000 ? `${(mb / 1000).toFixed(2)} GB` : `${mb} MB`} accent />
        <Readout label="Pull on a fresh server" value={fmtSecs(pull)} />
        <Readout label="Installed packages" value={pkgs} />
      </div>
      <Note className="mt-2">
        Every installed package is code someone has to keep patched, and every megabyte is pulled again on each new server. At {PULL_MB_PER_SEC} MB/s, twenty servers starting at once move {Math.round((mb * 20) / 1000)} GB.
      </Note>
    </div>
  );
}

/** goal: { maxMb } */
export function checkImageSize(state: unknown, goal: Record<string, unknown>) {
  const s = state as ImageSizeState | undefined;
  if (!s) return false;
  if (typeof goal.maxMb === "number" && s.mb > goal.maxMb) return false;
  if (typeof goal.minMb === "number" && s.mb < goal.minMb) return false;
  return ["maxMb", "minMb"].some((k) => k in goal);
}
