"use client";

import React from "react";
import type { SceneProps } from "@/engine/scene";
import { FeatureIcon } from "@/components/ui/icons";
import { Frame, Lamp, LockedPanel, WaitingPanel } from "../cpp-basics/ui";
import { Casts, FaultDrill, GlassCase, HandoverDesk, Logbook, Manifest, Operators, RegistryView, Report, RuleBoard, Storeroom, Custody } from "./cards";
import { LabConsole } from "./console";
import { doubleOwned, elementBlocks, frameGroups, readLab, resolveTarget, isMove, type Lab, type Shot } from "./data";
import { FramesView, ShelfView, VaultMap, WorkbenchView } from "./memory";
import { CounterStrip, ErrorStrip, MapStrip, OVERVIEW_H, OVERVIEW_W, StatusChip } from "./overview";
import { chipSpecs, PANELS, PANEL_IDS, type PanelSpec } from "./specs";
import { CSS, Empty, Stepper, useStepper } from "./ui";

/**
 * Provenance Lab: the memory room of the Larkspur Conservation Lab, the live board for the C++
 * Intermediate course.
 *
 * C++ cannot be called back, so the board draws what the program printed: stdout for the console,
 * the `shotN` keys written by snap() for the memory pictures, the `audit` key for the vault ledger
 * and the plain values sent with scene(). A failed build arrives as a `build_error` value and is shown
 * on the console with its line number. Each system is a dashed ghost until its lesson is passed, and
 * shows a "press Run" hint when it is unlocked but nothing has been built on this page yet.
 *
 * Each panel that works from photos has its own stepper, so a learner can walk through the photos
 * that matter to that panel without losing the others.
 */

const STEP_PANELS = new Set(["pv-bench", "pv-shelf", "pv-frames", "pv-vault", "pv-custody", "pv-handover", "pv-storeroom", "pv-registry", "pv-glass"]);

/** The photo each panel opens on, when the learner took it: the one from its own lesson. */
const HOME_CAPTION: Record<string, string> = {
  "pv-bench": "the bench",
  "pv-shelf": "the shelf",
  "pv-frames": "after the block",
  "pv-custody": "two logs, two buffers",
  "pv-handover": "after the handovers",
  "pv-storeroom": "storeroom",
  "pv-registry": "registry",
  "pv-glass": "glass case",
};

/** The photos a panel can show, by index. */
function candidatesFor(id: string, lab: Lab): number[] {
  const pick = (pred: (s: Shot) => boolean) => lab.shots.flatMap((s, i) => (pred(s) ? [i] : []));
  switch (id) {
    case "pv-bench":
      return pick((s) => s.entries.length > 0);
    case "pv-shelf":
      return pick((s) => s.entries.some((e) => e.kind === "arr"));
    case "pv-frames":
      return pick((s) => frameGroups(s).length >= 2 || s.entries.some((e) => (e.kind === "ptr" || e.kind === "own") && resolveTarget(lab, s, e).kind === "dangling"));
    case "pv-vault":
      return pick((s) => s.blocks.length > 0 || s.entries.some((e) => e.targetBlock !== undefined));
    case "pv-custody":
      return pick((s) => s.entries.some((e) => (e.kind === "own" || e.role === "owner" || e.kind === "vec") && (e.targetBlock !== undefined || e.targetRegion === 3)));
    case "pv-handover":
      return pick((s) => s.events.some((e) => isMove(e.kind)) && s.entries.length > 0);
    case "pv-storeroom":
      return pick((s) => s.entries.some((e) => e.kind === "own" || (e.kind === "vec" && elementBlocks(e).some((b) => b !== null))));
    case "pv-registry":
      return pick((s) => s.entries.some((e) => e.kind === "vec" && e.name.toLowerCase().includes("registry")));
    case "pv-glass":
      return pick((s) => s.entries.some((e) => e.isConst && (e.kind === "obj" || e.kind === "val")));
    default:
      return [];
  }
}

function PanelBody({ id, lab, shot, interactive }: { id: string; lab: Lab; shot: Shot | null; interactive: boolean }) {
  switch (id) {
    case "pv-bench":
      return shot ? <WorkbenchView lab={lab} shot={shot} /> : <Empty>Take a photo with peek(&quot;name&quot;, x); snap(&quot;caption&quot;);</Empty>;
    case "pv-shelf":
      return shot ? <ShelfView lab={lab} shot={shot} /> : <Empty>Photograph an array: peek(&quot;shelfSlots&quot;, shelfSlots);</Empty>;
    case "pv-frames":
      return shot ? <FramesView lab={lab} shot={shot} /> : <Empty>Take a photo from inside a function to see its frame.</Empty>;
    case "pv-vault":
      return shot ? <VaultMap lab={lab} shot={shot} finalShot={shot.index === lab.shots.length - 1} /> : <Empty>Photograph a pointer returned by new to see the vault.</Empty>;
    case "pv-logbook":
      return <Logbook lab={lab} interactive={interactive} />;
    case "pv-custody":
      return shot ? <Custody lab={lab} shot={shot} /> : <Empty>Peek an owning pointer (OWNER) or a unique_ptr.</Empty>;
    case "pv-casts":
      return <Casts lab={lab} />;
    case "pv-handover":
      return <HandoverDesk lab={lab} shot={shot} />;
    case "pv-rules":
      return <RuleBoard lab={lab} />;
    case "pv-storeroom":
      return shot ? <Storeroom lab={lab} shot={shot} /> : <Empty>Photograph a vector of unique_ptr.</Empty>;
    case "pv-operators":
      return <Operators lab={lab} />;
    case "pv-glass":
      return <GlassCase lab={lab} shot={shot} />;
    case "pv-manifest":
      return <Manifest lab={lab} interactive={interactive} />;
    case "pv-faults":
      return <FaultDrill lab={lab} shot={lab.shots.length > 0 ? ([...lab.shots].reverse().find((s) => s.caption.toLowerCase().includes("guarantee")) ?? lab.shots[lab.shots.length - 1]) : null} />;
    case "pv-registry":
      return shot ? <RegistryView lab={lab} shot={shot} /> : <Empty>Peek registry.pieces() and take a photo.</Empty>;
    default:
      return <Report lab={lab} />;
  }
}

/** A panel body with its own photo stepper. Remount (key) on every new run to follow the newest photo again. */
function SteppedBody({ id, lab, interactive }: { id: string; lab: Lab; interactive: boolean }) {
  const candidates = candidatesFor(id, lab);
  const want = HOME_CAPTION[id];
  const homeAt = want ? candidates.map((c) => lab.shots[c].caption).lastIndexOf(want) : -1;
  const step = useStepper(candidates, homeAt >= 0 ? homeAt : undefined);
  const shot = step.current >= 0 ? lab.shots[step.current] : null;
  return (
    <div>
      {step.count > 1 && shot && <Stepper step={step} caption={shot.caption} />}
      {step.count === 1 && shot && <p className="hud-label mb-2 truncate !normal-case !tracking-normal !text-[11px] !text-white/60" title={shot.caption}>
          photo · {shot.caption}
        </p>}
      <PanelBody id={id} lab={lab} shot={shot} interactive={interactive} />
    </div>
  );
}

function panelMeta(id: string, lab: Lab): string | undefined {
  switch (id) {
    case "pv-vault":
      return lab.audit ? `${lab.audit.counters.allocs} taken` : undefined;
    case "pv-manifest":
      return Array.isArray(lab.scalars.intakeIds) ? `${lab.scalars.intakeIds.length} in` : undefined;
    case "pv-registry":
      return typeof lab.scalars.registrySize === "number" ? `${lab.scalars.registrySize} pieces` : undefined;
    default:
      return undefined;
  }
}

/** Space the stage shell keeps for its own label and expand button along the top edge. */
const SHELL_TOP = 44;

const isCompact = (box: { w: number; h: number } | null) => box !== null && box.w >= 420 && box.h <= 600 && box.w / box.h >= 1.2;

export default function ProvenanceScene({ program, unlocked, focus, celebration, interactive }: SceneProps) {
  const [box, setBox] = React.useState<{ w: number; h: number } | null>(null);
  const measure = React.useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox((prev) => (prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1 ? prev : { w: width, h: height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const lab = readLab(program);
  const flashing = new Set(celebration?.features ?? []);
  const compileFailed = lab.error?.type === "CompileError";
  const liveCount = PANEL_IDS.filter((id) => unlocked.has(id)).length;
  const generation = program?.generation ?? 0;
  const double = lab.shots.some((s) => doubleOwned(s).length > 0);
  const leaked = (lab.audit?.leakCount ?? 0) > 0;
  const freedTwice = (lab.audit?.counters.badFrees ?? 0) > 0;
  const fault = !!lab.error || leaked || freedTwice;
  const stateLabel = lab.error ? "Fault" : program ? (lab.audit ? (leaked ? "Leaks found" : freedTwice ? "Double free caught" : "Audit clean") : "Build OK") : "Idle";

  const renderPanel = (spec: PanelSpec, className: string) => {
    if (!unlocked.has(spec.id)) {
      return <LockedPanel key={spec.id} id={spec.id} title={spec.title} kind={spec.ghost} lesson={spec.lesson} clause={spec.clause} spot={focus === spec.id} className={className} />;
    }
    if (!program) return <WaitingPanel key={spec.id} id={spec.id} title={spec.title} kind={spec.ghost} lesson={spec.lesson} className={className} />;
    return (
      <Frame
        key={flashing.has(spec.id) ? `${spec.id}:${celebration?.nonce}` : spec.id}
        id={spec.id}
        title={spec.title}
        icon={<FeatureIcon id={spec.id} className="h-3.5 w-3.5" />}
        meta={compileFailed ? undefined : panelMeta(spec.id, lab)}
        focus={focus === spec.id}
        flash={flashing.has(spec.id)}
        className={className}
      >
        {compileFailed ? (
          <p className="hud-log hud-muted py-1 text-[11px]">Waiting for a successful build. Fix the error on the console and press Run.</p>
        ) : STEP_PANELS.has(spec.id) ? (
          <SteppedBody key={generation} id={spec.id} lab={lab} interactive={interactive} />
        ) : (
          <PanelBody id={spec.id} lab={lab} shot={null} interactive={interactive} />
        )}
      </Frame>
    );
  };

  if (box && isCompact(box)) {
    const availH = Math.max(box.h - SHELL_TOP, 120);
    const scale = Math.min(box.w / OVERVIEW_W, availH / OVERVIEW_H);
    const chips = chipSpecs(lab);
    return (
      <div ref={measure} className="absolute inset-0 overflow-hidden">
        <style>{CSS}</style>
        <div
          className="absolute flex flex-col gap-2.5"
          style={{ width: OVERVIEW_W, height: OVERVIEW_H, left: (box.w - OVERVIEW_W * scale) / 2, top: SHELL_TOP + (availH - OVERVIEW_H * scale) / 2, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <div className="relative flex min-w-0 shrink-0 items-center gap-2 px-0.5">
            <Lamp on={program ? true : undefined} bad={fault} size={9} />
            <h2 className="hud-title !text-[14px]">Larkspur Lab memory room</h2>
            <span className={`hud-label min-w-0 truncate !text-[11px] ${fault ? "hud-danger" : "text-white/55"}`}>· {stateLabel}</span>
            <span className="hud-label ml-auto shrink-0 !text-[11px]">
              <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/45"}`}>{liveCount}</span>/{PANELS.length} systems live
            </span>
            {program && <span key={generation} aria-hidden className="pv-scan pointer-events-none absolute inset-x-0 -bottom-1 h-px bg-gradient-to-r from-transparent via-[#c5ee8a] to-transparent" />}
          </div>
          <MapStrip lab={lab} vaultOn={unlocked.has("pv-vault")} benchOn={unlocked.has("pv-bench")} built={!!program} />
          <div className="shrink-0">{lab.error ? <ErrorStrip error={lab.error} /> : <CounterStrip lab={lab} vaultOn={unlocked.has("pv-vault")} />}</div>
          <div className="grid shrink-0 grid-cols-4 gap-2">
            {chips.map((c) => (
              <StatusChip key={c.id} spec={c} unlocked={unlocked.has(c.id)} built={!!program} spot={focus === c.id} flash={flashing.has(c.id)} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const focused = PANELS.find((p) => p.id === focus) ?? null;
  const rest = PANELS.filter((p) => p.id !== focused?.id);
  const cardClass = "mb-3 break-inside-avoid";

  return (
    <div ref={measure} className={`@container absolute inset-0 ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
      <style>{CSS}</style>
      <div className="px-3 pb-3 pt-12">
        <div className="mb-3 px-0.5">
          <div className="flex min-w-0 items-baseline gap-x-3 gap-y-0.5">
            <h2 className="hud-title min-w-0 truncate">Larkspur Lab memory room</h2>
            <span className="hud-label ml-auto shrink-0">
              <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/45"}`}>{liveCount}</span>/{PANELS.length} systems live
            </span>
          </div>
          <div className="relative mt-1.5 flex min-w-0 items-center gap-2 overflow-hidden border-t border-white/10 pt-1.5">
            <Lamp on={program ? true : undefined} bad={fault} />
            <span className={`hud-label min-w-0 truncate ${fault ? "hud-danger" : "text-white/55"}`}>{stateLabel}</span>
            {lab.shots.length > 0 && !compileFailed && (
              <span className="hud-value ml-auto shrink-0 text-[10.5px] text-white/55">
                {lab.shots.length} photo{lab.shots.length === 1 ? "" : "s"}
                {double ? " · two owners!" : ""}
              </span>
            )}
            {program && <span key={generation} aria-hidden className="pv-scan pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c5ee8a] to-transparent" />}
          </div>
        </div>
        <div className="gap-3 @2xl:columns-2 @6xl:columns-3">
          {focused && renderPanel(focused, cardClass)}
          {rest.map((p) => renderPanel(p, cardClass))}
          <LabConsole lab={lab} built={!!program} interactive={interactive} className={cardClass} />
        </div>
      </div>
    </div>
  );
}

