// One-off: converts the "pockett" wordmark (Geist SemiBold, -0.02em tracking, exactly as the site sets it)
// into outlined vector paths, so the brand SVGs never depend on an installed font.
//
// Chrome embeds a variable font instance in a printed PDF as Type 3 glyph procedures: plain path operators.
// We print the word to PDF, read those glyph outlines back and write brand/src/wordmark.json.
//   node brand/tools/extract-wordmark.mjs
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const WORD = "pockett";
const SIZE = 200; // px; glyph space is 1000 units/em, so 1px = 5 units

const dir = mkdtempSync(join(tmpdir(), "wordmark-"));
const html = join(dir, "w.html");
writeFileSync(html, `<html><style>
@page{size:1400px 300px;margin:0}
@font-face{font-family:G;src:url("${pathToFileURL(join(root, "fonts/Geist-Variable.woff2"))}");font-weight:100 900}
html,body{margin:0}
body{font-family:G;font-weight:600;font-size:${SIZE}px;letter-spacing:-0.02em;line-height:300px;font-kerning:normal}
</style><body>${WORD}</body></html>`);
const pdfPath = join(dir, "w.pdf");
spawnSync(CHROME, ["--headless=new", "--no-pdf-header-footer", `--print-to-pdf=${pdfPath}`, pathToFileURL(html).href], { stdio: "ignore" });

const pdf = readFileSync(pdfPath).toString("latin1");
const objs = {};
for (const m of pdf.matchAll(/(\d+) 0 obj([\s\S]*?)endobj/g)) objs[m[1]] = m[2];
const streamOf = (n) => {
  const b = objs[n]; const i = b.indexOf("stream"); if (i < 0) return "";
  let raw = b.slice(i + 6).replace(/^\r?\n/, ""); raw = raw.slice(0, raw.lastIndexOf("endstream")).replace(/\r?\n$/, "");
  return /FlateDecode/.test(b.slice(0, i)) ? inflateSync(Buffer.from(raw, "latin1")).toString("latin1") : raw;
};
const fontObj = Object.values(objs).find((b) => /\/Subtype \/Type3/.test(b));
const procs = Object.fromEntries([...fontObj.slice(fontObj.indexOf("/CharProcs")).matchAll(/\/(g[0-9A-F]+) (\d+) 0 R/g)].map((m) => [m[1], m[2]]));
const diff = fontObj.match(/\/Differences \[0 ([^\]]*)\]/)[1].trim().split(/\s+/).map((s) => s.slice(1));
const content = Object.values(objs).map((_, i) => Object.keys(objs)[i]).map(streamOf).find((s) => s.includes("BT"));

// glyph run: first <xx> at the Tm origin, then "dx 0 Td <xx>" (relative to the previous origin), in px at SIZE.
const run = []; let x = 0; let first = true;
for (const m of content.matchAll(/(?:([-\d.]+) 0 Td )?<([0-9A-F]{2})> Tj/g)) { if (!first) x += parseFloat(m[1]); first = false; run.push({ code: parseInt(m[2], 16), x: x * (1000 / SIZE) }); }

const num = (v) => String(Math.round(v * 10) / 10);
let d = ""; let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
for (const g of run) {
  const proc = streamOf(procs[diff[g.code]]);
  const lines = proc.split("\n").map((l) => l.trim()).filter(Boolean);
  const bbox = lines[0].split(/\s+/).map(Number); // wx wy llx lly urx ury d1
  minX = Math.min(minX, g.x + bbox[2]); maxX = Math.max(maxX, g.x + bbox[4]);
  minY = Math.min(minY, bbox[5], bbox[3]); maxY = Math.max(maxY, bbox[3], bbox[5]);
  const nums = (s) => s.split(/\s+/).filter(Boolean).map(Number);
  for (const l of lines.slice(1)) {
    const op = l.split(/\s+/).pop(); const a = nums(l.slice(0, l.length - op.length));
    const sh = (arr) => arr.map((v, i) => num(i % 2 === 0 ? v + g.x : v)).join(" ");
    if (op === "m") d += `M${sh(a)}`; else if (op === "l") d += `L${sh(a)}`; else if (op === "c") d += `C${sh(a)}`; else if (op === "h") d += "Z";
  }
}
// y is already "down is positive" with the baseline at 0, so ascenders are negative.
writeFileSync(join(root, "src/wordmark.json"), JSON.stringify({ text: WORD, font: "Geist SemiBold 600, -0.02em", unitsPerEm: 1000, minX: Math.round(minX), maxX: Math.round(maxX), minY: Math.round(minY), maxY: Math.round(maxY), d }, null, 1));
console.log("wordmark", { minX, maxX, minY, maxY, glyphs: run.length, bytes: d.length });
