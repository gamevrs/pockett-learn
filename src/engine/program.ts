/**
 * ProgramHandle: what a scene sees of the learner's running Python program.
 *
 * Scenes never touch Pyodide. They read plain values (`num`, `str`, `list`...) that were
 * snapshotted after the program ran, and call Python functions ("hooks") by name, e.g.
 * `program.call("steer", left, right)` or a method path like `"autopilot.steer"`.
 *
 * `createStaticProgram` builds the same interface from plain JS, which powers the
 * landing-page demos without ever loading Python.
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
  /** Calls a Python function. Returns undefined (and sets lastError) if it fails. */
  call<T = unknown>(path: string, ...args: unknown[]): T | undefined;
  subscribe(listener: () => void): () => void;
  dispose(): void;
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

  constructor(
    readonly stdout: string,
    private vars: Record<string, unknown>,
    private callables: Set<string>,
    private py: PyModule | null,
    private staticHooks: Record<string, (...args: never[]) => unknown> | null,
  ) {}

  has(name: string) {
    return name in this.vars || this.callables.has(name);
  }

  hasHook(path: string) {
    // A disposed program (e.g. its route was hidden) must answer safely, never touch Pyodide.
    if (this.disposed) return false;
    if (this.staticHooks) return path in this.staticHooks;
    if (!path.includes(".")) return this.callables.has(path);
    const cached = this.hookCache.get(path);
    if (cached !== undefined) return cached;
    const result = this.py ? this.py.has_hook(path) : false;
    this.hookCache.set(path, result);
    return result;
  }

  num(name: string, fallback: number) {
    const v = this.vars[name];
    return typeof v === "number" && Number.isFinite(v) ? v : fallback;
  }

  str(name: string, fallback: string) {
    const v = this.vars[name];
    return typeof v === "string" ? v : fallback;
  }

  bool(name: string, fallback: boolean) {
    const v = this.vars[name];
    return typeof v === "boolean" ? v : fallback;
  }

  list<T = unknown>(name: string): T[] {
    const v = this.vars[name];
    return Array.isArray(v) ? (v as T[]) : [];
  }

  dict<T = unknown>(name: string): Record<string, T> {
    const v = this.vars[name];
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, T>) : {};
  }

  call<T = unknown>(path: string, ...args: unknown[]): T | undefined {
    if (this.disposed) return undefined;
    if (this.staticHooks) {
      const fn = this.staticHooks[path];
      return fn ? ((fn as (...a: unknown[]) => unknown)(...args) as T) : undefined;
    }
    if (!this.py) return undefined;
    let raw: string;
    try {
      raw = this.py.call(path, JSON.stringify(args));
    } catch (err) {
      this.setError(`${path}() ${(err as Error)?.message ?? err}`);
      return undefined;
    }
    const res = JSON.parse(raw) as { ok: boolean; value?: T; error?: string };
    if (!res.ok) {
      this.setError(res.error ?? `${path}() failed`);
      return undefined;
    }
    if (this.lastError) this.setError(null);
    return res.value;
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
    this.py?.dispose();
  }
}

export function createPythonProgram(
  py: PyModule,
  stdout: string,
  snapshot: { vars: Record<string, unknown>; callables: string[] },
): ProgramHandle {
  return new Program(stdout, snapshot.vars, new Set(snapshot.callables), py, null);
}

/** A program made from plain JS values and functions (no Python). Used for demos. */
export function createStaticProgram(spec: {
  vars?: Record<string, unknown>;
  hooks?: Record<string, (...args: never[]) => unknown>;
  stdout?: string;
}): ProgramHandle {
  const hooks = spec.hooks ?? {};
  return new Program(spec.stdout ?? "", spec.vars ?? {}, new Set(Object.keys(hooks)), null, hooks);
}
