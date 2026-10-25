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

const KEYWORDS = new Set(
  "def return if elif else for while in not and or is class import from as try except finally with lambda pass break continue None True False yield raise".split(" "),
);

export function PythonCode({ code }: { code: string }) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <code>
      {lines.map((line, li) => (
        <React.Fragment key={li}>
          {highlightLine(line)}
          {li < lines.length - 1 ? "\n" : null}
        </React.Fragment>
      ))}
    </code>
  );
}

function highlightLine(line: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z_0-9]*)/g;
  let last = 0;
  let n = 0;
  for (const m of line.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(line.slice(last, idx));
    const [tok, comment, str, num, word] = m;
    const key = n++;
    if (comment) out.push(<span key={key} style={{ color: "#7a8099" }}>{tok}</span>);
    else if (str) out.push(<span key={key} style={{ color: "#fcd34d" }}>{tok}</span>);
    else if (num) out.push(<span key={key} style={{ color: "#ffb86b" }}>{tok}</span>);
    else if (word && KEYWORDS.has(word)) out.push(<span key={key} style={{ color: "#a3e635" }}>{tok}</span>);
    else if (word && /^\s*\(/.test(line.slice(idx + tok.length))) out.push(<span key={key} style={{ color: "#7fd4ff" }}>{tok}</span>);
    else out.push(tok);
    last = idx + tok.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export function Prose({ source, className = "" }: { source: string; className?: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = source.trim().split("\n");
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^(~~~|```)/.test(line)) {
      const fence = line.slice(0, 3);
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith(fence)) body.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={key++}>
          <PythonCode code={body.join("\n")} />
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
