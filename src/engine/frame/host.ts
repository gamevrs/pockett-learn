import type { ProgramHandle } from "../program";
import { isServiceError } from "../runtimes/service-error";
import { getRuntimeState, subscribeRuntimeState } from "../runtimes/status";
import { loadLocalRuntime, markInsideCodeFrame } from "../runtimes";
import { getProgress, setAudio, subscribeProgress } from "@/data/progress/store";
import { isTrustedParentOrigin } from "./origin";
import {
  parseToFrame,
  type FrameMode,
  type FrameProject,
  type FrameProps,
  type FromFrame,
  type ToFrame,
  type WireError,
} from "./protocol";

/**
 * The code frame's side: the one place where learner Python and JavaScript actually execute. It lives in a page on another
 * origin than the signed-in site and only talks to the page that embeds it, through the typed messages in protocol.ts.
 * It never touches Supabase or the learner's progress; storage here belongs to this origin and is empty.
 */

export interface HostSnapshot {
  mode: FrameMode;
  project: FrameProject | null;
  props: FrameProps | null;
  /** The program the stage shows right now (a kept run), or null for the blueprint. */
  program: ProgramHandle | null;
}

const EMPTY: HostSnapshot = { mode: "stage", project: null, props: null, program: null };

function toWire(err: unknown): WireError {
  if (isServiceError(err)) return { name: err.name, message: err.message, serviceKind: err.kind, retryAfter: err.retryAfter, detail: err.detail };
  const e = err as Error | undefined;
  return { name: e?.name || "Error", message: e?.message ?? String(err) };
}

class FrameHost {
  private started = false;
  private parentOrigin: string | null = null;
  private snapshot: HostSnapshot = EMPTY;
  private listeners = new Set<() => void>();
  private programs = new Map<string, { program: ProgramHandle; unsubscribe: () => void }>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  private update(patch: Partial<HostSnapshot>) {
    const next = { ...this.snapshot, ...patch };
    // the stage shows whichever kept program the page points at
    const runId = next.props?.programRunId ?? null;
    next.program = runId ? (this.programs.get(runId)?.program ?? null) : null;
    this.snapshot = next;
    this.listeners.forEach((l) => l());
  }

  start() {
    if (this.started) return;
    this.started = true;
    markInsideCodeFrame();
    window.addEventListener("message", this.onMessage);
    // Run / Submit shortcuts pressed while the stage has focus belong to the page
    window.addEventListener(
      "keydown",
      (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          this.post({ type: "key", key: e.key, ctrl: e.ctrlKey, meta: e.metaKey, shift: e.shiftKey, alt: e.altKey });
        }
      },
      true,
    );
    // engine download progress / failures show up on the page's own notices
    const seen = new Map<string, string>();
    subscribeRuntimeState(() => {
      for (const language of ["python"] as const) {
        const s = getRuntimeState(language);
        const key = `${s.phase}|${s.message}`;
        if (seen.get(language) === key) continue;
        seen.set(language, key);
        this.post({ type: "runtime-state", language, phase: s.phase, message: s.message });
      }
    });
    // the sound control inside the stage changes the page's settings
    let audio = getProgress().audio;
    subscribeProgress(() => {
      const next = getProgress().audio;
      if (next.enabled === audio.enabled && next.volume === audio.volume) return;
      audio = next;
      this.post({ type: "audio", enabled: next.enabled, volume: next.volume });
    });
    window.parent.postMessage({ type: "ready" } satisfies FromFrame, "*");
  }

  private post(message: FromFrame) {
    // before the page has introduced itself there is nobody to tell (and nothing to tell them)
    if (this.parentOrigin === null) return;
    window.parent.postMessage(message, this.parentOrigin);
  }

  private onMessage = (event: MessageEvent) => {
    if (event.source !== window.parent || event.source === window) return;
    if (!isTrustedParentOrigin(event.origin, window.location)) return;
    if (this.parentOrigin !== null && event.origin !== this.parentOrigin) return;
    const message = parseToFrame(event.data);
    if (!message) return;
    if (this.parentOrigin === null) {
      if (message.type !== "init") return;
      this.parentOrigin = event.origin;
    }
    this.handle(message);
  };

  private handle(message: ToFrame) {
    switch (message.type) {
      case "init":
        this.setDark(message.dark);
        setAudio({ enabled: message.audio.enabled, volume: message.audio.volume });
        this.update({ mode: message.mode });
        return;
      case "theme":
        this.setDark(message.dark);
        return;
      case "audio":
        setAudio({ enabled: message.enabled, volume: message.volume });
        return;
      case "project":
        this.update({ project: message.project });
        return;
      case "props":
        this.update({ props: message.props });
        return;
      case "preload":
        void loadLocalRuntime(message.language)
          .then((rt) => rt.preload(message.eager))
          .catch(() => {});
        return;
      case "run":
        void this.run(message);
        return;
      case "grade":
        void this.grade(message);
        return;
      case "drop":
        this.drop(message.runId);
        return;
    }
  }

  private setDark(dark: boolean) {
    document.documentElement.classList.toggle("dark", dark);
  }

  private async run(m: Extract<ToFrame, { type: "run" }>) {
    try {
      const rt = await loadLocalRuntime(m.language);
      const out = await rt.run(m.source, { ...m.options, onStatus: (text) => this.post({ type: "status", id: m.id, text }) });
      let hasProgram = false;
      if (out.program) {
        if (m.keep) {
          this.keep(m.id, out.program);
          hasProgram = true;
        } else {
          out.program.dispose();
        }
      }
      this.post({ type: "ran", id: m.id, stdout: out.stdout, error: out.error, durationMs: out.durationMs, hasProgram });
    } catch (err) {
      this.post({ type: "failed", id: m.id, error: toWire(err) });
    }
  }

  private async grade(m: Extract<ToFrame, { type: "grade" }>) {
    try {
      const rt = await loadLocalRuntime(m.language);
      const out = await rt.grade(m.source, m.tests, { ...m.options, onStatus: (text) => this.post({ type: "status", id: m.id, text }) });
      this.post({ type: "graded", id: m.id, stdout: out.stdout, error: out.error, results: out.results, allPassed: out.allPassed, durationMs: out.durationMs });
    } catch (err) {
      this.post({ type: "failed", id: m.id, error: toWire(err) });
    }
  }

  private keep(runId: string, program: ProgramHandle) {
    // a hook failing in the stage is reported to the page, which shows it wherever it likes
    const unsubscribe = program.subscribe(() => this.post({ type: "hook-error", runId, message: program.lastError }));
    this.programs.set(runId, { program, unsubscribe });
    this.update({});
  }

  private drop(runId: string) {
    const entry = this.programs.get(runId);
    if (!entry) return;
    this.programs.delete(runId);
    entry.unsubscribe();
    // the stage stops using it first, then the engine lets go
    this.update({});
    entry.program.dispose();
  }
}

let host: FrameHost | null = null;

export function getFrameHost(): FrameHost {
  host ??= new FrameHost();
  return host;
}

export const SERVER_SNAPSHOT = EMPTY;
