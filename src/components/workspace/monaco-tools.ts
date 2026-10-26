import type { Monaco } from "@monaco-editor/react";
import {
  CPP_MEMBERS,
  CPP_STD,
  CS_INSTANCE,
  CS_MEMBERS,
  GO_PACKAGES,
  KEYWORDS,
  PY_MEMBERS,
  PY_MODULES,
  RUST_MEMBERS,
  SNIPPETS,
  SQL_FUNCTIONS,
  globalDocs,
  qualifiedDoc,
  type DocEntry,
  type DocTable,
} from "./editor-docs";
import { enclosingOwner, receiverBefore, scanSource, sqlStatementTables, visibleAt, type Scan, type Sym } from "./editor-scan";

/**
 * Editor-wide smarts for every language the editor shows: completions that know the file, hover docs,
 * signature help, go to definition and rename. All of it is regex/line based and cached per model
 * version, so it never blocks typing. Registered once per Monaco instance.
 */

type Model = ReturnType<Monaco["editor"]["createModel"]>;
type Position = { lineNumber: number; column: number };

/** Languages with our own completion/hover/signature providers (JavaScript uses Monaco's TypeScript service). */
const OWN_LANGUAGES = ["python", "csharp", "go", "rust", "cpp", "sql"] as const;

// ───────────────────────────── scan cache ─────────────────────────────

const extraContext = new WeakMap<object, string>();
const cache = new WeakMap<object, { version: number; extra: string; scan: Scan }>();

/** Extra text a language should know about but that is not in the editor (e.g. the SQL schema a project sets up). */
export function setModelContext(model: Model, context: string | undefined) {
  extraContext.set(model, context ?? "");
}

function getScan(model: Model, language: string): Scan {
  const version = model.getVersionId();
  const extra = extraContext.get(model) ?? "";
  const hit = cache.get(model);
  if (hit && hit.version === version && hit.extra === extra) return hit.scan;
  const scan = scanSource(language, model.getValue(), extra);
  cache.set(model, { version, extra, scan });
  return scan;
}

// ───────────────────────────── helpers ─────────────────────────────

/** True if the character just before `col` (1-based) sits inside a string or comment, using the masked copy of the line. */
function inStringOrComment(scan: Scan, line: number, col: number): boolean {
  const orig = scan.lines[line - 1] ?? "";
  const masked = scan.masked[line - 1] ?? "";
  const i = col - 2;
  if (i < 0) return false;
  // the closing/opening quote itself is kept in the masked copy, so look at the content character
  const blanked = orig[i] !== undefined && orig[i] !== " " && masked[i] === " ";
  if (!blanked) return false;
  if (scan.language === "python" || scan.language === "javascript") {
    // inside {expr} of an f-string: code
    const before = orig.slice(0, i + 1);
    if (/[fF][rR]?["'][^"']*\{[^{}"']*$/.test(before) || /\$\{[^}`]*$/.test(before)) return false;
  }
  if (scan.language === "csharp" && /\$@?"[^"]*\{[^{}"]*$/.test(orig.slice(0, i + 1))) return false;
  if (scan.language === "rust" && /"[^"]*\{[^{}"]*$/.test(orig.slice(0, i + 1))) return false;
  return true;
}

const kindOf = (monaco: Monaco, s: Sym): number => {
  const K = monaco.languages.CompletionItemKind;
  switch (s.kind) {
    case "variable":
      return K.Variable;
    case "constant":
      return K.Constant;
    case "function":
      return K.Function;
    case "method":
      return K.Method;
    case "class":
      return K.Class;
    case "parameter":
      return K.Variable;
    case "field":
      return K.Field;
    case "import":
      return K.Module;
    case "table":
      return K.Struct;
    case "column":
      return K.Field;
  }
};

const md = (value: string) => ({ value });
const codeBlock = (language: string, text: string) => "```" + (language === "cpp" ? "cpp" : language) + "\n" + text + "\n```";

function docMarkdown(language: string, entry: DocEntry): string {
  return `${codeBlock(language, entry[0])}\n${entry[1]}`;
}

function symDoc(language: string, s: Sym): string {
  const where = `declared on line ${s.line}`;
  const parts: string[] = [];
  if (s.sig) parts.push(codeBlock(language, s.sig));
  const bits = [s.kind === "parameter" ? "parameter" : s.kind, s.type && !s.type.includes(":") ? `of type ${s.type}` : undefined, where].filter(Boolean);
  parts.push(bits.join(", "));
  return parts.join("\n");
}

const STRIP_STATIC: Record<string, RegExp> = { String: /^String::/, Vec: /^Vec::/, HashMap: /^HashMap::/ };

// ───────────────────────────── completion ─────────────────────────────

interface Item {
  label: string;
  kind: number;
  insertText?: string;
  detail?: string;
  documentation?: { value: string };
  sortText?: string;
  insertTextRules?: number;
  filterText?: string;
  range: { startLineNumber: number; endLineNumber: number; startColumn: number; endColumn: number };
}

function userMembers(monaco: Monaco, scan: Scan, owner: string, range: Item["range"], seen = new Set<string>()): Item[] {
  const out: Item[] = [];
  const K = monaco.languages.CompletionItemKind;
  const cls = scan.syms.find((s) => s.kind === "class" && s.name === owner);
  for (const s of scan.syms) {
    if (s.owner !== owner || (s.kind !== "method" && s.kind !== "field" && s.kind !== "function")) continue;
    if (/^__(?!init__)/.test(s.name) || seen.has(s.name)) continue;
    seen.add(s.name);
    out.push({ label: s.name, kind: s.kind === "field" ? K.Field : K.Method, detail: s.sig ?? s.detail ?? s.type, documentation: md(symDoc(scan.language, s)), sortText: "0" + s.name, range });
  }
  // inherited (Python base classes written in the file)
  if (scan.language === "python" && cls?.detail) {
    for (const base of cls.detail.replace(/[()]/g, "").split(",")) {
      const b = base.trim();
      if (b && b !== owner && scan.syms.some((s) => s.kind === "class" && s.name === b)) out.push(...userMembers(monaco, scan, b, range, seen));
    }
  }
  return out;
}

function tableItems(monaco: Monaco, table: DocTable, range: Item["range"], language: string, strip?: RegExp, kindOverride?: number): Item[] {
  const K = monaco.languages.CompletionItemKind;
  return Object.entries(table).map(([name, entry]) => {
    const isFn = entry[0].includes("(");
    const sig = strip ? entry[0].replace(strip, "") : entry[0];
    return {
      label: name,
      kind: kindOverride ?? (isFn ? K.Method : K.Property),
      detail: sig,
      documentation: md(docMarkdown(language, [sig, entry[1]])),
      sortText: "1" + name,
      range,
    };
  });
}

function memberCompletions(monaco: Monaco, scan: Scan, beforeDot: string, line: number, range: Item["range"]): Item[] | null {
  const language = scan.language;
  const r = receiverBefore(scan, beforeDot, line);
  if (!r) return null;
  const head = r.head;
  const isPlainName = !!head && r.chain === head;
  const symIsVar = !!head && visibleAt(scan, line).some((s) => s.name === head && s.kind !== "class" && s.kind !== "function");

  // static / namespace access: Console. fmt. int. math.
  if (isPlainName && !symIsVar) {
    if (language === "csharp") {
      const key = head === "String" ? "string" : head === "Int32" ? "int" : head === "Double" ? "double" : head;
      if (CS_MEMBERS[key]) return tableItems(monaco, CS_MEMBERS[key], range, language, undefined, undefined);
    }
    if (language === "go" && GO_PACKAGES[head]) return tableItems(monaco, GO_PACKAGES[head], range, language);
    if (language === "python" && PY_MODULES[head] && !scan.syms.some((s) => s.name === head)) return tableItems(monaco, PY_MODULES[head], range, language);
    const cls = scan.syms.find((s) => s.kind === "class" && s.name === head);
    if (cls) return userMembers(monaco, scan, head, range);
  }

  const t = r.type;
  if (!t) return null;
  if (t.startsWith("module:")) {
    const mod = PY_MODULES[t.slice(7)];
    return mod ? tableItems(monaco, mod, range, language) : null;
  }
  if (t.startsWith("class:") || t.startsWith("struct:")) {
    const owner = t.slice(t.indexOf(":") + 1);
    const items = userMembers(monaco, scan, owner, range);
    if (language === "csharp") items.push(...tableItems(monaco, CS_INSTANCE.object, range, language));
    return items;
  }
  switch (language) {
    case "python": {
      const table = PY_MEMBERS[t];
      return table ? tableItems(monaco, table, range, language) : null;
    }
    case "csharp": {
      const table = CS_INSTANCE[t];
      return table ? [...tableItems(monaco, table, range, language), ...tableItems(monaco, CS_INSTANCE.object, range, language)] : null;
    }
    case "rust": {
      const key = t === "str" ? "String" : t;
      const table = RUST_MEMBERS[key];
      if (!table) return null;
      const instance = Object.fromEntries(Object.entries(table).filter(([, e]) => !/^[A-Z]\w*::/.test(e[0])));
      const items = tableItems(monaco, instance, range, language);
      if (key === "Vec" || key === "String") items.push(...tableItems(monaco, RUST_MEMBERS.iter, range, language).map((i) => ({ ...i, sortText: "2" + i.label })));
      return items;
    }
    case "cpp": {
      const table = CPP_MEMBERS[t];
      return table ? tableItems(monaco, table, range, language) : null;
    }
    default:
      return null;
  }
}

function pathCompletions(monaco: Monaco, scan: Scan, beforeSep: string, range: Item["range"]): Item[] | null {
  const m = /([A-Za-z_]\w*)\s*$/.exec(beforeSep);
  if (!m) return null;
  const head = m[1];
  if (scan.language === "cpp" && head === "std") return tableItems(monaco, CPP_STD, range, "cpp", /^std::/, monaco.languages.CompletionItemKind.Class);
  if (scan.language === "rust") {
    const table = RUST_MEMBERS[head];
    if (table && STRIP_STATIC[head] !== undefined) {
      const statics = Object.fromEntries(Object.entries(table).filter(([, e]) => new RegExp(`^${head}::`).test(e[0])));
      return tableItems(monaco, statics, range, "rust", new RegExp(`^${head}::`), monaco.languages.CompletionItemKind.Function);
    }
    if (head === "Self" || scan.syms.some((s) => s.kind === "class" && s.name === head)) return userMembers(monaco, scan, head === "Self" ? enclosingOwner(scan, 1) ?? head : head, range);
  }
  if (scan.language === "cpp" && scan.syms.some((s) => s.kind === "class" && s.name === head)) return userMembers(monaco, scan, head, range);
  return null;
}

function generalCompletions(monaco: Monaco, scan: Scan, line: number, range: Item["range"], typed: string): Item[] {
  const language = scan.language;
  const K = monaco.languages.CompletionItemKind;
  const out: Item[] = [];
  const seen = new Set<string>();
  const push = (i: Item) => {
    const key = i.label;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(i);
  };

  // names declared in the file, nearest declaration wins
  const owner = enclosingOwner(scan, line);
  const vis = visibleAt(scan, line)
    .filter((s) => s.line !== line || s.name !== typed) // not the half-typed word itself
    .reverse();
  for (const s of vis) {
    if ((s.kind === "method" || s.kind === "field") && language !== "python" && s.owner !== owner) continue;
    if ((s.kind === "method" || s.kind === "field") && language === "python" && !(s.kind === "field" && s.owner && !s.scope && owner === s.owner && s.line < line)) continue;
    if (s.kind === "column") continue;
    const rank = s.kind === "parameter" ? "0" : s.kind === "variable" || s.kind === "constant" ? "0" : s.kind === "field" ? "1" : "2";
    push({
      label: s.name,
      kind: kindOf(monaco, s),
      detail: s.sig ?? (s.kind === "parameter" ? `parameter${s.detail ? ": " + s.detail : ""}` : s.type && !s.type.includes(":") ? `${s.kind}: ${s.type}` : s.kind === "import" ? s.detail : s.kind),
      documentation: md(symDoc(language, s)),
      sortText: rank + s.name,
      range,
    });
  }

  if (language === "sql") return out.concat(sqlGeneral(monaco, scan, range));

  // built-in functions, modules and macros with docs
  for (const [name, entry] of Object.entries(globalDocs(language))) {
    const label = name;
    push({ label, kind: entry[0].startsWith("class ") || entry[0].startsWith("struct ") || entry[0].startsWith("static class") ? K.Class : entry[0].includes("(") || name.endsWith("!") ? K.Function : K.Class, detail: entry[0], documentation: md(docMarkdown(language, entry)), sortText: "3" + name, range });
  }
  if (language === "go") for (const pkg of Object.keys(GO_PACKAGES)) push({ label: pkg, kind: K.Module, detail: `package ${pkg}`, sortText: "3" + pkg, range });
  if (language === "rust") for (const t of ["String", "Vec", "Option", "Result", "HashMap", "Some", "None", "Ok", "Err", "Box"]) push({ label: t, kind: K.Class, sortText: "3" + t, range });
  if (language === "cpp") push({ label: "std", kind: K.Module, detail: "namespace std", sortText: "3std", range });

  for (const kw of KEYWORDS[language] ?? []) push({ label: kw, kind: K.Keyword, sortText: "4" + kw, range });
  for (const [label, body, doc] of SNIPPETS[language] ?? []) {
    out.push({ label, kind: K.Snippet, insertText: body, insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: doc, documentation: md(codeBlock(language, body.replace(/\$\{\d+:?([^}]*)\}/g, "$1").replace(/\$0/g, ""))), sortText: "5" + label, range });
  }
  return out;
}

function sqlGeneral(monaco: Monaco, scan: Scan, range: Item["range"]): Item[] {
  const K = monaco.languages.CompletionItemKind;
  const out: Item[] = [];
  for (const s of scan.syms) {
    if (s.kind === "table") out.push({ label: s.name, kind: K.Struct, detail: `table (${s.detail ?? ""})`, sortText: "1" + s.name, range });
  }
  const seenCols = new Set<string>();
  for (const s of scan.syms) {
    if (s.kind === "column" && !seenCols.has(s.name)) {
      seenCols.add(s.name);
      out.push({ label: s.name, kind: K.Field, detail: `${s.owner}.${s.name} ${s.detail ?? ""}`.trim(), sortText: "0" + s.name, range });
    }
  }
  for (const [name, entry] of Object.entries(SQL_FUNCTIONS)) out.push({ label: name, kind: K.Function, detail: entry[0], documentation: md(docMarkdown("sql", entry)), sortText: "3" + name, range });
  for (const kw of KEYWORDS.sql) out.push({ label: kw, kind: K.Keyword, sortText: "4" + kw, range });
  for (const [label, body, doc] of SNIPPETS.sql) out.push({ label, kind: K.Snippet, insertText: body, insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: doc, sortText: "5" + label, range });
  return out;
}

function sqlCompletions(monaco: Monaco, model: Model, scan: Scan, position: Position, range: Item["range"], beforeWord: string): Item[] | null {
  const K = monaco.languages.CompletionItemKind;
  const text = model.getValue();
  const offset = model.getOffsetAt(position);
  const tables = sqlStatementTables(text, offset);
  // alias. / table.  -> that table's columns
  const dot = /([A-Za-z_]\w*)\.\s*$/.exec(beforeWord);
  if (dot) {
    const t = tables.find((x) => x.alias?.toLowerCase() === dot[1].toLowerCase() || x.table.toLowerCase() === dot[1].toLowerCase());
    const table = t?.table ?? dot[1];
    const cols = scan.syms.filter((s) => s.kind === "column" && s.owner?.toLowerCase() === table.toLowerCase());
    return cols.map((c) => ({ label: c.name, kind: K.Field, detail: c.detail, sortText: "0" + c.name, range }));
  }
  const after = /\b(FROM|JOIN|INTO|UPDATE|TABLE)\s+(?:[A-Za-z_]\w*)?$/i.test(beforeWord.replace(/\s+$/, (s) => s));
  if (after) return scan.syms.filter((s) => s.kind === "table").map((s) => ({ label: s.name, kind: K.Struct, detail: `table (${s.detail ?? ""})`, sortText: "0" + s.name, range }));
  // columns of the tables in this statement first
  const names = new Set(tables.map((t) => t.table.toLowerCase()));
  const cols = scan.syms.filter((s) => s.kind === "column" && (names.size === 0 || names.has(s.owner!.toLowerCase())));
  const rest = sqlGeneral(monaco, scan, range).filter((i) => i.kind !== K.Field);
  const seen = new Set<string>();
  const first: Item[] = [];
  for (const c of cols) {
    if (seen.has(c.name)) continue;
    seen.add(c.name);
    first.push({ label: c.name, kind: K.Field, detail: `${c.owner}.${c.name} ${c.detail ?? ""}`.trim(), sortText: "0" + c.name, range });
  }
  return [...first, ...rest];
}

// ───────────────────────────── signature help ─────────────────────────────

interface Call {
  callee: string; // text before "("
  owner?: string; // Console in Console.WriteLine
  name: string;
  arg: number;
}

function enclosingCall(scan: Scan, line: number, col: number): Call | null {
  // join up to 6 previous lines so calls that span lines still resolve
  const from = Math.max(1, line - 6);
  let text = "";
  for (let l = from; l < line; l++) text += scan.masked[l - 1] + "\n";
  text += (scan.masked[line - 1] ?? "").slice(0, col - 1);
  const stack: { at: number; commas: number }[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "(") stack.push({ at: i, commas: 0 });
    else if (c === ")") stack.pop();
    else if (c === "," && stack.length) stack[stack.length - 1].commas++;
  }
  const top = stack[stack.length - 1];
  if (!top) return null;
  const before = text.slice(0, top.at).replace(/\s+$/, "");
  const m = /([A-Za-z_]\w*!?)(?:\s*(?:\.|::)\s*([A-Za-z_]\w*!?))?$/.exec(before);
  if (!m) return null;
  const name = m[2] ?? m[1];
  return { callee: m[0], owner: m[2] ? m[1] : undefined, name, arg: top.commas };
}

function splitParams(sig: string): string[] {
  const open = sig.indexOf("(");
  if (open < 0) return [];
  let depth = 0;
  let close = sig.length;
  for (let i = open; i < sig.length; i++) {
    if (sig[i] === "(") depth++;
    else if (sig[i] === ")") {
      depth--;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  const inner = sig.slice(open + 1, close);
  const parts: string[] = [];
  let d = 0;
  let cur = "";
  for (const c of inner) {
    if ("([{<".includes(c)) d++;
    if (")]}>".includes(c)) d--;
    if (c === "," && d === 0) {
      parts.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function lookupDoc(scan: Scan, line: number, owner: string | undefined, name: string): { sig: string; doc: string } | null {
  const language = scan.language;
  if (owner) {
    const q = qualifiedDoc(language, owner, name);
    if (q) return { sig: language === "go" ? `${owner}.${q[0]}` : language === "cpp" ? q[0] : `${owner}.${q[0]}`, doc: q[1] };
    const r = receiverBefore(scan, owner, line);
    if (r?.type) {
      const table = language === "python" ? PY_MEMBERS[r.type] : language === "csharp" ? CS_INSTANCE[r.type] : language === "rust" ? RUST_MEMBERS[r.type === "str" ? "String" : r.type] : language === "cpp" ? CPP_MEMBERS[r.type] : undefined;
      const e = table?.[name];
      if (e) return { sig: e[0], doc: e[1] };
      if (r.type.includes(":")) {
        const m = scan.syms.find((s) => s.owner === r.type!.slice(r.type!.indexOf(":") + 1) && s.name === name && s.sig);
        if (m) return { sig: m.sig!, doc: `Method declared on line ${m.line}.` };
      }
    }
    if (language === "rust" && RUST_MEMBERS[owner]?.[name]) return { sig: RUST_MEMBERS[owner][name][0], doc: RUST_MEMBERS[owner][name][1] };
    const cm = scan.syms.find((s) => s.owner === owner && s.name === name && s.sig);
    if (cm) return { sig: cm.sig!, doc: `Declared on line ${cm.line}.` };
    return null;
  }
  const user = [...visibleAt(scan, line)].reverse().find((s) => s.name === name && s.sig && (s.kind === "function" || s.kind === "method" || s.kind === "class"));
  if (user) return { sig: user.sig!.replace(/^class /, ""), doc: `Declared on line ${user.line}.` };
  const g = globalDocs(language)[name];
  if (g) return { sig: g[0], doc: g[1] };
  return null;
}

// ───────────────────────────── registration ─────────────────────────────

const done = new WeakSet<object>();

export function registerEditorTools(monaco: Monaco): void {
  if (done.has(monaco)) return;
  done.add(monaco);
  const K = monaco.languages;

  configureJavaScript(monaco);

  for (const language of OWN_LANGUAGES) {
    K.registerCompletionItemProvider(language, {
      triggerCharacters: language === "sql" ? [".", " "] : [".", ":"],
      provideCompletionItems(model: Model, position: Position) {
        try {
          const scan = getScan(model, language);
          if (inStringOrComment(scan, position.lineNumber, position.column)) return { suggestions: [] };
          const word = model.getWordUntilPosition(position);
          const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
          const lineText = model.getLineContent(position.lineNumber);
          const beforeWord = lineText.slice(0, word.startColumn - 1);
          if (language === "sql") {
            const items = sqlCompletions(monaco, model, scan, position, range, beforeWord);
            return { suggestions: items ?? [] };
          }
          if (/\.\s*$/.test(beforeWord)) {
            const items = memberCompletions(monaco, scan, beforeWord.replace(/\.\s*$/, ""), position.lineNumber, range);
            return { suggestions: items ?? [] };
          }
          if ((language === "rust" || language === "cpp") && /::\s*$/.test(beforeWord)) {
            const items = pathCompletions(monaco, scan, beforeWord.replace(/::\s*$/, ""), range);
            return { suggestions: items ?? [] };
          }
          if (/(?:^|[^\w])(?:\d)$/.test(beforeWord + word.word) && !word.word) return { suggestions: [] };
          return { suggestions: generalCompletions(monaco, scan, position.lineNumber, range, word.word) };
        } catch {
          return { suggestions: [] };
        }
      },
    });

    K.registerHoverProvider(language, {
      provideHover(model: Model, position: Position) {
        try {
          const word = model.getWordAtPosition(position);
          if (!word) return null;
          const scan = getScan(model, language);
          if (inStringOrComment(scan, position.lineNumber, word.endColumn)) return null;
          const lineText = model.getLineContent(position.lineNumber);
          const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
          let name = word.word;
          if (language === "rust" && lineText[word.endColumn - 1] === "!") name += "!";
          const before = lineText.slice(0, word.startColumn - 1);
          const q = /([A-Za-z_]\w*)\s*(?:\.|::)\s*$/.exec(before);
          const found = lookupDoc(scan, position.lineNumber, q?.[1], name);
          if (found) return { range, contents: [{ value: docMarkdown(language, [found.sig, found.doc]) }] };
          if (!q) {
            const sym = [...visibleAt(scan, position.lineNumber)].reverse().find((s) => s.name === name && s.kind !== "column");
            if (sym) return { range, contents: [{ value: symDoc(language, sym) }] };
            const kw = KEYWORDS[language]?.includes(name);
            if (kw) return { range, contents: [{ value: `\`${name}\` is a ${language === "sql" ? "SQL" : language} keyword.` }] };
          }
          if (language === "sql") {
            const e = SQL_FUNCTIONS[name.toUpperCase()] ?? globalDocs("sql")[name.toUpperCase()];
            if (e) return { range, contents: [{ value: docMarkdown("sql", e) }] };
          }
          return null;
        } catch {
          return null;
        }
      },
    });

    if (language !== "sql") {
      K.registerSignatureHelpProvider(language, {
        signatureHelpTriggerCharacters: ["(", ","],
        signatureHelpRetriggerCharacters: [")"],
        provideSignatureHelp(model: Model, position: Position) {
          try {
            const scan = getScan(model, language);
            const call = enclosingCall(scan, position.lineNumber, position.column);
            if (!call) return null;
            const found = lookupDoc(scan, position.lineNumber, call.owner, call.name);
            if (!found) return null;
            const all = splitParams(found.sig);
            const hasSelf = all[0] === "self" || all[0] === "cls";
            const shown = hasSelf ? all.slice(1) : all;
            return {
              value: {
                signatures: [{ label: hasSelf ? found.sig.replace(/\(\s*(self|cls)\s*,?\s*/, "(") : found.sig, documentation: found.doc, parameters: shown.map((p) => ({ label: p })) }],
                activeSignature: 0,
                activeParameter: Math.min(call.arg, Math.max(0, shown.length - 1)),
              },
              dispose() {},
            };
          } catch {
            return null;
          }
        },
      });

      K.registerDefinitionProvider(language, {
        provideDefinition(model: Model, position: Position) {
          const word = model.getWordAtPosition(position);
          if (!word) return null;
          const scan = getScan(model, language);
          const line = position.lineNumber;
          const cands = scan.syms.filter((s) => s.name === word.word && s.kind !== "column");
          const vis = visibleAt(scan, line);
          const target = vis.find((s) => cands.includes(s) && s.kind !== "field" && s.kind !== "method") ?? cands[0];
          if (!target || (target.line === line && target.col <= word.startColumn && target.col + target.name.length >= word.endColumn)) return null;
          return { uri: model.uri, range: { startLineNumber: target.line, endLineNumber: target.line, startColumn: target.col, endColumn: target.col + target.name.length } };
        },
      });
    }

    K.registerRenameProvider(language, {
      resolveRenameLocation(model: Model, position: Position) {
        const word = model.getWordAtPosition(position);
        if (!word) return { range: { startLineNumber: 1, endLineNumber: 1, startColumn: 1, endColumn: 1 }, text: "", rejectReason: "Place the cursor on a name to rename it." };
        if (KEYWORDS[language]?.includes(word.word) || globalDocs(language)[word.word]) return { range: { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn }, text: word.word, rejectReason: `${word.word} is built in, so it cannot be renamed.` };
        return { range: { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn }, text: word.word };
      },
      provideRenameEdits(model: Model, position: Position, newName: string) {
        const word = model.getWordAtPosition(position);
        if (!word) return { edits: [] };
        if (!/^[A-Za-z_]\w*$/.test(newName)) return { edits: [], rejectReason: "Names use letters, digits and underscores, and cannot start with a digit." };
        const scan = getScan(model, language);
        const re = new RegExp(`(?<![\\w$])${word.word.replace(/[$]/g, "\\$")}(?![\\w$])`, "g");
        const edits: { resource: unknown; versionId: undefined; textEdit: { range: object; text: string } }[] = [];
        scan.lines.forEach((orig, i) => {
          const masked = scan.masked[i];
          for (const m of orig.matchAll(re)) {
            const at = m.index!;
            const code = masked[at] !== " " || orig.slice(0, at).trimEnd().endsWith("{"); // code, or a name inside an f-string / template hole
            if (!code) continue;
            edits.push({ resource: model.uri, versionId: undefined, textEdit: { range: { startLineNumber: i + 1, endLineNumber: i + 1, startColumn: at + 1, endColumn: at + 1 + word.word.length }, text: newName } });
          }
        });
        return { edits };
      },
    });
  }

  // JavaScript: Monaco's TypeScript service already completes names, members and signatures; add snippets on top
  K.registerCompletionItemProvider("javascript", {
    provideCompletionItems(model: Model, position: Position) {
      const word = model.getWordUntilPosition(position);
      const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
      const beforeWord = model.getLineContent(position.lineNumber).slice(0, word.startColumn - 1);
      if (/[.'"`]\s*$/.test(beforeWord)) return { suggestions: [] };
      return {
        suggestions: SNIPPETS.javascript.map(([label, body, doc]) => ({
          label,
          kind: K.CompletionItemKind.Snippet,
          insertText: body,
          insertTextRules: K.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: doc,
          sortText: "9" + label,
          range,
        })),
      };
    },
  });
}

// ───────────────────────────── JavaScript / TypeScript service ─────────────────────────────

interface TsDefaults {
  setCompilerOptions(o: Record<string, unknown>): void;
  setDiagnosticsOptions(o: Record<string, unknown>): void;
  setEagerModelSync?(v: boolean): void;
  addExtraLib?(content: string, path?: string): void;
}
interface TsApi {
  javascriptDefaults: TsDefaults;
  typescriptDefaults: TsDefaults;
  ScriptTarget: Record<string, number>;
  ModuleResolutionKind?: Record<string, number>;
  JsxEmit?: Record<string, number>;
}

/** Sensible JS service settings: modern lib + DOM, no type-checking squiggles for code that uses lesson globals. */
function configureJavaScript(monaco: Monaco) {
  const loose = monaco as unknown as { typescript?: TsApi; languages: { typescript?: TsApi } };
  const ts = loose.typescript ?? loose.languages.typescript;
  if (!ts?.javascriptDefaults) return;
  try {
    for (const d of [ts.javascriptDefaults, ts.typescriptDefaults]) {
      d.setCompilerOptions({
        target: ts.ScriptTarget.ES2022,
        allowNonTsExtensions: true,
        allowJs: true,
        checkJs: false,
        noEmit: true,
        lib: ["es2022", "dom", "dom.iterable"],
        moduleResolution: ts.ModuleResolutionKind?.NodeJs ?? 2,
      });
      // syntax errors still show; "cannot find name" for globals the lesson runtime provides does not
      d.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false, noSuggestionDiagnostics: true });
      d.setEagerModelSync?.(true);
    }
  } catch {
    /* older/newer Monaco without this API: keep defaults */
  }
}
