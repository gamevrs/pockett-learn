/**
 * A small, faithful, in-memory Unix shell for the terminal widget. Pure TypeScript, no React.
 *
 * The file system is a flat map from absolute path to entry. A shell state is plain data, so the
 * widget can clone it, report it to goal checks, and reset it. `run()` executes one command line
 * (lists with ; && ||, pipelines, redirections, background jobs, globbing, $VARS, scripts) and
 * returns what to print. Error messages follow bash and GNU coreutils.
 */

// ───────────────────────────── Data ─────────────────────────────

export interface Entry {
  kind: "file" | "dir";
  content: string;
  /** Permission bits, e.g. 0o755. */
  mode: number;
  owner: string;
  group: string;
  /** Last modification, ms since epoch. */
  mtime: number;
  /** Pretend size for binaries in /usr/bin. */
  size?: number;
  /** Built-in program this file stands for (files in /usr/bin). */
  bin?: string;
}
export type Fs = Record<string, Entry>;

export interface Proc {
  pid: number;
  /** Short name for ps, e.g. "sleep". */
  cmd: string;
  /** Full command line for `ps aux` and job listings. */
  args: string;
  user: string;
  tty: string;
  started: number;
  /** When a sleeping process finishes on its own (ms). Undefined: runs until killed. */
  endsAt?: number;
  /** Job number when started from this shell with & (or stopped with Ctrl+Z). */
  job?: number;
  stopped?: boolean;
  /** Time left when stopped. */
  remaining?: number;
  /** Finished, waiting to be reported at the next prompt: "Done", "Terminated", "Killed"… */
  status?: string;
  /** Text shown after the status, e.g. "sleep 30". */
  jobText?: string;
  cpu?: number;
  mem?: number;
  time?: string;
  /** Ignores SIGTERM and SIGINT (only SIGKILL stops it). */
  stubborn?: boolean;
  system?: boolean;
}

export interface Seg {
  text: string;
  tone?: Tone;
}
export type Tone = "dir" | "exec" | "match" | "path" | "err" | "dim";

/** A foreground command that takes real time (sleep, fg). */
export interface Foreground {
  pid: number;
  until: number;
  label: string;
  /** Commands still to run after it, e.g. the `echo` in `sleep 3; echo done`. */
  rest: Item[];
}

export interface Shell {
  fs: Fs;
  cwd: string;
  user: string;
  host: string;
  home: string;
  groups: string[];
  env: Record<string, string>;
  lastCode: number;
  procs: Proc[];
  nextPid: number;
  shellPid: number;
  history: string[];
  /** Command names allowed at the prompt (null: everything). */
  allowed: string[] | null;
  fg: Foreground | null;
  /** Last output (stdout + stderr) for goal checks. */
  lastOutput: string;
  lastCommand: string;
  /** Commands typed since the start (or reset). */
  typed: number;
}

export interface RunResult {
  shell: Shell;
  out: Seg[];
  clear: boolean;
}

// ───────────────────────────── Setup ─────────────────────────────

/** Fixed clock for the starting files, so the server and client render the same thing. */
export const BASE_TIME = Date.UTC(2026, 9, 20, 9, 30);

const BIN_SIZES: Record<string, number> = {
  bash: 1446024, sh: 125688, ls: 138208, cat: 35280, echo: 35120, pwd: 35184, mkdir: 76032, rmdir: 47992, touch: 96896,
  cp: 141832, mv: 137752, rm: 59912, head: 43328, tail: 64288, wc: 47744, grep: 186144, sort: 104952, uniq: 43488,
  chmod: 64448, whoami: 35144, id: 39424, groups: 35184, ps: 145608, kill: 30952, sleep: 35128, which: 1072, env: 48536,
  printenv: 31008, date: 104968, hostname: 22760, clear: 14568, uname: 35192, true: 26944, false: 26944, tee: 39432, man: 125168,
};

export type FileSpecValue = string | null | { content?: string; mode?: string | number; owner?: string; group?: string; dir?: boolean };
/** Paths ("/etc/x", "~/notes.txt", "~/projects/") to contents. A trailing "/" or null makes a directory. */
export type FileSpec = Record<string, FileSpecValue>;

export interface ProcSpec {
  pid: number;
  cmd: string;
  args?: string;
  user?: string;
  tty?: string;
  cpu?: number;
  mem?: number;
  time?: string;
  stubborn?: boolean;
}

export interface ShellOptions {
  files?: FileSpec;
  cwd?: string;
  user?: string;
  host?: string;
  groups?: string[];
  env?: Record<string, string>;
  procs?: ProcSpec[];
  commands?: string[] | null;
  history?: string[];
}

/** Parse "755", "0644", "rwxr-xr-x" or a number into permission bits. */
export function parseMode(m: string | number | undefined, fallback: number): number {
  if (typeof m === "number") return m & 0o777;
  if (!m) return fallback;
  if (/^[0-7]{3,4}$/.test(m)) return parseInt(m, 8) & 0o777;
  const s = m.length === 10 ? m.slice(1) : m;
  if (/^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(s)) {
    let v = 0;
    for (let i = 0; i < 9; i++) if (s[i] !== "-" && s[i] !== "S" && s[i] !== "T") v |= 1 << (8 - i);
    return v;
  }
  return fallback;
}

export function modeString(mode: number): string {
  const c = "rwxrwxrwx";
  let s = "";
  for (let i = 0; i < 9; i++) s += mode & (1 << (8 - i)) ? c[i] : "-";
  return s;
}

export const octal = (mode: number) => (mode & 0o777).toString(8).padStart(3, "0");

export function createShell(o: ShellOptions = {}): Shell {
  const user = o.user ?? "ada";
  const home = user === "root" ? "/root" : `/home/${user}`;
  const host = o.host ?? "pockett";
  const groups = o.groups ?? [user];
  const fs: Fs = {};
  const t = BASE_TIME;
  const dir = (owner = "root", mode = 0o755) => ({ kind: "dir" as const, content: "", mode, owner, group: owner, mtime: t });
  for (const p of ["/", "/bin", "/dev", "/etc", "/home", "/root", "/tmp", "/usr", "/usr/bin", "/usr/local", "/usr/local/bin", "/var", "/var/log"]) fs[p] = dir();
  fs["/root"].mode = 0o700;
  fs["/tmp"].mode = 0o777;
  fs["/dev/null"] = { kind: "file", content: "", mode: 0o666, owner: "root", group: "root", mtime: t };
  fs["/etc/hostname"] = { kind: "file", content: host + "\n", mode: 0o644, owner: "root", group: "root", mtime: t };
  fs["/etc/passwd"] = {
    kind: "file",
    content: `root:x:0:0:root:/root:/bin/bash\n${user === "root" ? "" : `${user}:x:1000:1000::${home}:/bin/bash\n`}`,
    mode: 0o644, owner: "root", group: "root", mtime: t,
  };
  for (const [name, size] of Object.entries(BIN_SIZES)) {
    fs[`/usr/bin/${name}`] = { kind: "file", content: "", mode: 0o755, owner: "root", group: "root", mtime: t, size, bin: name };
  }
  fs[home] = { ...dir(user, user === "root" ? 0o700 : 0o750), group: groups[0] ?? user };

  const resolveSpec = (p: string) => normalize(p.startsWith("~") ? home + p.slice(1) : p.startsWith("/") ? p : `${home}/${p}`);
  const ensureDirs = (p: string, owner: string, group: string) => {
    const parts = p.split("/").filter(Boolean);
    let cur = "";
    for (const part of parts) {
      cur += "/" + part;
      if (!fs[cur]) fs[cur] = { kind: "dir", content: "", mode: 0o755, owner, group, mtime: t };
    }
  };
  for (const [key, val] of Object.entries(o.files ?? {})) {
    const path = resolveSpec(key);
    const spec = typeof val === "object" && val !== null ? val : { content: val ?? undefined };
    const isDir = key.endsWith("/") || val === null || Boolean(spec.dir);
    const owner = spec.owner ?? user;
    const group = spec.group ?? (owner === user ? groups[0] ?? user : owner);
    ensureDirs(parentOf(path), user, groups[0] ?? user);
    if (isDir) {
      ensureDirs(path, owner, group);
      const e = fs[path];
      e.mode = parseMode(spec.mode, 0o755);
      e.owner = owner;
      e.group = group;
    } else {
      fs[path] = { kind: "file", content: spec.content ?? "", mode: parseMode(spec.mode, 0o644), owner, group, mtime: t };
    }
  }

  const cwd = o.cwd ? resolveSpec(o.cwd) : home;
  if (!fs[cwd]) ensureDirs(cwd, user, groups[0] ?? user);
  const env: Record<string, string> = {
    HOME: home,
    USER: user,
    LOGNAME: user,
    SHELL: "/bin/bash",
    PATH: "/usr/local/bin:/usr/bin:/bin",
    PWD: cwd,
    LANG: "en_US.UTF-8",
    TERM: "xterm-256color",
    ...(o.env ?? {}),
  };
  const shellPid = 4211;
  const procs: Proc[] = [
    { pid: 1, cmd: "systemd", args: "/sbin/init", user: "root", tty: "?", started: t, system: true, time: "00:00:03", mem: 0.1 },
    { pid: 412, cmd: "cron", args: "/usr/sbin/cron -f", user: "root", tty: "?", started: t, system: true, mem: 0.0 },
    { pid: 538, cmd: "sshd", args: "sshd: /usr/sbin/sshd -D", user: "root", tty: "?", started: t, system: true, mem: 0.1 },
    { pid: 4210, cmd: "sshd", args: `sshd: ${user}@pts/0`, user, tty: "?", started: t, system: true, mem: 0.1 },
    ...(o.procs ?? []).map((p) => ({
      pid: p.pid, cmd: p.cmd, args: p.args ?? p.cmd, user: p.user ?? user, tty: p.tty ?? "pts/0", started: t,
      cpu: p.cpu, mem: p.mem, time: p.time, stubborn: p.stubborn,
    })),
  ];
  return {
    fs, cwd, user, host, home, groups, env, lastCode: 0, procs, nextPid: 4377, shellPid,
    history: [...(o.history ?? [])], allowed: o.commands ?? null, fg: null, lastOutput: "", lastCommand: "", typed: 0,
  };
}

// ───────────────────────────── Paths ─────────────────────────────

export function normalize(p: string): string {
  const out: string[] = [];
  for (const part of p.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return "/" + out.join("/");
}
export const parentOf = (p: string) => (p === "/" ? "/" : p.slice(0, p.lastIndexOf("/")) || "/");
export const baseName = (p: string) => (p === "/" ? "/" : p.slice(p.lastIndexOf("/") + 1));
const childPath = (dir: string, name: string) => (dir === "/" ? "/" + name : `${dir}/${name}`);

export function childrenOf(fs: Fs, dir: string): string[] {
  const prefix = dir === "/" ? "/" : dir + "/";
  const out: string[] = [];
  for (const p of Object.keys(fs)) {
    if (p !== "/" && p.startsWith(prefix) && !p.slice(prefix.length).includes("/")) out.push(p.slice(prefix.length));
  }
  return out;
}

/** Path shown in the prompt: home becomes ~. */
export function displayPath(sh: Pick<Shell, "home">, p: string) {
  if (p === sh.home) return "~";
  if (p.startsWith(sh.home + "/")) return "~" + p.slice(sh.home.length);
  return p;
}

const R = 4,
  W = 2,
  X = 1;

function can(sh: Shell, e: Entry, bit: number): boolean {
  if (sh.user === "root") return bit !== X || e.kind === "dir" || (e.mode & 0o111) !== 0;
  const shift = e.owner === sh.user ? 6 : sh.groups.includes(e.group) ? 3 : 0;
  return ((e.mode >> shift) & bit) !== 0;
}

type Errno = "ENOENT" | "ENOTDIR" | "EACCES" | "EISDIR" | "EEXIST" | "ENOTEMPTY" | "EPERM";
const MSG: Record<Errno, string> = {
  ENOENT: "No such file or directory",
  ENOTDIR: "Not a directory",
  EACCES: "Permission denied",
  EISDIR: "Is a directory",
  EEXIST: "File exists",
  ENOTEMPTY: "Directory not empty",
  EPERM: "Operation not permitted",
};

type Walk = { ok: true; path: string; entry: Entry | undefined } | { ok: false; err: Errno };

/** Resolve a path one component at a time, like the kernel: every directory on the way must exist and be searchable (x). */
function walk(sh: Shell, p: string): Walk {
  if (p === "") return { ok: false, err: "ENOENT" };
  const parts = p.split("/").filter(Boolean);
  let cur = p.startsWith("/") ? "/" : sh.cwd;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const here = sh.fs[cur];
    if (!here) return { ok: false, err: "ENOENT" };
    if (here.kind !== "dir") return { ok: false, err: "ENOTDIR" };
    if (!can(sh, here, X)) return { ok: false, err: "EACCES" };
    if (part === ".") continue;
    if (part === "..") {
      cur = parentOf(cur);
      continue;
    }
    const next = childPath(cur, part);
    if (!sh.fs[next]) {
      if (i === parts.length - 1) return { ok: true, path: next, entry: undefined };
      return { ok: false, err: "ENOENT" };
    }
    cur = next;
  }
  const entry = sh.fs[cur];
  if (p.endsWith("/") && entry && entry.kind !== "dir") return { ok: false, err: "ENOTDIR" };
  return { ok: true, path: cur, entry };
}

const bytes = (s: string) => new TextEncoder().encode(s).length;
const sizeOf = (e: Entry) => (e.kind === "dir" ? 4096 : e.size ?? bytes(e.content));

function removeTree(fs: Fs, path: string) {
  const prefix = path + "/";
  for (const k of Object.keys(fs)) if (k === path || k.startsWith(prefix)) delete fs[k];
}

// ───────────────────────────── Parsing ─────────────────────────────

interface Part {
  t: string;
  /** 0 unquoted, 1 literal (single quotes or escaped), 2 double quotes (expands $). */
  q: 0 | 1 | 2;
}
type Tok = { k: "w"; parts: Part[]; start: number; end: number } | { k: "op"; v: string; start: number; end: number };

export interface Redir {
  op: ">" | ">>" | "<" | "2>" | "2>>" | "2>&1";
  target: Part[] | null;
}
export interface Cmd {
  words: Part[][];
  redirs: Redir[];
}
export interface Item {
  pipe: Cmd[];
  bg: boolean;
  /** How this item joins the one before it. */
  conn: ";" | "&&" | "||";
  src: string;
}

class ShellSyntaxError extends Error {}

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let parts: Part[] | null = null;
  let start = 0;
  let i = 0;
  const begin = () => {
    if (!parts) {
      parts = [];
      start = i;
    }
    return parts;
  };
  const add = (t: string, q: 0 | 1 | 2) => {
    const ps = begin();
    const last = ps[ps.length - 1];
    if (last && last.q === q) last.t += t;
    else ps.push({ t, q });
  };
  const end = () => {
    if (parts) toks.push({ k: "w", parts, start, end: i });
    parts = null;
  };
  const op = (v: string, len = v.length) => {
    end();
    toks.push({ k: "op", v, start: i, end: i + len });
    i += len;
  };
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\r") {
      end();
      i++;
    } else if (c === "\n") op("nl", 1);
    else if (c === "#" && !parts) {
      while (i < src.length && src[i] !== "\n") i++;
    } else if (c === "'") {
      const close = src.indexOf("'", i + 1);
      if (close < 0) throw new ShellSyntaxError("unexpected EOF while looking for matching `''");
      add(src.slice(i + 1, close), 1);
      i = close + 1;
    } else if (c === '"') {
      begin();
      let j = i + 1;
      let buf = "";
      let pushed = false;
      while (j < src.length && src[j] !== '"') {
        if (src[j] === "\\" && j + 1 < src.length && '"\$`'.includes(src[j + 1])) {
          if (buf) add(buf, 2);
          buf = "";
          add(src[j + 1], 1);
          pushed = true;
          j += 2;
        } else buf += src[j++];
      }
      if (j >= src.length) throw new ShellSyntaxError("unexpected EOF while looking for matching `\"'");
      if (buf || !pushed) add(buf, 2);
      i = j + 1;
    } else if (c === "\\") {
      if (src[i + 1] === "\n") i += 2;
      else if (i + 1 < src.length) {
        add(src[i + 1], 1);
        i += 2;
      } else i++;
    } else if (c === "|") op(src[i + 1] === "|" ? "||" : "|");
    else if (c === "&") op(src[i + 1] === "&" ? "&&" : "&");
    else if (c === ";") op(";");
    else if (c === ">") op(src[i + 1] === ">" ? ">>" : ">");
    else if (c === "<") op("<");
    else if (c === "2" && !parts && src[i + 1] === ">") {
      if (src.startsWith("2>&1", i)) op("2>&1");
      else op(src[i + 2] === ">" ? "2>>" : "2>");
    } else {
      add(c, 0);
      i++;
    }
  }
  end();
  return toks;
}

const REDIRS = new Set([">", ">>", "<", "2>", "2>>"]);

export function parse(src: string): Item[] {
  const toks = tokenize(src);
  const items: Item[] = [];
  let i = 0;
  let conn: Item["conn"] = ";";
  const unexpected = (t: Tok | undefined): never => {
    const v = !t ? "newline" : t.k === "w" ? t.parts.map((p) => p.t).join("") : t.v === "nl" ? "newline" : t.v;
    throw new ShellSyntaxError(`syntax error near unexpected token \`${v}'`);
  };
  while (i < toks.length) {
    // blank lines between commands (and after && or ||) are fine
    while (i < toks.length && toks[i].k === "op" && (toks[i] as { v: string }).v === "nl") i++;
    if (i >= toks.length) {
      if (conn !== ";") throw new ShellSyntaxError("syntax error: unexpected end of file");
      break;
    }
    const first = toks[i];
    const pipe: Cmd[] = [];
    let cmd: Cmd = { words: [], redirs: [] };
    let lastEnd = first.start;
    for (; i < toks.length; i++) {
      const t = toks[i];
      if (t.k === "w") {
        cmd.words.push(t.parts);
        lastEnd = t.end;
        continue;
      }
      if (REDIRS.has(t.v)) {
        const target = toks[i + 1];
        if (!target || target.k !== "w") return unexpected(target);
        cmd.redirs.push({ op: t.v as Redir["op"], target: target.parts });
        i++;
        lastEnd = target.end;
        continue;
      }
      if (t.v === "2>&1") {
        cmd.redirs.push({ op: "2>&1", target: null });
        lastEnd = t.end;
        continue;
      }
      if (t.v === "|") {
        if (cmd.words.length === 0 && cmd.redirs.length === 0) return unexpected(t);
        pipe.push(cmd);
        cmd = { words: [], redirs: [] };
        const next = toks[i + 1];
        if (!next || (next.k === "op" && next.v === "nl")) throw new ShellSyntaxError("syntax error: unexpected end of file");
        continue;
      }
      break; // ; & && || or a newline ends the pipeline
    }
    if (cmd.words.length || cmd.redirs.length) pipe.push(cmd);
    const sep = toks[i] as Tok | undefined;
    if (pipe.length === 0) return unexpected(sep);
    const bg = sep?.k === "op" && sep.v === "&";
    items.push({ pipe, bg, conn, src: src.slice(first.start, lastEnd).trim() });
    if (sep) i++;
    conn = sep?.k === "op" && sep.v === "&&" ? "&&" : sep?.k === "op" && sep.v === "||" ? "||" : ";";
  }
  return items;
}

// ───────────────────────────── Expansion ─────────────────────────────

interface Frame {
  pos: string[];
  name: string;
}

function expandVars(sh: Shell, s: string, fr: Frame): string {
  return s.replace(/\$(\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*)|([0-9?$#@*]))/g, (_m, _a, braced, plain, special) => {
    const name = braced ?? plain;
    if (name) return sh.env[name] ?? "";
    switch (special) {
      case "?":
        return String(sh.lastCode);
      case "$":
        return String(sh.shellPid);
      case "#":
        return String(fr.pos.length);
      case "@":
      case "*":
        return fr.pos.join(" ");
      case "0":
        return fr.name;
      default:
        return fr.pos[Number(special) - 1] ?? "";
    }
  });
}

function globToRegex(chars: { ch: string; active: boolean }[]): RegExp {
  let re = "^";
  for (const { ch, active } of chars) {
    if (active && ch === "*") re += "[^/]*";
    else if (active && ch === "?") re += "[^/]";
    else re += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(re + "$");
}

function glob(sh: Shell, chars: { ch: string; active: boolean }[]): string[] {
  const text = chars.map((c) => c.ch).join("");
  const abs = text.startsWith("/");
  const comps: { ch: string; active: boolean }[][] = [[]];
  for (const c of chars) {
    if (c.ch === "/") comps.push([]);
    else comps[comps.length - 1].push(c);
  }
  let results = [{ shown: abs ? "/" : "", path: abs ? "/" : sh.cwd }];
  const joinShown = (a: string, b: string) => (a === "" ? b : a.endsWith("/") ? a + b : `${a}/${b}`);
  for (const comp of comps) {
    if (comp.length === 0) continue;
    const name = comp.map((c) => c.ch).join("");
    const next: typeof results = [];
    if (!comp.some((c) => c.active && (c.ch === "*" || c.ch === "?"))) {
      for (const r of results) next.push({ shown: joinShown(r.shown, name), path: name === ".." ? parentOf(r.path) : name === "." ? r.path : childPath(r.path, name) });
    } else {
      const re = globToRegex(comp);
      for (const r of results) {
        const d = sh.fs[r.path];
        if (!d || d.kind !== "dir" || !can(sh, d, R)) continue;
        for (const child of childrenOf(sh.fs, r.path).sort(nameCompare)) {
          if (child.startsWith(".") && name[0] !== ".") continue;
          if (re.test(child)) next.push({ shown: joinShown(r.shown, child), path: childPath(r.path, child) });
        }
      }
    }
    results = next;
  }
  return results.filter((r) => sh.fs[r.path]).map((r) => r.shown);
}

function expandWord(sh: Shell, parts: Part[], fr: Frame, allowGlob = true): string[] {
  const chars: { ch: string; active: boolean }[] = [];
  let quoted = false;
  // in NAME=value words bash also expands ~ right after = and after each : (so PATH=~/bin:$PATH works)
  const assign = parts[0]?.q === 0 && /^[A-Za-z_][A-Za-z0-9_]*=/.test(parts[0].t);
  parts.forEach((p, idx) => {
    if (p.q === 1) {
      quoted = true;
      for (const ch of p.t) chars.push({ ch, active: false });
      return;
    }
    if (p.q === 2) quoted = true;
    let t = p.t;
    if (p.q === 0 && assign) t = t.replace(/(^|[=:])~(?=\/|:|$)/g, (_m, pre: string) => pre + (sh.env.HOME ?? sh.home));
    if (p.q === 0 && idx === 0 && t.startsWith("~") && (t.length === 1 || t[1] === "/")) {
      for (const ch of sh.env.HOME ?? sh.home) chars.push({ ch, active: false });
      t = t.slice(1);
    }
    // expand $ pieces; their values are not globbed
    const re = /\$(\{[A-Za-z_][A-Za-z0-9_]*\}|[A-Za-z_][A-Za-z0-9_]*|[0-9?$#@*])/g;
    let at = 0;
    for (const m of t.matchAll(re)) {
      for (const ch of t.slice(at, m.index)) chars.push({ ch, active: p.q === 0 });
      for (const ch of expandVars(sh, m[0], fr)) chars.push({ ch, active: false });
      at = (m.index ?? 0) + m[0].length;
    }
    for (const ch of t.slice(at)) chars.push({ ch, active: p.q === 0 });
  });
  const text = chars.map((c) => c.ch).join("");
  if (!quoted && text === "") return [];
  if (allowGlob && chars.some((c) => c.active && (c.ch === "*" || c.ch === "?"))) {
    const hits = glob(sh, chars);
    if (hits.length) return hits;
  }
  return [text];
}

// ───────────────────────────── Execution ─────────────────────────────

interface Sink {
  tty: boolean;
  write(text: string, rich?: Seg[]): void;
}
interface Io {
  out: Sink;
  err: Sink;
  stdin: string | null;
}

interface RunCtx {
  sh: Shell;
  now: number;
  display: Seg[];
  depth: number;
  /** Whether a foreground sleep may block for real time (top-level line only). */
  canBlock: boolean;
  block: { pid: number; until: number; label: string } | null;
  clear: boolean;
}

interface Call {
  rc: RunCtx;
  sh: Shell;
  name: string;
  argv: string[];
  io: Io;
  fr: Frame;
  /** True when this command is the only one in its pipeline at the top of the line. */
  solo: boolean;
  src: string;
}

const out = (c: Call, s: string, rich?: Seg[]) => c.io.out.write(s, rich);
const err = (c: Call, s: string) => c.io.err.write(s.endsWith("\n") ? s : s + "\n");
const tryHelp = (name: string) => `Try '${name} --help' for more information.`;

const BUILTINS = new Set(["cd", "pwd", "echo", "export", "unset", "jobs", "kill", "history", "type", "exit", "fg", "bg", "true", "false", "help", "source", "."]);

function execList(rc: RunCtx, items: Item[], io: Io, fr: Frame): Item[] | null {
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    if (it.conn === "&&" && rc.sh.lastCode !== 0) continue;
    if (it.conn === "||" && rc.sh.lastCode === 0) continue;
    if (it.bg) {
      runBackground(rc, it, io, fr);
      continue;
    }
    const solo = rc.depth === 0 && it.pipe.length === 1 && rc.canBlock;
    runPipeline(rc, it, io, fr, solo);
    if (rc.block) return items.slice(k + 1);
  }
  return null;
}

function runPipeline(rc: RunCtx, it: Item, io: Io, fr: Frame, solo: boolean) {
  const sh = rc.sh;
  let input: string | null = io.stdin;
  let code = 0;
  const multi = it.pipe.length > 1;
  for (let s = 0; s < it.pipe.length; s++) {
    const last = s === it.pipe.length - 1;
    let buf = "";
    const pipeSink: Sink = { tty: false, write: (t) => (buf += t) };
    const stageIo: Io = { out: last ? io.out : pipeSink, err: io.err, stdin: input };
    // each stage of a real pipeline runs in its own subshell: cd or export there doesn't stick
    const saved = multi ? { cwd: sh.cwd, env: { ...sh.env } } : null;
    code = runCommand(rc, it.pipe[s], stageIo, fr, solo && !multi, it.src);
    if (saved) {
      sh.cwd = saved.cwd;
      sh.env = saved.env;
    }
    input = buf;
  }
  sh.lastCode = code;
}

function runBackground(rc: RunCtx, it: Item, io: Io, fr: Frame) {
  const sh = rc.sh;
  const job = Math.max(0, ...sh.procs.map((p) => p.job ?? 0)) + 1;
  const first = it.pipe[0];
  const argv = first.words.flatMap((w) => expandWord(sh, w, fr));
  const pid = ++sh.nextPid;
  rc.display.push({ text: `[${job}] ${pid}\n` });
  const isSleep = it.pipe.length === 1 && argv[0] === "sleep" && argv.length >= 2 && parseDuration(argv[1]) !== null && first.redirs.length === 0;
  if (isSleep) {
    const ms = parseDuration(argv[1]) ?? 0;
    sh.procs.push({ pid, cmd: "sleep", args: argv.join(" "), user: sh.user, tty: "pts/0", started: rc.now, endsAt: rc.now + ms, job, jobText: it.src });
    sh.lastCode = 0;
    return;
  }
  const savedBlock = rc.canBlock;
  rc.canBlock = false;
  runPipeline(rc, it, io, fr, false);
  rc.canBlock = savedBlock;
  sh.procs.push({ pid, cmd: argv[0] ?? "", args: argv.join(" "), user: sh.user, tty: "pts/0", started: rc.now, endsAt: rc.now + 1, job, jobText: it.src, status: undefined });
  sh.lastCode = 0;
}

function runCommand(rc: RunCtx, cmd: Cmd, io: Io, fr: Frame, solo: boolean, src: string): number {
  const sh = rc.sh;
  const argv = cmd.words.flatMap((w) => expandWord(sh, w, fr));
  // NAME=value prefixes
  const assigns: [string, string][] = [];
  while (argv.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[0])) {
    const a = argv.shift() as string;
    const eq = a.indexOf("=");
    assigns.push([a.slice(0, eq), a.slice(eq + 1)]);
  }
  // redirections
  let outSink = io.out;
  let errSink = io.err;
  let stdin = io.stdin;
  const writes: { path: string; append: boolean; buf: string }[] = [];
  for (const r of cmd.redirs) {
    if (r.op === "2>&1") {
      errSink = outSink;
      continue;
    }
    const targets = expandWord(sh, r.target ?? [], fr);
    const raw = (r.target ?? []).map((p) => p.t).join("");
    if (targets.length !== 1) {
      io.err.write(`bash: ${raw}: ambiguous redirect\n`);
      return 1;
    }
    const target = targets[0];
    const w = walk(sh, target);
    if (!w.ok) {
      io.err.write(`bash: ${target}: ${MSG[w.err]}\n`);
      return 1;
    }
    if (r.op === "<") {
      if (!w.entry) {
        io.err.write(`bash: ${target}: No such file or directory\n`);
        return 1;
      }
      if (w.entry.kind === "dir") {
        stdin = "";
        io.err.write(`bash: ${target}: Is a directory\n`);
        return 1;
      }
      if (!can(sh, w.entry, R)) {
        io.err.write(`bash: ${target}: Permission denied\n`);
        return 1;
      }
      stdin = w.entry.content;
      continue;
    }
    if (w.entry?.kind === "dir") {
      io.err.write(`bash: ${target}: Is a directory\n`);
      return 1;
    }
    if (w.path === "/dev/null") {
      const sink: Sink = { tty: false, write: () => {} };
      if (r.op.startsWith("2")) errSink = sink;
      else outSink = sink;
      continue;
    }
    if (w.entry) {
      if (!can(sh, w.entry, W)) {
        io.err.write(`bash: ${target}: Permission denied\n`);
        return 1;
      }
    } else {
      const dir = sh.fs[parentOf(w.path)];
      if (!dir || !can(sh, dir, W)) {
        io.err.write(`bash: ${target}: Permission denied\n`);
        return 1;
      }
    }
    const append = r.op === ">>" || r.op === "2>>";
    // the file is created (or emptied) before the command runs, just like bash does
    const prev = sh.fs[w.path];
    if (!prev) sh.fs[w.path] = { kind: "file", content: "", mode: 0o644, owner: sh.user, group: sh.groups[0] ?? sh.user, mtime: rc.now };
    else if (!append) prev.content = "";
    sh.fs[w.path].mtime = rc.now;
    const wr = { path: w.path, append, buf: "" };
    writes.push(wr);
    const sink: Sink = { tty: false, write: (t) => (wr.buf += t) };
    if (r.op.startsWith("2")) errSink = sink;
    else outSink = sink;
  }

  const flush = () => {
    for (const wr of writes) {
      const f = sh.fs[wr.path];
      if (f) f.content += wr.buf;
    }
  };

  if (argv.length === 0) {
    for (const [k, v] of assigns) sh.env[k] = v;
    flush();
    return 0;
  }
  const savedEnv = assigns.length ? { ...sh.env } : null;
  for (const [k, v] of assigns) sh.env[k] = v;

  const name = argv[0];
  const call: Call = { rc, sh, name, argv: argv.slice(1), io: { out: outSink, err: errSink, stdin }, fr, solo: solo && cmd.redirs.length === 0, src };
  let code: number;
  if (rc.depth === 0 && sh.allowed && !name.includes("/") && !sh.allowed.includes(name) && !["clear", "history", "help"].includes(name)) {
    errSink.write(`${name}: not part of this exercise. You can use: ${sh.allowed.join(", ")}\n`);
    code = 127;
  } else code = dispatch(call);
  if (savedEnv) sh.env = savedEnv;
  flush();
  return code;
}

/** Find a command: a builtin, a path with a slash, or a file found by searching $PATH. */
function dispatch(c: Call): number {
  const { sh, name } = c;
  if (BUILTINS.has(name)) return builtin(c);
  let path: string | null = null;
  if (name.includes("/")) {
    const w = walk(sh, name);
    if (!w.ok) {
      err(c, `bash: ${name}: ${MSG[w.err]}`);
      return w.err === "ENOENT" ? 127 : 126;
    }
    if (!w.entry) {
      err(c, `bash: ${name}: No such file or directory`);
      return 127;
    }
    if (w.entry.kind === "dir") {
      err(c, `bash: ${name}: Is a directory`);
      return 126;
    }
    if (!can(sh, w.entry, X)) {
      err(c, `bash: ${name}: Permission denied`);
      return 126;
    }
    path = w.path;
  } else {
    path = searchPath(sh, name);
    if (!path) {
      err(c, `bash: ${name}: command not found`);
      return 127;
    }
  }
  const e = sh.fs[path];
  sh.nextPid++;
  if (e.bin) return program(c, e.bin);
  return runScript(c, path, c.argv, false);
}

function searchPath(sh: Shell, name: string): string | null {
  for (const d of (sh.env.PATH ?? "").split(":")) {
    const dir = d === "" ? sh.cwd : d;
    const w = walk(sh, childPath(normalize(dir.startsWith("/") ? dir : `${sh.cwd}/${dir}`), name));
    if (w.ok && w.entry && w.entry.kind === "file" && can(sh, w.entry, X)) return w.path;
  }
  return null;
}

function runScript(c: Call, path: string, args: string[], source: boolean): number {
  const { sh, rc } = c;
  if (rc.depth >= 8) {
    err(c, `bash: ${path}: maximum nesting level exceeded`);
    return 1;
  }
  const e = sh.fs[path];
  let items: Item[];
  try {
    items = parse(e.content);
  } catch (x) {
    err(c, `${c.name}: line 1: ${(x as Error).message}`);
    return 2;
  }
  const saved = source ? null : { cwd: sh.cwd, env: { ...sh.env } };
  rc.depth++;
  const savedBlock = rc.canBlock;
  rc.canBlock = false;
  execList(rc, items, { ...c.io }, { pos: args, name: c.name });
  rc.canBlock = savedBlock;
  rc.depth--;
  const code = sh.lastCode;
  if (saved) {
    sh.cwd = saved.cwd;
    sh.env = saved.env;
  }
  return code;
}

// ───────────────────────────── Options ─────────────────────────────

interface Parsed {
  flags: Set<string>;
  vals: Record<string, string>;
  rest: string[];
  bad: string | null;
}

/** GNU-style short options: -la is -l -a; `valued` options take the next argument (-n 5 or -n5). */
function opts(args: string[], allowed: string, valued = "", numeric = false): Parsed {
  const flags = new Set<string>();
  const vals: Record<string, string> = {};
  const rest: string[] = [];
  let bad: string | null = null;
  let i = 0;
  for (; i < args.length; i++) {
    const a = args[i];
    if (a === "--") {
      i++;
      break;
    }
    if (a === "--help") {
      flags.add("help");
      continue;
    }
    if (a.startsWith("--")) {
      bad = bad ?? a;
      continue;
    }
    if (!a.startsWith("-") || a === "-") {
      rest.push(a);
      continue;
    }
    if (numeric && /^-\d+$/.test(a)) {
      vals.n = a.slice(1);
      continue;
    }
    for (let j = 1; j < a.length; j++) {
      const ch = a[j];
      if (valued.includes(ch)) {
        const v = a.slice(j + 1) || args[++i];
        if (v === undefined) bad = bad ?? `-${ch}`;
        else vals[ch] = v;
        break;
      }
      if (!allowed.includes(ch)) {
        bad = bad ?? ch;
        continue;
      }
      flags.add(ch);
    }
  }
  rest.push(...args.slice(i));
  return { flags, vals, rest, bad };
}

function badOption(c: Call, p: Parsed, code = 1): number {
  const b = p.bad as string;
  if (b.startsWith("--")) err(c, `${c.name}: unrecognized option '${b}'`);
  else if (b.startsWith("-")) err(c, `${c.name}: option requires an argument -- '${b.slice(1)}'`);
  else err(c, `${c.name}: invalid option -- '${b}'`);
  err(c, tryHelp(c.name));
  return code;
}

// ───────────────────────────── Help ─────────────────────────────

export const HELP: Record<string, [string, string]> = {
  pwd: ["pwd", "Print the full path of the directory you are in (the working directory)."],
  ls: ["ls [-a] [-l] [-h] [-R] [-1] [-r] [PATH]...", "List a directory's contents.\n  -a  include hidden names (starting with .), plus . and ..\n  -l  long format: permissions, links, owner, group, size, date, name\n  -h  with -l, sizes like 4.0K instead of 4096\n  -R  list subdirectories too, all the way down\n  -1  one name per line\n  -r  reverse the order"],
  cd: ["cd [DIR]", "Change the working directory. With no DIR, go home. `cd -` goes back to the previous one, `cd ..` up one level."],
  mkdir: ["mkdir [-p] DIR...", "Create directories.\n  -p  create missing parent directories too; no error if it already exists"],
  rmdir: ["rmdir DIR...", "Remove empty directories."],
  touch: ["touch FILE...", "Create empty files, or update the modification time of existing ones."],
  cat: ["cat [-n] [FILE]...", "Print files one after another (concatenate). With no FILE, copy standard input.\n  -n  number the lines"],
  echo: ["echo [-n] [-e] [TEXT]...", "Print TEXT followed by a newline.\n  -n  no newline at the end\n  -e  understand \\n and \\t"],
  cp: ["cp [-r] SOURCE... DEST", "Copy files. If DEST is a directory, copies go inside it.\n  -r  copy directories and everything in them"],
  mv: ["mv SOURCE... DEST", "Move or rename files and directories."],
  rm: ["rm [-r] [-f] FILE...", "Remove files. There is no undo and no trash.\n  -r  remove directories and everything in them\n  -f  ignore missing files, never ask"],
  head: ["head [-n N] [FILE]...", "Print the first 10 lines (or N lines) of each file."],
  tail: ["tail [-n N] [FILE]...", "Print the last 10 lines (or N lines) of each file. `-n +N` starts at line N."],
  wc: ["wc [-l] [-w] [-c] [FILE]...", "Count lines, words and bytes.\n  -l  lines only\n  -w  words only\n  -c  bytes only"],
  grep: ["grep [-i] [-v] [-n] [-c] [-r] [-E] [-F] PATTERN [FILE]...", "Print the lines that match PATTERN.\n  -i  ignore upper/lower case\n  -v  print lines that do NOT match\n  -n  show line numbers\n  -c  count matching lines\n  -r  search directories recursively\n  -E  extended regular expressions\n  -F  PATTERN is plain text"],
  sort: ["sort [-r] [-n] [-u] [FILE]...", "Sort lines.\n  -r  reverse\n  -n  compare as numbers\n  -u  drop repeated lines"],
  uniq: ["uniq [-c] [-d] [-u] [FILE]", "Collapse runs of identical neighbouring lines into one. Sort first to catch all repeats.\n  -c  prefix each line with how many times it repeated\n  -d  only print repeated lines\n  -u  only print lines that never repeat"],
  chmod: ["chmod [-R] MODE FILE...", "Change permissions. MODE is octal (755) or symbolic (u+x, go-w, a=r, u=rwx,g=rx,o=).\n  -R  change directories and everything in them"],
  whoami: ["whoami", "Print your user name."],
  id: ["id", "Print your user id, group id and groups."],
  groups: ["groups", "Print the groups you belong to."],
  ps: ["ps [-e] [aux]", "List processes. Plain `ps` shows the ones in this terminal; `ps -e` shows all; `ps aux` adds owner, CPU and memory."],
  kill: ["kill [-SIGNAL] PID|%JOB...", "Send a signal to a process (default TERM, a polite request to stop). -9 is KILL, which cannot be ignored. `kill -l` lists signals."],
  sleep: ["sleep SECONDS", "Do nothing for a while. Add & to run it in the background."],
  jobs: ["jobs [-l]", "List the background jobs started from this shell.\n  -l  also show process IDs"],
  fg: ["fg [%JOB]", "Bring a background or stopped job to the foreground."],
  bg: ["bg [%JOB]", "Resume a stopped job in the background."],
  which: ["which NAME...", "Show which file would run for each command NAME, by searching the directories in $PATH."],
  type: ["type NAME...", "Say what NAME is: a shell builtin or a file found in $PATH."],
  export: ["export NAME=VALUE", "Set an environment variable, so programs started from this shell see it too."],
  unset: ["unset NAME", "Remove a variable."],
  env: ["env", "Print all environment variables."],
  printenv: ["printenv [NAME]", "Print all environment variables, or the value of one."],
  history: ["history [-c]", "List the commands you typed, numbered. `!!` repeats the last one.\n  -c  clear the list"],
  clear: ["clear", "Clear the screen (Ctrl+L does the same)."],
  tee: ["tee [-a] FILE...", "Copy standard input to the screen and to FILEs.\n  -a  append instead of overwrite"],
  date: ["date", "Print the date and time."],
  hostname: ["hostname", "Print the computer's name."],
  uname: ["uname [-a]", "Print the name of the operating system kernel."],
  man: ["man NAME", "Show the manual page for a command."],
  source: ["source FILE", "Run the commands in FILE in this shell (changes to directory and variables stick)."],
  help: ["help", "List the commands this terminal understands."],
};

// ───────────────────────────── Builtins ─────────────────────────────

const SIGNALS: [number, string, string][] = [
  [1, "HUP", "Hangup"], [2, "INT", "Interrupt"], [3, "QUIT", "Quit"], [4, "ILL", "Illegal instruction"], [5, "TRAP", "Trace/breakpoint trap"],
  [6, "ABRT", "Aborted"], [7, "BUS", "Bus error"], [8, "FPE", "Floating point exception"], [9, "KILL", "Killed"], [10, "USR1", "User defined signal 1"],
  [11, "SEGV", "Segmentation fault"], [12, "USR2", "User defined signal 2"], [13, "PIPE", "Broken pipe"], [14, "ALRM", "Alarm clock"], [15, "TERM", "Terminated"],
  [16, "STKFLT", "Stack fault"], [17, "CHLD", "Child exited"], [18, "CONT", "Continued"], [19, "STOP", "Stopped (signal)"], [20, "TSTP", "Stopped"],
  [21, "TTIN", "Stopped (tty input)"], [22, "TTOU", "Stopped (tty output)"], [23, "URG", "Urgent I/O condition"], [24, "XCPU", "CPU time limit exceeded"],
  [25, "XFSZ", "File size limit exceeded"], [26, "VTALRM", "Virtual timer expired"], [27, "PROF", "Profiling timer expired"], [28, "WINCH", "Window changed"],
  [29, "IO", "I/O possible"], [30, "PWR", "Power failure"], [31, "SYS", "Bad system call"],
];

function parseDuration(s: string): number | null {
  const m = /^(\d+(?:\.\d+)?)([smhd]?)$/.exec(s);
  if (!m) return null;
  const mult = { "": 1, s: 1, m: 60, h: 3600, d: 86400 }[m[2]] ?? 1;
  return Math.round(Number(m[1]) * mult * 1000);
}

/** Job lookup by %N, %+, %%, %- (or the current job when spec is undefined). */
function findJob(sh: Shell, spec: string | undefined): Proc | undefined {
  const jobs = sh.procs.filter((p) => p.job && !p.status).sort((a, b) => (a.job ?? 0) - (b.job ?? 0));
  if (!spec || spec === "%" || spec === "%%" || spec === "%+") return jobs[jobs.length - 1];
  if (spec === "%-") return jobs[jobs.length - 2];
  const n = Number(spec.replace(/^%/, ""));
  return jobs.find((p) => p.job === n);
}

function jobMarker(sh: Shell, p: Proc): string {
  const jobs = sh.procs.filter((q) => q.job).sort((a, b) => (a.job ?? 0) - (b.job ?? 0));
  const i = jobs.indexOf(p);
  return i === jobs.length - 1 ? "+" : i === jobs.length - 2 ? "-" : " ";
}

const jobLine = (job: number, mark: string, status: string, text: string) => `[${job}]${mark}  ${status.padEnd(24)}${text}`;

/** Mark sleeping processes that have finished by now. */
function tick(sh: Shell, now: number) {
  for (const p of sh.procs) {
    if (!p.status && !p.stopped && p.endsAt !== undefined && p.endsAt <= now) p.status = "Done";
  }
  sh.procs = sh.procs.filter((p) => p.job || !p.status);
}

function builtin(c: Call): number {
  const { sh, argv, rc } = c;
  switch (c.name) {
    case "true":
      return 0;
    case "false":
      return 1;
    case "pwd":
      out(c, sh.cwd + "\n");
      return 0;
    case "cd": {
      if (argv.length > 1) {
        err(c, "bash: cd: too many arguments");
        return 1;
      }
      let target = argv[0] ?? sh.env.HOME ?? sh.home;
      let print = false;
      if (target === "-") {
        if (!sh.env.OLDPWD) {
          err(c, "bash: cd: OLDPWD not set");
          return 1;
        }
        target = sh.env.OLDPWD;
        print = true;
      }
      const w = walk(sh, target);
      if (!w.ok || !w.entry) {
        err(c, `bash: cd: ${target}: ${w.ok ? MSG.ENOENT : MSG[w.err]}`);
        return 1;
      }
      if (w.entry.kind !== "dir") {
        err(c, `bash: cd: ${target}: Not a directory`);
        return 1;
      }
      if (!can(sh, w.entry, X)) {
        err(c, `bash: cd: ${target}: Permission denied`);
        return 1;
      }
      sh.env.OLDPWD = sh.cwd;
      sh.cwd = w.path;
      sh.env.PWD = w.path;
      if (print) out(c, w.path + "\n");
      return 0;
    }
    case "echo": {
      let a = argv;
      let nl = true;
      let esc = false;
      while (a.length && /^-[neE]+$/.test(a[0])) {
        if (a[0].includes("n")) nl = false;
        if (a[0].includes("e")) esc = true;
        a = a.slice(1);
      }
      let s = a.join(" ");
      if (esc) s = s.replace(/\\(n|t|\\)/g, (_m, ch) => (ch === "n" ? "\n" : ch === "t" ? "\t" : "\\"));
      out(c, s + (nl ? "\n" : ""));
      return 0;
    }
    case "export": {
      if (argv.length === 0 || argv[0] === "-p") {
        for (const k of Object.keys(sh.env).sort()) out(c, `declare -x ${k}="${sh.env[k]}"\n`);
        return 0;
      }
      let code = 0;
      for (const a of argv) {
        const m = /^([A-Za-z_][A-Za-z0-9_]*)(=(.*))?$/.exec(a);
        if (!m) {
          err(c, `bash: export: \`${a}': not a valid identifier`);
          code = 1;
          continue;
        }
        if (m[2] !== undefined) sh.env[m[1]] = m[3];
        else if (sh.env[m[1]] === undefined) sh.env[m[1]] = "";
      }
      return code;
    }
    case "unset":
      for (const a of argv) delete sh.env[a];
      return 0;
    case "history": {
      if (argv[0] === "-c") {
        sh.history = [];
        return 0;
      }
      const n = argv[0] && /^\d+$/.test(argv[0]) ? Number(argv[0]) : sh.history.length;
      const start = Math.max(0, sh.history.length - n);
      sh.history.slice(start).forEach((h, i) => out(c, `${String(start + i + 1).padStart(5)}  ${h}\n`));
      return 0;
    }
    case "exit":
      out(c, "exit\n", [{ text: "exit\n" }, { text: "(The lesson keeps this terminal open for you.)\n", tone: "dim" }]);
      return 0;
    case "help": {
      const names = (sh.allowed ?? Object.keys(HELP)).filter((n) => HELP[n]);
      out(c, "Commands you can use here (add --help to any of them for details):\n");
      for (const n of names) out(c, `  ${n.padEnd(9)} ${HELP[n][1].split("\n")[0].replace(/\. .*$/, ".")}\n`);
      return 0;
    }
    case "type": {
      let code = 0;
      for (const a of argv) {
        if (BUILTINS.has(a)) out(c, `${a} is a shell builtin\n`);
        else {
          const p = searchPath(sh, a);
          if (p) out(c, `${a} is ${p}\n`);
          else {
            err(c, `bash: type: ${a}: not found`);
            code = 1;
          }
        }
      }
      return code;
    }
    case "source":
    case ".": {
      if (!argv[0]) {
        err(c, `bash: ${c.name}: filename argument required`);
        return 2;
      }
      const w = walk(sh, argv[0]);
      if (!w.ok || !w.entry || w.entry.kind !== "file") {
        err(c, `bash: ${argv[0]}: ${!w.ok ? MSG[w.err] : w.entry ? MSG.EISDIR : MSG.ENOENT}`);
        return 1;
      }
      return runScript({ ...c, name: argv[0] }, w.path, argv.slice(1), true);
    }
    case "jobs": {
      tick(sh, rc.now);
      const long = argv.includes("-l");
      const jobs = sh.procs.filter((p) => p.job).sort((a, b) => (a.job ?? 0) - (b.job ?? 0));
      for (const p of jobs) {
        const status = p.status ?? (p.stopped ? "Stopped" : "Running");
        const text = p.status || p.stopped ? p.jobText ?? p.args : `${p.jobText ?? p.args} &`;
        const line = jobLine(p.job ?? 0, jobMarker(sh, p), status, text);
        out(c, (long ? line.replace("  ", `  ${p.pid} `) : line) + "\n");
      }
      sh.procs = sh.procs.filter((p) => !(p.job && p.status));
      return 0;
    }
    case "fg":
    case "bg": {
      tick(sh, rc.now);
      const p = findJob(sh, argv[0]);
      if (!p) {
        err(c, `bash: ${c.name}: ${argv[0] ?? "current"}: no such job`);
        return 1;
      }
      if (c.name === "bg") {
        if (!p.stopped) {
          err(c, `bash: bg: job ${p.job} already in background`);
          return 0;
        }
        p.stopped = false;
        p.endsAt = p.endsAt === undefined ? undefined : rc.now + (p.remaining ?? 0);
        out(c, `[${p.job}]${jobMarker(sh, p)} ${p.jobText ?? p.args} &\n`);
        return 0;
      }
      out(c, (p.jobText ?? p.args) + "\n");
      const left = p.stopped ? p.remaining ?? 0 : (p.endsAt ?? rc.now) - rc.now;
      p.stopped = false;
      p.endsAt = rc.now + left;
      if (c.solo && rc.canBlock && left > 0) {
        rc.block = { pid: p.pid, until: rc.now + left, label: p.jobText ?? p.args };
        return 0;
      }
      sh.procs = sh.procs.filter((q) => q !== p);
      return 0;
    }
    case "kill":
      return kill(c);
  }
  return 0;
}

function kill(c: Call): number {
  const { sh, rc } = c;
  const args = [...c.argv];
  if (args[0] === "-l" || args[0] === "-L") {
    const rows: string[] = [];
    for (let i = 0; i < SIGNALS.length; i += 5) {
      rows.push(SIGNALS.slice(i, i + 5).map(([n, name]) => `${String(n).padStart(2)}) SIG${name}`.padEnd(15)).join("\t").trimEnd());
    }
    out(c, rows.join("\n") + "\n");
    return 0;
  }
  let sig = SIGNALS[14];
  if (args[0]?.startsWith("-")) {
    let s = (args.shift() ?? "").slice(1);
    if (s === "s" || s === "n") s = args.shift() ?? "";
    s = s.replace(/^SIG/i, "");
    const found = /^\d+$/.test(s) ? SIGNALS.find(([n]) => n === Number(s)) : SIGNALS.find(([, name]) => name === s.toUpperCase());
    if (!found) {
      err(c, `bash: kill: ${s}: invalid signal specification`);
      return 1;
    }
    sig = found;
  }
  if (args.length === 0) {
    err(c, "kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]");
    return 2;
  }
  tick(sh, rc.now);
  let code = 0;
  for (const a of args) {
    let p: Proc | undefined;
    if (a.startsWith("%")) {
      p = findJob(sh, a);
      if (!p) {
        err(c, `bash: kill: ${a}: no such job`);
        code = 1;
        continue;
      }
    } else if (/^\d+$/.test(a)) {
      const pid = Number(a);
      if (pid === sh.shellPid) continue; // an interactive bash ignores TERM; we leave the terminal alone
      p = sh.procs.find((q) => q.pid === pid && !q.status);
      if (!p) {
        err(c, `bash: kill: (${pid}) - No such process`);
        code = 1;
        continue;
      }
    } else {
      err(c, `bash: kill: ${a}: arguments must be process or job IDs`);
      code = 1;
      continue;
    }
    if (p.user !== sh.user && sh.user !== "root") {
      err(c, `bash: kill: (${p.pid}) - Operation not permitted`);
      code = 1;
      continue;
    }
    const [num, , label] = sig;
    if (num === 19 || num === 20) {
      if (!p.stopped && p.endsAt !== undefined) p.remaining = Math.max(0, p.endsAt - rc.now);
      p.stopped = true;
      if (p.job) rc.display.push({ text: "\n" + jobLine(p.job, jobMarker(sh, p), "Stopped", p.jobText ?? p.args) + "\n" });
      continue;
    }
    if (num === 18) {
      if (p.stopped) {
        p.stopped = false;
        if (p.remaining !== undefined) p.endsAt = rc.now + p.remaining;
      }
      continue;
    }
    if (num === 17 || num === 28 || num === 23) continue; // ignored by default
    if (p.stubborn && num !== 9) continue;
    if (p.job) p.status = label;
    else sh.procs = sh.procs.filter((q) => q !== p);
  }
  return code;
}

// ───────────────────────────── Programs ─────────────────────────────

/** Read one input file, reporting errors the GNU way. Returns null on error. */
function readFile(c: Call, path: string, style: "plain" | "open" = "plain"): string | null {
  const w = walk(c.sh, path);
  const fail = (m: string) => {
    err(c, style === "open" ? `${c.name}: cannot open '${path}' for reading: ${m}` : `${c.name}: ${path}: ${m}`);
    return null;
  };
  if (!w.ok) return fail(MSG[w.err]);
  if (!w.entry) return fail(MSG.ENOENT);
  if (w.entry.kind === "dir") {
    if (style === "open") {
      err(c, `${c.name}: error reading '${path}': Is a directory`);
      return null;
    }
    return fail(MSG.EISDIR);
  }
  if (!can(c.sh, w.entry, R)) return fail(MSG.EACCES);
  if (w.path === "/dev/null") return "";
  if (w.entry.bin) return "\u007fELF\u0002\u0001\u0001\u0000\u0000\u0000\u0000\u0000\u0003\u0000>\u0000\u0001\u0000\u0000\u0000\n";
  return w.entry.content;
}

const splitLines = (s: string) => {
  if (s === "") return [];
  const lines = s.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
};

const nameKey = (s: string) => s.replace(/^\.+/, "").toLowerCase();
function nameCompare(a: string, b: string) {
  const ka = nameKey(a);
  const kb = nameKey(b);
  return ka < kb ? -1 : ka > kb ? 1 : a < b ? -1 : a > b ? 1 : 0;
}
function lineCompare(a: string, b: string) {
  const ka = a.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const kb = b.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  return ka < kb ? -1 : ka > kb ? 1 : a < b ? -1 : a > b ? 1 : 0;
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const p2 = (n: number) => String(n).padStart(2, "0");
function lsDate(ms: number) {
  const d = new Date(ms);
  return `${MON[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2)} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
}
function human(n: number) {
  if (n < 1024) return String(n);
  const units = ["K", "M", "G"];
  let v = n;
  let u = -1;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return v < 10 ? `${(Math.ceil(v * 10) / 10).toFixed(1)}${units[u]}` : `${Math.ceil(v)}${units[u]}`;
}
const quoteName = (n: string) => (/[\s'"$&*?;|<>()\\]/.test(n) ? `'${n.replace(/'/g, "'\\''")}'` : n);

function program(c: Call, bin: string): number {
  const { sh, rc } = c;
  const help = HELP[bin];
  if (c.argv[0] === "--help" && help) {
    out(c, `Usage: ${help[0]}\n${help[1]}\n`);
    return 0;
  }
  switch (bin) {
    case "bash":
    case "sh": {
      if (c.argv.length === 0) return 0;
      const w = walk(sh, c.argv[0]);
      if (!w.ok || !w.entry) {
        err(c, `${bin}: ${c.argv[0]}: No such file or directory`);
        return 127;
      }
      if (w.entry.kind === "dir") {
        err(c, `${bin}: ${c.argv[0]}: Is a directory`);
        return 126;
      }
      if (!can(sh, w.entry, R)) {
        err(c, `${bin}: ${c.argv[0]}: Permission denied`);
        return 126;
      }
      return runScript({ ...c, name: c.argv[0] }, w.path, c.argv.slice(1), false);
    }
    case "ls":
      return ls(c);
    case "cat": {
      const p = opts(c.argv, "n");
      if (p.bad) return badOption(c, p);
      const files = p.rest.length ? p.rest : ["-"];
      let all = "";
      let code = 0;
      for (const f of files) {
        const t = f === "-" ? c.io.stdin ?? "" : readFile(c, f);
        if (t === null) {
          code = 1;
          continue;
        }
        all += t;
      }
      if (p.flags.has("n")) {
        const lines = all.split("\n");
        const endsNl = all.endsWith("\n");
        if (endsNl) lines.pop();
        all = lines.map((l, i) => `${String(i + 1).padStart(6)}\t${l}`).join("\n") + (endsNl ? "\n" : "");
      }
      out(c, all);
      return code;
    }
    case "echo":
      return builtin({ ...c, name: "echo" });
    case "pwd":
      return builtin({ ...c, name: "pwd" });
    case "kill":
      return kill(c);
    case "mkdir": {
      const p = opts(c.argv, "pv");
      if (p.bad) return badOption(c, p);
      if (!p.rest.length) {
        err(c, "mkdir: missing operand");
        err(c, tryHelp("mkdir"));
        return 1;
      }
      let code = 0;
      for (const d of p.rest) {
        const fail = (m: string) => {
          err(c, `mkdir: cannot create directory '${d}': ${m}`);
          code = 1;
        };
        if (p.flags.has("p")) {
          const abs = d.startsWith("/");
          const comps = d.split("/").filter(Boolean);
          let sofar = abs ? "/" : "";
          let failed = false;
          for (const comp of comps) {
            sofar = sofar === "" ? comp : sofar.endsWith("/") ? sofar + comp : `${sofar}/${comp}`;
            const w = walk(sh, sofar);
            if (!w.ok) {
              fail(MSG[w.err]);
              failed = true;
              break;
            }
            if (w.entry) {
              if (w.entry.kind !== "dir") {
                fail(MSG.EEXIST);
                failed = true;
                break;
              }
              continue;
            }
            const parent = sh.fs[parentOf(w.path)];
            if (!can(sh, parent, W)) {
              fail(MSG.EACCES);
              failed = true;
              break;
            }
            sh.fs[w.path] = { kind: "dir", content: "", mode: 0o755, owner: sh.user, group: sh.groups[0] ?? sh.user, mtime: rc.now };
            if (p.flags.has("v")) out(c, `mkdir: created directory '${sofar}'\n`);
          }
          if (failed) continue;
          continue;
        }
        const w = walk(sh, d);
        if (!w.ok) {
          fail(MSG[w.err]);
          continue;
        }
        if (w.entry) {
          fail(MSG.EEXIST);
          continue;
        }
        const parent = sh.fs[parentOf(w.path)];
        if (!parent || parent.kind !== "dir") {
          fail(MSG.ENOENT);
          continue;
        }
        if (!can(sh, parent, W)) {
          fail(MSG.EACCES);
          continue;
        }
        sh.fs[w.path] = { kind: "dir", content: "", mode: 0o755, owner: sh.user, group: sh.groups[0] ?? sh.user, mtime: rc.now };
        parent.mtime = rc.now;
        if (p.flags.has("v")) out(c, `mkdir: created directory '${d}'\n`);
      }
      return code;
    }
    case "rmdir": {
      if (!c.argv.length) {
        err(c, "rmdir: missing operand");
        err(c, tryHelp("rmdir"));
        return 1;
      }
      let code = 0;
      for (const d of c.argv) {
        const w = walk(sh, d);
        const fail = (m: string) => {
          err(c, `rmdir: failed to remove '${d}': ${m}`);
          code = 1;
        };
        if (!w.ok) fail(MSG[w.err]);
        else if (!w.entry) fail(MSG.ENOENT);
        else if (w.entry.kind !== "dir") fail(MSG.ENOTDIR);
        else if (childrenOf(sh.fs, w.path).length) fail(MSG.ENOTEMPTY);
        else if (!can(sh, sh.fs[parentOf(w.path)], W)) fail(MSG.EACCES);
        else delete sh.fs[w.path];
      }
      return code;
    }
    case "touch": {
      if (!c.argv.length) {
        err(c, "touch: missing file operand");
        err(c, tryHelp("touch"));
        return 1;
      }
      let code = 0;
      for (const f of c.argv) {
        const w = walk(sh, f);
        if (!w.ok) {
          err(c, `touch: cannot touch '${f}': ${MSG[w.err]}`);
          code = 1;
          continue;
        }
        if (w.entry) {
          w.entry.mtime = rc.now;
          continue;
        }
        const parent = sh.fs[parentOf(w.path)];
        if (!parent || !can(sh, parent, W)) {
          err(c, `touch: cannot touch '${f}': ${parent ? MSG.EACCES : MSG.ENOENT}`);
          code = 1;
          continue;
        }
        sh.fs[w.path] = { kind: "file", content: "", mode: 0o644, owner: sh.user, group: sh.groups[0] ?? sh.user, mtime: rc.now };
      }
      return code;
    }
    case "cp":
    case "mv":
      return copyMove(c, bin);
    case "rm":
      return rm(c);
    case "head":
    case "tail":
      return headTail(c, bin);
    case "wc":
      return wc(c);
    case "grep":
      return grep(c);
    case "sort": {
      const p = opts(c.argv, "rnuf");
      if (p.bad) return badOption(c, p, 2);
      let text = "";
      let code = 0;
      for (const f of p.rest.length ? p.rest : ["-"]) {
        const t = f === "-" ? c.io.stdin ?? "" : readFile(c, f, "plain");
        if (t === null) {
          code = 2;
          continue;
        }
        text += t.endsWith("\n") || t === "" ? t : t + "\n";
      }
      if (code) return code;
      let lines = splitLines(text);
      const num = (s: string) => {
        const m = /^\s*(-?\d+(\.\d+)?)/.exec(s);
        return m ? Number(m[1]) : 0;
      };
      const cmp = p.flags.has("n") ? (a: string, b: string) => num(a) - num(b) || lineCompare(a, b) : lineCompare;
      lines.sort((a, b) => (p.flags.has("r") ? -cmp(a, b) : cmp(a, b)));
      if (p.flags.has("u")) lines = lines.filter((l, i) => i === 0 || cmp(lines[i - 1], l) !== 0);
      out(c, lines.map((l) => l + "\n").join(""));
      return 0;
    }
    case "uniq": {
      const p = opts(c.argv, "cdui");
      if (p.bad) return badOption(c, p);
      const t = p.rest[0] && p.rest[0] !== "-" ? readFile(c, p.rest[0]) : c.io.stdin ?? "";
      if (t === null) return 1;
      const lines = splitLines(t);
      const runs: [string, number][] = [];
      const same = (a: string, b: string) => (p.flags.has("i") ? a.toLowerCase() === b.toLowerCase() : a === b);
      for (const l of lines) {
        const last = runs[runs.length - 1];
        if (last && same(last[0], l)) last[1]++;
        else runs.push([l, 1]);
      }
      let res = runs;
      if (p.flags.has("d")) res = res.filter(([, n]) => n > 1);
      if (p.flags.has("u")) res = res.filter(([, n]) => n === 1);
      out(c, res.map(([l, n]) => (p.flags.has("c") ? `${String(n).padStart(7)} ${l}\n` : l + "\n")).join(""));
      return 0;
    }
    case "tee": {
      const p = opts(c.argv, "a");
      const input = c.io.stdin ?? "";
      let code = 0;
      for (const f of p.rest) {
        const w = walk(sh, f);
        if (!w.ok || (w.entry && w.entry.kind === "dir")) {
          err(c, `tee: ${f}: ${!w.ok ? MSG[w.err] : MSG.EISDIR}`);
          code = 1;
          continue;
        }
        if (w.entry) {
          if (!can(sh, w.entry, W)) {
            err(c, `tee: ${f}: Permission denied`);
            code = 1;
            continue;
          }
          w.entry.content = p.flags.has("a") ? w.entry.content + input : input;
          w.entry.mtime = rc.now;
        } else {
          const parent = sh.fs[parentOf(w.path)];
          if (!parent || !can(sh, parent, W)) {
            err(c, `tee: ${f}: ${parent ? MSG.EACCES : MSG.ENOENT}`);
            code = 1;
            continue;
          }
          sh.fs[w.path] = { kind: "file", content: input, mode: 0o644, owner: sh.user, group: sh.groups[0] ?? sh.user, mtime: rc.now };
        }
      }
      out(c, input);
      return code;
    }
    case "chmod":
      return chmod(c);
    case "whoami":
      out(c, sh.user + "\n");
      return 0;
    case "id": {
      const gid = (g: string, i: number) => (g === "root" ? 0 : g === "sudo" ? 27 : g === "users" ? 100 : g === sh.user ? 1000 : 1001 + i);
      const uid = sh.user === "root" ? 0 : 1000;
      const gs = sh.groups.map((g, i) => `${gid(g, i)}(${g})`).join(",");
      out(c, `uid=${uid}(${sh.user}) gid=${gid(sh.groups[0], 0)}(${sh.groups[0]}) groups=${gs}\n`);
      return 0;
    }
    case "groups":
      out(c, sh.groups.join(" ") + "\n");
      return 0;
    case "hostname":
      out(c, sh.host + "\n");
      return 0;
    case "uname":
      out(c, c.argv.includes("-a") ? `Linux ${sh.host} 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC x86_64 x86_64 x86_64 GNU/Linux\n` : c.argv.includes("-r") ? "6.8.0-45-generic\n" : "Linux\n");
      return 0;
    case "date": {
      const d = new Date(rc.now);
      out(c, `${DAY[d.getUTCDay()]} ${MON[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2)} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())} UTC ${d.getUTCFullYear()}\n`);
      return 0;
    }
    case "clear":
      rc.clear = true;
      rc.display.length = 0;
      return 0;
    case "true":
      return 0;
    case "false":
      return 1;
    case "env":
    case "printenv": {
      if (bin === "printenv" && c.argv.length) {
        let code = 0;
        for (const a of c.argv) {
          if (sh.env[a] === undefined) code = 1;
          else out(c, sh.env[a] + "\n");
        }
        return code;
      }
      for (const [k, v] of Object.entries(sh.env)) out(c, `${k}=${v}\n`);
      return 0;
    }
    case "which": {
      let code = 0;
      for (const a of c.argv) {
        if (a.includes("/")) {
          const w = walk(sh, a);
          if (w.ok && w.entry && w.entry.kind === "file" && can(sh, w.entry, X)) out(c, a + "\n");
          else code = 1;
          continue;
        }
        const p = searchPath(sh, a);
        if (p) out(c, p + "\n");
        else code = 1;
      }
      return c.argv.length ? code : 1;
    }
    case "sleep": {
      if (!c.argv.length) {
        err(c, "sleep: missing operand");
        err(c, tryHelp("sleep"));
        return 1;
      }
      let ms = 0;
      for (const a of c.argv) {
        const d = parseDuration(a);
        if (d === null) {
          err(c, `sleep: invalid time interval '${a}'`);
          err(c, tryHelp("sleep"));
          return 1;
        }
        ms += d;
      }
      if (c.solo && rc.canBlock && ms > 0) {
        const pid = sh.nextPid;
        sh.procs.push({ pid, cmd: "sleep", args: ["sleep", ...c.argv].join(" "), user: sh.user, tty: "pts/0", started: rc.now, endsAt: rc.now + ms, jobText: c.src });
        rc.block = { pid, until: rc.now + ms, label: c.src };
      }
      return 0;
    }
    case "ps":
      return ps(c);
    case "man": {
      const n = c.argv[0];
      if (!n) {
        err(c, "What manual page do you want?\nFor example, try 'man man'.");
        return 1;
      }
      const h = HELP[n];
      if (!h) {
        err(c, `No manual entry for ${n}`);
        return 16;
      }
      out(c, `${n.toUpperCase()}\n\nNAME\n    ${n}: ${h[1].split("\n")[0]}\n\nSYNOPSIS\n    ${h[0]}\n${h[1].includes("\n") ? "\nOPTIONS\n" + h[1].split("\n").slice(1).map((l) => "  " + l).join("\n") + "\n" : ""}`);
      return 0;
    }
  }
  err(c, `${bin}: command not found`);
  return 127;
}

function ls(c: Call): number {
  const { sh } = c;
  const p = opts(c.argv, "alhAr1dR");
  if (p.flags.has("help")) {
    out(c, `Usage: ${HELP.ls[0]}\n${HELP.ls[1]}\n`);
    return 0;
  }
  if (p.bad) return badOption(c, p, 2);
  const long = p.flags.has("l");
  const all = p.flags.has("a");
  const almost = p.flags.has("A");
  const tty = c.io.out.tty;
  const oneLine = !long && !p.flags.has("1") && tty;
  const targets = p.rest.length ? p.rest : ["."];
  let code = 0;
  const files: { shown: string; path: string; e: Entry }[] = [];
  const dirs: { shown: string; path: string; e: Entry }[] = [];
  for (const t of targets) {
    const w = walk(sh, t);
    if (!w.ok || !w.entry) {
      err(c, `ls: cannot access '${t}': ${w.ok ? MSG.ENOENT : MSG[w.err]}`);
      code = 2;
      continue;
    }
    if (w.entry.kind === "dir" && !p.flags.has("d")) dirs.push({ shown: t, path: w.path, e: w.entry });
    else files.push({ shown: t, path: w.path, e: w.entry });
  }
  const order = (a: string, b: string) => (p.flags.has("r") ? -nameCompare(a, b) : nameCompare(a, b));
  const toneOf = (e: Entry): Tone | undefined => (e.kind === "dir" ? "dir" : e.mode & 0o111 ? "exec" : undefined);

  const render = (rows: { name: string; e: Entry; path: string }[], withTotal: boolean) => {
    if (long) {
      const linkCount = (row: { e: Entry; path: string }) => (row.e.kind === "dir" ? 2 + childrenOf(sh.fs, row.path).filter((n) => sh.fs[childPath(row.path, n)].kind === "dir").length : 1);
      const meta = rows.map((r) => ({
        ...r,
        links: String(linkCount(r)),
        size: p.flags.has("h") ? human(sizeOf(r.e)) : String(sizeOf(r.e)),
      }));
      const wl = Math.max(...meta.map((m) => m.links.length));
      const wo = Math.max(...meta.map((m) => m.e.owner.length));
      const wg = Math.max(...meta.map((m) => m.e.group.length));
      const ws = Math.max(...meta.map((m) => m.size.length));
      const rich: Seg[] = [];
      let text = "";
      if (withTotal) {
        const blocks = rows.reduce((n, r) => n + (r.e.kind === "dir" ? 4 : Math.ceil(sizeOf(r.e) / 4096) * 4), 0);
        const line = `total ${p.flags.has("h") ? human(blocks * 1024) : blocks}\n`;
        text += line;
        rich.push({ text: line });
      }
      for (const m of meta) {
        const head = `${m.e.kind === "dir" ? "d" : "-"}${modeString(m.e.mode)} ${m.links.padStart(wl)} ${m.e.owner.padEnd(wo)} ${m.e.group.padEnd(wg)} ${m.size.padStart(ws)} ${lsDate(m.e.mtime)} `;
        const nm = tty ? quoteName(m.name) : m.name;
        text += head + nm + "\n";
        rich.push({ text: head }, { text: nm, tone: toneOf(m.e) }, { text: "\n" });
      }
      out(c, text, rich);
      return;
    }
    if (!rows.length) return;
    if (oneLine) {
      const rich: Seg[] = [];
      rows.forEach((r, i) => {
        if (i) rich.push({ text: "  " });
        rich.push({ text: quoteName(r.name), tone: toneOf(r.e) });
      });
      rich.push({ text: "\n" });
      out(c, rows.map((r) => quoteName(r.name)).join("  ") + "\n", rich);
    } else {
      const rich: Seg[] = [];
      for (const r of rows) rich.push({ text: tty ? quoteName(r.name) : r.name, tone: toneOf(r.e) }, { text: "\n" });
      out(c, rows.map((r) => r.name + "\n").join(""), rich);
    }
  };

  files.sort((a, b) => order(a.shown, b.shown));
  if (files.length) render(files.map((f) => ({ name: f.shown, e: f.e, path: f.path })), false);
  dirs.sort((a, b) => order(a.shown, b.shown));
  const recursive = p.flags.has("R");
  const headers = targets.length > 1 || recursive;
  let printed = files.length > 0;
  const listDir = (d: { shown: string; path: string; e: Entry }) => {
    if (headers) out(c, `${printed ? "\n" : ""}${d.shown}:\n`);
    printed = true;
    if (!can(sh, d.e, R)) {
      err(c, `ls: cannot open directory '${d.shown}': Permission denied`);
      code = 2;
      return;
    }
    const names = childrenOf(sh.fs, d.path).filter((n) => all || almost || !n.startsWith("."));
    const rows = names.sort(order).map((n) => ({ name: n, e: sh.fs[childPath(d.path, n)], path: childPath(d.path, n) }));
    const subdirs = rows.filter((r) => r.e.kind === "dir");
    if (all) {
      const dots = [
        { name: ".", e: d.e, path: d.path },
        { name: "..", e: sh.fs[parentOf(d.path)], path: parentOf(d.path) },
      ];
      rows.unshift(...(p.flags.has("r") ? dots.reverse() : dots));
    }
    render(rows, true);
    if (recursive) for (const sd of subdirs) listDir({ shown: d.shown.endsWith("/") ? d.shown + sd.name : `${d.shown}/${sd.name}`, path: sd.path, e: sd.e });
  };
  dirs.forEach(listDir);
  return code;
}

function copyMove(c: Call, bin: "cp" | "mv" | string): number {
  const { sh, rc } = c;
  const p = opts(c.argv, bin === "cp" ? "rRfivp" : "fiv");
  if (p.bad) return badOption(c, p);
  const recursive = p.flags.has("r") || p.flags.has("R");
  if (p.rest.length === 0) {
    err(c, `${bin}: missing file operand`);
    err(c, tryHelp(bin));
    return 1;
  }
  if (p.rest.length === 1) {
    err(c, `${bin}: missing destination file operand after '${p.rest[0]}'`);
    err(c, tryHelp(bin));
    return 1;
  }
  const destArg = p.rest[p.rest.length - 1];
  const sources = p.rest.slice(0, -1);
  const dw = walk(sh, destArg);
  if (!dw.ok) {
    err(c, `${bin}: ${bin === "cp" ? "cannot create regular file" : "cannot move to"} '${destArg}': ${MSG[dw.err]}`);
    return 1;
  }
  const destIsDir = dw.entry?.kind === "dir";
  if (sources.length > 1 && !destIsDir) {
    err(c, `${bin}: target '${destArg}' is not a directory`);
    return 1;
  }
  let code = 0;
  for (const s of sources) {
    const sw = walk(sh, s);
    if (!sw.ok || !sw.entry) {
      err(c, `${bin}: cannot stat '${s}': ${sw.ok ? MSG.ENOENT : MSG[sw.err]}`);
      code = 1;
      continue;
    }
    const src = sw.entry;
    const target = destIsDir ? childPath(dw.path, baseName(sw.path)) : dw.path;
    if (target === sw.path) {
      err(c, bin === "cp" ? `cp: '${s}' and '${destIsDir ? `${destArg}/${baseName(sw.path)}` : destArg}' are the same file` : `mv: '${s}' and '${destIsDir ? `${destArg}/${baseName(sw.path)}` : destArg}' are the same file`);
      code = 1;
      continue;
    }
    if (src.kind === "dir" && (target + "/").startsWith(sw.path + "/")) {
      err(c, bin === "cp" ? `cp: cannot copy a directory, '${s}', into itself, '${destIsDir ? `${destArg}/${baseName(sw.path)}` : destArg}'` : `mv: cannot move '${s}' to a subdirectory of itself, '${destIsDir ? `${destArg}/${baseName(sw.path)}` : destArg}'`);
      code = 1;
      continue;
    }
    if (bin === "cp" && src.kind === "dir" && !recursive) {
      err(c, `cp: -r not specified; omitting directory '${s}'`);
      code = 1;
      continue;
    }
    if (bin === "cp" && !can(sh, src, R)) {
      err(c, `cp: cannot open '${s}' for reading: Permission denied`);
      code = 1;
      continue;
    }
    const existing = sh.fs[target];
    if (existing && existing.kind === "dir" && src.kind !== "dir") {
      err(c, `${bin}: cannot overwrite directory '${destIsDir ? `${destArg}/${baseName(sw.path)}` : destArg}' with non-directory`);
      code = 1;
      continue;
    }
    if (existing && existing.kind !== "dir" && src.kind === "dir") {
      err(c, `${bin}: cannot overwrite non-directory '${destIsDir ? `${destArg}/${baseName(sw.path)}` : destArg}' with directory '${s}'`);
      code = 1;
      continue;
    }
    const tparent = sh.fs[parentOf(target)];
    if (!tparent || tparent.kind !== "dir") {
      err(c, `${bin}: cannot ${bin === "cp" ? "create regular file" : "move"} '${destArg}': No such file or directory`);
      code = 1;
      continue;
    }
    if (!can(sh, tparent, W) || (bin === "mv" && !can(sh, sh.fs[parentOf(sw.path)], W))) {
      err(c, bin === "cp" ? `cp: cannot create regular file '${destArg}': Permission denied` : `mv: cannot move '${s}' to '${destArg}': Permission denied`);
      code = 1;
      continue;
    }
    if (existing && existing.kind === "dir") removeTree(sh.fs, target);
    const prefix = sw.path + "/";
    const moved: [string, Entry][] = [];
    for (const [k, e] of Object.entries(sh.fs)) {
      if (k === sw.path || k.startsWith(prefix)) moved.push([target + k.slice(sw.path.length), e]);
    }
    if (bin === "mv") {
      removeTree(sh.fs, sw.path);
      for (const [k, e] of moved) sh.fs[k] = e;
      // a process's working directory follows the directory when it moves
      if (sh.cwd === sw.path || sh.cwd.startsWith(prefix)) {
        sh.cwd = target + sh.cwd.slice(sw.path.length);
        sh.env.PWD = sh.cwd;
      }
    } else {
      for (const [k, e] of moved) {
        const prev = sh.fs[k];
        sh.fs[k] = prev && prev.kind === "file" && e.kind === "file"
          ? { ...prev, content: e.content, mtime: rc.now }
          : { ...e, owner: sh.user, group: sh.groups[0] ?? sh.user, mode: p.flags.has("p") ? e.mode : e.mode & ~0o022, mtime: p.flags.has("p") ? e.mtime : rc.now };
      }
    }
    if (p.flags.has("v")) out(c, `'${s}' -> '${destIsDir ? `${destArg.replace(/\/$/, "")}/${baseName(sw.path)}` : destArg}'\n`);
  }
  return code;
}

function rm(c: Call): number {
  const { sh } = c;
  const p = opts(c.argv, "rRfiv");
  if (p.bad) return badOption(c, p);
  const force = p.flags.has("f");
  const recursive = p.flags.has("r") || p.flags.has("R");
  if (!p.rest.length) {
    if (force) return 0;
    err(c, "rm: missing operand");
    err(c, tryHelp("rm"));
    return 1;
  }
  let code = 0;
  for (const f of p.rest) {
    if (/(^|\/)\.\.?\/?$/.test(f)) {
      err(c, `rm: refusing to remove '.' or '..' directory: skipping '${f}'`);
      code = 1;
      continue;
    }
    const w = walk(sh, f);
    if (w.ok && w.path === "/" && recursive) {
      err(c, "rm: it is dangerous to operate recursively on '/'");
      err(c, "rm: use --no-preserve-root to override this failsafe");
      code = 1;
      continue;
    }
    if (!w.ok || !w.entry) {
      if (!force) {
        err(c, `rm: cannot remove '${f}': ${w.ok ? MSG.ENOENT : MSG[w.err]}`);
        code = 1;
      }
      continue;
    }
    if (w.entry.kind === "dir" && !recursive) {
      err(c, `rm: cannot remove '${f}': Is a directory`);
      code = 1;
      continue;
    }
    if (!can(sh, sh.fs[parentOf(w.path)], W)) {
      err(c, `rm: cannot remove '${f}': Permission denied`);
      code = 1;
      continue;
    }
    if (w.path === sh.cwd || sh.cwd.startsWith(w.path + "/")) {
      // allowed on Linux: you are left standing in a deleted directory
    }
    removeTree(sh.fs, w.path);
    if (p.flags.has("v")) out(c, `removed ${w.entry.kind === "dir" ? "directory " : ""}'${f}'\n`);
  }
  return code;
}

function headTail(c: Call, bin: string): number {
  const p = opts(c.argv, "qv", "nc", true);
  if (p.bad) return badOption(c, p);
  const nArg = p.vals.n ?? "10";
  const fromStart = bin === "tail" && nArg.startsWith("+");
  const n = Number(nArg.replace(/^[+-]/, ""));
  if (!Number.isFinite(n)) {
    err(c, `${bin}: invalid number of lines: '${nArg}'`);
    return 1;
  }
  const files = p.rest.length ? p.rest : ["-"];
  let code = 0;
  files.forEach((f, i) => {
    const t = f === "-" ? c.io.stdin ?? "" : readFile(c, f, "open");
    if (t === null) {
      code = 1;
      return;
    }
    if (files.length > 1) out(c, `${i ? "\n" : ""}==> ${f === "-" ? "standard input" : f} <==\n`);
    const lines = splitLines(t);
    const pick = bin === "head" ? lines.slice(0, n) : fromStart ? lines.slice(Math.max(0, n - 1)) : n === 0 ? [] : lines.slice(-n);
    const endsNl = t.endsWith("\n");
    let s = pick.join("\n");
    if (pick.length && (endsNl || (bin === "head" ? pick.length < lines.length : false))) s += "\n";
    out(c, s);
  });
  return code;
}

function wc(c: Call): number {
  const p = opts(c.argv, "lwcm");
  if (p.bad) return badOption(c, p);
  const which = ["l", "w", "c"].filter((f) => p.flags.has(f) || (f === "c" && p.flags.has("m")));
  const show = which.length ? which : ["l", "w", "c"];
  const files = p.rest.length ? p.rest : ["-"];
  const rows: { counts: number[]; name: string }[] = [];
  let code = 0;
  let totalBytes = 0;
  for (const f of files) {
    const t = f === "-" ? c.io.stdin ?? "" : readFile(c, f);
    if (t === null) {
      code = 1;
      continue;
    }
    const counts = { l: (t.match(/\n/g) ?? []).length, w: t.split(/\s+/).filter(Boolean).length, c: bytes(t) };
    totalBytes += counts.c;
    rows.push({ counts: show.map((k) => counts[k as "l" | "w" | "c"]), name: f === "-" ? "" : f });
  }
  if (rows.length > 1) rows.push({ counts: show.map((_, i) => rows.reduce((s, r) => s + r.counts[i], 0)), name: "total" });
  const fromStdin = files.includes("-");
  // GNU wc pads every column to the width of the total byte count (7 when reading a pipe)
  const width = show.length === 1 && rows.length === 1 ? 1 : fromStdin ? 7 : String(totalBytes).length;
  for (const r of rows) out(c, r.counts.map((n) => String(n).padStart(width)).join(" ") + (r.name ? ` ${r.name}` : "") + "\n");
  return code;
}

function toRegex(pattern: string, mode: "basic" | "extended" | "fixed", ignoreCase: boolean): RegExp | null {
  let src = pattern;
  if (mode === "fixed") src = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  else if (mode === "basic") {
    // in a basic regex + ? | ( ) { } are plain characters, and \+ \? \| \( \) are the special ones
    let s = "";
    for (let i = 0; i < pattern.length; i++) {
      const ch = pattern[i];
      if (ch === "\\" && i + 1 < pattern.length && "+?|(){}".includes(pattern[i + 1])) {
        s += pattern[i + 1];
        i++;
      } else if ("+?|(){}".includes(ch)) s += "\\" + ch;
      else if (ch === "\\" && i + 1 < pattern.length) {
        s += ch + pattern[i + 1];
        i++;
      } else s += ch;
    }
    src = s;
  }
  try {
    return new RegExp(src, ignoreCase ? "gi" : "g");
  } catch {
    return null;
  }
}

function grep(c: Call): number {
  const { sh } = c;
  const p = opts(c.argv, "ivncrREFlwoH", "e");
  if (p.flags.has("help")) {
    out(c, `Usage: ${HELP.grep[0]}\n${HELP.grep[1]}\n`);
    return 0;
  }
  if (p.bad) return badOption(c, p, 2);
  const rest = [...p.rest];
  const pattern = p.vals.e ?? rest.shift();
  if (pattern === undefined) {
    err(c, "Usage: grep [OPTION]... PATTERNS [FILE]...");
    err(c, tryHelp("grep"));
    return 2;
  }
  const re = toRegex(pattern, p.flags.has("F") ? "fixed" : p.flags.has("E") ? "extended" : "basic", p.flags.has("i"));
  if (!re) {
    err(c, "grep: Unmatched ( or \\(");
    return 2;
  }
  const recursive = p.flags.has("r") || p.flags.has("R");
  const inputs: { name: string; text: string }[] = [];
  let code = 0;
  const targets = rest.length ? rest : recursive ? ["."] : ["-"];
  const addDir = (shown: string, path: string) => {
    for (const n of childrenOf(sh.fs, path).sort(nameCompare)) {
      const cp = childPath(path, n);
      const e = sh.fs[cp];
      const s = shown === "." && !rest.length ? n : shown.endsWith("/") ? shown + n : `${shown}/${n}`;
      if (e.kind === "dir") addDir(s, cp);
      else if (can(sh, e, R)) inputs.push({ name: s, text: e.content });
      else {
        err(c, `grep: ${s}: Permission denied`);
        code = 2;
      }
    }
  };
  for (const t of targets) {
    if (t === "-") {
      inputs.push({ name: "(standard input)", text: c.io.stdin ?? "" });
      continue;
    }
    const w = walk(sh, t);
    if (recursive && w.ok && w.entry?.kind === "dir") {
      addDir(t, w.path);
      continue;
    }
    const text = readFile(c, t);
    if (text === null) {
      code = 2;
      continue;
    }
    inputs.push({ name: t, text });
  }
  const showNames = p.flags.has("H") || inputs.length > 1 || recursive;
  let matched = false;
  let text = "";
  const rich: Seg[] = [];
  const emit = (prefix: string, line: string, hl: boolean) => {
    text += prefix + line + "\n";
    if (prefix) rich.push({ text: prefix, tone: "path" });
    if (hl) {
      let at = 0;
      re.lastIndex = 0;
      for (const m of line.matchAll(re)) {
        if (!m[0]) break;
        if ((m.index ?? 0) > at) rich.push({ text: line.slice(at, m.index) });
        rich.push({ text: m[0], tone: "match" });
        at = (m.index ?? 0) + m[0].length;
      }
      rich.push({ text: line.slice(at) + "\n" });
    } else rich.push({ text: line + "\n" });
  };
  const word = p.flags.has("w");
  for (const inp of inputs) {
    let count = 0;
    splitLines(inp.text).forEach((line, i) => {
      re.lastIndex = 0;
      let hit = re.test(line);
      if (hit && word) {
        re.lastIndex = 0;
        hit = [...line.matchAll(re)].some((m) => {
          const a = line[(m.index ?? 0) - 1] ?? " ";
          const b = line[(m.index ?? 0) + m[0].length] ?? " ";
          return !/\w/.test(a) && !/\w/.test(b);
        });
      }
      if (p.flags.has("v")) hit = !hit;
      if (!hit) return;
      count++;
      matched = true;
      if (p.flags.has("c") || p.flags.has("l")) return;
      const prefix = (showNames ? inp.name + ":" : "") + (p.flags.has("n") ? `${i + 1}:` : "");
      if (p.flags.has("o") && !p.flags.has("v")) {
        re.lastIndex = 0;
        for (const m of line.matchAll(re)) if (m[0]) emit(prefix, m[0], true);
      } else emit(prefix, line, !p.flags.has("v"));
    });
    if (p.flags.has("c")) {
      const line = (showNames ? inp.name + ":" : "") + count;
      text += line + "\n";
      rich.push({ text: line + "\n" });
    } else if (p.flags.has("l") && count) {
      text += inp.name + "\n";
      rich.push({ text: inp.name + "\n", tone: "path" });
    }
  }
  out(c, text, rich);
  if (code) return 2;
  return matched ? 0 : 1;
}

function chmod(c: Call): number {
  const { sh } = c;
  const args = [...c.argv];
  const recursive = args[0] === "-R";
  if (recursive) args.shift();
  if (args[0] === "--help") {
    out(c, `Usage: ${HELP.chmod[0]}\n${HELP.chmod[1]}\n`);
    return 0;
  }
  if (!args.length) {
    err(c, "chmod: missing operand");
    err(c, tryHelp("chmod"));
    return 1;
  }
  const modeArg = args.shift() as string;
  if (!args.length) {
    err(c, `chmod: missing operand after '${modeArg}'`);
    err(c, tryHelp("chmod"));
    return 1;
  }
  const apply = parseChmod(modeArg);
  if (!apply) {
    err(c, `chmod: invalid mode: '${modeArg}'`);
    err(c, tryHelp("chmod"));
    return 1;
  }
  let code = 0;
  for (const f of args) {
    const w = walk(sh, f);
    if (!w.ok || !w.entry) {
      err(c, `chmod: cannot access '${f}': ${w.ok ? MSG.ENOENT : MSG[w.err]}`);
      code = 1;
      continue;
    }
    const paths = recursive && w.entry.kind === "dir" ? Object.keys(sh.fs).filter((k) => k === w.path || k.startsWith(w.path + "/")) : [w.path];
    for (const path of paths) {
      const e = sh.fs[path];
      if (e.owner !== sh.user && sh.user !== "root") {
        err(c, `chmod: changing permissions of '${path === w.path ? f : path}': Operation not permitted`);
        code = 1;
        continue;
      }
      const [next, intended] = apply(e.mode, e.kind === "dir");
      e.mode = next;
      if (next !== intended) {
        err(c, `chmod: ${f}: new permissions are ${modeString(next)}, not ${modeString(intended)}`);
        code = 1;
      }
    }
  }
  return code;
}

/** Returns a function giving [new mode, mode if no umask applied] for a mode argument, or null if invalid. */
export function parseChmod(arg: string): ((mode: number, isDir: boolean) => [number, number]) | null {
  if (/^[0-7]{1,4}$/.test(arg)) {
    const v = parseInt(arg, 8) & 0o777;
    return () => [v, v];
  }
  const clauses = arg.split(",");
  const parsed: { who: string; ops: { op: string; perms: string }[] }[] = [];
  for (const cl of clauses) {
    const m = /^([ugoa]*)((?:[-+=][rwxX]*)+)$/.exec(cl);
    if (!m) return null;
    const ops = [...m[2].matchAll(/([-+=])([rwxX]*)/g)].map((x) => ({ op: x[1], perms: x[2] }));
    parsed.push({ who: m[1], ops });
  }
  const umask = 0o022;
  return (mode, isDir) => {
    const run = (masked: boolean) => {
      let m = mode;
      for (const cl of parsed) {
        const who = cl.who === "" ? "a" : cl.who;
        const whoMask = (who.includes("a") ? 0o777 : 0) | (who.includes("u") ? 0o700 : 0) | (who.includes("g") ? 0o070 : 0) | (who.includes("o") ? 0o007 : 0);
        const limit = masked && cl.who === "" ? ~umask & 0o777 : 0o777;
        for (const { op, perms } of cl.ops) {
          let bits = 0;
          if (perms.includes("r")) bits |= 0o444;
          if (perms.includes("w")) bits |= 0o222;
          if (perms.includes("x")) bits |= 0o111;
          if (perms.includes("X") && (isDir || m & 0o111)) bits |= 0o111;
          bits &= whoMask & limit;
          if (op === "+") m |= bits;
          else if (op === "-") m &= ~bits;
          else m = (m & ~(whoMask & limit)) | bits;
        }
      }
      return m & 0o777;
    };
    return [run(true), run(false)];
  };
}

function ps(c: Call): number {
  const { sh, rc } = c;
  tick(sh, rc.now);
  const args = c.argv.join(" ");
  const all = /(^|\s)-(e|A|ef|aux)\b/.test(args) || /\baux\b/.test(args) || args === "ax";
  const aux = /\baux\b/.test(args) || args === "ax";
  const selfPid = sh.nextPid;
  const procs: Proc[] = [
    ...sh.procs.filter((p) => p.system),
    { pid: sh.shellPid, cmd: "bash", args: "-bash", user: sh.user, tty: "pts/0", started: BASE_TIME },
    ...sh.procs.filter((p) => !p.system && !p.status),
    { pid: selfPid, cmd: "ps", args: `ps${args ? " " + args : ""}`, user: sh.user, tty: "pts/0", started: rc.now },
  ];
  const shown = all ? procs : procs.filter((p) => p.tty === "pts/0" && p.user === sh.user);
  shown.sort((a, b) => a.pid - b.pid);
  let text = "";
  if (aux) {
    text += "USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n";
    for (const p of shown) {
      const vsz = p.cmd === "bash" ? 8620 : p.cmd === "sleep" ? 5684 : p.system ? 167744 : 24820;
      const rss = p.cmd === "bash" ? 5248 : p.cmd === "sleep" ? 1920 : p.system ? 11520 : 9988;
      const stat = p.stopped ? "T" : p.cmd === "ps" ? "R+" : p.cmd === "bash" ? "Ss" : p.cpu && p.cpu > 50 ? "R" : "S";
      const d = new Date(p.started);
      const time = p.time ? p.time.replace(/^00:/, "").replace(/^0(\d)/, "$1") : "0:00";
      text += `${p.user.padEnd(8).slice(0, 8)} ${String(p.pid).padStart(7)} ${(p.cpu ?? 0).toFixed(1).padStart(4)} ${(p.mem ?? 0).toFixed(1).padStart(4)} ${String(vsz).padStart(6)} ${String(rss).padStart(5)} ${p.tty.padEnd(8)} ${stat.padEnd(4)} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())} ${time.padStart(6)} ${p.args}\n`;
    }
  } else {
    text += "    PID TTY          TIME CMD\n";
    for (const p of shown) text += `${String(p.pid).padStart(7)} ${p.tty.padEnd(8)} ${(p.time ?? "00:00:00").padStart(8)} ${p.cmd}\n`;
  }
  out(c, text);
  return 0;
}

// ───────────────────────────── Entry points ─────────────────────────────

export function cloneShell(sh: Shell): Shell {
  return JSON.parse(JSON.stringify(sh)) as Shell;
}

function plain(segs: Seg[]) {
  return segs.map((s) => s.text).join("");
}

/** Jobs that finished or were killed are reported just before the next prompt, like bash. */
function report(sh: Shell, now: number, display: Seg[]) {
  tick(sh, now);
  const done = sh.procs.filter((p) => p.job && p.status).sort((a, b) => (a.job ?? 0) - (b.job ?? 0));
  for (const p of done) display.push({ text: jobLine(p.job ?? 0, jobMarker(sh, p), p.status ?? "Done", p.jobText ?? p.args) + "\n" });
  sh.procs = sh.procs.filter((p) => !(p.job && p.status));
}

function finishRun(rc: RunCtx, rest: Item[] | null, cmdText: string, typed: boolean): RunResult {
  const sh = rc.sh;
  const text = plain(rc.display).replace(/\n+$/, "");
  if (rc.block) {
    sh.fg = { ...rc.block, rest: rest ?? [] };
  } else {
    sh.fg = null;
    report(sh, rc.now, rc.display);
  }
  if (typed) {
    sh.lastCommand = cmdText;
    sh.lastOutput = text;
  } else sh.lastOutput = sh.lastOutput && text ? `${sh.lastOutput}\n${text}` : sh.lastOutput || text;
  return { shell: sh, out: rc.display, clear: rc.clear };
}

/** Run one command line typed at the prompt. */
export function run(shell: Shell, line: string, now: number): RunResult {
  const sh = cloneShell(shell);
  const rc: RunCtx = { sh, now, display: [], depth: 0, canBlock: true, block: null, clear: false };
  let src = line;
  if (src.includes("!!")) {
    const prev = sh.history[sh.history.length - 1];
    if (!prev) {
      rc.display.push({ text: "bash: !!: event not found\n", tone: "err" });
      sh.lastCode = 1;
      return finishRun(rc, null, line, true);
    }
    src = src.split("!!").join(prev);
    rc.display.push({ text: src + "\n" });
  }
  if (src.trim()) {
    sh.history.push(src);
    sh.typed++;
  }
  let items: Item[];
  try {
    items = parse(src);
  } catch (e) {
    rc.display.push({ text: `bash: ${(e as Error).message}\n`, tone: "err" });
    sh.lastCode = 2;
    return finishRun(rc, null, src, true);
  }
  tick(sh, now);
  const display = rc.display;
  const io: Io = {
    out: { tty: true, write: (t, rich) => (rich ? display.push(...rich) : display.push({ text: t })) },
    err: { tty: true, write: (t) => display.push({ text: t, tone: "err" }) },
    stdin: null,
  };
  const rest = execList(rc, items, io, { pos: [], name: "bash" });
  return finishRun(rc, rest, src, true);
}

function resumeRest(sh: Shell, now: number, rest: Item[], display: Seg[], code: number): RunResult {
  sh.lastCode = code;
  const rc: RunCtx = { sh, now, display, depth: 0, canBlock: true, block: null, clear: false };
  const io: Io = {
    out: { tty: true, write: (t, rich) => (rich ? display.push(...rich) : display.push({ text: t })) },
    err: { tty: true, write: (t) => display.push({ text: t, tone: "err" }) },
    stdin: null,
  };
  const left = execList(rc, rest, io, { pos: [], name: "bash" });
  return finishRun(rc, left, sh.lastCommand, false);
}

/** The foreground command's time is up: continue with whatever followed it on the line. */
export function finishForeground(shell: Shell, now: number): RunResult {
  const sh = cloneShell(shell);
  const fg = sh.fg;
  if (!fg) return { shell: sh, out: [], clear: false };
  sh.procs = sh.procs.filter((p) => p.pid !== fg.pid);
  sh.fg = null;
  return resumeRest(sh, now, fg.rest, [], 0);
}

/** Ctrl+C: SIGINT to the foreground command (the rest of the line is abandoned). */
export function interrupt(shell: Shell, now: number): RunResult {
  const sh = cloneShell(shell);
  const fg = sh.fg;
  const display: Seg[] = [{ text: "^C\n" }];
  if (fg) {
    sh.procs = sh.procs.filter((p) => p.pid !== fg.pid);
    sh.fg = null;
  }
  sh.lastCode = 130;
  report(sh, now, display);
  sh.lastOutput = "";
  return { shell: sh, out: display, clear: false };
}

/** Ctrl+Z: SIGTSTP stops the foreground command and makes it a job. */
export function suspend(shell: Shell, now: number): RunResult {
  const sh = cloneShell(shell);
  const fg = sh.fg;
  if (!fg) return { shell: sh, out: [], clear: false };
  const p = sh.procs.find((q) => q.pid === fg.pid);
  const display: Seg[] = [{ text: "^Z\n" }];
  if (p) {
    p.stopped = true;
    p.remaining = Math.max(0, fg.until - now);
    p.job = p.job ?? Math.max(0, ...sh.procs.map((q) => q.job ?? 0)) + 1;
    display.push({ text: jobLine(p.job, jobMarker(sh, p), "Stopped", p.jobText ?? p.args) + "\n" });
  }
  sh.fg = null;
  sh.lastCode = 148;
  return { shell: sh, out: display, clear: false };
}

// ───────────────────────────── Completion ─────────────────────────────

/** Tab completion: command names for the first word, paths after that. */
export function complete(sh: Shell, line: string): { line: string; options: string[] } {
  const m = /(\S*)$/.exec(line);
  const word = m ? m[1] : "";
  const before = line.slice(0, line.length - word.length);
  const first = before.trim() === "" || /[|;&]\s*$/.test(before);
  let candidates: { name: string; dir: boolean }[] = [];
  let dirPart = "";
  let partial = word;
  if (first && !word.includes("/")) {
    const names = new Set<string>([...BUILTINS].filter((b) => /^[a-z]/.test(b)));
    for (const d of (sh.env.PATH ?? "").split(":")) {
      const dir = normalize(d || sh.cwd);
      for (const n of childrenOf(sh.fs, dir)) if (sh.fs[childPath(dir, n)].kind === "file") names.add(n);
    }
    const allowed = sh.allowed;
    candidates = [...names].filter((n) => n.startsWith(word) && (!allowed || allowed.includes(n))).map((name) => ({ name, dir: false }));
  } else {
    const slash = word.lastIndexOf("/");
    dirPart = slash >= 0 ? word.slice(0, slash + 1) : "";
    partial = slash >= 0 ? word.slice(slash + 1) : word;
    const dirReal = dirPart.startsWith("~") ? (sh.env.HOME ?? sh.home) + dirPart.slice(1) : dirPart;
    const w = walk(sh, dirReal === "" ? "." : dirReal);
    if (w.ok && w.entry?.kind === "dir") {
      candidates = childrenOf(sh.fs, w.path)
        .filter((n) => n.startsWith(partial) && (partial.startsWith(".") || !n.startsWith(".")))
        .map((name) => ({ name, dir: sh.fs[childPath(w.path, name)].kind === "dir" }));
    }
  }
  candidates.sort((a, b) => nameCompare(a.name, b.name));
  if (candidates.length === 0) return { line, options: [] };
  if (candidates.length === 1) {
    const cnd = candidates[0];
    const text = first && !dirPart ? cnd.name + " " : dirPart + cnd.name + (cnd.dir ? "/" : " ");
    return { line: before + text, options: [] };
  }
  let common = candidates[0].name;
  for (const cnd of candidates) while (!cnd.name.startsWith(common)) common = common.slice(0, -1);
  const prefixLen = first && !dirPart ? word.length : partial.length;
  if (common.length > prefixLen) return { line: before + dirPart + common, options: [] };
  return { line, options: candidates.map((cnd) => cnd.name + (cnd.dir ? "/" : "")) };
}

// ───────────────────────────── Goal state ─────────────────────────────

export interface TerminalState {
  cwd: string;
  home: string;
  user: string;
  files: Record<string, { kind: "file" | "dir"; content?: string; mode: string; owner: string }>;
  last: { command: string; output: string; code: number };
  history: string[];
  typed: number;
  env: Record<string, string>;
  procs: { pid: number; cmd: string; job?: number; stopped?: boolean }[];
}

export function shellState(sh: Shell, now: number): TerminalState {
  const files: TerminalState["files"] = {};
  for (const [p, e] of Object.entries(sh.fs)) {
    if (p.startsWith("/usr/") || p.startsWith("/dev/")) continue;
    files[p] = e.kind === "file" ? { kind: "file", content: e.content, mode: modeString(e.mode), owner: e.owner } : { kind: "dir", mode: modeString(e.mode), owner: e.owner };
  }
  const alive = sh.procs.filter((p) => !p.system && !p.status && (p.endsAt === undefined || p.stopped || p.endsAt > now));
  return {
    cwd: sh.cwd,
    home: sh.home,
    user: sh.user,
    files,
    last: { command: sh.lastCommand, output: sh.lastOutput, code: sh.lastCode },
    history: [...sh.history],
    typed: sh.typed,
    env: { ...sh.env },
    procs: alive.map((p) => ({ pid: p.pid, cmd: p.cmd, job: p.job, stopped: p.stopped })),
  };
}
