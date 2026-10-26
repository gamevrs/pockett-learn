import { parse } from "acorn";
import { simple } from "acorn-walk";
import type { Node } from "acorn";

/**
 * Prepares the learner's file to run as the body of an async function:
 *  - adds a `__guard()` call to the start of every loop body so a runaway loop throws instead of
 *    freezing the tab;
 *  - adds `__reg(...)` as the first statement, handing the runtime a closure that can `eval` inside
 *    the file's scope (to read variables, call hooks and run tests) even while the file is still
 *    awaiting something.
 * Insertions never add newlines, so line numbers in errors stay correct.
 * Top-level `await` is allowed. Throws acorn's SyntaxError (with `.loc`) for code that doesn't parse.
 */
export function instrument(source: string): string {
  const ast = parse(source, { ecmaVersion: "latest", sourceType: "script", locations: true, allowAwaitOutsideFunction: true });
  const edits: { at: number; text: string }[] = [];
  const guardBody = (body: Node & { type: string }) => {
    if (body.type === "BlockStatement") edits.push({ at: body.start + 1, text: "__guard();" });
    else {
      edits.push({ at: body.start, text: "{__guard();" });
      edits.push({ at: body.end, text: "}" });
    }
  };
  type Loop = Node & { body: Node & { type: string } };
  const visit = (node: Node) => guardBody((node as Loop).body);
  simple(ast, {
    ForStatement: visit,
    ForInStatement: visit,
    ForOfStatement: visit,
    WhileStatement: visit,
    DoWhileStatement: visit,
  });
  // a leading "use strict" directive must stay first, so the registration goes after any directives
  let at = 0;
  for (const stmt of ast.body) {
    if (stmt.type === "ExpressionStatement" && "directive" in stmt) at = stmt.end;
    else break;
  }
  edits.push({ at, text: "__reg((__s) => eval(__s));" });
  // apply from the end so earlier offsets stay valid; at equal offsets keep insertion order
  edits.sort((a, b) => b.at - a.at);
  let out = source;
  for (const e of edits) out = out.slice(0, e.at) + e.text + out.slice(e.at);
  return out;
}
