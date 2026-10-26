import type { WidgetRegistry } from "@/learn/widget";
import { Promote, checkPromote } from "./Promote";
import { Pipeline, checkPipeline } from "./Pipeline";
import { Flaky, checkFlaky } from "./Flaky";
import { Layers, checkLayers } from "./Layers";
import { ImageSize, checkImageSize } from "./ImageSize";
import { Shutdown, checkShutdown } from "./Shutdown";
import { Cluster, checkCluster } from "./Cluster";
import { Probes, checkProbes } from "./Probes";
import { ProbeDeps, checkProbeDeps } from "./ProbeDeps";
import { Rollout, checkRollout } from "./Rollout";
import { Schema, checkSchema } from "./Schema";
import { Flags, checkFlags } from "./Flags";
import { ColdStart, checkColdStart } from "./ColdStart";

/** Widgets for the "Getting code to production" module. Keys are prefixed with "ship-" to stay unique. */
export const SHIP_WIDGETS: WidgetRegistry = {
  "ship-promote": { Component: Promote, check: checkPromote },
  "ship-pipeline": { Component: Pipeline, check: checkPipeline },
  "ship-flaky": { Component: Flaky, check: checkFlaky },
  "ship-layers": { Component: Layers, check: checkLayers },
  "ship-size": { Component: ImageSize, check: checkImageSize },
  "ship-shutdown": { Component: Shutdown, check: checkShutdown },
  "ship-cluster": { Component: Cluster, check: checkCluster },
  "ship-probes": { Component: Probes, check: checkProbes },
  "ship-probe-deps": { Component: ProbeDeps, check: checkProbeDeps },
  "ship-rollout": { Component: Rollout, check: checkRollout },
  "ship-schema": { Component: Schema, check: checkSchema },
  "ship-flags": { Component: Flags, check: checkFlags },
  "ship-coldstart": { Component: ColdStart, check: checkColdStart },
};
