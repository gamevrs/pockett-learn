import type { ProgramHandle } from "@/engine/program";
import { isRec, num, readAny, str } from "../cpp-basics/data";

/**
 * What the Lantern Bay board reads from the learner's C++ program. A compiled program cannot be called back, so the
 * board draws what the program printed: stdout for the console, and the values sent with scene("key", value) (each
 * one an `@scene {json}` line). Every value may be missing or the wrong type; the readers return safe defaults
 * instead of throwing. Pure module (no React).
 */

export { isRec, num, str };

export interface BuildError {
  type: string;
  message: string;
  line: number | null;
}

export interface Bay {
  /** Every scene key the program sent, by name. */
  scalars: Record<string, unknown>;
  error: BuildError | null;
  stdout: string;
}

/** Every key the course's lessons send (see src/content/projects/cpp-engine.ts). */
export const SCENE_KEYS = [
  "brightInt", "brightDouble", "stamps",
  "lampEntries", "hornEntries", "bookTypes",
  "deducedTypes", "mixedDim", "gapSize", "rackSum",
  "totalGlow", "gateChecks",
  "queueNow", "served", "queueLeft", "peakValue", "peakIndex", "tideCount", "jumped",
  "tonsByPort", "portOrder", "sizeBefore", "sizeAfter", "hasFerry", "lampHours", "lampTotal", "uniqueVisitors", "visitorCount",
  "sortedLumens", "strongCount", "firstStrongValue", "firstStrongIndex", "lumenSum", "middleSum",
  "dimByValueNow", "dimByValue", "dimByReference", "fleetByLength", "brightTotal",
  "planShapes", "firstFlash", "secondFlash",
  "busLog", "subscribersBefore", "subscribersAfter",
  "directNames", "viaBaseNames", "viaBaseSignals", "plainSignal",
  "roles", "closingOrder", "abstractness", "pierIsFinal", "slicedColours", "keptColours",
  "staleSoundings", "sharedSoundings", "useCounts", "logBefore", "chartLog",
  "cycleCounts", "goneAfterCycle", "fixedCounts", "lockWorks", "watcherAliveInside", "watcherAliveAfter", "goneLog",
  "lookups", "westOrDefault", "reportLines", "stormCount", "worstWind",
  "nightLines", "nightAlerts", "nightRoles", "stationCount", "eastPattern",
] as const;

/** Keys whose value is legitimately null (an empty std::optional): present in the program's output, but readAny cannot tell. */
export function readBay(p: ProgramHandle | null): Bay {
  const scalars: Record<string, unknown> = {};
  let error: BuildError | null = null;
  if (p) {
    for (const key of SCENE_KEYS) {
      const v = readAny(p, key);
      if (v !== undefined) scalars[key] = v;
    }
    const err = readAny(p, "build_error");
    if (isRec(err)) error = { type: str(err.type) ?? "Error", message: str(err.message) ?? "", line: num(err.line) ?? null };
  }
  return { scalars, error, stdout: p?.stdout ?? "" };
}

// ───────────────────────── typed views of a value ─────────────────────────

export const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const strs = (v: unknown): string[] => list(v).map((x) => (typeof x === "string" ? x : x === null || x === undefined ? "" : String(x)));
export const nums = (v: unknown): number[] => list(v).flatMap((x) => (typeof x === "number" && Number.isFinite(x) ? [x] : []));
export const rec = (v: unknown): Record<string, unknown> => (isRec(v) ? v : {});
export const numOf = (v: unknown): number | undefined => num(v);
export const strOf = (v: unknown): string | undefined => str(v);
export const boolOf = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Is there at least one non-empty value for these keys? */
export const hasAny = (s: Record<string, unknown>, keys: string[]): boolean => keys.some((k) => s[k] !== undefined);
