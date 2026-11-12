import type { WidgetRegistry } from "@/learn/widget";
import { checkCoalesce, Coalesce } from "./Coalesce";
import { checkFormats, Formats } from "./Formats";
import { checkGridMap, GridMap } from "./GridMap";
import { checkOccupancy, Occupancy } from "./Occupancy";
import { PipelineExplainer } from "./PipelineExplainer";
import { checkRace, Race } from "./Race";
import { checkRoofline, Roofline } from "./Roofline";
import { checkStreams, Streams } from "./Streams";
import { checkTiled, Tiled } from "./Tiled";
import { checkTransfer, Transfer } from "./Transfer";
import { checkWarp, Warp } from "./Warp";

/**
 * Widgets for the "GPUs: thousands of small cores" module. Every key MUST be prefixed "gpu-" so it stays unique
 * across the per-module registries.
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "gpu-name": { Component: Name, check: checkName },
 */
export const GPU_WIDGETS: WidgetRegistry = {
  "gpu-race": { Component: Race, check: checkRace },
  "gpu-pipeline": { Component: PipelineExplainer },
  "gpu-grid": { Component: GridMap, check: checkGridMap },
  "gpu-warp": { Component: Warp, check: checkWarp },
  "gpu-transfer": { Component: Transfer, check: checkTransfer },
  "gpu-coalesce": { Component: Coalesce, check: checkCoalesce },
  "gpu-occupancy": { Component: Occupancy, check: checkOccupancy },
  "gpu-tiled": { Component: Tiled, check: checkTiled },
  "gpu-roofline": { Component: Roofline, check: checkRoofline },
  "gpu-formats": { Component: Formats, check: checkFormats },
  "gpu-streams": { Component: Streams, check: checkStreams },
};
