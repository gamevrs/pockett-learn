/**
 * Test helpers available to JavaScript-language checks (JavaScript and SQL projects).
 * Plain TS with no runtime-only syntax, so Node can import it for content validation.
 */

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

/** Short, readable rendering of any value for messages and console output. */
export function inspect(value: unknown, depth = 0): string {
  if (typeof value === "string") return depth === 0 ? value : JSON.stringify(value);
  if (value === null || value === undefined || typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
  if (typeof value === "function") return `[Function: ${value.name || "anonymous"}]`;
  if (typeof value === "symbol") return value.toString();
  if (depth > 3) return Array.isArray(value) ? "[Array]" : "[Object]";
  if (Array.isArray(value)) {
    const items = value.slice(0, 50).map((v) => inspect(v, depth + 1));
    if (value.length > 50) items.push(`… ${value.length - 50} more`);
    return `[${items.join(", ")}]`;
  }
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (value instanceof Map) return `Map(${value.size}) {${[...value].map(([k, v]) => ` ${inspect(k, depth + 1)} => ${inspect(v, depth + 1)}`).join(",")} }`;
  if (value instanceof Set) return `Set(${value.size}) {${[...value].map((v) => ` ${inspect(v, depth + 1)}`).join(",")} }`;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return "{}";
  const name = (value as object).constructor?.name;
  const prefix = name && name !== "Object" ? `${name} ` : "";
  return `${prefix}{ ${entries.map(([k, v]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${inspect(v, depth + 1)}`).join(", ")} }`;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

export const testHelpers = {
  assert(condition: unknown, message = "Check failed"): void {
    if (!condition) throw new AssertionError(message);
  },
  assertEqual(actual: unknown, expected: unknown, message?: string): void {
    if (!deepEqual(actual, expected)) {
      throw new AssertionError(`${message ? `${message}: ` : ""}expected ${inspect(expected, 1)}, got ${inspect(actual, 1)}`);
    }
  },
  assertClose(actual: unknown, expected: number, tolerance = 1e-6, message?: string): void {
    if (typeof actual !== "number" || Math.abs(actual - expected) > tolerance) {
      throw new AssertionError(`${message ? `${message}: ` : ""}expected about ${expected}, got ${inspect(actual, 1)}`);
    }
  },
  /**
   * Asserts that `fn` throws (JavaScript checks). `expected` may be a string (the message must contain
   * it, or the error name must equal it), a RegExp (tested against the message) or omitted.
   * Returns the error so a check can inspect it further.
   */
  assertThrows(fn: () => unknown, expected?: string | RegExp, message?: string): unknown {
    let thrown: unknown;
    let threw = false;
    try {
      fn();
    } catch (err) {
      threw = true;
      thrown = err;
    }
    if (!threw) throw new AssertionError(message ?? "expected the code to throw an error, but it finished normally");
    matchesError(thrown, expected, message);
    return thrown;
  },
  /**
   * Async twin of assertThrows: awaits a Promise (or the Promise returned by calling a function)
   * and asserts it rejects. Returns the rejection reason.
   */
  async assertRejects(promiseOrFn: unknown, expected?: string | RegExp, message?: string): Promise<unknown> {
    let thrown: unknown;
    let threw = false;
    try {
      await (typeof promiseOrFn === "function" ? (promiseOrFn as () => unknown)() : promiseOrFn);
    } catch (err) {
      threw = true;
      thrown = err;
    }
    if (!threw) throw new AssertionError(message ?? "expected the Promise to reject, but it resolved");
    matchesError(thrown, expected, message);
    return thrown;
  },
};

function matchesError(thrown: unknown, expected: string | RegExp | undefined, message?: string) {
  if (expected === undefined) return;
  const text = thrown instanceof Error ? thrown.message : String(thrown);
  const name = thrown instanceof Error ? thrown.name : "";
  const ok = typeof expected === "string" ? text.includes(expected) || name === expected : expected.test(text);
  if (!ok) {
    throw new AssertionError(`${message ? `${message}: ` : ""}expected an error matching ${String(expected)}, got ${name ? `${name}: ` : ""}${text}`);
  }
}

/** How a failing check is reported to the learner. */
export function describeFailure(err: unknown): string {
  if (err instanceof AssertionError) return err.message;
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}
