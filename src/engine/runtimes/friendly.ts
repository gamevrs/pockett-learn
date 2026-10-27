/**
 * Plain-language versions of the raw runtime errors a lesson CHECK can run into.
 *
 * A check is a bit of code that pokes at the learner's program ("result.columns.includes(...)",
 * "total(cart)[0]"). When the learner's program has not produced what the check pokes at yet (an
 * untouched starter, a function that still returns nothing, a name nobody defined), the engine
 * throws a raw TypeError / ReferenceError / NameError and the learner used to see
 * "TypeError: Cannot read properties of undefined (reading 'columns')". That says nothing about what
 * to do next, so every runtime routes such errors through `friendlyFailure` first.
 *
 * Assertion failures (our own `assert(...)` messages) are never touched: they are already written
 * for learners. Anything this file does not recognise is returned with the technical text intact
 * (wrapped in a sentence), and scripts/validate-content.mjs flags it on starters, so a new shape
 * of raw error gets noticed and handled here instead of reaching a learner.
 *
 * Plain TS, no runtime-only syntax: Node imports it for content validation.
 */

const tick = (name: string) => `\`${name.replace(/`/g, "")}\``;

/** Takes "TypeError: Cannot read properties of undefined (reading 'x')" style text, returns learner-facing text. */
export function friendlyFailure(raw: string): string {
  const m = /^([A-Za-z_]*(?:Error|Exception|Exit)):\s*([\s\S]*)$/.exec(raw.trim());
  if (!m) return raw;
  const [, kind, msg] = m;
  const message = msg.trim();
  const ENGINE_KINDS = new Set(["TypeError", "ReferenceError", "NameError", "UnboundLocalError", "AttributeError"]);
  if (!ENGINE_KINDS.has(kind)) return raw;

  // ── Python placeholders and "returned nothing" ──
  if (/ellipsis/.test(message)) return "A `...` placeholder is still in your code. Replace it with the code the task asks for.";
  if (/NoneType|\bNone\b/.test(message) && kind !== "NameError") {
    return "Something your code should produce is `None` (nothing). Make sure the function you are writing `return`s the value the task asks for.";
  }
  let x: RegExpExecArray | null;
  if ((x = /^name '([^']+)' is not defined/.exec(message))) return `Your code doesn't define ${tick(x[1])} yet. Add it, then run again.`;
  if ((x = /local variable '([^']+)' (?:\w+ )?referenced before assignment/.exec(message))) return `${tick(x[1])} is used before it is given a value. Assign it first.`;
  if ((x = /^(\w+)\(\) takes no arguments/.exec(message))) return `${tick(x[1])} doesn't accept those arguments yet. Give the class an \`__init__\` that takes them.`;
  if ((x = /Can't instantiate abstract class (\w+) with abstract methods? ([\w, ]+)/.exec(message))) return `${tick(x[1])} is missing methods it has to define: ${x[2]}.`;
  if ((x = /Can't instantiate abstract class (\w+)/.exec(message))) return `${tick(x[1])} is missing methods it has to define.`;
  if ((x = /^(\w[\w.]*)\(\) (?:missing \d+ required|takes \d+ positional|got an unexpected keyword)/.exec(message))) return `${tick(x[1])} is called with different arguments than it accepts: ${message}.`;

  // ── JavaScript ──
  if ((x = /^([\w$.]+) is not defined/.exec(message))) return `Your code doesn't define ${tick(x[1])} yet. Add it, then run again.`;
  if (/Must call super constructor/.test(message)) return "A subclass constructor has to call `super(...)` before it uses `this`.";
  if ((x = /^Cannot access '([^']+)' before initialization/.exec(message))) return `${tick(x[1])} is used before it is created. Move its declaration above the code that uses it.`;
  if ((x = /^(.+?) is not a function/.exec(message))) {
    const name = x[1].replace(/\(\.\.\.\)$/, "()");
    return /^(undefined|null)$/.test(name) ? "Something the check tried to call isn't a function yet. Define the function the task asks for." : `${tick(name)} should be a function, but it isn't one yet. Define it as the task describes.`;
  }
  if ((x = /^(.+?) is not a constructor/.exec(message))) return `${tick(x[1])} should be a class or constructor, but it isn't one yet.`;
  if ((x = /^Cannot (?:read|set) propert(?:y|ies) of (undefined|null)(?: \((?:reading|setting) '([^']*)'\))?/.exec(message))) {
    return `The check needed ${x[2] ? `${tick(x[2])} from` : "something from"} your code, but got ${x[1] === "undefined" ? "nothing (`undefined`)" : "`null`"}. Make sure your code returns what the task asks for.`;
  }
  if (/Cannot convert undefined or null to object/.test(message)) return "Something your code should produce is missing (`undefined`). Return the value the task asks for.";
  if (/(undefined|null) is not (?:iterable|an object)|is not iterable/.test(message)) return "A list or collection the check needs is missing (`undefined`). Return the value the task asks for.";
  if (/(undefined|null)/.test(message)) return "Something your code should produce is missing (`undefined`). Return the value the task asks for.";

  return `Your code isn't ready for this check yet: ${message}`;
}
