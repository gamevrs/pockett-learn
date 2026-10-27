"use client";

import React, { useEffect, useMemo, useRef } from "react";
import type { ProgramHandle } from "@/engine/program";
import type { Celebration } from "@/engine/scene";
import type { StageSurface } from "@/engine/stage-surface";
import { closeStageConnection, openStageConnection, type FrameConnection } from "@/engine/frame/client";
import type { FrameProject, FrameProps } from "@/engine/frame/protocol";
import type { StageProject, StageStatus } from "./StageShell";

interface StageFrameProps {
  project: StageProject & { slug: string };
  program: ProgramHandle | null;
  unlocked: ReadonlySet<string>;
  focus?: string | null;
  celebration?: Celebration | null;
  interactive?: boolean;
  status?: StageStatus;
  statusText?: string;
  surface?: StageSurface;
  emptyHint?: string;
  className?: string;
  hideControls?: boolean;
  autoplayScene?: boolean;
}

/**
 * <StageShell/> for projects whose learner code runs in the code frame (Python, JavaScript). It takes the same props, but the
 * stage itself is drawn by the frame: this component only passes the props across and keeps the frame in the right place.
 * While the stage is hidden by the router its frame is emptied to free memory; it loads again when shown.
 */
export function StageFrame({
  project,
  program,
  unlocked,
  focus = null,
  celebration = null,
  interactive = true,
  status = "idle",
  statusText = "",
  surface = "workspace",
  emptyHint,
  className = "",
  hideControls = false,
  autoplayScene = false,
}: StageFrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const connection = useRef<FrameConnection | null>(null);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const opened = openStageConnection(el);
    connection.current = opened;
    return () => {
      closeStageConnection(opened);
      connection.current = null;
    };
  }, []);

  const wireProject = useMemo<FrameProject>(
    () => ({
      slug: project.slug,
      title: project.title,
      sceneId: project.sceneId,
      language: project.language ?? "python",
      features: project.features,
      controls: project.controls,
    }),
    [project],
  );

  // after every render: the frame ignores anything that hasn't changed
  useEffect(() => {
    const frame = connection.current;
    if (!frame) return;
    const props: FrameProps = {
      unlocked: [...unlocked],
      focus,
      celebration: celebration ? { nonce: celebration.nonce, features: celebration.features } : null,
      status,
      statusText,
      emptyHint: emptyHint ?? null,
      surface,
      interactive,
      hideControls,
      autoplayScene,
      programRunId: frame.owns(program) ? program.runId : null,
    };
    frame.setProject(wireProject);
    frame.setProps(props);
  });

  return (
    <div className={`relative isolate flex h-full min-h-[260px] w-full min-w-0 overflow-hidden rounded-xl border border-line bg-[var(--stage-bg)] ${className}`}>
      <iframe ref={frameRef} title={`${project.title} live demo`} className="block h-full w-full flex-1 border-0" />
    </div>
  );
}
