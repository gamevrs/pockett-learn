import { parseMode, modeString, type TerminalState } from "./shell";

/**
 * Goals for the terminal widget. Every key given must hold. Paths may start with "~".
 *
 * - cwd: "/home/ada/projects"            working directory
 * - exists / missing: ["~/a.txt"]          paths that must (not) exist
 * - dirs / files: ["~/drafts"]             paths that must be a directory / a regular file
 * - content: { "~/a.txt": "hi\n" }       exact file content (one trailing newline is optional)
 * - contains: { "~/a.txt": "milk" }       file content includes the text
 * - mode: { "~/run.sh": "rwxr-xr-x" }    exact permissions ("755" also works)
 * - executable: ["~/run.sh"]               the owner may run it
 * - output: "3"                            the last command printed exactly this (trailing space ignored)
 * - outputIncludes: "ERROR" | [...]        the last output includes each text
 * - lastCommand: "^grep .*\\|"            regex the last command must match
 * - historyMatches: ["^ls", "^cd"]         each regex must match a command typed in this terminal
 * - code: 0                                exit status of the last command
 * - env: { GREETING: "hi" }                environment variables (exact)
 * - envIncludes: { PATH: "/home/ada/bin" } variables include the text
 * - killed: [5120]                         these PIDs are no longer running
 * - running / notRunning: ["sleep"]        a process with this name is (not) running
 * - maxCommands: 1                         typed at most this many commands
 */
export type TerminalGoal = Partial<{
  cwd: string;
  exists: string[];
  missing: string[];
  dirs: string[];
  files: string[];
  content: Record<string, string>;
  contains: Record<string, string>;
  mode: Record<string, string>;
  executable: string[];
  output: string;
  outputIncludes: string | string[];
  lastCommand: string;
  historyMatches: string[];
  code: number;
  env: Record<string, string>;
  envIncludes: Record<string, string>;
  killed: number[];
  running: string[];
  notRunning: string[];
  maxCommands: number;
}>;

const KNOWN = [
  "cwd", "exists", "missing", "dirs", "files", "content", "contains", "mode", "executable", "output", "outputIncludes",
  "lastCommand", "historyMatches", "code", "env", "envIncludes", "killed", "running", "notRunning", "maxCommands",
];

const trimLines = (s: string) => s.replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").replace(/\n+$/, "");
const stripNl = (s: string) => s.replace(/\n$/, "");

export function checkTerminal(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as TerminalState | undefined;
  if (!s || !s.files) return false;
  const g = goal as TerminalGoal;
  if (!KNOWN.some((k) => k in goal)) return false;
  const abs = (p: string) => {
    const full = p === "~" ? s.home : p.startsWith("~/") ? s.home + p.slice(1) : p;
    return full.length > 1 ? full.replace(/\/$/, "") : full;
  };
  const file = (p: string) => s.files[abs(p)];
  const re = (src: string) => {
    try {
      return new RegExp(src);
    } catch {
      return null;
    }
  };

  if (g.cwd !== undefined && s.cwd !== abs(g.cwd)) return false;
  if (g.exists?.some((p) => !file(p))) return false;
  if (g.missing?.some((p) => file(p))) return false;
  if (g.dirs?.some((p) => file(p)?.kind !== "dir")) return false;
  if (g.files?.some((p) => file(p)?.kind !== "file")) return false;
  if (g.content && Object.entries(g.content).some(([p, want]) => {
    const f = file(p);
    return f?.kind !== "file" || stripNl(f.content ?? "") !== stripNl(want);
  })) return false;
  if (g.contains && Object.entries(g.contains).some(([p, want]) => !(file(p)?.content ?? "").includes(want))) return false;
  if (g.mode && Object.entries(g.mode).some(([p, want]) => file(p)?.mode !== modeString(parseMode(want, -1)))) return false;
  if (g.executable?.some((p) => file(p)?.mode[2] !== "x")) return false;
  if (g.output !== undefined && trimLines(s.last.output) !== trimLines(g.output)) return false;
  if (g.outputIncludes !== undefined) {
    const wants = Array.isArray(g.outputIncludes) ? g.outputIncludes : [g.outputIncludes];
    if (wants.some((w) => !s.last.output.includes(w))) return false;
  }
  if (g.lastCommand !== undefined && !re(g.lastCommand)?.test(s.last.command)) return false;
  if (g.historyMatches?.some((src) => !s.history.some((h) => re(src)?.test(h)))) return false;
  if (g.code !== undefined && s.last.code !== g.code) return false;
  if (g.env && Object.entries(g.env).some(([k, v]) => s.env[k] !== v)) return false;
  if (g.envIncludes && Object.entries(g.envIncludes).some(([k, v]) => !(s.env[k] ?? "").includes(v))) return false;
  if (g.killed?.some((pid) => s.procs.some((p) => p.pid === pid))) return false;
  if (g.running?.some((name) => !s.procs.some((p) => p.cmd === name))) return false;
  if (g.notRunning?.some((name) => s.procs.some((p) => p.cmd === name))) return false;
  if (g.maxCommands !== undefined && s.typed > g.maxCommands) return false;
  return true;
}
