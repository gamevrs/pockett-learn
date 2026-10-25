"use client";

import React, { type ComponentType } from "react";
import dynamic from "next/dynamic";
import type { SceneProps } from "./scene";

function SceneLoading() {
  return (
    <div className="grid h-full w-full place-items-center text-xs font-mono text-white/50">
      <span className="animate-pulse">warming up the scene…</span>
    </div>
  );
}

const load = (loader: () => Promise<{ default: ComponentType<SceneProps> }>) =>
  dynamic(loader, { ssr: false, loading: SceneLoading });

/**
 * Scene registry. To add a project's live demo: build a component that takes SceneProps,
 * then register it here under the project's `sceneId`.
 */
export const SCENES: Record<string, ComponentType<SceneProps>> = {
  garage: load(() => import("@/scenes/garage/GarageScene")),
  launch: load(() => import("@/scenes/launch/LaunchScene")),
  beatlab: load(() => import("@/scenes/beatlab/BeatLabScene")),
  sqldesk: load(() => import("@/scenes/sqldesk/SqlDeskScene")),
};
