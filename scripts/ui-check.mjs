// pockett UI check suite: drives headless Chrome over CDP (no dependencies beyond Node and a Chrome install).
//
//   node scripts/ui-check.mjs                          full run against http://localhost:3100
//   node scripts/ui-check.mjs --base http://localhost:3000 --only editor,prose
//   node scripts/ui-check.mjs --quick                  dark theme, 1440 px only
//   npm run ui:check -- --only layout
//
// Options (or env): --base/BASE_URL, --only editor,prose,layout, --themes light,dark, --widths 1440,390,
//                   --out/UI_CHECK_OUT (screenshots of failures), CDP_PORT (default 9651), CHROME (path to chrome).
//
// What it checks, in light and dark at 1440 and 390 px:
//   editor   Monaco token colours on /playground for Python, JavaScript, C#, Rust, Go and C++ samples: strings,
//            keywords, numbers and comments are distinct, interpolated expressions differ from the surrounding
//            string, braces/placeholders/format specs are coloured, nothing falls back to the default colour,
//            every token has >= 4.5:1 contrast on the editor background.
//   prose    lesson code blocks (src/components/ui/Prose.tsx): f-strings, template literals and $"..." render
//            their {holes} in different colours than the string around them.
//   layout   no horizontal overflow, navbar items vertically centred, text contrast >= 4.5:1 (3:1 for large text),
//            no console errors, images have alt, buttons and links have accessible names.
//   workspace  lesson workspace and code-running feedback (scripts/ui-check-workspace.mjs): runner failures (503, 429, offline, hang),
//            Submit-while-Run queueing, console hints, blocked CDNs, result bar, stage hints, shortcut labels, Learn-tab code blocks.
//   learn    Foundations player (scripts/ui-check-learn.mjs): Enter submits / Space toggles, wrong-answer help, resume where you
//            stopped, confirm before losing typed code, no raw TypeError in project checks.
//   audio    volume and mute (scripts/ui-check-audio.mjs): audio is off by default, no AudioContext until opt-in, one shared
//            master gain, navbar/stage controls share one state, sliders by mouse/keys/touch, persistence, second tab, legacy state.
//   site     site-wide UX and accessibility (scripts/ui-check-site.mjs): robots/sitemap, skip link, mobile menu, tab roles, tap targets
//            of 40px on phones, overflow on every main route, container alignment, /dashboard payload, splitter keyboard.
//
// Exit code 1 when anything FAILs. Needs the dev server (or a production build) to be running.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ───────────────────────────── options ─────────────────────────────

const argv = process.argv.slice(2);
const opt = (name, env, fallback) => {
  const i = argv.indexOf(`--${name}`);
  if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--")) return argv[i + 1];
  return (env && process.env[env]) || fallback;
};
const flag = (name) => argv.includes(`--${name}`);
const QUICK = flag("quick");
const BASE = opt("base", "BASE_URL", "http://localhost:3100").replace(/\/$/, "");
const ONLY = new Set(opt("only", null, "editor,prose,layout,audio,workspace,site,learn").split(","));
const THEMES = opt("themes", null, QUICK ? "dark" : "light,dark").split(",");
const WIDTHS = opt("widths", null, QUICK ? "1440" : "1440,390").split(",").map(Number);
const OUT = opt("out", "UI_CHECK_OUT", join(tmpdir(), "pockett-ui-check"));
const PORT = Number(process.env.CDP_PORT ?? 9651);
const CHROME = process.env.CHROME ?? [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((p) => existsSync(p));

if (!CHROME) {
  console.error("No Chrome found. Set CHROME=/path/to/chrome.");
  process.exit(2);
}
const FAIL_DIR = join(OUT, "failures"); // wiped at the start of every run
rmSync(FAIL_DIR, { recursive: true, force: true });
mkdirSync(FAIL_DIR, { recursive: true });

const ROUTES = [
  ["home", "/"],
  ["projects", "/projects"],
  ["playground", "/playground"],
  ["privacy", "/privacy"],
  ["terms", "/terms"],
  ["brand", "/brand"],
  ["project-hub", "/projects/garage"],
  ["lesson-workspace", "/projects/garage/garage-3-engine"],
  ["foundations-lesson", "/learn/fnd-programs-1-instructions"],
];

const PROSE_LESSONS = [
  { name: "garage f-string", path: "/projects/garage/garage-3-engine", kind: "python" },
  { name: "garage-js template literal", path: "/projects/garage-js/garage-js-3-engine", kind: "javascript" },
  { name: "csharp interpolation", path: "/projects/csharp-basics/csharp-basics-1-hello", kind: "csharp" },
  { name: "rust format macros", path: "/projects/rust-basics/rust-basics-1-hello", kind: "rust" },
];

// ───────────────────────────── CDP plumbing ─────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "pockett-ui-check-"));
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "about:blank",
  ],
  { stdio: "ignore" },
);

let target;
for (let i = 0; i < 75 && !target; i++) {
  await sleep(200);
  try {
    target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === "page");
  } catch {
    /* chrome still starting */
  }
}
if (!target) {
  console.error(`Chrome did not open its debugging port ${PORT}. Try CDP_PORT=<other> or run from PowerShell.`);
  chrome.kill();
  process.exit(2);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let nextId = 0;
const pending = new Map();
let consoleErrors = [];
const eventListeners = new Set(); // other check files subscribe to CDP events (e.g. Fetch.requestPaused) through onEvent
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  for (const listener of eventListeners) listener(msg);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method === "Runtime.exceptionThrown") {
    const d = msg.params.exceptionDetails;
    consoleErrors.push(`exception: ${d.exception?.description?.split("\n")[0] ?? d.text}`);
  } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    consoleErrors.push(`console.error: ${msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(" ").slice(0, 300)}`);
  } else if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
    const e = msg.params.entry;
    consoleErrors.push(`${e.source}: ${e.text}${e.url ? ` (${e.url})` : ""}`.slice(0, 300));
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
async function evaluate(expression) {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text);
  return r.result?.result?.value;
}
/** Runs a function in the page; `arg` must be JSON-serialisable. */
const inPage = (fn, arg) => evaluate(`(${fn.toString()})(${JSON.stringify(arg ?? null)})`);
async function waitFor(fn, arg, timeout = 15000, step = 150) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) {
    try {
      last = await inPage(fn, arg);
      if (last) return last;
    } catch {
      /* page not ready */
    }
    await sleep(step);
  }
  return last;
}

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");

async function configure(theme, width) {
  const mobile = width < 700;
  await send("Emulation.setDeviceMetricsOverride", { width, height: mobile ? 844 : 900, deviceScaleFactor: 1, mobile });
  await send("Emulation.setTouchEmulationEnabled", { enabled: mobile });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
  await send("Page.navigate", { url: `${BASE}/robots.txt` });
  await sleep(400);
  await evaluate(`localStorage.clear(); localStorage.setItem("pockett_theme_mode", ${JSON.stringify(theme)});`);
}

async function open(path, settle = 1200) {
  consoleErrors = [];
  await send("Page.navigate", { url: BASE + path });
  await waitFor(() => document.readyState === "complete", null, 60000, 200);
  await sleep(settle);
  // let running CSS transitions finish (a half-faded button would read as low contrast); endless loops are ignored
  await waitFor(() => document.getAnimations().every((a) => a.playState !== "running" || !Number.isFinite(a.effect?.getComputedTiming().endTime ?? Infinity)), null, 4000, 100);
}

// ───────────────────────────── reporting ─────────────────────────────

const results = [];
let ctx = { theme: "-", width: 0 };
function record(area, name, ok, detail = "", shot = null) {
  results.push({ area, name, ok, detail, theme: ctx.theme, width: ctx.width, shot });
  const tag = ok === "skip" ? "SKIP" : ok ? "PASS" : "FAIL";
  const where = ctx.width ? ` [${ctx.theme} ${ctx.width}]` : "";
  console.log(`${tag}  ${area.padEnd(7)} ${name}${where}${detail && !ok ? `\n        ${String(detail).split("\n").join("\n        ")}` : ""}`);
}
async function screenshot(label) {
  const file = join(FAIL_DIR, `${label.replace(/[^a-z0-9-]+/gi, "_")}-${ctx.theme}-${ctx.width}.png`);
  try {
    const shot = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(file, Buffer.from(shot.result.data, "base64"));
    return file;
  } catch {
    return null;
  }
}

// ───────────────────────────── colour helpers (node side) ─────────────────────────────

const parseRgb = (s) => (s ? (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number) : null);
const lum = ([r, g, b]) => {
  const c = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// ───────────────────────────── editor tokens ─────────────────────────────

const SAMPLES = [
  {
    lang: "python",
    code: [
      "# greeting",
      'name = "Ada"',
      "price = 3.5",
      'print(f"Hello, {name}! Total: {price:.2f} {{literal}} {name!r}")',
      'print("%s has %d items, {} done" % (name, 3))',
      "class Car:",
      "    def go(self, dx): return len(name)",
      "MAX_SPEED = 120",
    ].join("\n"),
    probes: [
      { role: "comment", line: 1, text: "# greeting" },
      { role: "variable", line: 2, text: "name" },
      { role: "builtin", line: 4, text: "print" },
      { role: "number", line: 3, text: "3.5" },
      { role: "string", line: 4, text: "Hello, " },
      { role: "brace", line: 4, text: "{" },
      { role: "expr", line: 4, text: "name" },
      { role: "spec", line: 4, text: ".2f" },
      { role: "placeholder", line: 5, text: "%s" },
      { role: "keyword", line: 6, text: "class" },
      { role: "type", line: 6, text: "Car" },
      { role: "function", line: 7, text: "go" },
      { role: "selfword", line: 7, text: "self" },
      { role: "param", line: 7, text: "dx" },
      { role: "constant", line: 8, text: "MAX_SPEED" },
    ],
    wantTypes: ["string.interpolation.delimiter", "string.format.spec", "string.format.placeholder", "variable", "function", "type", "constant", "predefined", "variable.parameter", "variable.language"],
  },
  {
    lang: "javascript",
    code: [
      "// greeting",
      'const name = "Ada";',
      "const price = 3.5;",
      "console.log(`Hello, ${name}! Total: ${price.toFixed(2)} ${1 + 2}`);",
      "class Car {}",
      "function go(dx) { return Math.max(dx, 1); }",
      "const MAX_SPEED = 1;",
    ].join("\n"),
    probes: [
      { role: "comment", line: 1, text: "// greeting" },
      { role: "keyword", line: 2, text: "const" },
      { role: "variable", line: 2, text: "name" },
      { role: "number", line: 3, text: "3.5" },
      { role: "string", line: 4, text: "Hello, " },
      { role: "brace", line: 4, text: "{" },
      { role: "expr", line: 4, text: "name" },
      { role: "type", line: 5, text: "Car" },
      { role: "function", line: 6, text: "go" },
      { role: "builtin", line: 6, text: "Math" },
      { role: "constant", line: 7, text: "MAX_SPEED" },
    ],
    wantTypes: ["string.interpolation.delimiter", "variable", "function", "type", "constant", "predefined"],
  },
  {
    lang: "csharp",
    code: [
      "// greeting",
      'var name = "Ada";',
      "double price = 3.5;",
      'Console.WriteLine($"Hello, {name}! Total: {price:F2} {{literal}}");',
      'Console.WriteLine($@"C:\\{name}");',
      'Console.WriteLine($"""Raw {name} "q" """);',
      'Console.WriteLine("{0} of {1:F1}", name, price);',
      "class Car { }",
      "static void Go(int dx) { Console.WriteLine(dx); }",
      "const int MAX_SPEED = 1;",
    ].join("\n"),
    probes: [
      { role: "comment", line: 1, text: "// greeting" },
      { role: "keyword", line: 2, text: "var" },
      { role: "variable", line: 2, text: "name" },
      { role: "number", line: 3, text: "3.5" },
      { role: "string", line: 4, text: "Hello, " },
      { role: "brace", line: 4, text: "{" },
      { role: "expr", line: 4, text: "name" },
      { role: "spec", line: 4, text: ":F2" },
      { role: "placeholder", line: 7, text: "{0}" },
      { role: "type", line: 8, text: "Car" },
      { role: "function", line: 9, text: "Go" },
      { role: "builtin", line: 9, text: "Console" },
      { role: "constant", line: 10, text: "MAX_SPEED" },
    ],
    wantTypes: ["string.interpolation.delimiter", "string.format.spec", "string.format.placeholder", "variable", "function", "type", "constant", "predefined"],
  },
  {
    lang: "rust",
    code: [
      "// greeting",
      "fn main() {",
      '    let name = "Ada";',
      "    let price = 3.5;",
      '    println!("Hello, {name}! Total: {price:.2} {} {:?}", name, price);',
      "}",
      "struct Car;",
      "fn go(dx: i32) { println!(\"{}\", dx); }",
      "const MAX_SPEED: u32 = 1;",
    ].join("\n"),
    probes: [
      { role: "comment", line: 1, text: "// greeting" },
      { role: "keyword", line: 2, text: "fn" },
      { role: "variable", line: 3, text: "name" },
      { role: "number", line: 4, text: "3.5" },
      { role: "string", line: 5, text: "Hello, " },
      { role: "brace", line: 5, text: "{" },
      { role: "expr", line: 5, text: "name" },
      { role: "spec", line: 5, text: ":.2" },
      { role: "placeholder", line: 5, text: "{:?}" },
      { role: "type", line: 7, text: "Car" },
      { role: "function", line: 8, text: "go" },
      { role: "builtin", line: 8, text: "println!" },
      { role: "constant", line: 9, text: "MAX_SPEED" },
    ],
    wantTypes: ["string.interpolation.delimiter", "string.format.spec", "string.format.placeholder", "variable", "function", "type", "constant", "predefined"],
  },
  {
    lang: "go",
    code: [
      "// greeting",
      "package main",
      "func main() {",
      '    name, price := "Ada", 3.5',
      '    fmt.Printf("Hello, %s! Total: %.2f %d%%\\n", name, price, 3)',
      "}",
      "type Car struct{}",
      "func Go(dx int) { fmt.Println(dx) }",
      "const MAX_SPEED = 1",
    ].join("\n"),
    probes: [
      { role: "comment", line: 1, text: "// greeting" },
      { role: "keyword", line: 2, text: "package" },
      { role: "variable", line: 4, text: "name" },
      { role: "number", line: 4, text: "3.5" },
      { role: "string", line: 5, text: "Hello, " },
      { role: "placeholder", line: 5, text: "%s" },
      { role: "type", line: 7, text: "Car" },
      { role: "function", line: 8, text: "Go" },
      { role: "builtin", line: 8, text: "fmt" },
      { role: "constant", line: 9, text: "MAX_SPEED" },
    ],
    wantTypes: ["string.format.placeholder", "variable", "function", "type", "constant", "predefined"],
  },
  {
    lang: "cpp",
    code: [
      "// greeting",
      "#include <print>",
      "int main() {",
      "    double price = 3.5;",
      '    std::println("Hello, {}! Total: {:.2f} {0}", "Ada", price);',
      '    printf("%s costs %.1f\\n", "x", price);',
      "}",
      "class Car {};",
      "void go(int dx) { std::cout << dx; }",
      "const int MAX_SPEED = 1;",
    ].join("\n"),
    probes: [
      { role: "comment", line: 1, text: "// greeting" },
      { role: "keyword", line: 3, text: "int" },
      { role: "variable", line: 4, text: "price" },
      { role: "number", line: 4, text: "3.5" },
      { role: "string", line: 5, text: "Hello, " },
      { role: "placeholder", line: 5, text: "{}" },
      { role: "placeholder", line: 6, text: "%s" },
      { role: "type", line: 8, text: "Car" },
      { role: "function", line: 9, text: "go" },
      { role: "builtin", line: 9, text: "std" },
      { role: "constant", line: 10, text: "MAX_SPEED" },
    ],
    wantTypes: ["string.format.placeholder", "variable", "function", "type", "constant", "predefined"],
  },
  {
    lang: "sql",
    code: ["-- greeting", "SELECT name, ROUND(day_hours, 1)", "FROM planets", "WHERE moons > 2;"].join("\n"),
    probes: [
      { role: "comment", line: 1, text: "-- greeting" },
      { role: "keyword", line: 2, text: "SELECT" },
      { role: "variable", line: 2, text: "name" },
      { role: "builtin", line: 2, text: "ROUND" },
      { role: "number", line: 4, text: "2" },
    ],
    wantTypes: ["variable", "predefined"],
  },
];

async function checkEditor() {
  await open("/playground", 800);
  const ready = await waitFor(() => typeof window.monaco !== "undefined" && window.monaco.editor.getEditors().length > 0 && !!document.querySelector(".monaco-editor .view-line"), null, 45000);
  if (!ready) {
    const note = await inPage(() => (typeof window.monaco === "undefined" ? "window.monaco is undefined (Monaco loads from the jsDelivr CDN: is the network reachable?)" : "no editor instance rendered"));
    record("editor", "Monaco loads on /playground", false, note, await screenshot("editor-load"));
    return;
  }
  const expectBg = ctx.theme === "dark" ? [10, 10, 10] : [255, 255, 255];
  const bg = parseRgb(await inPage(() => getComputedStyle(document.querySelector(".monaco-editor .monaco-editor-background") ?? document.querySelector(".monaco-editor")).backgroundColor));
  record("editor", "editor uses the pockett theme background", !!bg && bg.every((v, i) => Math.abs(v - expectBg[i]) <= 1), `got rgb(${bg}), want rgb(${expectBg})`, await screenshot("editor-theme"));

  for (const sample of SAMPLES) {
    const label = `${sample.lang}`;
    const typesOk = await inPage(
      async ({ code, lang, wantTypes }) => {
        const editor = window.monaco.editor.getEditors()[0];
        const model = window.monaco.editor.createModel(code, lang);
        window.__pkOldModel ??= editor.getModel();
        editor.updateOptions({ wordWrap: "off" }); // one DOM row per model line, so line numbers map to rows
        editor.setModel(model);
        const t0 = Date.now();
        while (Date.now() - t0 < 8000) {
          const types = new Set(window.monaco.editor.tokenize(code, lang).flat().map((t) => t.type));
          if (wantTypes.every((w) => [...types].some((t) => t.startsWith(w)))) {
            await new Promise((r) => setTimeout(r, 500));
            return { ok: true, missing: [] };
          }
          await new Promise((r) => setTimeout(r, 150));
        }
        const types = new Set(window.monaco.editor.tokenize(code, lang).flat().map((t) => t.type));
        return { ok: false, missing: wantTypes.filter((w) => ![...types].some((t) => t.startsWith(w))) };
      },
      sample,
    );
    if (!typesOk.ok) {
      record("editor", `${label}: interpolation and name token types are produced`, false, `missing token types: ${typesOk.missing.join(", ")} (the extended grammar in monaco-interpolation.ts / monaco-identifiers.ts was not applied)`, await screenshot(`editor-${label}`));
    } else {
      record("editor", `${label}: interpolation and name token types are produced`, true);
    }

    const probe = await inPage(
      ({ probes }) => {
        const lines = [...document.querySelectorAll(".monaco-editor .view-lines .view-line")].sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top));
        const editorEl = document.querySelector(".monaco-editor");
        const bg = getComputedStyle(editorEl.querySelector(".monaco-editor-background") ?? editorEl).backgroundColor;
        const ghost = document.createElement("span");
        ghost.className = "mtk1";
        editorEl.querySelector(".view-lines")?.appendChild(ghost);
        const defaultFg = getComputedStyle(ghost).color;
        ghost.remove();
        const found = probes.map((p) => {
          const leaves = [...(lines[p.line - 1]?.querySelectorAll("span > span") ?? [])];
          const txt = (s) => s.textContent.replace(/ /g, " "); // Monaco renders spaces as non-breaking
          const exact = leaves.find((s) => txt(s).trim() === p.text);
          const partial = leaves.filter((s) => txt(s).includes(p.text)).sort((a, b) => txt(a).length - txt(b).length)[0];
          const el = exact ?? partial;
          return { ...p, color: el ? getComputedStyle(el).color : null, seen: el ? el.textContent : null };
        });
        const everyToken = lines.flatMap((l) => [...l.querySelectorAll("span > span")]).filter((s) => s.textContent.trim()).map((s) => ({ text: s.textContent.slice(0, 24), color: getComputedStyle(s).color }));
        return { bg, defaultFg, found, everyToken };
      },
      sample,
    );
    const bgc = parseRgb(probe.bg);
    const byRole = new Map();
    const problems = [];
    for (const p of probe.found) {
      if (!p.color) {
        problems.push(`no rendered token containing ${JSON.stringify(p.text)} on line ${p.line} (${p.role})`);
        continue;
      }
      if (!byRole.has(p.role)) byRole.set(p.role, p.color);
      else if (byRole.get(p.role) !== p.color) problems.push(`${p.role} is not one colour: ${byRole.get(p.role)} vs ${p.color} (${p.text})`);
    }
    const roles = [...byRole.keys()];
    for (let i = 0; i < roles.length; i++) {
      for (let j = i + 1; j < roles.length; j++) {
        const [a, b] = [roles[i], roles[j]];
        const same = (x, y) => (a === x && b === y) || (a === y && b === x);
        if (same("brace", "placeholder") || same("expr", "variable")) continue; // same colour on purpose
        if (byRole.get(a) === byRole.get(b)) problems.push(`${a} and ${b} render in the same colour ${byRole.get(a)}`);
      }
    }
    for (const role of roles) {
      if (byRole.get(role) === probe.defaultFg) problems.push(`${role} falls back to the default editor colour ${probe.defaultFg} (unthemed)`);
    }
    if (ctx.theme === "dark" && probe.found.some((p) => p.color === "rgb(0, 0, 0)")) problems.push("a token renders black on the dark editor");
    const low = probe.everyToken.filter((t) => bgc && ratio(parseRgb(t.color), bgc) < 4.5);
    for (const t of low.slice(0, 4)) problems.push(`low contrast ${ratio(parseRgb(t.color), bgc).toFixed(2)}:1 for ${JSON.stringify(t.text)} (${t.color} on ${probe.bg})`);
    record("editor", `${label}: keywords, strings, numbers, comments, names and interpolation use distinct, readable colours`, problems.length === 0, problems.join("\n"), problems.length ? await screenshot(`editor-${label}`) : null);
  }
  await inPage(() => {
    const editor = window.monaco.editor.getEditors()[0];
    editor.updateOptions({ wordWrap: "on" });
    if (window.__pkOldModel) editor.setModel(window.__pkOldModel);
  });
  await checkSmartEditing();
  await checkKeyboardUX();
}

// ───────────────────────────── typing, hover and shortcuts ─────────────────────────────

const key = async (type, k, code, vk, modifiers = 0) => send("Input.dispatchKeyEvent", { type, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
async function typeChars(text) {
  for (const ch of text) {
    await send("Input.dispatchKeyEvent", { type: "char", text: ch });
    await sleep(35);
  }
}
async function backspace(n) {
  for (let i = 0; i < n; i++) {
    await key("rawKeyDown", "Backspace", "Backspace", 8);
    await key("keyUp", "Backspace", "Backspace", 8);
    await sleep(20);
  }
}

// ── real key and mouse events (what a learner's hardware produces), never model API calls ──

const KEYS = {
  Enter: [13, "Enter", String.fromCharCode(13)],
  Tab: [9, "Tab", String.fromCharCode(9)],
  Escape: [27, "Escape"],
  Backspace: [8, "Backspace"],
  Delete: [46, "Delete"],
  ArrowDown: [40, "ArrowDown"],
  ArrowUp: [38, "ArrowUp"],
  ArrowLeft: [37, "ArrowLeft"],
  ArrowRight: [39, "ArrowRight"],
  Home: [36, "Home"],
  End: [35, "End"],
};
const MOD = { alt: 1, ctrl: 2, shift: 8 };

async function press(name, modifiers = 0) {
  const [vk, code, text] = KEYS[name];
  await send("Input.dispatchKeyEvent", { type: text && !(modifiers & 2) ? "keyDown" : "rawKeyDown", key: name, code, text: text && !(modifiers & 2) ? text : undefined, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: name, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
  await sleep(60);
}
/** Ctrl+<letter> or Ctrl+<symbol>. */
async function chord(letter, modifiers = MOD.ctrl) {
  const up = letter.toUpperCase();
  const isLetter = /[a-z]/i.test(letter);
  const vk = isLetter ? up.charCodeAt(0) : letter === "/" ? 191 : 0;
  const code = isLetter ? `Key${up}` : "Slash";
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: letter, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: letter, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
  await sleep(80);
}
async function mouse(type, x, y, modifiers = 0) {
  await send("Input.dispatchMouseEvent", { type, x, y, button: type === "mouseMoved" ? "none" : "left", clickCount: type === "mouseMoved" ? 0 : 1, modifiers });
}
async function clickAt(x, y, modifiers = 0) {
  await mouse("mouseMoved", x, y, modifiers);
  await mouse("mousePressed", x, y, modifiers);
  await mouse("mouseReleased", x, y, modifiers);
  await sleep(120);
}
/** Page-space centre of a character cell in the focused editor. */
const cellAt = (line, col) => inPage(({ line, col }) => {
  const editor = window.monaco.editor.getEditors()[0];
  const p = editor.getScrolledVisiblePosition({ lineNumber: line, column: col });
  const r = editor.getDomNode().getBoundingClientRect();
  return { x: r.left + p.left, y: r.top + p.top + p.height / 2 };
}, { line, col });

const editorState = () => inPage(() => {
  const editor = window.monaco.editor.getEditors()[0];
  const model = editor.getModel();
  const p = editor.getPosition();
  const w = document.querySelector(".suggest-widget.visible");
  const rows = [...document.querySelectorAll(".suggest-widget.visible .monaco-list-row")].map((r) => r.getAttribute("aria-label") || "");
  const focused = document.querySelector(".suggest-widget.visible .monaco-list-row.focused")?.getAttribute("aria-label") ?? null;
  return { text: model.getValue(), line: model.getLineContent(p.lineNumber), lineNo: p.lineNumber, col: p.column, selections: editor.getSelections().length, widget: !!w, rows, focused, active: document.activeElement?.className ?? "" };
});

/** Waits for the suggest list to offer `expect`, accepts it the way `c.accept` says, and checks the text and the cursor. */
async function acceptSuggestion(c, attempts = 1) {
  const poll = (ms) =>
    waitFor(
      ({ expect }) => {
        const w = document.querySelector(".suggest-widget.visible");
        // Monaco shows the list on the next animation frame: wait until it is actually painted (a hidden element cannot be clicked)
        if (!w || getComputedStyle(w).visibility === "hidden") return false;
        const rows = [...w.querySelectorAll(".monaco-list-row")].map((r) => r.getAttribute("aria-label") || r.textContent || "");
        return rows.some((r) => r.startsWith(expect)) ? rows.slice(0, 5) : false;
      },
      c,
      ms,
      150,
    );
  let rows = await poll(6000);
  for (let i = 1; !rows && i <= attempts; i++) {
    // the TypeScript worker (JavaScript) can still be starting: clear and type again
    await press("Escape");
    await backspace(c.type.length);
    await sleep(2500);
    await typeChars(c.type);
    rows = await poll(8000);
  }
  if (!rows) return { ok: false, detail: `no suggestion starting with ${c.expect}: ${JSON.stringify(await editorState())}` };
  const before = await editorState();
  if (!before.focused?.startsWith(c.expect)) return { ok: false, detail: `the selected suggestion is ${JSON.stringify(before.focused)}, not ${c.expect}` };
  if (c.accept === "tab") await press("Tab");
  else if (c.accept === "click") {
    const at = await inPage(({ expect }) => {
      const row = [...document.querySelectorAll(".suggest-widget.visible .monaco-list-row")].find((r) => (r.getAttribute("aria-label") || "").startsWith(expect));
      const r = row?.getBoundingClientRect();
      if (!r) return null;
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      return { x, y, covered: !row.contains(hit), by: hit ? `${hit.tagName.toLowerCase()}.${String(hit.className).slice(0, 60)} in ${String(hit.parentElement?.className).slice(0, 40)}` : "nothing" };
    }, c);
    if (!at) return { ok: false, detail: "suggest row not found for the click" };
    if (at.covered) return { ok: false, detail: `the suggestion row is covered by ${at.by}, so a click would never reach it` };
    await clickAt(at.x, at.y);
  } else await press("Enter");
  await sleep(500);
  const after = await editorState();
  const beforeCursor = after.line.slice(0, after.col - 1);
  const inserted = beforeCursor.endsWith(c.expect);
  const sameLines = after.text.split("\n").length === before.text.split("\n").length;
  return { ok: inserted && !after.widget && sameLines, detail: `after ${c.accept}: line ${JSON.stringify(after.line)}, cursor col ${after.col}, list open ${after.widget}, lines ${before.text.split("\n").length} -> ${after.text.split("\n").length}` };
}

/** Replaces the editor's model with `code` in `lang`, focuses it and puts the cursor at the end. */
function prepareModel({ code, lang }) {
  const editor = window.monaco.editor.getEditors()[0];
  window.__pkOldModel ??= editor.getModel();
  editor.updateOptions({ wordWrap: "off" });
  const model = window.monaco.editor.createModel(code, lang);
  editor.setModel(model);
  editor.focus();
  const last = model.getLineCount();
  editor.setPosition({ lineNumber: last, column: model.getLineMaxColumn(last) });
  editor.revealLine(last);
  return true;
}

const SUGGEST_CASES = [
  // plain code, accepted three ways
  { lang: "python", code: 'car_name = "Bolt"\nhorsepower = 220\nweight_kg = 1100\n', type: "hor", expect: "horsepower", accept: "enter" },
  { lang: "python", code: 'car_name = "Bolt"\nhorsepower = 220\nweight_kg = 1100\n', type: "hor", expect: "horsepower", accept: "tab" },
  { lang: "python", code: 'car_name = "Bolt"\nhorsepower = 220\nweight_kg = 1100\n', type: "hor", expect: "horsepower", accept: "click" },
  // holes inside strings, arguments, after a dot, at the end of the file
  { lang: "python", code: "horsepower = 220\nzero_to_100 = 5.0\n", type: 'print(f"0-100 km/h in {zer', expect: "zero_to_100", accept: "enter" },
  { lang: "python", code: "horsepower = 220\n", type: 'print(f"{hor', expect: "horsepower", accept: "tab" },
  { lang: "python", code: "horsepower = 220\n", type: "print(hor", expect: "horsepower", accept: "enter" },
  { lang: "python", code: "horsepower = 220\n", type: "total = 1 + hor", expect: "horsepower", accept: "enter" },
  { lang: "python", code: 'name = "Ada"\n', type: "name.up", expect: "upper", accept: "enter" },
  { lang: "python", code: "import math\n", type: "math.sq", expect: "sqrt", accept: "tab" },
  { lang: "csharp", code: 'string carName = "Bolt";\nint horsepower = 220;\n', type: "hor", expect: "horsepower", accept: "enter" },
  { lang: "csharp", code: "int horsepower = 220;\n", type: 'Console.WriteLine($"in {hor', expect: "horsepower", accept: "enter" },
  { lang: "csharp", code: "int horsepower = 220;\n", type: "Console.WriteLine(hor", expect: "horsepower", accept: "tab" },
  { lang: "csharp", code: "", type: "Console.WriteL", expect: "WriteLine", accept: "enter" },
  { lang: "go", code: "package main\nfunc main() {\n    horsepower := 220\n    ", type: "hor", expect: "horsepower", accept: "click" },
  { lang: "go", code: "package main\nfunc main() {\n    horsepower := 220\n    ", type: "fmt.Println(hor", expect: "horsepower", accept: "enter" },
  { lang: "go", code: "package main\nfunc main() {\n    ", type: "fmt.Printl", expect: "Println", accept: "enter" },
  { lang: "rust", code: "fn main() {\n    let horsepower = 220;\n    ", type: "hor", expect: "horsepower", accept: "enter" },
  { lang: "rust", code: "fn main() {\n    let horsepower = 220;\n    ", type: 'println!("in {hor', expect: "horsepower", accept: "enter" },
  { lang: "rust", code: "fn main() {\n    let v = vec![1];\n    ", type: "v.pus", expect: "push", accept: "tab" },
  { lang: "cpp", code: "int main() {\n    int horsepower = 220;\n    ", type: "hor", expect: "horsepower", accept: "enter" },
  { lang: "cpp", code: "int main() {\n    int horsepower = 220;\n    ", type: "std::cout << hor", expect: "horsepower", accept: "enter" },
  { lang: "cpp", code: "int main() {\n    ", type: "std::cou", expect: "cout", accept: "enter" },
  { lang: "sql", code: "CREATE TABLE cars (id INTEGER, horsepower INTEGER);\nSELECT ", type: "hor", expect: "horsepower", accept: "enter" },
  { lang: "sql", code: "CREATE TABLE cars (id INTEGER, horsepower INTEGER);\nSELECT * FROM cars WHERE ", type: "hor", expect: "horsepower", accept: "tab" },
  { lang: "javascript", code: "const horsepower = 220;\n", type: "hor", expect: "horsepower", accept: "enter" },
  { lang: "javascript", code: "const horsepower = 220;\n", type: "console.log(`in ${hor", expect: "horsepower", accept: "enter" },
];

const HOVER_CASES = [
  { lang: "python", code: 'print("hi")', col: 3, expect: "on screen" },
  { lang: "csharp", code: 'Console.WriteLine("hi");', col: 12, expect: "Prints the value" },
  { lang: "go", code: 'fmt.Println("hi")', col: 7, expect: "Prints values" },
  { lang: "rust", code: 'println!("hi");', col: 3, expect: "Prints text" },
  { lang: "cpp", code: 'std::cout << "hi";', col: 8, expect: "Standard output" },
  { lang: "sql", code: "SELECT ROUND(2.5, 0);", col: 10, expect: "Rounds" },
];

const SIGNATURE_CASES = [
  { lang: "python", code: "", type: "print(", expect: "sep" },
  { lang: "csharp", code: "", type: "Console.WriteLine(", expect: "value" },
  { lang: "go", code: "package main\nfunc main() {\n    ", type: "fmt.Printf(", expect: "format" },
];

async function checkSmartEditing() {
  for (const c of SUGGEST_CASES) {
    await inPage(prepareModel, c);
    await sleep(c.lang === "javascript" ? 1500 : 500);
    await typeChars(c.type);
    const outcome = await acceptSuggestion(c, c.lang === "javascript" ? 2 : 1);
    record("editor", `${c.lang}: "${c.type}" then ${c.accept === "enter" ? "Enter" : c.accept === "tab" ? "Tab" : "a click"} inserts ${c.expect}`, outcome.ok, outcome.detail, outcome.ok ? null : await screenshot(`suggest-${c.lang}`));
    await press("Escape");
  }

  for (const c of HOVER_CASES) {
    await inPage(prepareModel, c);
    await sleep(400);
    const pos = await inPage(({ col }) => {
      const editor = window.monaco.editor.getEditors()[0];
      const p = editor.getScrolledVisiblePosition({ lineNumber: 1, column: col });
      const r = editor.getDomNode().getBoundingClientRect();
      return { x: r.left + p.left + 2, y: r.top + p.top + p.height / 2 };
    }, c);
    let text = false;
    for (let attempt = 0; attempt < 2 && !text; attempt++) {
      // leave any previous hover first, then come in from outside the editor
      await key("rawKeyDown", "Escape", "Escape", 27);
      await key("keyUp", "Escape", "Escape", 27);
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5 });
      await sleep(500);
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: pos.x + 120, y: pos.y + 90 });
      await sleep(150);
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: pos.x, y: pos.y });
      text = await waitFor(({ expect }) => {
        const t = [...document.querySelectorAll(".monaco-hover")].filter((h) => h.getBoundingClientRect().width > 0).map((h) => h.textContent).join(" ");
        return t.includes(expect) ? t : false;
      }, c, 4000, 200);
    }
    const got = text || (await inPage(() => [...document.querySelectorAll(".monaco-hover")].map((h) => h.textContent).join(" | ").slice(0, 200)));
    record("editor", `${c.lang}: hover shows docs ("${c.expect}")`, !!text, `hover text: ${JSON.stringify(got)}`, text ? null : await screenshot(`hover-${c.lang}`));
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5 });
  }

  for (const c of SIGNATURE_CASES) {
    await inPage(prepareModel, c);
    await sleep(400);
    await typeChars(c.type);
    const text = await waitFor(({ expect }) => {
      const w = document.querySelector(".parameter-hints-widget.visible");
      return w && w.textContent.includes(expect) ? w.textContent : false;
    }, c, 6000, 200);
    record("editor", `${c.lang}: "${c.type}" opens parameter hints (${c.expect})`, !!text, "no parameter hints widget with that text", text ? null : await screenshot(`signature-${c.lang}`));
    await key("rawKeyDown", "Escape", "Escape", 27);
    await key("keyUp", "Escape", "Escape", 27);
  }

  // everyday editing tools: auto-indent, auto-closing, comment toggle, rename, go to definition, format
  const valueOf = () => inPage(() => window.monaco.editor.getEditors()[0].getModel().getValue());
  const enter = async () => {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: String.fromCharCode(13), windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await key("keyUp", "Enter", "Enter", 13);
    await sleep(150);
  };
  const tool = async (name, ok, detail) => record("editor", name, ok, detail, ok ? null : await screenshot(`tool-${name.replace(/\W+/g, "-").slice(0, 30)}`));

  await inPage(prepareModel, { lang: "python", code: "def f():" });
  await enter();
  let v = await valueOf();
  await tool("python: Enter after ':' indents the next line", /\n {4}$|\n\t$/.test(v), JSON.stringify(v));

  await inPage(prepareModel, { lang: "csharp", code: "static void M() {" });
  await enter();
  v = await valueOf();
  await tool("csharp: Enter after '{' indents the next line", /\n( {4}|\t)\S?.*$/.test(v) && v.split("\n")[1].length >= 4, JSON.stringify(v));

  await inPage(prepareModel, { lang: "python", code: "" });
  await typeChars('print("');
  v = await valueOf();
  await tool("python: brackets and quotes close automatically", v === 'print("")', JSON.stringify(v));

  await inPage(prepareModel, { lang: "python", code: "x = 1" });
  await key("rawKeyDown", "/", "Slash", 191, 2);
  await key("keyUp", "/", "Slash", 191, 2);
  await sleep(200);
  v = await valueOf();
  await tool("python: Ctrl+/ comments the line", /^# x = 1/.test(v), JSON.stringify(v));

  await inPage(prepareModel, { lang: "cpp", code: "int x = 1;" });
  await key("rawKeyDown", "/", "Slash", 191, 2);
  await key("keyUp", "/", "Slash", 191, 2);
  await sleep(200);
  v = await valueOf();
  await tool("cpp: Ctrl+/ comments the line", /^\/\/ int x = 1;/.test(v), JSON.stringify(v));

  const renameCode = 'total = 1\nprint(total)\nprint(f"{total}")\n"total stays"';
  await inPage(prepareModel, { lang: "python", code: renameCode });
  await inPage(() => {
    const editor = window.monaco.editor.getEditors()[0];
    editor.setPosition({ lineNumber: 1, column: 3 });
  });
  await key("rawKeyDown", "F2", "F2", 113);
  await key("keyUp", "F2", "F2", 113);
  await sleep(700);
  await key("rawKeyDown", "a", "KeyA", 65, 2); // select all in the rename box
  await key("keyUp", "a", "KeyA", 65, 2);
  await typeChars("score");
  await enter();
  await sleep(600);
  v = await valueOf();
  await tool("python: F2 renames every use (code and f-string holes, not text)", v === 'score = 1\nprint(score)\nprint(f"{score}")\n"total stays"', JSON.stringify(v));

  await inPage(prepareModel, { lang: "python", code: "def go():\n    pass\n\ngo()" });
  await inPage(() => {
    const editor = window.monaco.editor.getEditors()[0];
    editor.setPosition({ lineNumber: 4, column: 2 });
    editor.focus();
  });
  await key("rawKeyDown", "F12", "F12", 123);
  await key("keyUp", "F12", "F12", 123);
  await sleep(700);
  const line = await inPage(() => window.monaco.editor.getEditors()[0].getPosition().lineNumber);
  await tool("python: F12 jumps to the definition", line === 1, `cursor on line ${line}`);

  await inPage(prepareModel, { lang: "javascript", code: "const   a=1\nfunction f( ){return a}" });
  const formatted = await waitFor(async () => {
    const editor = window.monaco.editor.getEditors()[0];
    await editor.getAction("editor.action.formatDocument")?.run();
    const text = editor.getModel().getValue();
    return text.includes("const a = 1") ? text : false;
  }, null, 12000, 800);
  await tool("javascript: format document works", !!formatted, "document was not reformatted");

  await inPage(() => {
    const editor = window.monaco.editor.getEditors()[0];
    editor.updateOptions({ wordWrap: "on" });
    if (window.__pkOldModel) editor.setModel(window.__pkOldModel);
  });
}

/** Ctrl+Enter must still run the program while the suggestion list is open. */
async function checkRunShortcut() {
  await open("/playground", 800);
  const ready = await waitFor(() => typeof window.monaco !== "undefined" && window.monaco.editor.getEditors().length > 0, null, 45000);
  if (!ready) return record("editor", "Ctrl+Enter runs with the suggest list open", "skip", "Monaco did not load");
  await inPage(() => {
    const js = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "JavaScript");
    js?.click();
  });
  await sleep(1500);
  await inPage(() => {
    const editor = window.monaco.editor.getEditors()[0];
    editor.getModel().setValue('console.log("RUN-OK");\nconst horsepower = 1;\n');
    editor.focus();
    const last = editor.getModel().getLineCount();
    editor.setPosition({ lineNumber: last, column: 1 });
    return true;
  });
  await sleep(1200);
  await typeChars("hor");
  const suggestOpen = await waitFor(() => !!document.querySelector(".suggest-widget.visible"), null, 8000, 150);
  await key("rawKeyDown", "Enter", "Enter", 13, 2);
  await key("keyUp", "Enter", "Enter", 13, 2);
  const ran = await waitFor(() => document.body.innerText.includes("RUN-OK"), null, 10000, 200);
  record("editor", "Ctrl+Enter runs the code while the suggest list is open", !!ran && !!suggestOpen, `suggest widget open: ${!!suggestOpen}, output shown: ${!!ran}`, ran ? null : await screenshot("run-shortcut"));
}

// ───────────────────────────── keyboard and mouse UX with real events ─────────────────────────────

/** Keyboard pass in the playground editor (fresh models per check). */
async function checkKeyboardUX() {
  const t = async (name, ok, detail) => record("editor", `keyboard: ${name}`, !!ok, detail, ok ? null : await screenshot(`kbd-${name.replace(/\W+/g, "-").slice(0, 30)}`));
  const fresh = (lang, code = "") => inPage(prepareModel, { lang, code });

  // auto-closing pairs: the closer appears, typing the closer overtypes it, Backspace removes an empty pair
  for (const [open, close, label] of [["(", ")", "parenthesis"], ["[", "]", "bracket"], ["{", "}", "brace"], ['"', '"', "double quote"], ["'", "'", "single quote"]]) {
    await fresh("python");
    await typeChars(open);
    let s = await editorState();
    await t(`typing ${label} adds its closer`, s.text === open + close && s.col === 2, JSON.stringify(s.text));
    await typeChars(close);
    s = await editorState();
    await t(`typing the closing ${label} overtypes it`, s.text === open + close && s.col === 3, `${JSON.stringify(s.text)} col ${s.col}`);
    await fresh("python");
    await typeChars(open);
    await press("Backspace");
    s = await editorState();
    await t(`Backspace in an empty ${label} pair removes both`, s.text === "", JSON.stringify(s.text));
  }

  // indent / outdent a selection
  await fresh("python", "a\nb");
  await chord("a");
  await press("Tab");
  let s = await editorState();
  await t("Tab indents every selected line", s.text === "    a\n    b", JSON.stringify(s.text));
  await press("Tab", MOD.shift);
  s = await editorState();
  await t("Shift+Tab outdents them again", s.text === "a\nb", JSON.stringify(s.text));

  // undo / redo
  await fresh("python");
  await typeChars("hello");
  await chord("z");
  s = await editorState();
  await t("Ctrl+Z undoes typing", s.text === "", JSON.stringify(s.text));
  await chord("y");
  s = await editorState();
  await t("Ctrl+Y redoes it", s.text === "hello", JSON.stringify(s.text));

  // Home / End
  await fresh("python", "    hello");
  await press("Home");
  s = await editorState();
  const firstHome = s.col;
  await press("Home");
  s = await editorState();
  await t("Home goes to the first character, then to the line start", firstHome === 5 && s.col === 1, `cols ${firstHome} then ${s.col}`);
  await press("End");
  s = await editorState();
  await t("End goes to the end of the line", s.col === 10, `col ${s.col}`);

  // multi-cursor with Alt+Click, and Ctrl+D
  await fresh("python", "a\nb\nc");
  if (ctx.width >= 700) {
    const a = await cellAt(1, 2);
    const b = await cellAt(2, 2);
    await clickAt(a.x + 3, a.y);
    if ((await editorState()).lineNo !== 1) await clickAt(a.x + 3, a.y - 3); // retry if a moving widget swallowed the first click
    await clickAt(b.x + 3, b.y, MOD.alt);
    await typeChars("x");
    s = await editorState();
    await t("Alt+Click adds a cursor and typing uses both", s.text === "ax\nbx\nc" && s.selections === 2, `${JSON.stringify(s.text)} cursors ${s.selections}`);
  }
  await fresh("python", "foo foo foo");
  await inPage(() => window.monaco.editor.getEditors()[0].setPosition({ lineNumber: 1, column: 2 }));
  await chord("d");
  await chord("d");
  s = await editorState();
  await t("Ctrl+D selects the next occurrence", s.selections >= 2, `cursors ${s.selections}`);

  // find
  await fresh("python", "needle");
  await chord("f");
  const find = await waitFor(() => !!document.querySelector(".monaco-editor .find-widget.visible"), null, 4000, 100);
  await t("Ctrl+F opens find", find, "no find widget");
  await press("Escape");

  // arrow keys move through the list and Enter takes the one you moved to
  await fresh("python", "horsepower = 1\nhas_turbo = True\nheight = 3\n");
  await typeChars("h");
  await waitFor(() => document.querySelectorAll(".suggest-widget.visible .monaco-list-row").length > 1, null, 5000, 100);
  const first = (await editorState()).focused;
  await press("ArrowDown");
  const moved = await editorState();
  await press("Enter");
  s = await editorState();
  const pickedName = (moved.focused ?? "").split(",")[0];
  await t("ArrowDown moves the selection and Enter inserts that item", !!first && moved.focused !== first && s.line === pickedName, `first ${first}, moved ${moved.focused}, line ${JSON.stringify(s.line)}`);

  // parameter hints follow the commas
  await fresh("python");
  await typeChars("print(1,");
  const hint = await waitFor(() => document.querySelector(".parameter-hints-widget.visible .parameter.active")?.textContent ?? false, null, 5000, 150);
  await t("parameter hints highlight the next parameter after a comma", typeof hint === "string" && hint.includes("sep"), JSON.stringify(hint));
  await press("Escape");
  s = await editorState();

  // hover must not take focus away from the editor
  await fresh("python", 'print("hi")\n');
  await inPage(() => {
    const editor = window.monaco.editor.getEditors()[0];
    editor.setPosition({ lineNumber: 2, column: 1 });
    editor.focus();
  });
  const pos = await cellAt(1, 3);
  await mouse("mouseMoved", pos.x + 150, pos.y + 90);
  await sleep(150);
  await mouse("mouseMoved", pos.x + 3, pos.y);
  await waitFor(() => [...document.querySelectorAll(".monaco-hover")].some((h) => h.getBoundingClientRect().width > 0), null, 5000, 150);
  await typeChars("z");
  s = await editorState();
  await t("typing still works while a hover is open", s.text.split("\n")[1] === "z", `${JSON.stringify(s.text)} focus ${s.active}`);

  // the suggestion list must fit on screen (matters at 390 px)
  await fresh("python", "horsepower = 1\n");
  await typeChars("hor");
  await waitFor(() => !!document.querySelector(".suggest-widget.visible"), null, 5000, 100);
  const box = await inPage(() => {
    const r = document.querySelector(".suggest-widget.visible")?.getBoundingClientRect();
    return r ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom, w: window.innerWidth, h: window.innerHeight } : null;
  });
  await t("the suggestion list stays inside the screen", !!box && box.left >= -1 && box.right <= box.w + 1 && box.top >= -1 && box.bottom <= box.h + 1, JSON.stringify(box));
  await press("Escape");

  await inPage(() => {
    const editor = window.monaco.editor.getEditors()[0];
    if (window.__pkOldModel) editor.setModel(window.__pkOldModel);
  });
}

/** The same keystrokes in a real lesson editor, where a React workspace and a 3D scene share the page. */
async function checkLessonKeyboard() {
  const path = "/projects/garage/garage-3-engine";
  await open(path, 800);
  const ready = await waitFor(() => typeof window.monaco !== "undefined" && window.monaco.editor.getEditors().length > 0 && !!document.querySelector(".monaco-editor .view-line"), null, 45000);
  const t = async (name, ok, detail) => record("editor", `lesson editor: ${name}`, !!ok, detail, ok ? null : await screenshot(`lesson-${name.replace(/\W+/g, "-").slice(0, 30)}`));
  if (!ready) return t("Monaco mounts", false, "no editor");
  // on a phone the editor sits behind the "Code" tab
  await inPage(() => {
    if (window.innerWidth < 800) [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Code" && b.getBoundingClientRect().width > 0)?.click();
  });
  await sleep(3500); // let the workspace restore and settle
  const starter = (await editorState()).text;
  const newLine = async () => {
    await inPage(() => {
      const editor = window.monaco.editor.getEditors()[0];
      const model = editor.getModel();
      const last = model.getLineCount();
      editor.focus();
      editor.executeEdits("ui-check", [{ range: { startLineNumber: last, endLineNumber: last, startColumn: model.getLineMaxColumn(last), endColumn: model.getLineMaxColumn(last) }, text: String.fromCharCode(10) }]);
      editor.setPosition({ lineNumber: last + 1, column: 1 });
      // put the caret line at the very bottom of the editor: the list then hangs over the panel below it
      editor.setScrollTop(editor.getTopForLineNumber(last + 1) - editor.getLayoutInfo().height + 40);
    });
    await sleep(300);
  };
  // clean-up between checks goes through the model (it is not what is being tested)
  const clearLine = async () => {
    await press("Escape");
    await inPage((text) => {
      const editor = window.monaco.editor.getEditors()[0];
      const model = editor.getModel();
      model.setValue(text + String.fromCharCode(10));
      editor.focus();
      editor.setPosition({ lineNumber: model.getLineCount(), column: 1 });
    }, starter);
    await sleep(200);
  };

  // the reported bug: Enter on a selected suggestion inside an f-string hole
  await newLine();
  await typeChars('print(f"0-100 km/h in {zer');
  let r = await acceptSuggestion({ type: 'print(f"0-100 km/h in {zer', expect: "zero_to_100", accept: "enter" });
  await t("Enter accepts a suggestion inside an f-string hole", r.ok, r.detail);
  await clearLine();

  for (const accept of ["tab", "click", "enter"]) {
    await typeChars("hor");
    r = await acceptSuggestion({ type: "hor", expect: "horsepower", accept });
    await t(`${accept === "click" ? "a click" : accept === "tab" ? "Tab" : "Enter"} accepts a suggestion in plain code`, r.ok, r.detail);
    await clearLine();
  }

  await typeChars("hor");
  await waitFor(() => !!document.querySelector(".suggest-widget.visible"), null, 5000, 100);
  await press("Escape");
  let s = await editorState();
  await t("Escape closes the list and keeps the typed text", !s.widget && s.line === "hor", JSON.stringify({ widget: s.widget, line: s.line }));
  await clearLine();

  await typeChars("hor");
  await waitFor(() => !!document.querySelector(".suggest-widget.visible"), null, 5000, 100);
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, modifiers: MOD.ctrl });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, modifiers: MOD.ctrl });
  await sleep(600);
  s = await editorState();
  await t("Ctrl+Enter closes the list and does not insert a newline or a suggestion", !s.widget && s.line === "hor", JSON.stringify({ widget: s.widget, line: s.line }));
  await inPage(() => {
    // running moves a phone to the results tab: come back to the editor
    if (window.innerWidth < 800) [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Code" && b.getBoundingClientRect().width > 0)?.click();
  });
  await sleep(500);
  await clearLine();

  // Enter with no list open: newline plus the right indent
  await typeChars("for i in range(3):");
  await press("Enter");
  s = await editorState();
  await t("Enter after ':' starts an indented line", s.line === "    " && !s.widget, JSON.stringify(s.line));
  const eol = await inPage(() => ({ eol: JSON.stringify(window.monaco.editor.getEditors()[0].getModel().getEOL()), cr: window.monaco.editor.getEditors()[0].getModel().getValue().includes(String.fromCharCode(13)) }));
  await t("typed newlines are LF, not CRLF", eol.eol === JSON.stringify(String.fromCharCode(10)) && !eol.cr, JSON.stringify(eol));

  // fast typing must not lose characters (a slow render once overwrote newer keystrokes)
  await clearLine();
  const sentence = 'print("The quick brown fox jumps over 13 lazy dogs")';
  await send("Emulation.setCPUThrottlingRate", { rate: 4 }); // a slow phone: renders lag behind keystrokes
  for (const ch of sentence) {
    await send("Input.dispatchKeyEvent", { type: "char", text: ch });
    await sleep(20);
  }
  await sleep(1500);
  await send("Emulation.setCPUThrottlingRate", { rate: 1 });
  s = await editorState();
  await t("fast typing keeps every character (4x slower CPU, 20 ms per key)", s.line === sentence, `${JSON.stringify(s.line)}`);
  await clearLine();

  // Reset lesson asks first, then restores the starter, and Ctrl+Z brings the work back
  await typeChars("zzz");
  await sleep(300);
  const clickReset = () => inPage(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /Reset lesson|Click again to discard/.test(x.textContent) && x.getBoundingClientRect().width > 0);
    b?.click();
    return b ? b.textContent.trim() : null;
  });
  const first = await clickReset();
  if (first) {
    await sleep(500);
    s = await editorState();
    const armed = await inPage(() => !![...document.querySelectorAll("button")].find((x) => /Click again to discard/.test(x.textContent)));
    await t("the first Reset click only asks for confirmation", armed && s.text.includes("zzz"), `button now says armed=${armed}, text still has zzz=${s.text.includes("zzz")}`);
    await clickReset();
    await sleep(800);
    s = await editorState();
    await t("the second click restores the starter code", s.text === starter, `${s.text.length} vs ${starter.length} characters`);
    await inPage(() => window.monaco.editor.getEditors()[0].focus());
    await chord("z");
    s = await editorState();
    await t("Ctrl+Z after Reset brings the work back", s.text.includes("zzz"), `contains zzz: ${s.text.includes("zzz")}`);
  } else record("editor", "lesson editor: Reset lesson", "skip", "no visible Reset lesson button");
}

/** The lesson workspace mounts the same CodeEditor: its language must also get the interpolation-aware tokenizer. */
const WORKSPACE_EDITORS = [
  { path: "/projects/garage/garage-3-engine", lang: "python", probe: 'print(f"{a:.2f}")' },
  { path: "/projects/garage-js/garage-js-3-engine", lang: "javascript", probe: "console.log(`${a}`);" },
  { path: "/projects/csharp-basics/csharp-basics-1-hello", lang: "csharp", probe: 'Console.WriteLine($"{a:F2}");' },
  { path: "/projects/rust-basics/rust-basics-1-hello", lang: "rust", probe: 'println!("{a:.2} {}", b);' },
];

async function checkWorkspaceEditors() {
  for (const w of WORKSPACE_EDITORS) {
    await open(w.path, 800);
    const ready = await waitFor(() => typeof window.monaco !== "undefined" && window.monaco.editor.getEditors().length > 0, null, 45000);
    if (!ready) {
      record("editor", `workspace ${w.lang}: editor mounts`, false, `no Monaco editor on ${w.path}`, await screenshot(`workspace-${w.lang}`));
      continue;
    }
    const got = await inPage(
      async ({ lang, probe }) => {
        const editorLang = window.monaco.editor.getEditors()[0].getModel()?.getLanguageId();
        const t0 = Date.now();
        let types = [];
        while (Date.now() - t0 < 6000) {
          types = [...new Set(window.monaco.editor.tokenize(probe, lang).flat().map((t) => t.type))];
          if (types.some((t) => t.startsWith("string.interpolation.delimiter") || t.startsWith("string.format.placeholder"))) break;
          await new Promise((r) => setTimeout(r, 200));
        }
        return { editorLang, types };
      },
      w,
    );
    const ok = got.editorLang === w.lang && got.types.some((t) => t.startsWith("string.interpolation.delimiter") || t.startsWith("string.format.placeholder"));
    record("editor", `workspace ${w.lang}: lesson editor uses the interpolation-aware grammar`, ok, `editor language ${got.editorLang}, tokens: ${got.types.join(", ")}`, ok ? null : await screenshot(`workspace-${w.lang}`));
  }
}

// ───────────────────────────── prose code blocks ─────────────────────────────

const BRACE_COLOR = "rgb(171, 211, 115)";
const STRING_COLOR = "rgb(252, 211, 77)";

async function checkProse() {
  for (const lesson of PROSE_LESSONS) {
    await open(lesson.path, 1500);
    await inPage(() => {
      // lesson text sits behind the "Learn" tab in the workspace
      const tab = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Learn" && b.getBoundingClientRect().width > 0);
      tab?.click();
    });
    await sleep(800);
    const info = await inPage(() => {
      const blocks = [...document.querySelectorAll(".prose-lesson pre code")];
      const strings = [];
      for (const code of blocks) {
        for (const el of code.querySelectorAll("span")) {
          const color = getComputedStyle(el).color;
          if (color !== "rgb(252, 211, 77)") continue;
          if (el.parentElement !== code) continue; // only top-level string spans
          const prev = el.previousSibling?.textContent ?? "";
          strings.push({
            text: el.textContent,
            prev: prev.slice(-3),
            kids: [...el.querySelectorAll(":scope > span")].map((k) => ({ text: k.textContent, color: getComputedStyle(k).color })),
          });
        }
      }
      return { blocks: blocks.length, strings };
    });
    const candidates = info.strings.map((s) => ({ ...s, holes: s.text.replace(/\{\{|\}\}/g, "") })).filter((s) => {
      // "{{" and "}}" are escaped braces, not holes
      if (lesson.kind === "python") return /(^|[^\w])(rf|fr|f)$/i.test(s.prev) && /\{[^{}]+\}/.test(s.holes);
      if (lesson.kind === "javascript") return s.text.startsWith("`") && s.holes.includes("${");
      if (lesson.kind === "csharp") return /\$@?$/.test(s.prev) && /\{[^{}]+\}/.test(s.holes);
      if (lesson.kind === "rust") return /\{[^{}]*\}/.test(s.holes);
      return false;
    });
    if (info.blocks === 0) {
      record("prose", `${lesson.name}: has code blocks`, "skip", `${lesson.path} showed no .prose-lesson code blocks`);
      continue;
    }
    if (!candidates.length) {
      record("prose", `${lesson.name}: interpolated string present`, "skip", `no ${lesson.kind} interpolated string literal in ${lesson.path} right now (lesson content may have changed)`);
      continue;
    }
    const bad = candidates.filter((c) => !c.kids.some((k) => k.color === BRACE_COLOR) || c.kids.every((k) => k.color === STRING_COLOR));
    record(
      "prose",
      `${lesson.name}: {holes} differ from the string colour`,
      bad.length === 0,
      bad.map((b) => `string ${JSON.stringify(b.text)} has no differently coloured hole`).join("\n"),
      bad.length ? await screenshot(`prose-${lesson.kind}`) : null,
    );
  }
}

// ───────────────────────────── layout, contrast, a11y ─────────────────────────────

function layoutProbe() {
  const vw = window.innerWidth;
  const doc = document.documentElement;
  const overflow = doc.scrollWidth > vw + 1 || document.body.scrollWidth > vw + 1;
  const clipped = (el) => {
    for (let a = el.parentElement; a && a !== document.body && a !== doc; a = a.parentElement) {
      const o = getComputedStyle(a).overflowX;
      if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
    }
    return false;
  };
  const sel = (el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".") : ""}`;
  const offenders = [];
  if (overflow) {
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > vw + 1 && !clipped(el) && getComputedStyle(el).position !== "fixed") offenders.push(`${sel(el)} right=${Math.round(r.right)} width=${Math.round(r.width)}`);
      if (offenders.length >= 6) break;
    }
  }
  return { vw, scrollWidth: doc.scrollWidth, overflow, offenders };
}

function navProbe() {
  const header = document.querySelector("header");
  if (!header) return { present: false };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && el.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) !== false;
  };
  const centre = (el) => {
    const r = el.getBoundingClientRect();
    return r.top + r.height / 2;
  };
  const items = [];
  const home = header.querySelector('a[aria-label="pockett home"]');
  if (home) {
    const mark = home.querySelector("svg");
    const word = home.querySelector("span > span");
    if (mark) items.push(["logo mark", mark]);
    if (word) items.push(["wordmark", word]);
  }
  header.querySelectorAll("nav a").forEach((a) => items.push([`nav link "${a.textContent.trim()}"`, a]));
  const bar = header.firstElementChild;
  const right = bar?.lastElementChild;
  if (right) [...right.children].forEach((c, i) => items.push([`control ${i + 1} ${c.getAttribute("aria-label") ?? c.textContent.trim().slice(0, 14)}`, c]));
  const measured = items.filter(([, el]) => visible(el)).map(([name, el]) => ({ name, y: centre(el) }));
  const ys = measured.map((m) => m.y);
  const spread = ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
  return { present: true, measured: measured.map((m) => `${m.name}: ${m.y.toFixed(1)}`), spread };
}

function contrastProbe() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const cache = new Map();
  const parse = (css) => {
    if (cache.has(css)) return cache.get(css);
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = "#000";
    cx.fillStyle = css;
    cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data;
    const v = [d[0], d[1], d[2], d[3] / 255];
    cache.set(css, v);
    return v;
  };
  const blend = (fg, bg, a) => fg.map((c, i) => c * a + bg[i] * (1 - a));
  const lum = ([r, g, b]) => {
    const c = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const backgroundOf = (el) => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null; // gradient or image: can't judge
      const c = parse(cs.backgroundColor);
      if (c[3] > 0) {
        layers.push(c);
        if (c[3] >= 0.999) break;
      }
    }
    let base = [255, 255, 255];
    for (let i = layers.length - 1; i >= 0; i--) base = blend(layers[i].slice(0, 3), base, layers[i][3]);
    return base;
  };
  const opacityOf = (el) => {
    let o = 1;
    for (let e = el; e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity);
    return o;
  };
  const sel = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".") : ""}`;

  const skip = "script,style,noscript,svg,canvas,.monaco-editor,[aria-hidden='true'],option,[disabled],[aria-disabled='true'],.sr-only,[hidden]";
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const failures = new Map();
  let checked = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (!text) continue;
    const el = node.parentElement;
    if (!el || el.closest(skip)) continue;
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const r = range.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el);
    const fill = parse(cs.webkitTextFillColor || cs.color);
    const alpha = fill[3] * opacityOf(el);
    if (alpha < 0.05) continue; // transparent or gradient-clipped text
    const bg = backgroundOf(el);
    if (!bg) continue;
    const fg = blend(fill.slice(0, 3), bg, alpha);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
    const need = large ? 3 : 4.5;
    const got = ratio(fg, bg);
    checked++;
    if (got < need) {
      const key = `${sel(el)}|${cs.color}|${bg.map(Math.round)}`;
      const prev = failures.get(key);
      if (prev) prev.count++;
      else failures.set(key, { selector: sel(el), text: text.slice(0, 40), ratio: +got.toFixed(2), need, fg: fg.map(Math.round).join(","), bg: bg.map(Math.round).join(","), size, count: 1 });
    }
  }
  return { checked, failures: [...failures.values()].sort((a, b) => a.ratio - b.ratio).slice(0, 12) };
}

function a11yProbe() {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && el.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) !== false;
  };
  const sel = (el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".") : ""}`;
  const noAlt = [...document.images].filter((i) => i.getAttribute("alt") === null && i.getAttribute("role") !== "presentation" && i.getAttribute("aria-hidden") !== "true").map((i) => (i.getAttribute("src") ?? "").slice(0, 80));
  const svgNoName = [...document.querySelectorAll("svg[role='img']")].filter((s) => !s.getAttribute("aria-label") && !s.querySelector("title") && !s.getAttribute("aria-labelledby")).map(sel);
  const nameOf = (el) => {
    const al = el.getAttribute("aria-label")?.trim();
    if (al) return al;
    const lb = el.getAttribute("aria-labelledby");
    if (lb) {
      const t = lb.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim();
      if (t) return t;
    }
    if (el.labels?.length) {
      const t = [...el.labels].map((l) => l.textContent).join(" ").trim();
      if (t) return t;
    }
    const text = (el.innerText ?? el.textContent ?? "").trim();
    if (text) return text;
    const img = el.querySelector("img[alt]:not([alt=''])")?.getAttribute("alt");
    if (img) return img;
    const svgTitle = el.querySelector("svg title")?.textContent?.trim();
    if (svgTitle) return svgTitle;
    return (el.getAttribute("title") ?? el.getAttribute("placeholder") ?? (el.tagName === "INPUT" ? el.value : "") ?? "").trim();
  };
  const unnamed = [...document.querySelectorAll("a[href], button, [role='button'], [role='link'], [role='tab'], input:not([type='hidden']), select, textarea, summary")]
    .filter((el) => visible(el) && !el.closest(".monaco-editor") && el.getAttribute("aria-hidden") !== "true")
    .filter((el) => !nameOf(el))
    .map((el) => `${sel(el)}${el.getAttribute("href") ? ` href=${el.getAttribute("href")}` : ""}`);
  return { noAlt, svgNoName, unnamed };
}

async function checkLayout(routes) {
  for (const [name, path] of routes) {
    await open(path, 1500);
    const fail = async (what, detail) => record("layout", `${name} (${path}): ${what}`, false, detail, await screenshot(`layout-${name}`));
    const pass = (what) => record("layout", `${name} (${path}): ${what}`, true);

    // console errors collected while the page loaded and settled
    const errs = [...new Set(consoleErrors)];
    if (errs.length) await fail("no console errors", errs.slice(0, 6).join("\n"));
    else pass("no console errors");

    const lay = await inPage(layoutProbe);
    if (lay.overflow) await fail("no horizontal overflow", `page is ${lay.scrollWidth}px wide in a ${lay.vw}px viewport\n${lay.offenders.join("\n")}`);
    else pass("no horizontal overflow");

    const nav = await inPage(navProbe);
    if (!nav.present) record("layout", `${name} (${path}): navbar items vertically centred`, "skip", "no site header on this route");
    else if (nav.spread > 1) await fail("navbar items vertically centred", `centres spread ${nav.spread.toFixed(2)}px (limit 1px)\n${nav.measured.join("\n")}`);
    else pass("navbar items vertically centred");

    let con = await inPage(contrastProbe);
    if (con.failures.length) {
      // demos animate (autopilot toggles, fades): only count what is still low a moment later
      await sleep(900);
      const again = await inPage(contrastProbe);
      const still = new Set(again.failures.map((f) => `${f.selector}|${f.text}`));
      con = { ...again, failures: con.failures.filter((f) => still.has(`${f.selector}|${f.text}`)) };
    }
    if (con.failures.length) {
      await fail(
        "text contrast >= 4.5:1",
        `${con.failures.length} offender(s) of ${con.checked} text nodes\n` +
          con.failures.map((f) => `${f.ratio}:1 (need ${f.need}) ${f.selector} "${f.text}" fg rgb(${f.fg}) on rgb(${f.bg}) ${f.size}px x${f.count}`).join("\n"),
      );
    } else pass(`text contrast >= 4.5:1 (${con.checked} text nodes)`);

    const a11y = await inPage(a11yProbe);
    if (a11y.noAlt.length || a11y.svgNoName.length) await fail("images have alt text", [...a11y.noAlt.map((s) => `<img> without alt: ${s}`), ...a11y.svgNoName.map((s) => `svg[role=img] without a name: ${s}`)].join("\n"));
    else pass("images have alt text");
    if (a11y.unnamed.length) await fail("buttons and links have accessible names", a11y.unnamed.slice(0, 8).join("\n"));
    else pass("buttons and links have accessible names");
  }
}

// ───────────────────────────── run ─────────────────────────────

const t0 = Date.now();
console.log(`pockett ui-check  base=${BASE}  themes=${THEMES.join(",")}  widths=${WIDTHS.join(",")}  checks=${[...ONLY].join(",")}\nscreenshots of failures: ${FAIL_DIR}\n`);
try {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      ctx = { theme, width };
      console.log(`\n── ${theme} @ ${width}px ──`);
      await configure(theme, width);
      if (ONLY.has("editor")) {
        await checkEditor();
        await checkRunShortcut();
        await checkWorkspaceEditors();
        await checkLessonKeyboard();
      }
      if (ONLY.has("prose")) await checkProse();
      if (ONLY.has("layout")) await checkLayout(ROUTES);
      if (ONLY.has("workspace") && theme === "dark") {
        const { checkWorkspace } = await import("./ui-check-workspace.mjs");
        await checkWorkspace({ send, evaluate, inPage, waitFor, sleep, clickAt, press, record, open, screenshot, getCtx: () => ctx, onEvent: (fn) => (eventListeners.add(fn), () => eventListeners.delete(fn)), BASE, PORT, OUT });
      }
      if (ONLY.has("site")) {
        const { checkSite } = await import("./ui-check-site.mjs");
        await checkSite({ send, evaluate, inPage, waitFor, sleep, clickAt, press, record, open, screenshot, getCtx: () => ctx, BASE, PORT, OUT });
      }
      if (ONLY.has("learn") && ctx.width >= 700 && theme === "dark") {
        const { checkLearn } = await import("./ui-check-learn.mjs");
        await checkLearn({ send, evaluate, inPage, waitFor, sleep, clickAt, record, open, screenshot, getCtx: () => ctx, BASE });
      }
      if (ONLY.has("audio")) {
        const { checkAudio } = await import("./ui-check-audio.mjs");
        await checkAudio({ send, evaluate, inPage, waitFor, sleep, clickAt, press, record, open, screenshot, getCtx: () => ctx, BASE, PORT, OUT });
      }
    }
  }
} catch (e) {
  record("run", "ui-check crashed", false, e.stack ?? String(e));
}

const failed = results.filter((r) => r.ok === false);
const skipped = results.filter((r) => r.ok === "skip");
const passed = results.filter((r) => r.ok === true);
console.log(`\n════ ${failed.length ? "FAIL" : "PASS"}: ${passed.length} passed, ${failed.length} failed, ${skipped.length} skipped in ${((Date.now() - t0) / 1000).toFixed(0)}s ════`);
if (failed.length) {
  console.log("\nFailures:");
  for (const f of failed) console.log(`  [${f.theme} ${f.width}] ${f.area}: ${f.name}${f.shot ? `\n      screenshot: ${f.shot}` : ""}`);
}

try {
  ws.close();
} catch {
  /* already closed */
}
chrome.kill();
await sleep(300);
try {
  rmSync(profile, { recursive: true, force: true });
} catch {
  /* chrome may still hold the profile on Windows */
}
process.exit(failed.length ? 1 : 0);
