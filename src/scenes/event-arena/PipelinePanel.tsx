"use client";

import React, { useState } from "react";
import { ArrowRight, Rocket } from "lucide-react";
import type { ProgramHandle } from "@/engine/program";
import type { ArenaDriver, ArenaSnapshot } from "./driver";
import { BTN, BTN_ON, Chip, Locked, Notice, Panel } from "./ui";

interface Props {
  snap: ArenaSnapshot;
  driver: ArenaDriver;
  program: ProgramHandle | null;
  unlocked: ReadonlySet<string>;
  focus: string | null;
  interactive: boolean;
}

const STAGES = ["validate", "dedupe", "enrich"];

function Tile({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "bad" | "plain" }) {
  const color = tone === "ok" ? "hud-accent" : tone === "warn" ? "hud-warning" : tone === "bad" ? "hud-danger" : "text-white/80";
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
      <div className="hud-label truncate">{label}</div>
      <div key={value} className={`hud-value arena-pop text-[20px] leading-tight ${color}`}>
        {value}
      </div>
    </div>
  );
}

export function PipelinePanel({ snap, driver, program, unlocked, focus, interactive }: Props) {
  const on = unlocked.has("arena-pipeline");
  const [feedResult, setFeedResult] = useState<string | null>(null);
  const [feeding, setFeeding] = useState(false);
  const stats = snap.pipeline.stats;
  const off = !interactive || !program;

  const startFeed = async () => {
    if (!program) return;
    setFeeding(true);
    setFeedResult(null);
    const res = await program.callAsync<{ received: number; delivered: number; dropped: number; failed: number; stopped: boolean }>("startFeed", 1);
    setFeeding(false);
    driver.refresh();
    if (res) setFeedResult(res.stopped ? `Stopped after ${res.received} events` : `Replay finished: ${res.delivered} delivered, ${res.dropped} dropped, ${res.failed} failed`);
  };
  const stopFeed = () => {
    program?.call("stopFeed");
    setFeeding(false);
    driver.refresh();
  };

  return (
    <Panel title="Real-time pipeline" icon={<Rocket className="h-3.5 w-3.5" />} meta={on ? "processEvent()" : "locked"} className={focus === "arena-pipeline" ? "pulse-ring" : ""}>
      {!on ? (
        <div className="p-2">
          <Locked feature="arena-pipeline" title="Pipeline" need="createPipeline(), processEvent(event)" spot={focus === "arena-pipeline"}>
            <div className="mt-2 flex items-center gap-1.5" aria-hidden>
              {["source", ...STAGES, "bus"].map((s, i) => (
                <React.Fragment key={s}>
                  {i > 0 && <ArrowRight className="h-3 w-3 shrink-0 text-white/20" />}
                  <span className="rounded-md border border-dashed border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-white/30">{s}</span>
                </React.Fragment>
              ))}
            </div>
          </Locked>
        </div>
      ) : (
        <div className="space-y-3 p-3">
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Pipeline stages">
            {["feed", ...STAGES, "arena.emit"].map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && <ArrowRight className="h-3 w-3 shrink-0 text-white/30" />}
                <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[10.5px] ${i === 0 ? "border-white/15 text-white/60" : "border-[#c5ee8a]/40 bg-[#c5ee8a]/10 text-[#e0f6c1]"}`}>{s}</span>
              </React.Fragment>
            ))}
          </div>
          <p className="text-[11px] leading-snug text-white/55">
            Live events now enter through <code className="font-mono text-white/80">processEvent(event)</code>. The stadium&apos;s feed is trusted; switch on a noisy feed to see your stages cope with duplicates and garbage.
          </p>
          <div className="grid grid-cols-2 gap-1.5 @sm:grid-cols-4">
            <Tile label="Received" value={stats?.received ?? 0} tone="plain" />
            <Tile label="Delivered" value={stats?.delivered ?? 0} tone="ok" />
            <Tile label="Dropped" value={stats?.dropped ?? 0} tone="warn" />
            <Tile label="Failed" value={stats?.failed ?? 0} tone="bad" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" aria-pressed={snap.pipeline.noisy} className={snap.pipeline.noisy ? BTN_ON : BTN} onClick={() => driver.setNoisy(!snap.pipeline.noisy)} disabled={off}>
              Noisy feed
            </button>
            <button type="button" className={BTN} onClick={startFeed} disabled={off || feeding}>
              Replay match 1 through it
            </button>
            <button type="button" className={BTN} onClick={stopFeed} disabled={off || !feeding}>
              Stop
            </button>
          </div>
          {feeding && <p className="animate-pulse text-[11px] text-white/45">startFeed(1) is streaming pages through your pipeline…</p>}
          {feedResult && <p className="hud-accent text-[11px]">{feedResult}</p>}
          {snap.error && <Notice tone="bad">{snap.error}</Notice>}
          <div>
            <div className="hud-label mb-1">Recent failures</div>
            {snap.pipeline.failures.length === 0 ? (
              <p className="text-[11px] text-white/35">None yet. Turn on the noisy feed.</p>
            ) : (
              <ul className="space-y-1">
                {snap.pipeline.failures.map((f, i) => (
                  <li key={i} className="flex min-w-0 items-start gap-2 text-[11px]">
                    <Chip tone="bad">{f.stage}</Chip>
                    <span className="min-w-0 break-words text-white/70">{f.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
