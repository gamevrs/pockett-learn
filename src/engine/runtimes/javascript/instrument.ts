import { parse } from "acorn";
import { simple } from "acorn-walk";
import type { Node } from "acorn";

/**
 * Adds a `__guard()` call to the start of every loop body so a runaway loop throws instead of
 * freezing the tab. Insertions never add newlines, so line numbers in errors stay correct.
 * Throws acorn's SyntaxError (with `.loc`) for code that doesn't parse.
 */
export function instrument(source: string): string {
  const ast = parse(source, { ecmaVersion: "latest", sourceType: "script", locations: true });
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
  // apply from the end so earlier offsets stay valid; at equal offsets keep insertion order
  edits.sort((a, b) => b.at - a.at);
  let out = source;
  for (const e of edits) out = out.slice(0, e.at) + e.text + out.slice(e.at);
  return out;
}
