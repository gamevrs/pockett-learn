// Headless checks for the Beat Lab step logic (no browser, no audio).
//   node scripts/test-beatlab.mjs
process.env.NODE_NO_WARNINGS = "1";
import assert from "node:assert/strict";
import * as S from "../src/scenes/beatlab/sequencer.ts";

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log("ok  ", name);
};
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

ok("normBpm tolerates junk", () => {
  assert.equal(S.normBpm(undefined), 100);
  assert.equal(S.normBpm(NaN), 100);
  assert.equal(S.normBpm(-120), 100);
  assert.equal(S.normBpm(0), 100);
  assert.equal(S.normBpm("fast"), 100);
  assert.equal(S.normBpm(5), 40);
  assert.equal(S.normBpm(9999), 240);
  assert.equal(S.normBpm(128), 128);
});

ok("normSwing / normVolume / normPan", () => {
  assert.equal(S.normSwing(-1), 0);
  assert.equal(S.normSwing(9), 0.6);
  assert.equal(S.normSwing(NaN), 0);
  assert.equal(S.normVolume("loud", 0.8), 0.8);
  assert.equal(S.normVolume(3, 0.8), 1);
  assert.equal(S.normPan(-5), -1);
});

ok("string patterns", () => {
  assert.deepEqual(S.normPattern("x...X..."), [1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(S.normPattern("x".repeat(500)).length, 16);
  assert.equal(S.normPattern("").length, 16);
  assert.equal(S.normPattern("x...").filter((v) => v > 0).length, 1); // short strings pad with rests
  assert.deepEqual(S.normPattern("x-x_"), [1, 0, 1, 0, ...new Array(12).fill(0)]);
});

ok("list patterns with weird values", () => {
  const p = S.normPattern([1, 0, 2, 7, -3, NaN, Infinity, null, undefined, true, false, "x", "X", {}, [], 0.4, 1, 1, 1]);
  assert.equal(p.length, 16);
  assert.deepEqual(p.slice(0, 8), [1, 0, 2, 2, 0, 0, 0, 0]);
  assert.equal(p[9], 1);
  assert.equal(p[11], 1);
  assert.equal(p[12], 2);
  assert.equal(p[13], 0);
  near(p[15], 0.4);
  assert.deepEqual(S.normPattern(null), new Array(16).fill(0));
  assert.deepEqual(S.normPattern(42), new Array(16).fill(0));
  assert.equal(S.normPattern(new Array(100000).fill(1)).length, 16);
});

ok("rawLength", () => {
  assert.equal(S.rawLength("abc"), 3);
  assert.equal(S.rawLength([1, 2]), 2);
  assert.equal(S.rawLength(undefined), -1);
  assert.equal(S.rawLength(5), -1);
});

ok("levelGain stays in range and is monotonic", () => {
  assert.equal(S.levelGain(0), 0);
  assert.equal(S.levelGain(NaN), 0);
  let prev = 0;
  for (let l = 0.05; l <= 2; l += 0.05) {
    const g = S.levelGain(l);
    assert.ok(g >= prev && g <= 1);
    prev = g;
  }
  assert.equal(S.levelGain(2), 1);
});

ok("normNotes", () => {
  const notes = S.normNotes([33, 0, -4, 36.4, "A", null, NaN, 500, 0.2, 40]);
  assert.equal(notes.length, 16);
  assert.deepEqual(notes.slice(0, 10), [33, 0, 0, 36, 0, 0, 0, 127, 0, 40]);
  assert.deepEqual(S.normNotes("nope"), new Array(16).fill(0));
});

ok("midi maths", () => {
  near(S.midiToHzReference(69), 440);
  near(S.midiToHzReference(57), 220);
  near(S.midiToHzReference(60), 261.6255653, 1e-6);
  assert.equal(S.midiName(33), "A1");
  assert.equal(S.midiName(60), "C4");
  assert.equal(S.midiName(-1), "--");
  assert.equal(S.sanitizeHz(55, 33).ok, true);
  assert.equal(S.sanitizeHz(NaN, 33).ok, false);
  assert.equal(S.sanitizeHz(1e12, 33).ok, false);
  assert.equal(S.sanitizeHz("55", 33).ok, false);
  near(S.sanitizeHz(null, 33).hz, 55);
});

ok("mixer", () => {
  const m = S.normMixer({ kick: { volume: 0.5, pan: -0.3, mute: true }, hats: { volume: "loud", pan: 4, mute: "yes" }, bass: 7, extra: {} });
  assert.deepEqual(m.kick, { volume: 0.5, pan: -0.3, mute: true });
  assert.deepEqual(m.hats, { volume: 1, pan: 1, mute: false });
  assert.deepEqual(m.bass, { volume: 1, pan: 0, mute: false });
  assert.deepEqual(m.snare, { volume: 1, pan: 0, mute: false });
  assert.equal(Object.keys(S.normMixer(null)).length, 5);
  assert.equal(Object.keys(S.normMixer([1, 2])).length, 5);
});

ok("sections", () => {
  assert.equal(S.normSection("FILL "), "fill");
  assert.equal(S.normSection("nonsense"), "groove");
  assert.equal(S.normSection(5), "groove");
  assert.equal(S.normSection(undefined), "groove");
  assert.equal(S.sectionLevel("groove", "kick", 3, 1), 1);
  assert.equal(S.sectionLevel("break", "kick", 0, 2), 0);
  assert.equal(S.sectionLevel("break", "hats", 0, 1), 1);
  assert.equal(S.sectionLevel("drop", "bass", 0, 1), 2);
  assert.equal(S.sectionLevel("drop", "bass", 1, 0), 0);
  assert.equal(S.sectionLevel("drop", "snare", 4, 1), 1);
  assert.equal(S.sectionLevel("fill", "snare", 15, 0), 2);
  assert.equal(S.sectionLevel("fill", "snare", 4, 1), 1);
  assert.equal(S.sectionLevel("fill", "hats", 13, 1), 0);
  assert.equal(S.sectionLevel("fill", "kick", 0, 2), 2);
  assert.equal(S.sectionCrash("drop", 0), true);
  assert.equal(S.sectionCrash("drop", 4), false);
  assert.equal(S.sectionCrash("groove", 0), false);
});

ok("transport: exact step count, ordering, bar numbering", () => {
  const t = S.createTransport();
  assert.deepEqual(S.collectSteps(t, 0, 0.1, 120, 0), []); // not primed
  S.startTransport(t, 10, 0.1);
  const events = [];
  // 25ms timer, 100ms look-ahead, 4 seconds of wall clock at 120 bpm (125ms per step)
  for (let now = 10; now < 14; now += 0.025) events.push(...S.collectSteps(t, now, 0.1, 120, 0));
  const expected = Math.floor((14 - 10 - 0.1) / 0.125) + 1;
  assert.ok(events.length >= expected && events.length <= expected + 1, `${events.length} vs ${expected}`);
  events.forEach((e, i) => {
    assert.equal(e.counter, i);
    assert.equal(e.step, i % 16);
    assert.equal(e.bar, Math.floor(i / 16));
    near(e.time, 10.1 + i * 0.125, 1e-9);
    if (i) assert.ok(e.time > events[i - 1].time);
  });
  assert.equal(events[16].bar, 1);
  assert.equal(events[16].step, 0);
});

ok("transport: swing delays odd steps but keeps order", () => {
  const t = S.createTransport();
  S.startTransport(t, 0, 0);
  const ev = S.collectSteps(t, 0, 3, 120, 0.6, 100);
  ev.forEach((e, i) => {
    near(e.time, i * 0.125 + (i % 2 ? 0.6 * 0.125 : 0));
    if (i) assert.ok(e.time > ev[i - 1].time);
  });
});

ok("transport: tempo change mid-play never reorders or duplicates", () => {
  const t = S.createTransport();
  S.startTransport(t, 0, 0);
  const all = [];
  let bpm = 100;
  for (let now = 0; now < 6; now += 0.025) {
    if (Math.abs(now - 3) < 0.013) bpm = 180;
    all.push(...S.collectSteps(t, now, 0.1, bpm, 0.2));
  }
  all.forEach((e, i) => {
    assert.equal(e.counter, i);
    if (i) assert.ok(e.time > all[i - 1].time);
  });
});

ok("transport: a stalled timer skips instead of bursting", () => {
  const t = S.createTransport();
  S.startTransport(t, 0, 0);
  S.collectSteps(t, 0, 0.1, 120, 0);
  const late = S.collectSteps(t, 30, 0.1, 120, 0); // 30s stall
  late.push(...S.collectSteps(t, 30.025, 0.1, 120, 0), ...S.collectSteps(t, 30.05, 0.1, 120, 0));
  assert.ok(late.length >= 1 && late.length <= 2, `burst of ${late.length}`);
  assert.ok(late[0].time >= 29.99);
  assert.equal(late[0].step, late[0].counter % 16);
});

ok("transport: junk bpm/swing still advances", () => {
  const t = S.createTransport();
  S.startTransport(t, 0, 0);
  const ev = S.collectSteps(t, 0, 2, NaN, NaN, 100);
  assert.ok(ev.length > 5 && ev.every((e) => Number.isFinite(e.time)));
  const t2 = S.createTransport();
  S.startTransport(t2, 0, 0);
  assert.ok(S.collectSteps(t2, 0, 1000, 240, 0).length <= 48);
});

ok("resync keeps position in the loop", () => {
  const t = S.createTransport();
  S.startTransport(t, 0, 0);
  S.collectSteps(t, 0, 0.5, 120, 0);
  const c = t.counter;
  S.resyncTransport(t, 100, 0.05);
  const ev = S.collectSteps(t, 100, 0.2, 120, 0);
  assert.equal(ev[0].counter, c);
  near(ev[0].time, 100.05);
});

console.log(`\n${n} groups passed`);
