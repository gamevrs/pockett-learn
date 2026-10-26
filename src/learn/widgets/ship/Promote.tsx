"use client";

import React, { useState } from "react";
import { Box, GitCommitHorizontal, Hammer, RotateCcw, ShieldCheck, StepForward, TriangleAlert } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Segmented, useReport } from "./kit";

/**
 * "Build once, promote" versus "rebuild in every environment". A commit lands; in the first mode
 * it is built into one artifact that is tested in staging and then shipped unchanged to
 * production. In the second, each environment builds from source on its own, an hour apart, and a
 * dependency released in between means production runs something nobody tested.
 */

type Mode = "promote" | "rebuild";

interface Stage {
  title: string;
  text: string;
  /** Artifact digest now present in each environment after this stage. */
  staging?: string;
  prod?: string;
  dep?: { staging?: string; prod?: string };
  tone?: "good" | "bad";
}

const STAGING_DIGEST = "sha256:9c1e07";
const PROD_REBUILT_DIGEST = "sha256:e48b3d";

function stagesFor(mode: Mode): Stage[] {
  if (mode === "promote") {
    return [
      { title: "A change is merged", text: "Commit 7f3a21: “round delivery ETAs to the minute”. Nothing is built or running yet." },
      { title: "Build, once", text: "CI turns commit 7f3a21 into one artifact and files it in the registry under its digest.", staging: undefined },
      { title: "Deploy that artifact to staging", text: "Staging runs sha256:9c1e07, and the full test suite runs against it. Everything passes.", staging: STAGING_DIGEST, dep: { staging: "geo-lib 2.4.0" }, tone: "good" },
      { title: "Promote the same artifact", text: "Production is told to run sha256:9c1e07: the identical bytes staging ran. Nothing is rebuilt, so nothing can differ.", staging: STAGING_DIGEST, prod: STAGING_DIGEST, dep: { staging: "geo-lib 2.4.0", prod: "geo-lib 2.4.0" }, tone: "good" },
    ];
  }
  return [
    { title: "A change is merged", text: "Commit 7f3a21: “round delivery ETAs to the minute”. Nothing is built or running yet." },
    { title: "Staging builds from source", text: "The staging server pulls the code and installs its dependencies. geo-lib resolves to 2.4.0. Tests pass.", staging: STAGING_DIGEST, dep: { staging: "geo-lib 2.4.0" }, tone: "good" },
    { title: "An hour passes", text: "The geo-lib maintainers publish 2.4.1. Your build asked for “2.4 or newer”, so the next build will pick it up.", staging: STAGING_DIGEST, dep: { staging: "geo-lib 2.4.0" } },
    { title: "Production builds from source", text: "Same commit, but the production build installs geo-lib 2.4.1. The result is a different artifact that was never tested.", staging: STAGING_DIGEST, prod: PROD_REBUILT_DIGEST, dep: { staging: "geo-lib 2.4.0", prod: "geo-lib 2.4.1" }, tone: "bad" },
  ];
}

export interface PromoteState {
  mode: Mode;
  finished: boolean;
  /** True once production runs exactly what staging tested. */
  sameBytes: boolean;
}

export function Promote({ props, onChange, revealed }: WidgetProps<{ mode?: Mode; locked?: boolean }>) {
  const [mode, setMode] = useState<Mode>(props.mode ?? "promote");
  const [shown, setShown] = useState(0);
  const list = stagesFor(mode);
  const finished = shown >= list.length;
  const current = shown > 0 ? list[shown - 1] : undefined;
  // environments show the latest digest any shown stage has set
  const env = { staging: undefined as string | undefined, prod: undefined as string | undefined, depS: undefined as string | undefined, depP: undefined as string | undefined };
  for (const st of list.slice(0, shown)) {
    if (st.staging) env.staging = st.staging;
    if (st.prod) env.prod = st.prod;
    if (st.dep?.staging) env.depS = st.dep.staging;
    if (st.dep?.prod) env.depP = st.dep.prod;
  }
  const same = Boolean(env.prod) && env.prod === env.staging;
  const artifact = mode === "promote" && shown >= 2 ? STAGING_DIGEST : undefined;
  const state: PromoteState = { mode, finished, sameBytes: finished && same };
  useReport(onChange, state, `${mode}|${finished}|${same}`);

  const pick = (m: Mode) => {
    if (revealed) return;
    setMode(m);
    setShown(0);
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="flex justify-center">
        <Segmented
          label="How production gets its code"
          value={mode}
          disabled={revealed || props.locked}
          onChange={pick}
          options={[
            { id: "promote", label: "Build once, promote" },
            { id: "rebuild", label: "Rebuild per environment" },
          ]}
        />
      </div>

      <div className="mt-3 grid gap-2 min-[520px]:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <Caption className="flex items-center gap-1.5">
            <GitCommitHorizontal className="h-3.5 w-3.5" /> Source
          </Caption>
          <p className="mt-1.5 font-mono text-[13px] font-semibold text-ink">7f3a21</p>
          <p className="mt-0.5 text-xs text-ink-3">delivery-api, main</p>
          {artifact && (
            <div className="pop-in mt-2 flex items-center gap-1.5 rounded-lg border border-[var(--brand)]/50 bg-tint px-2 py-1 font-mono text-[11px] text-ink">
              <Box className="h-3.5 w-3.5 shrink-0 text-brand" /> {artifact}
            </div>
          )}
          {mode === "promote" && shown >= 2 && <p className="mt-1 text-[11px] text-ink-3">in the registry</p>}
        </div>
        <EnvCard name="Staging" digest={env.staging} dep={env.depS} />
        <EnvCard name="Production" digest={env.prod} dep={env.depP} flag={Boolean(env.prod) && !same} />
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3" aria-live="polite">
        {current ? (
          <div key={`${mode}-${shown}`} className="pop-in">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              {current.tone === "bad" ? <TriangleAlert className="h-4 w-4 shrink-0 text-bad" /> : current.title.startsWith("Build") ? <Hammer className="h-4 w-4 shrink-0 text-ink-2" /> : current.tone === "good" ? <ShieldCheck className="h-4 w-4 shrink-0 text-good" /> : null}
              {current.title}
            </p>
            <p className="mt-1 text-[13px] leading-snug text-ink-2">{current.text}</p>
          </div>
        ) : (
          <p className="text-sm text-ink-3">Press Next to follow one change from commit to production.</p>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary !h-10" onClick={() => setShown(shown + 1)} disabled={revealed || finished}>
          <StepForward className="h-4 w-4" /> Next
        </button>
        <button type="button" className="btn !h-10" onClick={() => setShown(0)} disabled={revealed || shown === 0}>
          <RotateCcw className="h-4 w-4" /> Replay
        </button>
      </div>

      {finished && (
        <Note tone={same ? "good" : "bad"} className="pop-in mt-2">
          {same ? "Production runs the exact bytes that staging tested. The tests you ran are evidence about what is live." : "Production is running something new. The staging tests say nothing about it."}
        </Note>
      )}
    </div>
  );
}

function EnvCard({ name, digest, dep, flag }: { name: string; digest?: string; dep?: string; flag?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${flag ? "border-[var(--bad)]/50 bg-[var(--bad)]/[0.06]" : digest ? "border-[var(--brand)]/45 bg-tint" : "border-line bg-surface"}`}>
      <Caption>{name}</Caption>
      {digest ? (
        <div key={digest} className="pop-in">
          <p className="mt-1.5 break-all font-mono text-[13px] font-semibold text-ink">{digest}</p>
          <p className="mt-0.5 font-mono text-[11px] text-ink-3">{dep}</p>
        </div>
      ) : (
        <p className="mt-1.5 text-sm text-ink-3">nothing running</p>
      )}
    </div>
  );
}

/** goal: { mode, finished, sameBytes } */
export function checkPromote(state: unknown, goal: Record<string, unknown>) {
  const s = state as PromoteState | undefined;
  if (!s) return false;
  if (typeof goal.mode === "string" && s.mode !== goal.mode) return false;
  if (goal.finished === true && !s.finished) return false;
  if (typeof goal.sameBytes === "boolean" && s.sameBytes !== goal.sameBytes) return false;
  return ["mode", "finished", "sameBytes"].some((k) => k in goal);
}
