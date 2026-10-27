"use client";

import React, { useEffect, useMemo, useSyncExternalStore } from "react";
import { getFrameHost, SERVER_SNAPSHOT } from "@/engine/frame/host";
import { StageShell } from "./StageShell";

/**
 * What the code frame shows: the real stage, drawn full-size from what the page sends (see engine/frame/host.ts).
 * The headless frame (no stage on screen) draws nothing; it only runs code.
 */
export function FrameApp() {
  const host = getFrameHost();
  const snap = useSyncExternalStore(host.subscribe, host.getSnapshot, () => SERVER_SNAPSHOT);

  useEffect(() => {
    getFrameHost().start();
  }, []);

  const unlocked = useMemo(() => new Set(snap.props?.unlocked ?? []), [snap.props?.unlocked]);

  if (snap.mode === "headless" || !snap.project || !snap.props) return <div className="fixed inset-0 bg-[var(--stage-bg)]" />;
  const { project, props } = snap;

  return (
    <div className="fixed inset-0 bg-[var(--stage-bg)]">
      <StageShell
        project={project}
        program={snap.program}
        unlocked={unlocked}
        focus={props.focus}
        celebration={props.celebration}
        interactive={props.interactive}
        status={props.status}
        statusText={props.statusText}
        emptyHint={props.emptyHint ?? undefined}
        surface={props.surface}
        hideControls={props.hideControls}
        autoplayScene={props.autoplayScene}
        className="!rounded-none !border-0"
      />
    </div>
  );
}
