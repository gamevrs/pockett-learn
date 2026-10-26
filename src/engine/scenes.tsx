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
  "signal-lab": load(() => import("@/scenes/signal-lab/SignalLabScene")),
  "cargo-control": load(() => import("@/scenes/cargo-control/CargoControlScene")),
  "store-api": load(() => import("@/scenes/store-api/StoreApiScene")),
  "smart-home": load(() => import("@/scenes/smart-home/SmartHomeScene")),
  "csharp-basics": load(() => import("@/scenes/csharp-basics/CsharpBasicsScene")),
  "csharp-api": load(() => import("@/scenes/csharp-api/ApiConsoleScene")),
  "go-basics": load(() => import("@/scenes/go-basics/GoBasicsScene")),
  "season-analytics": load(() => import("@/scenes/season-analytics/SeasonAnalyticsScene")),
  "schema-studio": load(() => import("@/scenes/schema-studio/SchemaStudioScene")),
  "counting-house": load(() => import("@/scenes/counting-house/CountingHouseScene")),
  "graphql-gateway": load(() => import("@/scenes/graphql-gateway/GraphqlGatewayScene")),
  "form-forge": load(() => import("@/scenes/form-forge/FormForgeScene")),
  "event-arena": load(() => import("@/scenes/event-arena/EventArenaScene")),
  "rust-basics": load(() => import("@/scenes/rust-basics/RustBasicsScene")),
  "cpp-basics": load(() => import("@/scenes/cpp-basics/ReactorCoreScene")),
  "csharp-linq": load(() => import("@/scenes/csharp-linq/CsharpLinqScene")),
  "csharp-delegates": load(() => import("@/scenes/csharp-delegates/FootlightScene")),
  "ai-foundations": load(() => import("@/scenes/ai-foundations/AiFoundationsScene")),
  "js-api": load(() => import("@/scenes/js-api/JsApiScene")),
};
