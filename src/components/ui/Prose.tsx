import React from "react";

/**
 * Tiny markdown subset for lesson text: ### headings, paragraphs, - lists,
 * **bold**, *italic*, `inline code`, and ~~~python / ```python fenced blocks.
 * Returns React elements (never raw HTML), so authored content can't inject markup.
 */

function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const tok = m[0];
    const key = `${keyBase}-${i++}`;
    if (tok.startsWith("`")) out.push(<code key={key}>{tok.slice(1, -1)}</code>);
    // bold and italic may contain `code` (and each other), so render their insides inline too
    else if (tok.startsWith("**")) out.push(<strong key={key}>{inline(tok.slice(2, -2), key)}</strong>);
    else out.push(<em key={key}>{inline(tok.slice(1, -1), key)}</em>);
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type CodeLanguage = "python" | "javascript" | "sql" | "csharp" | "cpp" | "go" | "rust" | "asm" | "shell";

const words = (list: string) => new Set(list.split(" "));
const SYNTAX: Record<CodeLanguage, { keywords: Set<string>; comment: RegExp; caseInsensitive?: boolean }> = {
  python: {
    keywords: words("def return if elif else for while in not and or is class import from as try except finally with lambda pass break continue None True False yield raise self"),
    comment: /#.*$/,
  },
  javascript: {
    keywords: words("const let var function return if else for while do of in new class extends this super import export from default try catch finally throw typeof instanceof null undefined true false break continue switch case async await yield static get set"),
    comment: /\/\/.*$/,
  },
  sql: {
    keywords: words("select from where and or not in is null as on join left right inner outer full cross group by having order asc desc limit offset insert into values update set delete create table view index drop alter distinct case when then else end between like count sum avg min max round coalesce union all exists primary key integer text real"),
    comment: /--.*$/,
    caseInsensitive: true,
  },
  csharp: {
    keywords: words("using namespace class static void public private protected int double float string bool var new return if else for foreach in while do true false null this base switch case break continue try catch finally throw"),
    comment: /\/\/.*$/,
  },
  cpp: {
    keywords: words("include using namespace std int double float char bool void auto const return if else for while do true false nullptr class struct public private new delete switch case break continue NULL sizeof unsigned signed long short static typedef enum union extern"),
    comment: /\/\/.*$/,
  },
  go: {
    keywords: words("package import func var const type struct return if else for range true false nil map chan go defer switch case break continue"),
    comment: /\/\/.*$/,
  },
  rust: {
    keywords: words("fn let mut const static struct enum impl trait pub use mod crate self Self super match if else loop while for in return break continue as ref move where dyn Box Vec String Option Some None Result Ok Err true false unsafe async await type"),
    comment: /\/\/.*$/,
  },
  // the toy CPU in Foundations, plus common real mnemonics
  asm: {
    keywords: words("mov load store add sub mul div cmp jmp jz jnz jlt jgt je jne out push pop call ret hlt nop lea inc dec and or xor not"),
    comment: /;.*$/,
    caseInsensitive: true,
  },
  shell: {
    keywords: words("ls cd pwd mkdir touch cat echo cp mv rm grep wc sort uniq head tail chmod chown ps kill jobs sleep which export sudo man less find"),
    comment: /#.*$/,
  },
};

/** Maps a fence tag (```js, ~~~sql, …) to a highlighter. */
function fenceLanguage(tag: string, fallback: CodeLanguage): CodeLanguage | "text" {
  const t = tag.trim().toLowerCase();
  if (["text", "txt", "output", "console", "plain", "http"].includes(t)) return "text";
  if (["asm", "assembly", "nasm", "s"].includes(t)) return "asm";
  if (["sh", "bash", "shell", "zsh"].includes(t)) return "shell";
  if (["js", "javascript", "ts", "typescript"].includes(t)) return "javascript";
  if (["py", "python"].includes(t)) return "python";
  if (t === "sql") return "sql";
  if (["cs", "csharp", "c#", "java", "kotlin"].includes(t)) return "csharp";
  if (["c", "h", "cpp", "c++", "cc"].includes(t)) return "cpp";
  if (t === "go") return "go";
  if (["rs", "rust"].includes(t)) return "rust";
  return fallback;
}

export function CodeBlock({ code, language = "python" }: { code: string; language?: CodeLanguage }) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <code>
      {lines.map((line, li) => (
        <React.Fragment key={li}>
          {highlightLine(line, language)}
          {li < lines.length - 1 ? "\n" : null}
        </React.Fragment>
      ))}
    </code>
  );
}

/** Inline mini-markdown (`code`, **bold**, *italic*) for short strings like answer options. */
export function InlineProse({ text }: { text: string }) {
  return <>{inline(text, "i")}</>;
}

/** Kept for existing call sites. */
export function PythonCode({ code }: { code: string }) {
  return <CodeBlock code={code} language="python" />;
}

/** Code-block palette (the blocks are always dark). Mirrors the dark Monaco theme in CodeEditor.tsx. */
const COLOR = {
  string: "#fcd34d",
  number: "#ffb86b",
  keyword: "#c5ee8a",
  call: "#7fd4ff",
  comment: "#8a8a8a",
  /** braces and fixed placeholders inside a string: ACCENT 500 */
  brace: "#abd373",
  /** format spec after ":" / "!r" */
  spec: "#9db1a3",
  /** plain code, same as the block's own text colour */
  plain: "#e5e5e5",
} as const;

const TOKEN_RE = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][A-Za-z_0-9$]*)/g;
// Python's and C#'s triple-quoted strings (on one line) come first so """ isn't read as "" + ".
const TRIPLE_TOKEN_RE = /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][A-Za-z_0-9$]*)/g;

function highlightLine(line: string, language: CodeLanguage): React.ReactNode[] {
  const syntax = SYNTAX[language] ?? SYNTAX.python;
  // strip the comment first so words inside it aren't highlighted
  const cm = syntax.comment.exec(line);
  const commentAt = cm && !insideString(line, cm.index) ? cm.index : -1;
  const body = commentAt >= 0 ? line.slice(0, commentAt) : line;
  const out = highlightCode(body, language);
  if (commentAt >= 0) out.push(<span key="c" style={{ color: COLOR.comment }}>{line.slice(commentAt)}</span>);
  return out;
}

/** Highlights code that contains no comment: strings, numbers, keywords, calls. Also used for the expressions inside `{}` holes. */
function highlightCode(body: string, language: CodeLanguage): React.ReactNode[] {
  const syntax = SYNTAX[language] ?? SYNTAX.python;
  const out: React.ReactNode[] = [];
  const re = language === "python" || language === "csharp" ? TRIPLE_TOKEN_RE : TOKEN_RE;
  let last = 0;
  let n = 0;
  for (const m of body.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(body.slice(last, idx));
    const [tok, str, num, word] = m;
    const key = n++;
    const kw = word && syntax.keywords.has(syntax.caseInsensitive ? word.toLowerCase() : word);
    if (str) {
      const kind = interpolationKind(language, tok, body.slice(0, idx));
      out.push(kind ? <span key={key} style={{ color: COLOR.string }}>{interpolatedString(tok, kind, language)}</span> : <span key={key} style={{ color: COLOR.string }}>{tok}</span>);
    } else if (num) out.push(<span key={key} style={{ color: COLOR.number }}>{tok}</span>);
    else if (kw) out.push(<span key={key} style={{ color: COLOR.keyword }}>{tok}</span>);
    else if (word && /^\s*\(/.test(body.slice(idx + tok.length))) out.push(<span key={key} style={{ color: COLOR.call }}>{tok}</span>);
    else out.push(tok);
    last = idx + tok.length;
  }
  if (last < body.length) out.push(body.slice(last));
  return out;
}

// ───────────── string interpolation ─────────────

type InterpolationKind =
  | "expr-braces" // Python f-string, C# $"..." : {expr[:spec]} holes, {{ }} escapes
  | "template" // JavaScript `...${expr}...`
  | "rust" // {} {0} {:?} fixed placeholders and {name} / {name:.2} inline arguments
  | "cpp" // std::format {} {0:.2f} plus printf %d
  | "go"; // fmt verbs %d %s %v %.2f

/** Which interpolation rules apply to this string literal, or null for a plain string. */
function interpolationKind(language: CodeLanguage, tok: string, before: string): InterpolationKind | null {
  const q = tok[0];
  switch (language) {
    case "python":
      return /(?:^|[^\w])(?:[rR][fF]|[fF][rR]|[fF])$/.test(before) && q !== "`" ? "expr-braces" : null;
    case "csharp":
      return /(?:\$@?|@\$)$/.test(before) && q === '"' ? "expr-braces" : null;
    case "javascript":
      return q === "`" ? "template" : null;
    case "rust":
      return q === '"' ? "rust" : null;
    case "cpp":
      return q === '"' ? "cpp" : null;
    case "go":
      return q === '"' || q === "`" ? "go" : null;
    default:
      return null;
  }
}

/** Index just past the quoted literal that starts at s[i], or -1 if it never closes. */
function skipQuoted(s: string, i: number): number {
  const q = s[i];
  for (let j = i + 1; j < s.length; j++) {
    if (s[j] === "\\") j++;
    else if (s[j] === q) return j + 1;
  }
  return -1;
}

/** Index of the "}" closing a hole whose contents start at `from`, skipping nested brackets and strings. -1 if unclosed. */
function holeEnd(s: string, from: number): number {
  let depth = 0;
  for (let i = from; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'" || c === "`") {
      const end = skipQuoted(s, i);
      if (end < 0) return -1;
      i = end - 1;
    } else if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "}") {
      if (depth === 0) return i;
      depth--;
    }
  }
  return -1;
}

/** Splits `expr:spec` (and Python's `expr!r`) at the first top-level ":"; `spec` includes the colon. */
function splitSpec(hole: string, python: boolean): { expr: string; conversion: string; spec: string } {
  let depth = 0;
  let colon = -1;
  for (let i = 0; i < hole.length && colon < 0; i++) {
    const c = hole[i];
    if (c === '"' || c === "'" || c === "`") {
      const end = skipQuoted(hole, i);
      if (end < 0) break;
      i = end - 1;
    } else if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (c === ":" && depth === 0 && hole[i + 1] !== ":" && hole[i - 1] !== ":") colon = i;
  }
  let expr = colon >= 0 ? hole.slice(0, colon) : hole;
  const spec = colon >= 0 ? hole.slice(colon) : "";
  let conversion = "";
  if (python) {
    const conv = /!([rsa])\s*$/.exec(expr);
    if (conv) {
      conversion = expr.slice(conv.index);
      expr = expr.slice(0, conv.index);
    }
  }
  return { expr, conversion, spec };
}

/** Renders a string literal's contents with its interpolated parts picked out. Plain text inherits the string colour. */
function interpolatedString(tok: string, kind: InterpolationKind, language: CodeLanguage): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let text = "";
  let k = 0;
  const flush = () => {
    if (text) parts.push(text);
    text = "";
  };
  const span = (content: React.ReactNode, color: string) => {
    flush();
    parts.push(
      <span key={k++} style={{ color }}>
        {content}
      </span>,
    );
  };

  const triple = /^("""|''')/.test(tok) ? 3 : 1;
  const open = tok.slice(0, triple);
  const close = tok.slice(tok.length - triple);
  const s = tok.slice(triple, tok.length - triple);
  text = open;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && !(kind === "go" && tok[0] === "`")) {
      text += s.slice(i, i + 2);
      i++;
      continue;
    }

    if (kind === "template") {
      if (c === "$" && s[i + 1] === "{") {
        const end = holeEnd(s, i + 2);
        if (end > 0) {
          span("${", COLOR.brace);
          span(highlightCode(s.slice(i + 2, end), language), COLOR.plain);
          span("}", COLOR.brace);
          i = end;
          continue;
        }
      }
    } else if (kind === "expr-braces") {
      if ((c === "{" && s[i + 1] === "{") || (c === "}" && s[i + 1] === "}")) {
        text += c + c;
        i++;
        continue;
      }
      if (c === "{") {
        const end = holeEnd(s, i + 1);
        if (end > 0) {
          const { expr, conversion, spec } = splitSpec(s.slice(i + 1, end), language === "python");
          span("{", COLOR.brace);
          span(highlightCode(expr, language), COLOR.plain);
          if (conversion) span(conversion, COLOR.spec);
          if (spec) span(spec, COLOR.spec);
          span("}", COLOR.brace);
          i = end;
          continue;
        }
      }
    } else if (kind === "rust" || kind === "cpp") {
      if ((c === "{" && s[i + 1] === "{") || (c === "}" && s[i + 1] === "}") || (c === "%" && s[i + 1] === "%" && kind === "cpp")) {
        text += c + s[i + 1];
        i++;
        continue;
      }
      if (c === "{") {
        const end = s.indexOf("}", i + 1);
        const hole = end > 0 ? s.slice(i + 1, end) : "";
        if (end > 0 && !/[{"'\\]/.test(hole)) {
          const named = /^([A-Za-z_]\w*)(:[^{}]*)?$/.exec(hole);
          if (kind === "rust" && named) {
            // an inline argument: {name} / {name:.2}; the name is an expression
            span("{", COLOR.brace);
            span(named[1], COLOR.plain);
            if (named[2]) span(named[2], COLOR.spec);
            span("}", COLOR.brace);
            i = end;
            continue;
          }
          if (/^(\d+|[A-Za-z_]\w*)?(:[^{}]*)?$/.test(hole)) {
            span(`{${hole}}`, COLOR.brace);
            i = end;
            continue;
          }
        }
      }
      if (c === "%" && kind === "cpp") {
        const verb = /^%[-+ #0]*(?:\d+|\*)?(?:\.(?:\d+|\*))?(?:hh|h|ll|l|j|z|t|L)?[diouxXeEfFgGaAcspn]/.exec(s.slice(i));
        if (verb) {
          span(verb[0], COLOR.brace);
          i += verb[0].length - 1;
          continue;
        }
      }
    } else if (kind === "go" && c === "%") {
      if (s[i + 1] === "%") {
        text += "%%";
        i++;
        continue;
      }
      const verb = /^%(?:\[\d+\])?[-+# 0]*(?:\*|\d+)?(?:\.(?:\*|\d+)?)?[vTtbcdoOqxXUeEfFgGsp]/.exec(s.slice(i));
      if (verb) {
        span(verb[0], COLOR.brace);
        i += verb[0].length - 1;
        continue;
      }
    }
    text += c;
  }
  text += close;
  flush();
  return parts;
}

/** True if position `at` sits inside a string literal on this line. */
function insideString(line: string, at: number): boolean {
  let quote: string | null = null;
  for (let i = 0; i < at; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'" || ch === "`") quote = ch;
  }
  return quote !== null;
}

export function Prose({ source, className = "", language = "python" }: { source: string; className?: string; language?: CodeLanguage }) {
  const blocks: React.ReactNode[] = [];
  const lines = source.trim().split("\n");
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^(~~~|```)/.test(line)) {
      const fence = line.slice(0, 3);
      const lang = fenceLanguage(line.slice(3), language);
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith(fence)) body.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={key++}>
          {lang === "text" ? <code>{body.join("\n")}</code> : <CodeBlock code={body.join("\n")} language={lang} />}
        </pre>,
      );
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(<h3 key={key++}>{inline(line.slice(4), `h${key}`)}</h3>);
      i++;
      continue;
    }

    if (/^\s*[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*] /, ""));
      blocks.push(
        <ul key={key++}>
          {items.map((t, j) => (
            <li key={j}>{inline(t, `li${key}-${j}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\s*\d+[.)] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)] /.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)] /, ""));
      blocks.push(
        <ol key={key++}>
          {items.map((t, j) => (
            <li key={j}>{inline(t, `oli${key}-${j}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(~~~|```|### )/.test(lines[i]) &&
      !/^\s*[-*] /.test(lines[i]) &&
      !/^\s*\d+[.)] /.test(lines[i])
    ) {
      para.push(lines[i++]);
    }
    blocks.push(<p key={key++}>{inline(para.join(" "), `p${key}`)}</p>);
  }

  return <div className={`prose-lesson ${className}`}>{blocks}</div>;
}
