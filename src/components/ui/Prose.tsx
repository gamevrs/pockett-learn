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
    else if (tok.startsWith("**")) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    else out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type CodeLanguage = "python" | "javascript" | "sql" | "csharp" | "cpp" | "go";

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
    keywords: words("include using namespace std int double float char bool void auto const return if else for while do true false nullptr class struct public private new delete switch case break continue"),
    comment: /\/\/.*$/,
  },
  go: {
    keywords: words("package import func var const type struct return if else for range true false nil map chan go defer switch case break continue"),
    comment: /\/\/.*$/,
  },
};

/** Maps a fence tag (```js, ~~~sql, …) to a highlighter. */
function fenceLanguage(tag: string, fallback: CodeLanguage): CodeLanguage | "text" {
  const t = tag.trim().toLowerCase();
  if (["text", "txt", "output", "console", "plain"].includes(t)) return "text";
  if (["js", "javascript", "ts", "typescript"].includes(t)) return "javascript";
  if (["py", "python"].includes(t)) return "python";
  if (t === "sql") return "sql";
  if (["cs", "csharp", "c#", "java", "kotlin"].includes(t)) return "csharp";
  if (["cpp", "c++", "cc"].includes(t)) return "cpp";
  if (t === "go") return "go";
  return fallback;
}

export function CodeBlock({ code, language = "python" }: { code: string; language?: CodeLanguage }) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <code>
      {lines.map((line, li) => (
        <React.Fragment key={li}>
          {highlightLine(line, SYNTAX[language] ?? SYNTAX.python)}
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

function highlightLine(line: string, syntax: (typeof SYNTAX)[CodeLanguage]): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // strip the comment first so words inside it aren't highlighted
  const cm = syntax.comment.exec(line);
  const commentAt = cm && !insideString(line, cm.index) ? cm.index : -1;
  const body = commentAt >= 0 ? line.slice(0, commentAt) : line;
  const re = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][A-Za-z_0-9$]*)/g;
  let last = 0;
  let n = 0;
  for (const m of body.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(body.slice(last, idx));
    const [tok, str, num, word] = m;
    const key = n++;
    const kw = word && syntax.keywords.has(syntax.caseInsensitive ? word.toLowerCase() : word);
    if (str) out.push(<span key={key} style={{ color: "#fcd34d" }}>{tok}</span>);
    else if (num) out.push(<span key={key} style={{ color: "#ffb86b" }}>{tok}</span>);
    else if (kw) out.push(<span key={key} style={{ color: "#a3e635" }}>{tok}</span>);
    else if (word && /^\s*\(/.test(body.slice(idx + tok.length))) out.push(<span key={key} style={{ color: "#7fd4ff" }}>{tok}</span>);
    else out.push(tok);
    last = idx + tok.length;
  }
  if (last < body.length) out.push(body.slice(last));
  if (commentAt >= 0) out.push(<span key="c" style={{ color: "#8a8a8a" }}>{line.slice(commentAt)}</span>);
  return out;
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

    if (line.trim() === "") {
      i++;
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(~~~|```|### )/.test(lines[i]) &&
      !/^\s*[-*] /.test(lines[i])
    ) {
      para.push(lines[i++]);
    }
    blocks.push(<p key={key++}>{inline(para.join(" "), `p${key}`)}</p>);
  }

  return <div className={`prose-lesson ${className}`}>{blocks}</div>;
}
