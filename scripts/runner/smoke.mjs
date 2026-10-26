// Smoke test for a deployed code runner: hello world, stdin, a compile error, an infinite loop and a
// runtime exception in C#, C++ and Go, with latency. Exits 1 if anything fails.
//
//   node scripts/runner/smoke.mjs https://pockett.example.com
//   node scripts/runner/smoke.mjs https://pockett.example.com --lang go --repeat 5
//
// --repeat N runs the hello-world sample N extra times per language and prints min / median / max, to
// judge whether per-request sandbox creation is fast enough (if the median is well over ~3 s, switch the
// deployment to RUNNER_MODE=pool). Vercel deployment protection must allow the request (use the production
// domain, or pass a bypass header with --header "x-vercel-protection-bypass: <secret>").
import { SAMPLES, checkSample } from "../../src/server/runner/samples.ts";

process.env.NODE_NO_WARNINGS ??= "1";
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const base = args.find((a) => /^https?:\/\//.test(a));
if (!base) {
  console.error("usage: node scripts/runner/smoke.mjs <base-url> [--lang csharp|cpp|go] [--repeat N] [--header 'name: value']");
  process.exit(2);
}
const only = flag("--lang");
const repeat = Number(flag("--repeat") ?? 0);
const extraHeader = flag("--header");
const headers = { "Content-Type": "application/json" };
if (extraHeader) {
  const at = extraHeader.indexOf(":");
  headers[extraHeader.slice(0, at).trim()] = extraHeader.slice(at + 1).trim();
}

async function call(sample) {
  const started = performance.now();
  const res = await fetch(new URL("/api/run", base), {
    method: "POST",
    headers,
    body: JSON.stringify({ language: sample.language, source: sample.source, stdin: sample.stdin ?? "" }),
    signal: AbortSignal.timeout(90_000),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, ms: Math.round(performance.now() - started), retryAfter: res.headers.get("retry-after") };
}

const samples = SAMPLES.filter((s) => !only || s.language === only);
let failed = 0;
const hello = {};
console.log(`Runner smoke test against ${base}\n`);
for (const sample of samples) {
  let outcome;
  try {
    outcome = await call(sample);
  } catch (err) {
    outcome = { status: 0, body: { error: String(err) }, ms: 0 };
  }
  let problems;
  if (outcome.status === 429 && outcome.retryAfter) {
    problems = [`rate limited (retry after ${outcome.retryAfter}s); wait and rerun`];
  } else if (outcome.status !== 200) {
    problems = [`HTTP ${outcome.status}: ${outcome.body.error ?? "no error message"}`];
  } else {
    problems = checkSample(sample, outcome.body);
  }
  if (problems.length === 0 && sample.id === "hello") (hello[sample.language] ??= []).push(outcome.ms);
  if (problems.length) failed++;
  console.log(`${problems.length ? "FAIL" : "PASS"}  ${sample.language.padEnd(6)} ${sample.id.padEnd(14)} ${String(outcome.ms).padStart(6)} ms${problems.length ? "\n        " + problems.join("\n        ") : ""}`);
}

if (repeat > 0) {
  console.log(`\nLatency, hello world x${repeat}:`);
  for (const lang of [...new Set(samples.map((s) => s.language))]) {
    const sample = samples.find((s) => s.language === lang && s.id === "hello");
    const times = [];
    for (let i = 0; i < repeat; i++) {
      const r = await call(sample).catch(() => null);
      if (r && r.status === 200) times.push(r.ms);
      else if (r?.status === 429) await new Promise((ok) => setTimeout(ok, 2000));
    }
    times.sort((a, b) => a - b);
    console.log(times.length ? `  ${lang.padEnd(6)} min ${times[0]} ms   median ${times[Math.floor(times.length / 2)]} ms   max ${times[times.length - 1]} ms   (${times.length}/${repeat} ok)` : `  ${lang.padEnd(6)} no successful runs`);
  }
}

console.log(failed ? `\n${failed} of ${samples.length} checks FAILED` : `\nAll ${samples.length} checks passed`);
process.exit(failed ? 1 : 0);
