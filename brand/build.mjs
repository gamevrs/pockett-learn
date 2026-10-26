// pockett brand kit builder. The artwork below is the single source of truth for every file in brand/.
//
//   node brand/build.mjs          rebuild svg/, png/, social/, the public copies and the zip
//
// - SVG masters are generated from the geometry in this file (mark) and brand/src/wordmark.json
//   (the outlined "pockett" wordmark, produced once by brand/tools/extract-wordmark.mjs).
// - PNGs are rasterised with headless Chrome over CDP (already needed by the project's screenshot tooling),
//   no extra dependencies.
// - The zip is written with a tiny built-in writer (node:zlib only).
//
// Keep the mark geometry in sync with src/components/brand/Logo.tsx and src/app/icon.svg.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, copyFileSync, readdirSync, statSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deflateRawSync, crc32 } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = Number(process.env.CDP_PORT ?? 9343);
const wm = JSON.parse(readFileSync(join(here, "src/wordmark.json"), "utf8"));

// ── palette ──────────────────────────────────────────────────────────────────────────────────────
export const C = { body: "#c5ee8a", ink: "#0a0a0a", white: "#ffffff", wordLight: "#0a0a0a", wordDark: "#fafafa" };
const GRAD = {
  full: { deep: "#4a771d", mid: "#7eaa45", midAt: 0.4, endAt: 0.82, squash: 0.62 },
  min: { deep: "#3f6a16", mid: "#5f8d2c", midAt: 0.5, endAt: 0.92, squash: 0.7 },
};

// ── the mark (32 x 32 grid; the envelope itself spans 3..29, so the tight viewBox is "3 3 26 26") ───
const FLAP = "M3.5 6.6A6 6 0 0 1 9 3H23A6 6 0 0 1 28.5 6.6L17.64 11.46Q16 12.6 14.36 11.46Z";
const FOLD_GAP = "M3 6.9L16 12.7L29 6.9"; // one-colour versions: the fold is a cut-out sliver, never an outline
const PROMPT = ["M9.8 15.4 15 19.5 9.8 23.6", "M17.4 23.8H22.6"];

/** Inner SVG of the mark on the 32-grid. kind: "color" | one-colour hex. */
function markInner(kind, { detail = "full", id = "pk" } = {}) {
  const sw = detail === "min" ? 3 : 2.6;
  if (kind === "color") {
    const g = GRAD[detail];
    return `<defs><radialGradient id="${id}-fold" gradientUnits="userSpaceOnUse" cx="16" cy="12.2" r="18" gradientTransform="translate(0 12.2) scale(1 ${g.squash}) translate(0 -12.2)"><stop offset="0" stop-color="${g.deep}"/><stop offset="${g.midAt}" stop-color="${g.mid}"/><stop offset="${g.endAt}" stop-color="${C.body}"/></radialGradient></defs>` +
      `<rect x="3" y="3" width="26" height="26" rx="6" fill="${C.body}"/><path d="${FLAP}" fill="url(#${id}-fold)"/>` +
      `<g fill="none" stroke="${C.ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${PROMPT.map((d) => `<path d="${d}"/>`).join("")}</g>`;
  }
  const gap = detail === "min" ? 1.7 : 1.4;
  return `<defs><mask id="${id}-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32"><rect width="32" height="32" fill="#fff"/>` +
    `<path d="${FOLD_GAP}" fill="none" stroke="#000" stroke-width="${gap}" stroke-linejoin="round"/>` +
    `<g fill="none" stroke="#000" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${PROMPT.map((d) => `<path d="${d}"/>`).join("")}</g></mask></defs>` +
    `<rect x="3" y="3" width="26" height="26" rx="6" fill="${kind}" mask="url(#${id}-cut)"/>`;
}

const svgDoc = (vb, w, h, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>\n`;

// ── wordmark (outlined paths, 1000 units/em, baseline y=0, ascenders negative) ──────────────────
const word = (fill, s, x, baseline) => `<path transform="translate(${(x - wm.minX * s).toFixed(2)} ${baseline.toFixed(2)}) scale(${s})" fill="${fill}" d="${wm.d}"/>`;
const CAP = 710; // Geist cap/ascender height in units

// horizontal lockup: mark 100 tall (art), 40 gap, wordmark 73.8 units (the proportions used in the site navbar)
function lockupH(kind, wordFill, id) {
  const s = 0.0738, gap = 40, markH = 100, k = markH / 26;
  const wordW = (wm.maxX - wm.minX) * s, W = markH + gap + wordW;
  const baseline = markH / 2 + (CAP / 2) * s;
  const mark = `<g transform="translate(${-3 * k} ${-3 * k}) scale(${k})">${markInner(kind, { id })}</g>`;
  return svgDoc(`0 0 ${W.toFixed(2)} ${markH}`, Math.round(W * 2), markH * 2, mark + word(wordFill, s, markH + gap, baseline), "pockett");
}
// stacked lockup: mark 130 tall, 34 gap, wordmark 90 units, centred
function lockupS(kind, wordFill, id) {
  const s = 0.09, gap = 34, markH = 130, k = markH / 26;
  const wordW = (wm.maxX - wm.minX) * s, W = wordW;
  const baseline = markH + gap + CAP * s, H = baseline + wm.maxY * s;
  const mark = `<g transform="translate(${(W - markH) / 2 - 3 * k} ${-3 * k}) scale(${k})">${markInner(kind, { id })}</g>`;
  return svgDoc(`0 0 ${W.toFixed(2)} ${H.toFixed(2)}`, Math.round(W * 1.5), Math.round(H * 1.5), mark + word(wordFill, s, 0, baseline), "pockett");
}
const markDoc = (kind, detail = "full") => svgDoc("3 3 26 26", 256, 256, markInner(kind, { detail, id: "pk" }), "pockett");

// ── variants ─────────────────────────────────────────────────────────────────────────────────────
const VARIANTS = [
  { name: "light", kind: "color", word: C.wordLight, bg: "#f6f5f1" }, // full colour, for light backgrounds
  { name: "dark", kind: "color", word: C.wordDark, bg: "#0a0a0a" }, // full colour, for dark backgrounds
  { name: "black", kind: "#0a0a0a", word: "#0a0a0a", bg: "#ffffff" },
  { name: "white", kind: "#ffffff", word: "#ffffff", bg: "#0a0a0a" },
];
const files = {}; // relative path (under brand/) -> content
for (const v of VARIANTS) {
  files[`svg/pockett-mark-${v.name}.svg`] = markDoc(v.kind);
  files[`svg/pockett-lockup-horizontal-${v.name}.svg`] = lockupH(v.kind, v.word, "pk");
  files[`svg/pockett-lockup-stacked-${v.name}.svg`] = lockupS(v.kind, v.word, "pk");
}

// ── write svgs ───────────────────────────────────────────────────────────────────────────────────
const out = (rel, data) => { const p = join(here, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, data); return p; };
for (const [rel, data] of Object.entries(files)) out(rel, data);
console.log(`svg: ${Object.keys(files).length} files`);

// ── Chrome / CDP rasteriser ─────────────────────────────────────────────────────────────────────
const tmp = mkdtempSync(join(tmpdir(), "pockett-brand-"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(tmp, "profile")}`, "--hide-scrollbars", "--no-first-run", "--force-color-profile=srgb", "about:blank"], { stdio: "ignore" });
let target; for (let i = 0; i < 60 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === "page"); } catch { /* not up yet */ } }
if (!target) throw new Error("Chrome did not start (set CHROME / CDP_PORT)");
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let msgId = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++msgId; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable");

let n = 0;
async function shoot(html, outRel, w, h) {
  const f = join(tmp, `p${++n}.html`); writeFileSync(f, html);
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  await send("Page.navigate", { url: pathToFileURL(f).href });
  await sleep(250);
  await send("Runtime.evaluate", { expression: "document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))", awaitPromise: true });
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
  out(outRel, Buffer.from(shot.result.data, "base64"));
}
const imgPage = (src, w, h, extra = "") => `<!doctype html><html><body style="margin:0;background:transparent;width:${w}px;height:${h}px;overflow:hidden;${extra}"><img src="${src}" width="${w}" height="${h}" style="display:block"></body></html>`;
const SIZES = [16, 32, 64, 128, 256, 512, 1024];

for (const v of VARIANTS) {
  // mark: square, tight art. <=32px uses the heavier small-size drawing so the prompt and fold survive.
  for (const s of SIZES) {
    const detail = s <= 32 ? "min" : "full";
    const f = join(tmp, `m-${v.name}-${detail}.svg`); writeFileSync(f, markDoc(v.kind, detail));
    await shoot(imgPage(pathToFileURL(f).href, s, s), `png/mark/pockett-mark-${v.name}-${s}.png`, s, s);
  }
  // lockups: sized by width (128 and up; the guide sets 96px as the smallest lockup)
  for (const [kind, doc, ratioW, ratioH] of [["horizontal", lockupH(v.kind, v.word, "pk"), 1, 0], ["stacked", lockupS(v.kind, v.word, "pk"), 1, 0]]) {
    const f = join(tmp, `l-${kind}-${v.name}.svg`); writeFileSync(f, doc);
    const [, , vw, vh] = doc.match(/viewBox="([\d. ]+)"/)[1].split(" ").map(Number);
    for (const w of [128, 256, 512, 1024]) {
      const h = Math.round((w * vh) / vw);
      await shoot(imgPage(pathToFileURL(f).href, w, h), `png/lockup-${kind}/pockett-lockup-${kind}-${v.name}-${w}.png`, w, h);
    }
    void ratioW; void ratioH;
  }
}

// ── social images ────────────────────────────────────────────────────────────────────────────────
const fontCss = `@font-face{font-family:Geist;src:url("${pathToFileURL(join(here, "fonts/Geist-Variable.woff2"))}");font-weight:100 900}
@font-face{font-family:"Source Serif 4";src:url("${pathToFileURL(join(here, "fonts/SourceSerif4.woff2"))}");font-weight:200 900}`;
const dark = join(tmp, "lockup-dark.svg"); writeFileSync(dark, files["svg/pockett-lockup-horizontal-dark.svg"]);
const markSvg = join(tmp, "mark.svg"); writeFileSync(markSvg, markDoc("color"));
const og = `<!doctype html><html><head><style>${fontCss}
html,body{margin:0}body{width:1200px;height:630px;background:#0a0a0a;color:#fafafa;font-family:Geist,sans-serif;position:relative;overflow:hidden}
.lock{position:absolute;left:80px;top:72px;height:56px}
h1{position:absolute;left:80px;top:196px;width:640px;margin:0;transform:translateZ(0);font:600 84px/1.04 "Source Serif 4",serif;letter-spacing:-0.01em}
p{position:absolute;left:80px;bottom:76px;margin:0;transform:translateZ(0);font:400 28px/1.3 Geist,sans-serif;color:#a3a3a3}
.mark{position:absolute;right:92px;top:135px;width:360px;height:360px}
</style></head><body><img class="lock" src="${pathToFileURL(dark).href}"><h1>Learn to code by building real projects.</h1><p>Live demos. Instant feedback. Free.</p><img class="mark" src="${pathToFileURL(markSvg).href}"></body></html>`;
await shoot(og, "social/pockett-og-1200x630.png", 1200, 630);
const avatar = `<!doctype html><html><body style="margin:0;width:1080px;height:1080px;background:#0a0a0a;display:grid;place-items:center"><img src="${pathToFileURL(markSvg).href}" width="600" height="600"></body></html>`;
await shoot(avatar, "social/pockett-avatar-1080.png", 1080, 1080);

ws.close(); chrome.kill();
await sleep(300);
try { rmSync(tmp, { recursive: true, force: true }); } catch { /* chrome may still hold the profile */ }

// ── public copies (the /brand page) and site metadata image ───────────────────────────────────────
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const pub = join(repo, "public/brand");
rmSync(pub, { recursive: true, force: true });
for (const sub of ["svg", "png", "social"]) for (const p of walk(join(here, sub))) { const dst = join(pub, relative(here, p)); mkdirSync(dirname(dst), { recursive: true }); copyFileSync(p, dst); }
copyFileSync(join(here, "social/pockett-og-1200x630.png"), join(repo, "src/app/opengraph-image.png"));
copyFileSync(join(here, "social/pockett-og-1200x630.png"), join(repo, "src/app/twitter-image.png"));

// ── zip ──────────────────────────────────────────────────────────────────────────────────────────
function zip(entries) {
  const chunks = [], central = []; let offset = 0;
  for (const [name, data] of entries) {
    const nameBuf = Buffer.from(name), comp = deflateRawSync(data), crc = crc32(data);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0x6000, 10); local.writeUInt16LE(0x5a21, 12); // fixed timestamp keeps the zip reproducible
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBuf.length, 26);
    chunks.push(local, nameBuf, comp);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10);
    c.writeUInt16LE(0x6000, 12); c.writeUInt16LE(0x5a21, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nameBuf.length, 28); c.writeUInt32LE(offset, 42);
    central.push(c, nameBuf); offset += 30 + nameBuf.length + comp.length;
  }
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cdSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, ...central, end]);
}
const kit = [];
for (const sub of ["svg", "png", "social"]) for (const p of walk(join(here, sub))) kit.push([`pockett-brand-kit/${relative(here, p).replaceAll("\\", "/")}`, readFileSync(p)]);
if (existsSync(join(here, "BRAND.md"))) kit.push(["pockett-brand-kit/BRAND.md", readFileSync(join(here, "BRAND.md"))]);
mkdirSync(pub, { recursive: true });
writeFileSync(join(pub, "pockett-brand-kit.zip"), zip(kit));
console.log(`png/social done; zip: ${kit.length} files`);
process.exit(0);
