/**
 * ProgramHandle: what a scene sees of the learner's running program, in any language.
 *
 * Scenes never touch a language engine. They read plain values (`num`, `str`, `list`...) and
 * call the learner's functions ("hooks") by name, e.g. `program.call("steer", left, right)` or
 * a method path like `"autopilot.steer"`. Names are written Python-style; runtimes for other
 * languages map them to their own conventions (JavaScript also tries camelCase).
 *
 * Each runtime supplies a ProgramBackend; `createStaticProgram` builds one from plain JS,
 * which powers the landing-page demos without loading any engine.
 */

export interface ProgramHandle {
  /** Everything the program printed while it ran. */
  readonly stdout: string;
  /** Bumps on every (re)run so scenes can reset themselves. */
  readonly generation: number;
  /** Most recent hook failure, e.g. "steer() NameError: ...". Cleared on success. */
  readonly lastError: string | null;
  /** True if a top-level variable or function with this name exists. */
  has(name: string): boolean;
  /** True if `path` (e.g. "steer" or "autopilot.steer") is callable. */
  hasHook(path: string): boolean;
  num(name: string, fallback: number): number;
  str(name: string, fallback: string): string;
  bool(name: string, fallback: boolean): boolean;
  list<T = unknown>(name: string): T[];
  dict<T = unknown>(name: string): Record<string, T>;
  /** Calls a learner function. Returns undefined (and sets lastError) if it fails. */
  call<T = unknown>(path: string, ...args: unknown[]): T | undefined;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

/** What a runtime provides so a Program can answer scenes. */
export interface ProgramBackend {
  /** Plain-data value of a top-level name, or undefined if there is none. */
  read(name: string): unknown;
  hasHook(path: string): boolean;
  call(path: string, args: unknown[]): { ok: true; value: unknown } | { ok: false; error: string };
  dispose?(): void;
}

export interface PyModule {
  run_user(source: string): string;
  snapshot(): string;
  call(path: string, argsJson: string): string;
  has_hook(path: string): boolean;
  run_test(code: string, stdout: string): string;
  dispose(): void;
}

let generationCounter = 0;

class Program implements ProgramHandle {
  readonly generation = ++generationCounter;
  lastError: string | null = null;
  private listeners = new Set<() => void>();
  private hookCache = new Map<string, boolean>();
  private disposed = false;
  readonly stdout: string;
  private backend: ProgramBackend;

  constructor(stdout: string, backend: ProgramBackend) {
    this.stdout = stdout;
    this.backend = backend;
  }

  has(name: string) {
    return this.backend.read(name) !== undefined || this.hasHook(name);
  }

  hasHook(path: string) {
    // A disposed program (e.g. its route was hidden) must answer safely, never touch an engine.
    if (this.disposed) return false;
    const cached = this.hookCache.get(path);
    if (cached !== undefined) return cached;
    const result = this.backend.hasHook(path);
    this.hookCache.set(path, result);
    return result;
  }

  num(name: string, fallback: number) {
    const v = this.backend.read(name);
    return typeof v === "number" && Number.isFinite(v) ? v : fallback;
  }

  str(name: string, fallback: string) {
    const v = this.backend.read(name);
    return typeof v === "string" ? v : fallback;
  }

  bool(name: string, fallback: boolean) {
    const v = this.backend.read(name);
    return typeof v === "boolean" ? v : fallback;
  }

  list<T = unknown>(name: string): T[] {
    const v = this.backend.read(name);
    return Array.isArray(v) ? (v as T[]) : [];
  }

  dict<T = unknown>(name: string): Record<string, T> {
    const v = this.backend.read(name);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, T>) : {};
  }

  call<T = unknown>(path: string, ...args: unknown[]): T | undefined {
    if (this.disposed) return undefined;
    let res: ReturnType<ProgramBackend["call"]>;
    try {
      res = this.backend.call(path, args);
    } catch (err) {
      this.setError(`${path}() ${(err as Error)?.message ?? err}`);
      return undefined;
    }
    if (!res.ok) {
      this.setError(res.error);
      return undefined;
    }
    if (this.lastError) this.setError(null);
    return res.value as T;
  }

  private setError(message: string | null) {
    if (this.lastError === message) return;
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
    this.backend.dispose?.();
  }
}

export function createProgram(stdout: string, backend: ProgramBackend): ProgramHandle {
  return new Program(stdout, backend);
}

export function createPythonProgram(
  py: PyModule,
  stdout: string,
  snapshot: { vars: Record<string, unknown>; callables: string[] },
): ProgramHandle {
  const callables = new Set(snapshot.callables);
  return new Program(stdout, {
    read: (name) => (Object.prototype.hasOwnProperty.call(snapshot.vars, name) ? snapshot.vars[name] : undefined),
    hasHook: (path) => (path.includes(".") ? py.has_hook(path) : callables.has(path)),
    call: (path, args) => {
      const res = JSON.parse(py.call(path, JSON.stringify(args))) as { ok: boolean; value?: unknown; error?: string };
      return res.ok ? { ok: true, value: res.value } : { ok: false, error: res.error ?? `${path}() failed` };
    },
    dispose: () => py.dispose(),
  });
}

/** A program made from plain JS values and functions (no engine). Used for demos and SQL results. */
export function createStaticProgram(spec: {
  vars?: Record<string, unknown>;
  hooks?: Record<string, (...args: never[]) => unknown>;
  stdout?: string;
}): ProgramHandle {
  const vars = spec.vars ?? {};
  const hooks = spec.hooks ?? {};
  return new Program(spec.stdout ?? "", {
    read: (name) => (Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : undefined),
    hasHook: (path) => path in hooks,
    call: (path, args) => {
      const fn = hooks[path] as ((...a: unknown[]) => unknown) | undefined;
      return fn ? { ok: true, value: fn(...args) } : { ok: false, error: `${path}() is not defined` };
    },
  });
}
