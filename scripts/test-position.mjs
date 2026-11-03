// Headless checks for Foundations resume positions (src/learn/position.ts).
//   node scripts/test-position.mjs
process.env.NODE_NO_WARNINGS = "1";
import assert from "node:assert/strict";
const store = new Map();
globalThis.window = { localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) } };
const { savedStep, saveStep, clearStep, stepRef } = await import("../src/learn/position.ts");

const mk = (...titles) => titles.map((t) => ({ kind: "explain", title: t, body: `body of ${t}` }));
let n = 0;
const check = (name, fn) => { fn(); n++; console.log("ok  ", name); };
const V2 = "pockett_lesson_position_v2", V1 = "pockett_lesson_position_v1";

check("round trip on an unchanged lesson", () => {
  const steps = mk("a", "b", "c", "d", "e");
  saveStep("L", steps, 3);
  assert.equal(savedStep("L", steps), 3);
});
check("steps inserted before: resumes on the same step at its new index", () => {
  saveStep("L", mk("a", "b", "c", "d", "e"), 3); // on "d"
  assert.equal(savedStep("L", mk("a", "new1", "new2", "b", "c", "d", "e")), 5);
});
check("steps removed before: resumes on the same step at its new index", () => {
  saveStep("L", mk("a", "b", "c", "d", "e"), 3);
  assert.equal(savedStep("L", mk("a", "d", "e")), 1);
});
check("legacy bare number still works (and out of range is 0)", () => {
  store.clear();
  store.set(V1, JSON.stringify({ L: 2, M: 99, N: "x" }));
  const steps = mk("a", "b", "c", "d");
  assert.equal(savedStep("L", steps), 2);
  assert.equal(savedStep("M", steps), 0);
  assert.equal(savedStep("N", steps), 0);
});
check("saving supersedes the legacy entry; clearing forgets it", () => {
  store.clear();
  store.set(V1, JSON.stringify({ L: 2 }));
  const steps = mk("a", "b", "c", "d");
  saveStep("L", steps, 1);
  assert.equal(savedStep("L", steps), 1);
  assert.ok(!(JSON.parse(store.get(V1)).L));
  clearStep("L");
  assert.equal(savedStep("L", steps), 0);
});
check("unknown step, same length: keeps the index", () => {
  saveStep("L", mk("a", "b", "c", "d", "e"), 3);
  assert.equal(savedStep("L", mk("a", "b", "c", "X", "e")), 3);
});
check("unknown step, lesson shrank: clamps to the last step", () => {
  saveStep("L", mk("a", "b", "c", "d", "e"), 4);
  assert.equal(savedStep("L", mk("p", "q", "r")), 2);
});
check("duplicate titles: picks the match nearest the old index", () => {
  const steps = [{ kind: "recap", points: ["x"] }, { kind: "recap", points: ["x"] }, { kind: "recap", points: ["x"] }];
  saveStep("L", steps, 2);
  assert.equal(savedStep("L", [...steps, { kind: "recap", points: ["x"] }]), 2);
});
check("corrupt or hostile storage never throws and gives 0", () => {
  const steps = mk("a", "b", "c");
  for (const bad of ["{not json", "null", "[]", '{"L":{"s":"x"}}', '{"L":{"s":-1,"r":"z","n":3}}', '{"L":5}']) {
    store.clear(); store.set(V2, bad); store.set(V1, bad);
    assert.equal(savedStep("L", steps), 0, bad);
  }
  const old = window.localStorage.setItem;
  window.localStorage.setItem = () => { throw new Error("full"); };
  saveStep("L", steps, 1);
  window.localStorage.setItem = old;
});
check("stepRef is stable and distinguishes steps", () => {
  const [a, b] = mk("a", "b");
  assert.equal(stepRef(a), stepRef({ ...a }));
  assert.notEqual(stepRef(a), stepRef(b));
});
console.log(`\n${n} checks passed`);
