import type { Feature, LanguageId, RunError, TestCase, TestResult } from "../types";
import type { ServiceIssueKind } from "../runtimes/service-error";

/**
 * The messages between the page and the code frame (see client.ts and the /frame route).
 *
 * Learner Python and JavaScript run only inside the frame, which lives on another origin, so nothing a learner writes can
 * reach the page's storage. Everything crossing the boundary is plain data (structured clone). Whatever comes FROM the frame
 * is untrusted: it is validated here, shown only as text, never as HTML, never as a URL to open, never evaluated.
 */

export type FrameMode = "stage" | "headless";
export type CodeLanguage = "python" | "javascript";

/** Languages whose learner code runs in the frame (SQL and the remote languages never touch the page's storage). */
export function usesCodeFrame(language: LanguageId | undefined): language is CodeLanguage {
  return language === "python" || language === "javascript";
}

/** What the stage needs to know about a project. */
export interface FrameProject {
  slug: string;
  title: string;
  sceneId: string;
  language: LanguageId;
  features: Feature[];
  controls: string[];
}

export type FrameStatus = "idle" | "loading" | "running";
export type FrameSurface = "workspace" | "hub" | "landing";

export interface FrameProps {
  unlocked: string[];
  focus: string | null;
  celebration: { nonce: number; features: string[] } | null;
  status: FrameStatus;
  statusText: string;
  emptyHint: string | null;
  surface: FrameSurface;
  interactive: boolean;
  hideControls: boolean;
  autoplayScene: boolean;
  /** Which kept run's program the stage shows (null: the blueprint). */
  programRunId: string | null;
}

export interface WireRunOptions {
  setup?: string;
  prelude?: string;
  packages?: string[];
}

export interface WireAudio {
  enabled: boolean;
  volume: number;
}

export type ToFrame =
  | { type: "init"; mode: FrameMode; dark: boolean; audio: WireAudio }
  | { type: "project"; project: FrameProject }
  | { type: "props"; props: FrameProps }
  | { type: "run"; id: string; language: CodeLanguage; source: string; options: WireRunOptions; keep: boolean }
  | { type: "grade"; id: string; language: CodeLanguage; source: string; tests: TestCase[]; options: WireRunOptions }
  | { type: "preload"; language: CodeLanguage; eager: boolean }
  | { type: "drop"; runId: string }
  | { type: "theme"; dark: boolean }
  | ({ type: "audio" } & WireAudio);

export interface WireError {
  name: string;
  message: string;
  serviceKind?: ServiceIssueKind;
  retryAfter?: number | null;
  detail?: string | null;
}

export type RuntimePhaseWire = "idle" | "loading" | "ready" | "failed";

export type FromFrame =
  | { type: "ready" }
  | { type: "status"; id: string; text: string }
  | { type: "ran"; id: string; stdout: string; error: RunError | null; durationMs: number; hasProgram: boolean }
  | { type: "graded"; id: string; stdout: string; error: RunError | null; results: TestResult[]; allPassed: boolean; durationMs: number }
  | { type: "failed"; id: string; error: WireError }
  | { type: "runtime-state"; language: LanguageId; phase: RuntimePhaseWire; message: string }
  | { type: "hook-error"; runId: string; message: string | null }
  | { type: "key"; key: string; ctrl: boolean; meta: boolean; shift: boolean; alt: boolean }
  | ({ type: "audio" } & WireAudio);

// ───────────── defensive parsing ─────────────

const LANGUAGES: readonly string[] = ["python", "javascript", "sql", "csharp", "cpp", "go", "rust"];
const SERVICE_KINDS: readonly string[] = ["busy", "unavailable", "offline", "timeout", "engine", "rejected"];
const PHASES: readonly string[] = ["idle", "loading", "ready", "failed"];
const STAGE_STATUS: readonly string[] = ["idle", "loading", "running"];
const SURFACES: readonly string[] = ["workspace", "hub", "landing"];

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const strList = (v: unknown): string[] | null => (Array.isArray(v) && v.every(isStr) ? (v as string[]) : null);
const optStr = (v: unknown): string | undefined | null => (v === undefined ? undefined : isStr(v) ? v : null);

function parseAudio(m: Rec): WireAudio | null {
  return isBool(m.enabled) && isNum(m.volume) ? { enabled: m.enabled, volume: Math.min(1, Math.max(0, m.volume)) } : null;
}

function parseRunError(v: unknown): RunError | null | undefined {
  if (v === null) return null;
  if (!isRec(v) || !isStr(v.type) || !isStr(v.message)) return undefined;
  if (v.line !== null && !isNum(v.line)) return undefined;
  return { type: v.type, message: v.message, line: v.line };
}

function parseOptions(v: unknown): WireRunOptions | null {
  if (!isRec(v)) return null;
  const setup = optStr(v.setup);
  const prelude = optStr(v.prelude);
  const packages = v.packages === undefined ? undefined : strList(v.packages);
  if (setup === null || prelude === null || packages === null) return null;
  return { setup, prelude, packages };
}

function parseTests(v: unknown): TestCase[] | null {
  if (!Array.isArray(v)) return null;
  const out: TestCase[] = [];
  for (const t of v) {
    if (!isRec(t) || !isStr(t.id) || !isStr(t.description) || !isStr(t.assertionCode)) return null;
    out.push({ id: t.id, description: t.description, assertionCode: t.assertionCode });
  }
  return out;
}

function parseResults(v: unknown): TestResult[] | null {
  if (!Array.isArray(v)) return null;
  const out: TestResult[] = [];
  for (const r of v) {
    if (!isRec(r) || !isStr(r.testId) || !isStr(r.description) || !isBool(r.passed)) return null;
    if (r.error !== undefined && !isStr(r.error)) return null;
    out.push({ testId: r.testId, description: r.description, passed: r.passed, error: r.error });
  }
  return out;
}

function parseProject(v: unknown): FrameProject | null {
  if (!isRec(v) || !isStr(v.slug) || !isStr(v.title) || !isStr(v.sceneId) || !isStr(v.language) || !LANGUAGES.includes(v.language)) return null;
  const controls = strList(v.controls);
  if (!controls || !Array.isArray(v.features)) return null;
  const features: Feature[] = [];
  for (const f of v.features) {
    if (!isRec(f) || !isStr(f.id) || !isStr(f.title) || !isStr(f.blurb) || !isStr(f.emoji)) return null;
    features.push({ id: f.id, title: f.title, blurb: f.blurb, emoji: f.emoji });
  }
  return { slug: v.slug, title: v.title, sceneId: v.sceneId, language: v.language as LanguageId, features, controls };
}

function parseProps(v: unknown): FrameProps | null {
  if (!isRec(v)) return null;
  const unlocked = strList(v.unlocked);
  if (!unlocked) return null;
  if (v.focus !== null && !isStr(v.focus)) return null;
  let celebration: FrameProps["celebration"] = null;
  if (v.celebration !== null) {
    const c = v.celebration;
    const features = isRec(c) ? strList(c.features) : null;
    if (!isRec(c) || !isNum(c.nonce) || !features) return null;
    celebration = { nonce: c.nonce, features };
  }
  if (!isStr(v.status) || !STAGE_STATUS.includes(v.status) || !isStr(v.statusText)) return null;
  if (v.emptyHint !== null && !isStr(v.emptyHint)) return null;
  if (!isStr(v.surface) || !SURFACES.includes(v.surface)) return null;
  if (!isBool(v.interactive) || !isBool(v.hideControls) || !isBool(v.autoplayScene)) return null;
  if (v.programRunId !== null && !isStr(v.programRunId)) return null;
  return {
    unlocked,
    focus: v.focus,
    celebration,
    status: v.status as FrameStatus,
    statusText: v.statusText,
    emptyHint: v.emptyHint,
    surface: v.surface as FrameSurface,
    interactive: v.interactive,
    hideControls: v.hideControls,
    autoplayScene: v.autoplayScene,
    programRunId: v.programRunId,
  };
}

const isCodeLanguage = (v: unknown): v is CodeLanguage => v === "python" || v === "javascript";

/** A message the frame received, or null when it is not one of ours. */
export function parseToFrame(data: unknown): ToFrame | null {
  if (!isRec(data) || !isStr(data.type)) return null;
  switch (data.type) {
    case "init": {
      const audio = isRec(data.audio) ? parseAudio(data.audio) : null;
      if ((data.mode !== "stage" && data.mode !== "headless") || !isBool(data.dark) || !audio) return null;
      return { type: "init", mode: data.mode, dark: data.dark, audio };
    }
    case "project": {
      const project = parseProject(data.project);
      return project ? { type: "project", project } : null;
    }
    case "props": {
      const props = parseProps(data.props);
      return props ? { type: "props", props } : null;
    }
    case "run": {
      const options = parseOptions(data.options);
      if (!isStr(data.id) || !isCodeLanguage(data.language) || !isStr(data.source) || !options || !isBool(data.keep)) return null;
      return { type: "run", id: data.id, language: data.language, source: data.source, options, keep: data.keep };
    }
    case "grade": {
      const options = parseOptions(data.options);
      const tests = parseTests(data.tests);
      if (!isStr(data.id) || !isCodeLanguage(data.language) || !isStr(data.source) || !options || !tests) return null;
      return { type: "grade", id: data.id, language: data.language, source: data.source, tests, options };
    }
    case "preload":
      return isCodeLanguage(data.language) && isBool(data.eager) ? { type: "preload", language: data.language, eager: data.eager } : null;
    case "drop":
      return isStr(data.runId) ? { type: "drop", runId: data.runId } : null;
    case "theme":
      return isBool(data.dark) ? { type: "theme", dark: data.dark } : null;
    case "audio": {
      const audio = parseAudio(data);
      return audio ? { type: "audio", ...audio } : null;
    }
    default:
      return null;
  }
}

/** A message the page received from the frame, or null when it is not one of ours (or is malformed). */
export function parseFromFrame(data: unknown): FromFrame | null {
  if (!isRec(data) || !isStr(data.type)) return null;
  switch (data.type) {
    case "ready":
      return { type: "ready" };
    case "status":
      return isStr(data.id) && isStr(data.text) ? { type: "status", id: data.id, text: data.text } : null;
    case "ran": {
      const error = parseRunError(data.error);
      if (!isStr(data.id) || !isStr(data.stdout) || error === undefined || !isNum(data.durationMs) || !isBool(data.hasProgram)) return null;
      return { type: "ran", id: data.id, stdout: data.stdout, error, durationMs: data.durationMs, hasProgram: data.hasProgram };
    }
    case "graded": {
      const error = parseRunError(data.error);
      const results = parseResults(data.results);
      if (!isStr(data.id) || !isStr(data.stdout) || error === undefined || !results || !isBool(data.allPassed) || !isNum(data.durationMs)) return null;
      return { type: "graded", id: data.id, stdout: data.stdout, error, results, allPassed: data.allPassed, durationMs: data.durationMs };
    }
    case "failed": {
      const e = data.error;
      if (!isStr(data.id) || !isRec(e) || !isStr(e.name) || !isStr(e.message)) return null;
      const error: WireError = { name: e.name, message: e.message };
      if (isStr(e.serviceKind) && SERVICE_KINDS.includes(e.serviceKind)) error.serviceKind = e.serviceKind as ServiceIssueKind;
      if (isNum(e.retryAfter)) error.retryAfter = e.retryAfter;
      if (isStr(e.detail)) error.detail = e.detail;
      return { type: "failed", id: data.id, error };
    }
    case "runtime-state":
      if (!isStr(data.language) || !LANGUAGES.includes(data.language) || !isStr(data.phase) || !PHASES.includes(data.phase) || !isStr(data.message)) return null;
      return { type: "runtime-state", language: data.language as LanguageId, phase: data.phase as RuntimePhaseWire, message: data.message };
    case "hook-error":
      return isStr(data.runId) && (data.message === null || isStr(data.message)) ? { type: "hook-error", runId: data.runId, message: data.message } : null;
    case "key":
      return isStr(data.key) && isBool(data.ctrl) && isBool(data.meta) && isBool(data.shift) && isBool(data.alt)
        ? { type: "key", key: data.key, ctrl: data.ctrl, meta: data.meta, shift: data.shift, alt: data.alt }
        : null;
    case "audio": {
      const audio = parseAudio(data);
      return audio ? { type: "audio", ...audio } : null;
    }
    default:
      return null;
  }
}
