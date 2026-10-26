import { randomBytes } from "node:crypto";
import { SANDBOX_KINDS, SANDBOX_NAME_PREFIX, SWEEP_LOOKBACK_MS, SWEEP_MAX_AGE_ANY_MS, SWEEP_MAX_AGE_MS } from "./config.ts";
import type { SandboxKind } from "./config.ts";

/**
 * Pure helpers for the runner's cost controls (no SDK imports, so scripts/runner/test.mjs covers them):
 * sandbox naming, the sweeper's "is this one stale?" decision, pool-slot expiry, snapshot clean-up
 * selection, and the kill switch.
 */

/** `pk-run-1a2b3c4d5e6f`: names are unique per project, so the suffix is random. */
export function sandboxName(kind: SandboxKind): string {
  return `${SANDBOX_NAME_PREFIX}${kind}-${randomBytes(6).toString("hex")}`;
}

/** The kind encoded in a sandbox name, or null when the name isn't one of ours. */
export function sandboxKind(name: string): SandboxKind | null {
  if (!name.startsWith(SANDBOX_NAME_PREFIX)) return null;
  for (const kind of SANDBOX_KINDS) {
    if (name.startsWith(`${SANDBOX_NAME_PREFIX}${kind}-`)) return kind;
  }
  return null;
}

/** Statuses that are consuming (or about to consume) billable time. */
const LIVE_STATUSES = new Set(["running", "pending"]);

export interface SweepCandidate {
  name: string;
  status: string;
  /** Epoch milliseconds. */
  createdAt: number;
}

export interface SweepDecision {
  stop: boolean;
  /** Which limit applied: a kind, "any" for sandboxes that aren't named like ours. */
  kind: SandboxKind | "any";
  ageMs: number;
  limitMs: number;
}

/** Whether the sweeper should stop this sandbox now. Only live sandboxes are ever stopped. */
export function sweepDecision(candidate: SweepCandidate, now: number): SweepDecision {
  const kind = sandboxKind(candidate.name);
  const limitMs = kind ? SWEEP_MAX_AGE_MS[kind] : SWEEP_MAX_AGE_ANY_MS;
  const ageMs = Math.max(0, now - candidate.createdAt);
  return { stop: LIVE_STATUSES.has(candidate.status) && ageMs > limitMs, kind: kind ?? "any", ageMs, limitMs };
}

/** The sandbox list is newest-first: once a page reaches back past the lookback window, stop paging. */
export function pastSweepLookback(createdAt: number, now: number): boolean {
  return now - createdAt > SWEEP_LOOKBACK_MS;
}

// ---- pool slots ----

export interface SlotState {
  busy: boolean;
  /** Epoch ms the VM was created. */
  bornAt: number;
  /** Epoch ms the last run finished (or the VM was created). */
  lastUsedAt: number;
  uses: number;
}

export interface SlotLimits {
  maxAgeMs: number;
  maxUses: number;
  idleMs: number;
}

/** An idle slot should be stopped when it is too old, has served enough runs, or has sat unused too long. */
export function slotExpired(slot: SlotState, now: number, limits: SlotLimits): boolean {
  if (slot.busy) return false;
  return now - slot.bornAt >= limits.maxAgeMs || slot.uses >= limits.maxUses || now - slot.lastUsedAt >= limits.idleMs;
}

// ---- snapshots ----

export interface SnapshotInfo {
  id: string;
  status: string;
  createdAt?: number;
}

/** Ids parsed from a comma/space separated env value. */
export function parseIdList(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Snapshots to delete: everything not in `keep` and not already deleted. Never returns a kept id. */
export function selectSnapshotsToDelete(snapshots: readonly SnapshotInfo[], keep: readonly (string | undefined)[]): string[] {
  const kept = new Set(keep.filter((x): x is string => Boolean(x)));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of snapshots) {
    if (kept.has(s.id) || s.status === "deleted" || seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s.id);
  }
  return out;
}

// ---- kill switch ----

/** RUNNER_DISABLED=1 (or true / yes / on): /api/run answers 503 without creating anything. */
export function runnerDisabled(value: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test((value ?? "").trim());
}

/** Positive integer from an env value, else the fallback. */
export function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
