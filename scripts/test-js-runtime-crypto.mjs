// Unit tests for the JavaScript runtime's synchronous HMAC helper and the weather upstream route.
//   node scripts/test-js-runtime-crypto.mjs
process.env.NODE_NO_WARNINGS = "1";
import { createHmac, createHash } from "node:crypto";
import { hmacSha256, sha256Bytes } from "../src/engine/runtimes/javascript/crypto-shim.ts";
import { executeJs, runJsTests } from "../src/engine/runtimes/javascript/engine.ts";

let failed = 0;
const check = (name, ok, extra = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : " " + extra}`);
};
const hex = (bytes) => Buffer.from(bytes).toString("hex");

// RFC 4231 test case 1 and 2
check("rfc4231 #1", hex(hmacSha256(new Uint8Array(20).fill(0x0b), "Hi There")) === "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7");
check("rfc4231 #2", hex(hmacSha256("Jefe", "what do ya want for nothing?")) === "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");

// agreement with node:crypto over many lengths, including keys longer than one block
let agree = true;
for (let n = 0; n < 200; n += 7) {
  const key = "k".repeat(n % 150);
  const msg = "payload-" + "x".repeat(n);
  if (hex(hmacSha256(key, msg)) !== createHmac("sha256", key).update(msg).digest("hex")) agree = false;
  if (hex(sha256Bytes(new TextEncoder().encode(msg))) !== createHash("sha256").update(msg).digest("hex")) agree = false;
}
check("matches node:crypto for many sizes", agree);
check("non-string key is a clear TypeError", (() => { try { hmacSha256(42, "x"); return false; } catch (e) { return e instanceof TypeError && /key/.test(e.message); } })());

// visible to learner code, and the upstream route answers deterministically
const run = await executeJs(`
const sig = hmacSha256("secret", "hello");
const first = await (await fetch("/upstream/forecast/waterfront")).json();
const second = await (await fetch("/upstream/forecast/waterfront")).json();
`);
check("program runs", run.ok, run.ok ? "" : run.error.message);
if (run.ok) {
  const res = await runJsTests(run.scope, [
    { id: "a", description: "sig is 32 bytes", assertionCode: `assertEqual(sig.length, 32); assertEqual(sig instanceof Uint8Array, true);` },
    { id: "b", description: "forecast is stable", assertionCode: `assertEqual(first, second); assertEqual(first.zone, "waterfront");` },
  ]);
  for (const r of res) check(r.description, r.passed, r.error);
  run.scope.dispose();
}
process.exit(failed ? 1 : 0);
