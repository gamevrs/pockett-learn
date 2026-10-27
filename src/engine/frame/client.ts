import type { ProgramEnv, ProgramHandle } from "../program";
import { ServiceError } from "../runtimes/service-error";
import { reportRuntime } from "../runtimes/status";
import type { GradeOutcome, RunOptions, RunOutcome, Runtime } from "../runtimes/types";
import type { TestCase } from "../types";
import { getProgress, setAudio, subscribeProgress } from "@/data/progress/store";
import { codeFrameOrigin } from "./origin";
import {
  parseFromFrame,
  usesCodeFrame,
  type CodeLanguage,
  type FrameMode,
  type FrameProject,
  type FrameProps,
  type FromFrame,
  type ToFrame,
  type WireRunOptions,
} from "./protocol";

/**
 * The page's side of the code frame. Learner Python and JavaScript run in a page on another origin (see origin.ts); this file
 * is the only thing that talks to it. `framedRuntime(language)` is a normal Runtime whose runs happen in the active frame, and
 * a run that keeps its program hands back a FramedProgram: a stand-in with the program's output and errors (the live program
 * itself stays in the frame, where the stage that draws it also lives, so scenes call it synchronously every frame).
 *
 * Everything coming back is untrusted: messages are accepted only from the frame's own window and origin, validated, and used
 * as plain text.
 */

const READY_TIMEOUT_MS = 60_000;

const nextId = (() => {
  let n = 0;
  return () => `${Date.now().toString(36)}-${(++n).toString(36)}`;
})();

// ───────────── the stand-in for a program that lives in the frame ─────────────

let generationCounter = 0;

export class FramedProgram implements ProgramHandle {
  readonly generation = ++generationCounter;
  readonly stdout: string;
  lastError: string | null = null;
  readonly env: ProgramEnv | null = null;
  private listeners = new Set<() => void>();
  private disposed = false;

  constructor(
    private readonly connection: FrameConnection,
    readonly runId: string,
    stdout: string,
  ) {
    this.stdout = stdout;
  }

  /** The frame this program lives in (a stage can only show programs of its own frame). */
  get frame(): FrameConnection {
    return this.connection;
  }

  has() {
    return false;
  }
  hasHook() {
    return false;
  }
  num(_name: string, fallback: number) {
    return fallback;
  }
  str(_name: string, fallback: string) {
    return fallback;
  }
  bool(_name: string, fallback: boolean) {
    return fallback;
  }
  list<T = unknown>(): T[] {
    return [];
  }
  dict<T = unknown>(): Record<string, T> {
    return {};
  }
  call<T = unknown>(): T | undefined {
    return undefined;
  }
  async callAsync<T = unknown>(): Promise<T | undefined> {
    return undefined;
  }

  /** Called with the frame's report of the program's latest hook failure. */
  setError(message: string | null) {
    if (this.disposed || this.lastError === message) return;
    this.lastError = message;
    this.listeners.forEach((l) => l());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.listeners.clear();
    this.connection.dropProgram(this.runId);
  }
}

export function isFramedProgram(program: ProgramHandle | null | undefined): program is FramedProgram {
  return program instanceof FramedProgram;
}

// ───────────── one frame ─────────────

interface Pending {
  language: CodeLanguage;
  onStatus?: (text: string) => void;
  resolve: (message: FromFrame) => void;
  reject: (error: Error) => void;
}

function wireOptions(options?: RunOptions): WireRunOptions {
  return { setup: options?.setup, prelude: options?.prelude, packages: options?.packages };
}

const connections = new Set<FrameConnection>();

export class FrameConnection {
  private ready = false;
  private closed = true;
  private failed = false;
  private expectedOrigin = "null";
  private targetOrigin = "*";
  private readyTimer: ReturnType<typeof setTimeout> | null = null;
  private queue: ToFrame[] = [];
  private pending = new Map<string, Pending>();
  private programs = new Map<string, FramedProgram>();
  private project: FrameProject | null = null;
  private props: FrameProps | null = null;
  private projectKey = "";
  private propsKey = "";

  constructor(
    private readonly iframe: HTMLIFrameElement,
    private readonly mode: FrameMode,
  ) {}

  /** Starts (or restarts) loading the frame page into the iframe. */
  attach() {
    if (!this.closed) return;
    this.closed = false;
    connections.add(this);
    installGlobalSync();
    this.load();
  }

  private load() {
    const origin = codeFrameOrigin();
    this.ready = false;
    this.failed = false;
    this.expectedOrigin = origin ?? "null";
    // without a second origin the frame runs sandboxed without allow-same-origin, which makes its origin opaque ("null")
    this.targetOrigin = origin ?? "*";
    const el = this.iframe;
    el.setAttribute("sandbox", origin ? "allow-scripts allow-same-origin" : "allow-scripts");
    el.setAttribute("allow", "fullscreen; autoplay");
    el.referrerPolicy = "no-referrer";
    el.src = `${origin ?? window.location.origin}/frame?mode=${this.mode}`;
    if (this.readyTimer) clearTimeout(this.readyTimer);
    this.readyTimer = setTimeout(() => this.onReadyTimeout(), READY_TIMEOUT_MS);
  }

  /** Stops using the iframe: frees its memory and fails whatever was waiting on it. */
  detach() {
    if (this.closed) return;
    this.closed = true;
    this.ready = false;
    connections.delete(this);
    if (this.readyTimer) clearTimeout(this.readyTimer);
    this.readyTimer = null;
    // emptied under the strictest sandbox, so the blank page it leaves behind is never scriptable by anything
    this.iframe.setAttribute("sandbox", "");
    this.iframe.src = "about:blank";
    this.reset(new ServiceError("unavailable"));
  }

  private onReadyTimeout() {
    this.readyTimer = null;
    if (this.ready || this.closed) return;
    this.failed = true;
    const error = new ServiceError("engine", { message: "Could not load Python. Check your connection and try again." });
    reportRuntime("python", "failed", error.message);
    this.reset(error);
  }

  /** Fails everything in flight and forgets the programs (they lived in a frame that is gone or restarting). */
  private reset(error: Error) {
    const pending = [...this.pending.values()];
    this.pending.clear();
    this.queue = [];
    for (const program of this.programs.values()) program.setError(null);
    this.programs.clear();
    pending.forEach((p) => p.reject(error));
  }

  /** A frame that never became ready gets a fresh start the next time someone needs it (a Retry). */
  private wake() {
    if (this.failed && !this.closed) this.load();
  }

  // ----- state the frame needs, replayed whenever it (re)starts -----

  setProject(project: FrameProject) {
    const key = JSON.stringify(project);
    if (key === this.projectKey) return;
    this.projectKey = key;
    this.project = project;
    if (this.ready) this.send({ type: "project", project });
  }

  setProps(props: FrameProps) {
    const key = JSON.stringify(props);
    if (key === this.propsKey) return;
    this.propsKey = key;
    this.props = props;
    if (this.ready) this.send({ type: "props", props });
  }

  /** True for a program that was run in (and lives in) this frame. */
  owns(program: ProgramHandle | null): program is FramedProgram {
    return isFramedProgram(program) && program.frame === this;
  }

  // ----- sending -----

  /** Sends now when the frame is ready, otherwise as soon as it is. */
  post(message: ToFrame) {
    if (this.closed) return;
    this.wake();
    if (this.ready) this.send(message);
    else this.queue.push(message);
  }

  /** Sends only if the frame is up (settings that it also gets on start). */
  postIfReady(message: ToFrame) {
    if (this.ready && !this.closed) this.send(message);
  }

  private send(message: ToFrame) {
    this.iframe.contentWindow?.postMessage(message, this.targetOrigin);
  }

  private request(message: ToFrame & { id: string }, pending: Pending) {
    if (this.closed) {
      pending.reject(new ServiceError("unavailable"));
      return;
    }
    this.pending.set(message.id, pending);
    this.post(message);
  }

  run(language: CodeLanguage, source: string, options?: RunOptions): Promise<RunOutcome> {
    const id = nextId();
    const keep = options?.keep !== false;
    return new Promise<RunOutcome>((resolve, reject) => {
      this.request(
        { type: "run", id, language, source, options: wireOptions(options), keep },
        {
          language,
          onStatus: options?.onStatus,
          reject,
          resolve: (m) => {
            if (m.type !== "ran") return reject(new Error("Unexpected reply"));
            const program = m.hasProgram && keep ? new FramedProgram(this, id, m.stdout) : null;
            if (program) this.programs.set(id, program);
            resolve({ stdout: m.stdout, error: m.error, durationMs: m.durationMs, program });
          },
        },
      );
    });
  }

  grade(language: CodeLanguage, source: string, tests: TestCase[], options?: RunOptions): Promise<GradeOutcome> {
    const id = nextId();
    return new Promise<GradeOutcome>((resolve, reject) => {
      this.request(
        { type: "grade", id, language, source, tests, options: wireOptions(options) },
        {
          language,
          onStatus: options?.onStatus,
          reject,
          resolve: (m) => {
            if (m.type !== "graded") return reject(new Error("Unexpected reply"));
            resolve({ stdout: m.stdout, error: m.error, results: m.results, allPassed: m.allPassed, durationMs: m.durationMs });
          },
        },
      );
    });
  }

  preload(language: CodeLanguage, eager: boolean) {
    this.post({ type: "preload", language, eager });
  }

  dropProgram(runId: string) {
    if (!this.programs.delete(runId)) return;
    this.postIfReady({ type: "drop", runId });
  }

  // ----- receiving -----

  /** True when this message really came from this frame's window and origin. */
  accepts(event: MessageEvent): boolean {
    return !this.closed && event.source !== null && event.source === this.iframe.contentWindow && event.origin === this.expectedOrigin;
  }

  handle(message: FromFrame) {
    switch (message.type) {
      case "ready": {
        // a second "ready" means the frame restarted by itself: nothing it was running is alive any more
        if (this.ready) this.reset(new ServiceError("unavailable"));
        this.ready = true;
        this.failed = false;
        if (this.readyTimer) clearTimeout(this.readyTimer);
        this.readyTimer = null;
        this.send({
          type: "init",
          mode: this.mode,
          dark: document.documentElement.classList.contains("dark"),
          audio: { enabled: getProgress().audio.enabled, volume: getProgress().audio.volume },
        });
        if (this.project) this.send({ type: "project", project: this.project });
        if (this.props) this.send({ type: "props", props: this.props });
        const queued = this.queue;
        this.queue = [];
        queued.forEach((m) => this.send(m));
        return;
      }
      case "status":
        this.pending.get(message.id)?.onStatus?.(message.text);
        return;
      case "ran":
      case "graded": {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        pending.resolve(message);
        return;
      }
      case "failed": {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        const e = message.error;
        if (e.serviceKind) {
          pending.reject(new ServiceError(e.serviceKind, { retryAfter: e.retryAfter ?? null, detail: e.detail ?? null, message: e.message }));
        } else {
          const err = new Error(e.message);
          err.name = e.name;
          pending.reject(err);
        }
        return;
      }
      case "runtime-state":
        if (usesCodeFrame(message.language)) reportRuntime(message.language, message.phase, message.message);
        return;
      case "hook-error":
        this.programs.get(message.runId)?.setError(message.message);
        return;
      case "key":
        // Run / Submit shortcuts pressed while the stage had focus: the page's own handler takes it from here
        if (message.key === "Enter" && (message.ctrl || message.meta)) {
          window.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter", ctrlKey: message.ctrl, metaKey: message.meta, shiftKey: message.shift, altKey: message.alt, bubbles: true, cancelable: true }),
          );
        }
        return;
      case "audio":
        setAudio({ enabled: message.enabled, volume: message.volume });
        return;
    }
  }
}

// ───────────── routing, theme and sound ─────────────

let globalSyncInstalled = false;

function installGlobalSync() {
  if (globalSyncInstalled || typeof window === "undefined") return;
  globalSyncInstalled = true;

  window.addEventListener("message", (event) => {
    for (const connection of connections) {
      if (!connection.accepts(event)) continue;
      const message = parseFromFrame(event.data);
      if (message) connection.handle(message);
      return;
    }
  });

  let dark = document.documentElement.classList.contains("dark");
  new MutationObserver(() => {
    const now = document.documentElement.classList.contains("dark");
    if (now === dark) return;
    dark = now;
    connections.forEach((c) => c.postIfReady({ type: "theme", dark: now }));
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  let audio = getProgress().audio;
  subscribeProgress(() => {
    const next = getProgress().audio;
    if (next.enabled === audio.enabled && next.volume === audio.volume) return;
    audio = next;
    connections.forEach((c) => c.postIfReady({ type: "audio", enabled: next.enabled, volume: next.volume }));
  });
}

// ───────────── which frame runs code ─────────────

/** Frames of mounted stages, most recently shown last. */
const stages: FrameConnection[] = [];
let headless: FrameConnection | null = null;

/**
 * Screens that are about to show a stage (the workspace, the project hub) say so before it has mounted, so the run they start
 * right away lands in that stage's frame instead of the hidden one.
 */
let stagesExpected = 0;
let stageWaiters: Array<() => void> = [];

export function expectStage(): () => void {
  stagesExpected++;
  return () => {
    stagesExpected = Math.max(0, stagesExpected - 1);
  };
}

/** A visible stage registers its iframe here; code run from then on lives in it (until the next stage shows). Returns the connection. */
export function openStageConnection(iframe: HTMLIFrameElement): FrameConnection {
  const connection = new FrameConnection(iframe, "stage");
  connection.attach();
  stages.push(connection);
  const waiting = stageWaiters;
  stageWaiters = [];
  waiting.forEach((wake) => wake());
  return connection;
}

export function closeStageConnection(connection: FrameConnection) {
  const at = stages.indexOf(connection);
  if (at >= 0) stages.splice(at, 1);
  connection.detach();
}

/** With no stage on screen (the lesson player, the sandbox), code runs in one hidden frame that is created on first use and reused. */
function headlessConnection(): FrameConnection {
  if (!headless) {
    const iframe = document.createElement("iframe");
    iframe.title = "Code runner";
    iframe.setAttribute("aria-hidden", "true");
    iframe.tabIndex = -1;
    iframe.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(iframe);
    headless = new FrameConnection(iframe, "headless");
    headless.attach();
  }
  return headless;
}

function activeConnection(): FrameConnection {
  return stages[stages.length - 1] ?? headlessConnection();
}

/**
 * Like activeConnection, but waits for a stage that is on its way (the workspace mounts it once its layout is measured, which
 * can take seconds on a slow device). Falling back early would boot a second engine in the hidden frame and leave the stage
 * showing a blueprint, so only a stage that never appears sends work to the hidden frame.
 */
const STAGE_WAIT_MS = 30_000;

async function connectionForWork(): Promise<FrameConnection> {
  if (stages.length === 0 && stagesExpected > 0) {
    await new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        stageWaiters = stageWaiters.filter((w) => w !== done);
        resolve();
      };
      const timer = setTimeout(done, STAGE_WAIT_MS);
      stageWaiters.push(done);
    });
  }
  return activeConnection();
}

const runtimes = new Map<CodeLanguage, Runtime>();

/** The Runtime for a language that runs in the code frame. */
export function framedRuntime(language: CodeLanguage): Runtime {
  let runtime = runtimes.get(language);
  if (!runtime) {
    runtime = {
      language,
      preload: (eager) => void connectionForWork().then((c) => c.preload(language, Boolean(eager))),
      run: async (source, options) => (await connectionForWork()).run(language, source, options),
      grade: async (source, tests, options) => (await connectionForWork()).grade(language, source, tests, options),
    };
    runtimes.set(language, runtime);
  }
  return runtime;
}
