"use client";

import React from "react";
import { File, FileCode, Folder, FolderOpen, House, MapPin } from "lucide-react";
import { childrenOf, type Fs } from "./shell";

export interface TreeRow {
  path: string;
  name: string;
  kind: "file" | "dir";
  depth: number;
  exec: boolean;
  /** For drawing the guide lines: is this the last child at each ancestor level? */
  lasts: boolean[];
}

const sortNames = (fs: Fs, dir: string) =>
  childrenOf(fs, dir).sort((a, b) => {
    const da = fs[dir === "/" ? "/" + a : `${dir}/${a}`].kind === "dir" ? 0 : 1;
    const db = fs[dir === "/" ? "/" + b : `${dir}/${b}`].kind === "dir" ? 0 : 1;
    return da - db || a.toLowerCase().localeCompare(b.toLowerCase());
  });

/** Flatten part of the file system into display rows, depth-first, folders before files. */
export function treeRows(fs: Fs, root: string, opts: { hidden?: boolean; maxDepth?: number; skip?: string[] } = {}): TreeRow[] {
  const rows: TreeRow[] = [];
  const e = fs[root];
  if (!e) return rows;
  rows.push({ path: root, name: root, kind: "dir", depth: 0, exec: false, lasts: [] });
  const walk = (dir: string, depth: number, lasts: boolean[]) => {
    if (opts.maxDepth !== undefined && depth > opts.maxDepth) return;
    const names = sortNames(fs, dir).filter((n) => (opts.hidden || !n.startsWith(".")) && !opts.skip?.includes(dir === "/" ? "/" + n : `${dir}/${n}`));
    names.forEach((n, i) => {
      const p = dir === "/" ? "/" + n : `${dir}/${n}`;
      const c = fs[p];
      const last = i === names.length - 1;
      rows.push({ path: p, name: n, kind: c.kind, depth, exec: c.kind === "file" && (c.mode & 0o100) !== 0, lasts: [...lasts, last] });
      if (c.kind === "dir") walk(p, depth + 1, [...lasts, last]);
    });
  };
  walk(root, 1, []);
  return rows;
}

export type RowMark = "trail" | "target" | "missing" | "changed";

/**
 * A compact, read-only folder tree with guide lines. `marks` colours rows (the lime trail of a
 * path being typed, the target, a fresh change); `cwd` and `home` get small badges.
 */
export function TreeView({
  rows,
  rootLabel,
  cwd,
  home,
  marks = {},
  steps = {},
  onPick,
  picked,
  dense,
}: {
  rows: TreeRow[];
  rootLabel?: string;
  cwd?: string;
  home?: string;
  marks?: Record<string, RowMark>;
  /** Small step numbers drawn on rows (the order a path visits them). */
  steps?: Record<string, number[]>;
  onPick?: (path: string) => void;
  picked?: string | null;
  dense?: boolean;
}) {
  return (
    <ul className={`font-mono ${dense ? "text-[12px]" : "text-[13px]"}`} role="tree">
      {rows.map((r) => {
        const mark = marks[r.path];
        const here = cwd === r.path;
        const isHome = home === r.path;
        const Icon = r.kind === "dir" ? (mark === "trail" || mark === "target" || here ? FolderOpen : Folder) : r.exec || /\.(sh|py|js|c)$/.test(r.name) ? FileCode : File;
        const tone =
          mark === "target"
            ? "bg-primary text-primary-ink"
            : mark === "trail"
              ? "bg-tint text-ink ring-1 ring-[var(--brand)]/45"
              : mark === "changed"
                ? "bg-tint text-ink"
                : picked === r.path
                  ? "bg-surface-2 text-ink ring-1 ring-[var(--line-strong)]"
                  : "text-ink-2";
        const label = r.depth === 0 ? rootLabel ?? r.name : r.name + (r.kind === "dir" ? "/" : "");
        const content = (
          <>
            <Icon className={`h-3.5 w-3.5 shrink-0 ${mark === "target" ? "" : r.kind === "dir" ? "text-brand" : "text-ink-3"}`} aria-hidden />
            <span className="truncate">{label}</span>
            {steps[r.path]?.map((n) => (
              <span key={n} className={`grid h-4 min-w-4 shrink-0 place-items-center rounded-full px-1 text-[9.5px] font-semibold ${mark === "target" ? "bg-primary-ink/15" : "bg-primary text-primary-ink"}`}>
                {n}
              </span>
            ))}
            {isHome && r.depth > 0 && (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 pl-2 font-sans text-[10.5px] text-ink-3" title="Home directory (~)">
                <House className="h-3 w-3" aria-hidden />
                home <span className="font-mono">~</span>
              </span>
            )}
            {here && (
              <span className={`${isHome && r.depth > 0 ? "" : "ml-auto"} inline-flex shrink-0 items-center gap-0.5 pl-1.5 text-[10px] font-sans font-medium ${mark === "target" ? "" : "text-brand"}`}>
                <MapPin className="h-3 w-3" aria-hidden />
                you are here
              </span>
            )}
          </>
        );
        return (
          <li key={r.path} role="treeitem" aria-selected={mark === "target" || picked === r.path} className="flex items-stretch">
            {r.lasts.map((last, i) => (
              <span key={i} aria-hidden className="relative w-4 shrink-0">
                {i < r.lasts.length - 1 ? (
                  !last && <span className="absolute inset-y-0 left-[7px] border-l border-line" />
                ) : (
                  <>
                    <span className={`absolute left-[7px] top-0 border-l border-line ${last ? "h-1/2" : "h-full"}`} />
                    <span className="absolute left-[7px] top-1/2 w-2 border-t border-line" />
                  </>
                )}
              </span>
            ))}
            {onPick ? (
              <button
                type="button"
                onClick={() => onPick(r.path)}
                className={`my-px flex min-h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 text-left transition-colors hover:bg-surface-2 ${tone}`}
              >
                {content}
              </button>
            ) : (
              <span className={`my-px flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 transition-colors ${dense ? "min-h-6" : "min-h-7"} ${tone}`}>{content}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
