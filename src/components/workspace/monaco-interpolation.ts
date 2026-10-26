import type { Monaco } from "@monaco-editor/react";
import { applyIdentifierTokens } from "./monaco-identifiers";

/**
 * Monaco's built-in Monarch grammars colour a whole string literal one colour, so the expressions
 * inside f-strings, `${}` holes, `$"..."` holes and format macros are invisible. This module takes
 * each stock grammar (via the language's own lazy `loader`), splices in extra states for the
 * interpolation syntax, and re-registers it. Everything else in the stock grammar is untouched.
 *
 * New token types (colours live in CodeEditor.tsx, both themes):
 *   string.interpolation.delimiter  the braces of a hole / placeholder:  {  }  ${
 *   string.format.placeholder       a whole fixed placeholder:  {}  {0}  {:?}  %d  %s  %.2f  %v
 *   string.format.spec              the format spec after ":" (and "!r"):  :.2f  :>10  !r
 * Expressions inside a hole use the language's normal tokens (identifier, number, keyword, ...).
 * The names start with "string" on purpose: Monaco then treats the braces as string content and
 * leaves them out of bracket-pair colouring, which would otherwise repaint them in rainbow colours.
 */

type Rule = unknown;
type Grammar = { tokenizer: Record<string, Rule[]> } & Record<string, unknown>;
type LanguageModule = { language: Grammar };
type MonarchInput = Parameters<Monaco["languages"]["setMonarchTokensProvider"]>[1];
type LoaderEntry = { id: string; loader?: () => Promise<LanguageModule> };

const DELIM = "string.interpolation.delimiter";
const PLACEHOLDER = "string.format.placeholder";
const SPEC = "string.format.spec";

// ───────────────────────────── shared placeholder patterns ─────────────────────────────

/** Rust / C++ / Python str.format style: {}  {0}  {name}  {:?}  {0:>5}  {x:.2} */
const BRACE_PLACEHOLDER = /\{(?:\d+|[A-Za-z_]\w*)?(?:![rsa])?(?::[^{}'"\\]*)?\}/;
/** Rust: only positional / empty placeholders are "fixed"; {name} is an inline argument (see below). */
const RUST_FIXED = /\{(?:\d+)?(?::[^{}"\\]*)?\}/;
/** C# composite format: {0}  {1,5}  {2:F2} */
const CS_PLACEHOLDER = /\{\d+(?:,-?\d+)?(?::[^{}"\\]*)?\}/;
/** printf style in Python (%s %d %.2f %(name)s) */
const PY_PERCENT = /%(?:\([A-Za-z_]\w*\))?[-+#0]*(?:\d+|\*)?(?:\.(?:\d+|\*))?[sdifrxXeEgGcoua]/;
/** C / C++ printf */
const C_PERCENT = /%[-+ #0]*(?:\d+|\*)?(?:\.(?:\d+|\*))?(?:hh|h|ll|l|j|z|t|L)?[diouxXeEfFgGaAcspn]/;
/** Go fmt verbs, including indexed (%[1]d) and flags */
const GO_VERB = /%(?:\[\d+\])?[-+# 0]*(?:\*|\d+)?(?:\.(?:\*|\d+)?)?[vTtbcdoOqxXUeEfFgGsp]/;

// ───────────────────────────── Python ─────────────────────────────

function python(g: Grammar): Grammar {
  const t = g.tokenizer;
  const identifier = [/[a-zA-Z_]\w*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }];

  // plain '...' and "..." strings: stock behaviour plus subtle %s / {} placeholders
  const plain = (q: string): Rule[] => [
    [new RegExp(`[^\\\\${q}%{}]+$`), "string", "@popall"],
    [new RegExp(`[^\\\\${q}%{}]+`), "string"],
    [/\{\{|\}\}|%%/, "string"],
    [BRACE_PLACEHOLDER, PLACEHOLDER],
    [PY_PERCENT, PLACEHOLDER],
    [/[%{}]/, "string"],
    [/\\./, "string"],
    [new RegExp(q), "string.escape", "@popall"],
    [/\\$/, "string"],
  ];
  t.stringBody = plain("'");
  t.dblStringBody = plain('"');

  // f-string bodies
  const fbody = (q: string, triple: boolean): Rule[] => [
    ...(triple ? [] : [[new RegExp(`[^\\\\${q}{}]+$`), "string", "@popall"]]),
    [new RegExp(`[^\\\\${q}{}]+`), "string"],
    [/\{\{|\}\}/, "string"], // escapes stay string-coloured
    [/\{/, { token: DELIM, next: "@pyExpr" }],
    [/\\./, "string"],
    [/\\$/, "string"],
    [triple ? new RegExp(q.repeat(3)) : new RegExp(q), "string.escape", triple ? "@pop" : "@popall"],
    ...(triple ? [[new RegExp(q), "string"]] : []),
    [/\}/, "string"],
  ];
  t.pyFsq = fbody("'", false);
  t.pyFdq = fbody('"', false);
  t.pyFtsq = fbody("'", true);
  t.pyFtdq = fbody('"', true);

  // nested plain strings inside an expression
  t.pyStrSq = [[/[^\\']+$/, "string", "@popall"], [/[^\\']+/, "string"], [/\\./, "string"], [/'/, "string.escape", "@pop"]];
  t.pyStrDq = [[/[^\\"]+$/, "string", "@popall"], [/[^\\"]+/, "string"], [/\\./, "string"], [/"/, "string.escape", "@pop"]];

  t.pyCommon = [
    { include: "@numbers" },
    [/\s+/, "white"],
    [/'/, "string.escape", "@pyStrSq"],
    [/"/, "string.escape", "@pyStrDq"],
    [/\(/, { token: "delimiter.parenthesis", next: "@pyBr" }],
    [/\[/, { token: "delimiter.bracket", next: "@pyBr" }],
    [/\{/, { token: "delimiter.curly", next: "@pyBr" }],
    [/[,;]/, "delimiter"],
    identifier,
  ];
  t.pyBr = [
    [/\)/, { token: "delimiter.parenthesis", next: "@pop" }],
    [/\]/, { token: "delimiter.bracket", next: "@pop" }],
    [/\}/, { token: "delimiter.curly", next: "@pop" }],
    [/:/, "delimiter"],
    { include: "@pyCommon" },
  ];
  // the expression part of a replacement field: {expr!r:spec}
  t.pyExpr = [
    [/\}/, { token: DELIM, next: "@pop" }],
    [/![rsa](?=\s*[:}])/, SPEC],
    [/:/, { token: SPEC, switchTo: "@pySpec" }],
    { include: "@pyCommon" },
  ];
  // the format spec; may contain nested fields: {x:{width}.{prec}f}
  t.pySpec = [
    [/\{/, { token: DELIM, next: "@pyExpr" }],
    [/\}/, { token: DELIM, next: "@pop" }],
    [/[^{}]+/, SPEC],
  ];

  t.strings = [
    [/(?:[rR][fF]|[fF][rR]|[fF])'''/, "string.escape", "@pyFtsq"],
    [/(?:[rR][fF]|[fF][rR]|[fF])"""/, "string.escape", "@pyFtdq"],
    [/(?:[rR][fF]|[fF][rR]|[fF])'/, "string.escape", "@pyFsq"],
    [/(?:[rR][fF]|[fF][rR]|[fF])"/, "string.escape", "@pyFdq"],
    // the stock plain-quote rules, minus its own (single-line only) f-string starters
    ...t.strings.filter((r) => !(Array.isArray(r) && r[0] instanceof RegExp && r[0].source.startsWith("f"))),
  ];
  return g;
}

// ───────────────────────────── JavaScript / TypeScript ─────────────────────────────

function javascript(g: Grammar): Grammar {
  const t = g.tokenizer;
  t.string_backtick = [
    [/\$\{/, { token: DELIM, next: "@jsInterp" }],
    [/[^\\`$]+/, "string"],
    [/@escapes/, "string.escape"],
    [/\\./, "string.escape.invalid"],
    [/\$/, "string"],
    [/`/, "string", "@pop"],
  ];
  t.jsInterp = [
    [/\{/, "delimiter.bracket", "@bracketCounting"],
    [/\}/, { token: DELIM, next: "@pop" }],
    { include: "common" },
  ];
  return g;
}

// ───────────────────────────── C# ─────────────────────────────

function csharp(g: Grammar): Grammar {
  const t = g.tokenizer;
  const identifier = t.root[0]; // the stock identifier / keyword rule (with its @qualified follow state)

  t.csCommon = [
    { include: "@whitespace" },
    identifier,
    [/[0-9_]*\.[0-9_]+([eE][-+]?\d+)?[fFdD]?/, "number.float"],
    [/0[xX][0-9a-fA-F_]+/, "number.hex"],
    [/0[bB][01_]+/, "number.hex"],
    [/[0-9_]+/, "number"],
    [/\$"""/, "string.quote", "@csR1"],
    [/\$\$"""/, "string.quote", "@csR2"],
    [/(?:\$@|@\$)"/, "string.quote", "@csVStr"],
    [/\$"/, "string.quote", "@csIStr"],
    [/@"/, "string.quote", "@litstring"],
    [/"/, "string.quote", "@string"],
    [/'[^\\']'/, "string"],
    [/(')(@escapes)(')/, ["string", "string.escape", "string"]],
    [/[(]/, { token: "delimiter.parenthesis", next: "@csBr" }],
    [/\[/, { token: "delimiter.bracket", next: "@csBr" }],
    [/\{/, { token: "delimiter.curly", next: "@csBr" }],
    [/[<>](?!@symbols)/, "delimiter.angle"],
    [/@symbols/, { cases: { "@operators": "delimiter", "@default": "" } }],
    [/[;,.]/, "delimiter"],
  ];
  t.csBr = [
    [/\)/, { token: "delimiter.parenthesis", next: "@pop" }],
    [/\]/, { token: "delimiter.bracket", next: "@pop" }],
    [/\}/, { token: "delimiter.curly", next: "@pop" }],
    { include: "@csCommon" },
  ];
  // the expression part of a hole: {expr,align:spec}
  t.csExpr = [
    [/\}/, { token: DELIM, next: "@pop" }],
    [/:(?!:)/, { token: SPEC, switchTo: "@csSpec" }],
    { include: "@csCommon" },
  ];
  t.csExpr2 = [
    [/\}\}/, { token: DELIM, next: "@pop" }],
    [/:(?!:)/, { token: SPEC, switchTo: "@csSpec2" }],
    { include: "@csCommon" },
  ];
  t.csSpec = [
    [/\}/, { token: DELIM, next: "@pop" }],
    [/[^}]+/, SPEC],
  ];
  t.csSpec2 = [
    [/\}\}/, { token: DELIM, next: "@pop" }],
    [/[^}]+|\}/, SPEC],
  ];

  t.csIStr = [
    [/[^\\"{}]+$/, "string", "@popall"],
    [/[^\\"{}]+/, "string"],
    [/@escapes/, "string.escape"],
    [/\\./, "string.escape.invalid"],
    [/\{\{|\}\}/, "string"],
    [/\{/, { token: DELIM, next: "@csExpr" }],
    [/\}/, "string"],
    [/"/, { token: "string.quote", next: "@pop" }],
  ];
  t.csVStr = [
    [/[^"{}]+/, "string"],
    [/""/, "string.escape"],
    [/\{\{|\}\}/, "string"],
    [/\{/, { token: DELIM, next: "@csExpr" }],
    [/\}/, "string"],
    [/"/, { token: "string.quote", next: "@pop" }],
  ];
  t.csR1 = [
    [/[^"{}]+/, "string"],
    [/"""/, { token: "string.quote", next: "@pop" }],
    [/"/, "string"],
    [/\{/, { token: DELIM, next: "@csExpr" }],
    [/\}/, "string"],
  ];
  t.csR2 = [
    [/[^"{]+/, "string"],
    [/"""/, { token: "string.quote", next: "@pop" }],
    [/"/, "string"],
    [/\{\{/, { token: DELIM, next: "@csExpr2" }],
    [/\{/, "string"],
  ];
  t.csRP = [
    [/[^"]+/, "string"],
    [/"""/, { token: "string.quote", next: "@pop" }],
    [/"/, "string"],
  ];

  // plain strings: subtle composite-format placeholders ({0} {1:F2})
  t.string = [
    [/[^\\"{}]+/, "string"],
    [/\{\{|\}\}/, "string"],
    [CS_PLACEHOLDER, PLACEHOLDER],
    [/[{}]/, "string"],
    [/@escapes/, "string.escape"],
    [/\\./, "string.escape.invalid"],
    [/"/, { token: "string.quote", next: "@pop" }],
  ];

  // string starts in root: interpolated / raw forms come before the stock plain-string rules
  t.root = [
    [/\$\$"""/, "string.quote", "@csR2"],
    [/\$"""/, "string.quote", "@csR1"],
    [/"""/, "string.quote", "@csRP"],
    [/(?:\$@|@\$)"/, "string.quote", "@csVStr"],
    [/\$"/, "string.quote", "@csIStr"],
    ...t.root,
  ];
  return g;
}

// ───────────────────────────── Rust ─────────────────────────────

function rust(g: Grammar): Grammar {
  const t = g.tokenizer;
  t.string = [
    [/[^\\"{}]+/, "string"],
    [/\{\{|\}\}/, "string"], // escapes stay string-coloured
    [RUST_FIXED, PLACEHOLDER],
    // inline arguments: {name} and {name:.2}, the name is an expression
    [/(\{)([A-Za-z_]\w*)(\})/, [DELIM, "variable", DELIM]],
    [/(\{)([A-Za-z_]\w*)(:[^{}"\\]*)(\})/, [DELIM, "variable", SPEC, DELIM]],
    // a hole still being typed ({na, closing brace not there yet): colour the name so suggestions can pop up
    [/(\{)([A-Za-z_]\w*)(?=["),:]|$)/, [DELIM, "variable"]],
    [/[{}]/, "string"],
    [/@escapes/, "string.escape"],
    [/\\./, "string.escape.invalid"],
    [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
  ];
  return g;
}

// ───────────────────────────── Go ─────────────────────────────

function go(g: Grammar): Grammar {
  const t = g.tokenizer;
  t.string = [
    [/[^\\"%]+/, "string"],
    [/%%/, "string"],
    [GO_VERB, PLACEHOLDER],
    [/%/, "string"],
    [/@escapes/, "string.escape"],
    [/\\./, "string.escape.invalid"],
    [/"/, "string", "@pop"],
  ];
  t.rawstring = [
    [/[^`%]+/, "string"],
    [/%%/, "string"],
    [GO_VERB, PLACEHOLDER],
    [/%/, "string"],
    [/`/, "string", "@pop"],
  ];
  return g;
}

// ───────────────────────────── C++ ─────────────────────────────

function cpp(g: Grammar): Grammar {
  const t = g.tokenizer;
  t.string = [
    [/[^\\"%{}]+/, "string"],
    [/%%|\{\{|\}\}/, "string"],
    [BRACE_PLACEHOLDER, PLACEHOLDER],
    [C_PERCENT, PLACEHOLDER],
    [/[%{}]/, "string"],
    [/@escapes/, "string.escape"],
    [/\\./, "string.escape.invalid"],
    [/"/, "string", "@pop"],
  ];
  return g;
}

const PATCHERS: Record<string, (g: Grammar) => Grammar> = {
  python,
  javascript,
  typescript: javascript,
  csharp,
  rust,
  go,
  cpp,
  sql: (g) => g, // no interpolation, but its names get colours too
};

/** Languages the editor can show that have an interpolation-aware grammar. */
export const INTERPOLATION_LANGUAGES = Object.keys(PATCHERS);

const registered = new WeakMap<object, Map<string, Promise<void>>>();

/**
 * Re-registers the tokenizer for `languageId` with interpolation-aware states. Idempotent; call it
 * (and await it) before a model of that language is created so Monaco's own lazy loader can't win.
 */
export function ensureInterpolationGrammar(monaco: Monaco, languageId: string): Promise<void> {
  const patch = PATCHERS[languageId];
  if (!patch) return Promise.resolve();
  let perLanguage = registered.get(monaco);
  if (!perLanguage) {
    registered.set(monaco, (perLanguage = new Map()));
    // safety net for models created later in another language (e.g. the sandbox switching language)
    for (const id of INTERPOLATION_LANGUAGES) monaco.languages.onLanguage(id, () => { void ensureInterpolationGrammar(monaco, id); });
  }
  const existing = perLanguage.get(languageId);
  if (existing) return existing;

  const job = (async () => {
    const def = monaco.languages.getLanguages().find((l: { id: string }) => l.id === languageId) as LoaderEntry | undefined;
    if (!def?.loader) return;
    const patched = def.loader().then((mod) => applyIdentifierTokens(languageId, patch(structuredClone(mod.language))) as unknown as MonarchInput & Grammar);
    // 1. Handing Monaco a promise replaces its own lazy tokenizer factory right now (synchronously),
    //    so that factory can't finish later and overwrite ours.
    monaco.languages.setMonarchTokensProvider(languageId, patched);
    // 2. If Monaco had already resolved its stock tokenizer (a model of this language existed), set ours directly.
    monaco.languages.setMonarchTokensProvider(languageId, await patched);
  })().catch(() => {
    // a failed patch just leaves Monaco's stock highlighting in place
    perLanguage.delete(languageId);
  });
  perLanguage.set(languageId, job);
  return job;
}
