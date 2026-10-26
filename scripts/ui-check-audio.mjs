// Audio and volume checks for scripts/ui-check.mjs (run with: node scripts/ui-check.mjs --only audio).
// Everything is driven with real mouse, touch and key events over CDP; the page is only *observed*:
// a spy installed before the page loads records every AudioContext and the node wired to its destination, so we can assert
//   - nothing audio-related exists until the person opts in (autoplay policy: no context on load),
//   - ALL audio goes through one master gain (exactly one node feeds the destination),
//   - that gain follows the sliders / mute buttons, and the actual output level is silent when muted.
// Desktop widths run the navbar / stage / persistence / second-tab flows; widths < 700 run the touch flow.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SPY = `(() => {
  const au = (window.__au = { ctxs: [], dest: [] });
  const Base = window.AudioContext;
  if (!Base) return;
  window.AudioContext = class extends Base { constructor(...a) { super(...a); au.ctxs.push(this); } };
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (d, ...r) {
    if (d instanceof AudioDestinationNode && !au.dest.includes(this)) au.dest.push(this);
    return connect.call(this, d, ...r);
  };
  // the gain the app COMMANDED (an idle or suspended GainNode never renders, so .value can lag behind in a quiet page)
  const target = Object.getOwnPropertyDescriptor(AudioParam.prototype, "value");
  Object.defineProperty(AudioParam.prototype, "value", { ...target, set(v) { this.__target = v; target.set.call(this, v); } });
  const setTarget = AudioParam.prototype.setTargetAtTime;
  AudioParam.prototype.setTargetAtTime = function (v, t, c) { this.__target = v; return setTarget.call(this, v, t, c); };
  // peak level of what leaves the master gain over \`ms\` milliseconds
  au.peak = async (ms) => {
    const m = au.dest[0];
    if (!m) return null;
    if (!au.an) { au.an = m.context.createAnalyser(); au.an.fftSize = 1024; m.connect(au.an); au.buf = new Float32Array(1024); }
    let peak = 0;
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      au.an.getFloatTimeDomainData(au.buf);
      for (const v of au.buf) peak = Math.max(peak, Math.abs(v));
      await new Promise((r) => setTimeout(r, 40));
    }
    return peak;
  };
})()`;

/** Mirrors gainFor() in src/lib/sound/audio.ts. */
const gainFor = (v) => 1.2 * Math.pow(Math.min(1, Math.max(0, v)), 1.5);

export async function checkAudio(h) {
  const { send, evaluate, inPage, waitFor, sleep, clickAt, press, record, open, screenshot, getCtx, BASE, PORT, OUT } = h;
  const shotsDir = process.env.AUDIO_SHOTS || join(OUT, "audio");
  mkdirSync(shotsDir, { recursive: true });
  const ctx = getCtx();
  const mobile = ctx.width < 700;

  const check = async (name, ok, detail = "") => {
    const shot = ok ? null : await screenshot(`audio-${name}`);
    record("audio", name, !!ok, ok ? "" : detail, shot);
    return !!ok;
  };
  const shot = async (name) => {
    try {
      const r = await send("Page.captureScreenshot", { format: "png" });
      writeFileSync(join(shotsDir, `${name}-${ctx.theme}-${ctx.width}.png`), Buffer.from(r.result.data, "base64"));
    } catch {
      /* screenshots are a bonus */
    }
  };

  // ── page and storage helpers ──
  const seed = JSON.parse(execFileSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), "seed-progress.mjs"), "beatlab", "4"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop());
  const legacy = { ...seed, soundEnabled: true };
  delete legacy.audio; // what a returning visitor has: the old flag, which used to default to ON

  /** Clean browser state (+ optional stored progress), then open the page. */
  async function freshPage(path, progress) {
    await send("Page.navigate", { url: `${BASE}/robots.txt` });
    await sleep(350);
    await evaluate(`localStorage.clear(); localStorage.setItem("pockett_theme_mode", ${JSON.stringify(ctx.theme)});` + (progress ? `localStorage.setItem("pockett_progress_v2", ${JSON.stringify(JSON.stringify(progress))});` : ""));
    await open(path);
  }

  const au = () => inPage(() => ({ contexts: window.__au?.ctxs.length ?? -1, nodes: window.__au?.dest.length ?? -1, gain: window.__au?.dest[0] ? (window.__au.dest[0].gain.__target ?? window.__au.dest[0].gain.value) : null, actual: window.__au?.dest[0]?.gain.value ?? null, state: window.__au?.ctxs[0]?.state ?? null }));
  const stored = () => inPage(() => { try { return JSON.parse(localStorage.getItem("pockett_progress_v2") ?? "null")?.audio ?? null; } catch { return null; } });
  const peak = (ms = 1400) => evaluate(`window.__au.peak(${ms})`);
  const waitGain = (expected, timeout = 3500) => waitFor((e) => { const p = window.__au?.dest[0]?.gain; const g = p && (p.__target ?? p.value); return typeof g === "number" && Math.abs(g - e) < 0.03; }, expected, timeout, 80);
  /** The value the audio thread is really applying (needs a running context with something playing through it). */
  const waitActual = (expected, timeout = 3500) => waitFor((e) => { const g = window.__au?.dest[0]?.gain.value; return typeof g === "number" && Math.abs(g - e) < 0.03; }, expected, timeout, 80);
  const text = (sel) => inPage((s) => document.querySelector(s)?.textContent?.trim() ?? null, sel);
  const label = (sel) => inPage((s) => document.querySelector(s)?.getAttribute("aria-label") ?? null, sel);
  const value = (sel) => inPage((s) => { const e = document.querySelector(s); return e ? Number(e.value) : null; }, sel);
  const rectOf = (sel) => inPage((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2, right: r.right, bottom: r.bottom };
  }, sel);
  const hudButton = (t) => inPage((t) => {
    const b = [...document.querySelectorAll("button.hud-btn")].find((x) => x.textContent.trim().startsWith(t));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
  }, t);
  const clickEl = async (sel) => {
    const r = await rectOf(sel);
    if (!r) throw new Error(`no element ${sel}`);
    await clickAt(r.cx, r.cy);
    return r;
  };
  const NAV = '[data-sound-control="navbar"]';
  const STAGE = '[data-sound-control="stage"]';
  const NAV_SLIDER = `${NAV} [data-sound-slider]`;
  const STAGE_SLIDER = `${STAGE} [data-sound-slider]`;
  const toggleLabel = (scope) => label(`${scope} [data-sound-toggle]`);
  const focusedIs = (sel) => inPage((s) => document.activeElement === document.querySelector(s), sel);

  /** Real mouse drag along a range input, from a fraction of its width to another. */
  async function dragSlider(sel, from, to) {
    const r = await rectOf(sel);
    const x = (p) => r.x + 9 + (r.w - 18) * p;
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x(from), y: r.cy, button: "none" });
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: x(from), y: r.cy, button: "left", buttons: 1, clickCount: 1 });
    for (let i = 1; i <= 8; i++) {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x(from + ((to - from) * i) / 8), y: r.cy, button: "left", buttons: 1 });
      await sleep(25);
    }
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x(to), y: r.cy, button: "left", buttons: 0, clickCount: 1 });
    await sleep(120);
  }
  async function keys(name, n) {
    for (let i = 0; i < n; i++) await press(name);
    await sleep(100);
  }

  // ── a second browser tab (separate target, same profile, so same localStorage) ──
  async function openTab(url) {
    const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${url}`, { method: "PUT" })).json();
    const sock = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((r) => (sock.onopen = r));
    let n = 0;
    const waiting = new Map();
    sock.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && waiting.has(d.id)) {
        waiting.get(d.id)(d);
        waiting.delete(d.id);
      }
    };
    const call = (method, params = {}) => new Promise((r) => { const id = ++n; waiting.set(id, r); sock.send(JSON.stringify({ id, method, params })); });
    await call("Page.enable");
    await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const ev = async (expression) => (await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
    const until = async (expression, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await ev(expression)) return true; } catch { /* loading */ } await sleep(150); } return false; };
    const rect = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; })()`);
    const click = async (sel) => {
      const r = await rect(sel);
      for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await call("Input.dispatchMouseEvent", { type, x: r.cx, y: r.cy, button: type === "mouseMoved" ? "none" : "left", clickCount: type === "mouseMoved" ? 0 : 1 });
      await sleep(150);
    };
    const key = async (name, vk, n = 1) => { for (let i = 0; i < n; i++) { await call("Input.dispatchKeyEvent", { type: "rawKeyDown", key: name, code: name, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); await call("Input.dispatchKeyEvent", { type: "keyUp", key: name, code: name, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); await sleep(60); } };
    const close = async () => { try { sock.close(); await fetch(`http://127.0.0.1:${PORT}/json/close/${t.id}`); } catch { /* gone */ } };
    return { ev, until, click, key, close };
  }

  const spy = (await send("Page.addScriptToEvaluateOnNewDocument", { source: SPY })).result.identifier;
  let other = null;
  try {
    if (mobile) await touchFlow();
    else await desktopFlows();
  } finally {
    await other?.close();
    await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: spy });
  }

  // ───────────────────────── desktop ─────────────────────────
  async function desktopFlows() {
    // 1. true first visit: nothing is on, nothing exists
    await freshPage("/projects/beatlab", null);
    await waitFor((s) => !!document.querySelector(s), STAGE, 30000);
    let a = await au();
    await check("fresh profile: no AudioContext created on load", a.contexts === 0, JSON.stringify(a));
    await check("fresh profile: navbar says sound is off", (await toggleLabel(NAV)) === "Unmute sound", String(await toggleLabel(NAV)));
    await check("fresh profile: audio stage shows a 'Sound off' chip", (await text(`${STAGE} [data-sound-chip]`)) === "Sound off", String(await text(`${STAGE} [data-sound-chip]`)));
    await clickAt(6, 420);
    await clickAt(6, 500);
    a = await au();
    await check("fresh profile: clicking around the page still creates no AudioContext", a.contexts === 0, JSON.stringify(a));
    await freshPage("/projects/garage", null);
    await check("scenes without sound have no stage sound control", !(await rectOf(STAGE)), "found a stage sound control on the garage");

    // 2. a visitor from before this change: the old flag said soundEnabled=true, they never chose it
    await freshPage("/", legacy);
    a = await au();
    await check("legacy soundEnabled=true loads as muted (label)", (await toggleLabel(NAV)) === "Unmute sound", String(await toggleLabel(NAV)));
    await clickAt(6, 420);
    a = await au();
    await check("legacy soundEnabled=true: no AudioContext after interaction", a.contexts === 0, JSON.stringify(a));

    // 3. Beat Lab while muted
    await freshPage("/projects/beatlab", legacy);
    const hint = await waitFor(() => !!document.querySelector('[data-testid="beatlab-sound-hint"]'), null, 150000, 300);
    await check("Beat Lab playing while muted shows the 'Sound is off' hint", hint, "hint never appeared (did the program boot?)");
    if (!hint) return;
    await check("hint text offers to turn sound on", /Sound is off/.test((await text('[data-testid="beatlab-sound-hint"]')) ?? ""), String(await text('[data-testid="beatlab-sound-hint"]')));
    await shot("stage-muted-hint");
    // Stop, then Play again with a real click on the stage button
    await clickAt((await hudButton("Stop")).cx, (await hudButton("Stop")).cy);
    await sleep(500);
    const stopped = await inPage(() => !document.querySelector('[data-testid="beatlab-sound-hint"]'));
    await check("hint goes away when playback stops", stopped);
    const play = await hudButton("Play");
    await clickAt(play.cx, play.cy);
    await sleep(600);
    a = await au();
    await check("Play while muted: hint shown again, no AudioContext, no master gain", (await rectOf('[data-testid="beatlab-sound-hint"]')) && a.contexts === 0 && a.gain === null, JSON.stringify(a));
    await check("muted hint did not auto-unmute", (await stored())?.enabled !== true, JSON.stringify(await stored()));

    // one click on the hint turns sound on
    await clickEl('[data-testid="beatlab-sound-hint"]');
    await waitGain(gainFor(0.6));
    a = await au();
    await check("hint click unmutes: navbar toggle follows", (await toggleLabel(NAV)) === "Mute sound", String(await toggleLabel(NAV)));
    await check("hint click unmutes: stage chip gone, hint gone", !(await rectOf(`${STAGE} [data-sound-chip]`)) && !(await rectOf('[data-testid="beatlab-sound-hint"]')));
    await check("hint click unmutes: one AudioContext, running, one master gain at the default volume (0.6)", a.contexts === 1 && a.state === "running" && a.nodes === 1 && Math.abs(a.gain - gainFor(0.6)) < 0.03, JSON.stringify(a));
    await check("hint click persists the choice", (await stored())?.enabled === true, JSON.stringify(await stored()));
    const heard = await peak(1800);
    await check("Beat Lab is audible after unmuting", heard > 0.005, `peak ${heard}`);

    // 4. navbar popover: mouse, keyboard, Esc
    await clickEl(`${NAV} [data-sound-menu]`);
    await sleep(200);
    const pop = await rectOf(`${NAV} [data-sound-popover]`);
    const vw = await inPage(() => window.innerWidth);
    await check("navbar popover opens and fits the viewport", pop && pop.x >= 0 && pop.right <= vw && pop.bottom <= 900, JSON.stringify(pop));
    await check("opening the popover focuses the slider", await focusedIs(NAV_SLIDER));
    await check("slider shows the current volume (60%)", (await value(NAV_SLIDER)) === 60, String(await value(NAV_SLIDER)));
    await shot("navbar-popover");

    await dragSlider(NAV_SLIDER, 0.6, 0.2);
    let v = await value(NAV_SLIDER);
    await check("mouse drag moves the slider down", v >= 12 && v <= 28, `value ${v}`);
    await check("master gain follows the mouse drag", await waitGain(gainFor(v / 100)), JSON.stringify(await au()));
    await check("...and the audio thread really applies it (Beat Lab is playing through it)", await waitActual(gainFor(v / 100)), JSON.stringify(await au()));
    await check("volume persisted as a 0..1 fraction", Math.abs((await stored())?.volume - v / 100) < 0.005, JSON.stringify(await stored()));
    await dragSlider(NAV_SLIDER, 0.2, 0.9);
    v = await value(NAV_SLIDER);
    await check("mouse drag moves the slider up", v >= 80, `value ${v}`);
    await check("master gain follows (up)", await waitGain(gainFor(v / 100)), JSON.stringify(await au()));

    const before = await value(NAV_SLIDER);
    await keys("ArrowLeft", 5);
    await check("ArrowLeft x5 lowers the volume by 5", (await value(NAV_SLIDER)) === before - 5, `${before} -> ${await value(NAV_SLIDER)}`);
    await keys("ArrowRight", 2);
    await check("ArrowRight x2 raises it by 2", (await value(NAV_SLIDER)) === before - 3, String(await value(NAV_SLIDER)));
    await check("master gain follows the arrow keys", await waitGain(gainFor((before - 3) / 100)), JSON.stringify(await au()));
    await keys("Home", 1);
    await check("Home -> 0%: gain 0 and the control reads as muted", (await waitGain(0)) && (await toggleLabel(NAV)) === "Unmute sound", `${JSON.stringify(await au())} ${await toggleLabel(NAV)}`);
    await check("volume 0 is silent", (await peak(700)) < 0.0008);
    await keys("End", 1);
    await check("End -> 100%: sound back on at full gain", (await waitGain(gainFor(1))) && (await toggleLabel(NAV)) === "Mute sound", `${JSON.stringify(await au())} ${await toggleLabel(NAV)}`);
    await keys("ArrowLeft", 40);
    await check("40 more ArrowLeft presses land on 60%", (await value(NAV_SLIDER)) === 60, String(await value(NAV_SLIDER)));

    await press("Escape");
    await sleep(150);
    await check("Esc closes the popover", !(await rectOf(`${NAV} [data-sound-popover]`)));
    await check("Esc returns focus to the volume button", await focusedIs(`${NAV} [data-sound-menu]`));
    await press("Enter");
    await sleep(150);
    await check("Enter on the volume button reopens the popover (keyboard)", !!(await rectOf(`${NAV} [data-sound-popover]`)));
    await press("Escape");

    // 5. the stage control is the same state
    await clickEl(`${STAGE} [data-sound-menu]`);
    await sleep(200);
    await check("stage popover shows the same volume (60%)", (await value(STAGE_SLIDER)) === 60, String(await value(STAGE_SLIDER)));
    await shot("stage-popover");
    await keys("ArrowLeft", 10);
    await check("stage slider changes the shared volume", (await stored())?.volume === 0.5 && (await waitGain(gainFor(0.5))), `${JSON.stringify(await stored())} ${JSON.stringify(await au())}`);
    await clickEl(`${NAV} [data-sound-menu]`);
    await sleep(150);
    await check("...and the navbar slider shows it too (50%)", (await value(NAV_SLIDER)) === 50, String(await value(NAV_SLIDER)));
    await check("opening the navbar popover closed the stage one", !(await rectOf(`${STAGE} [data-sound-popover]`)));
    await press("Escape");

    // mute from the stage
    await clickEl(`${STAGE} [data-sound-toggle]`);
    await check("stage mute button updates the navbar", await waitFor((s) => document.querySelector(s)?.getAttribute("aria-label") === "Unmute sound", `${NAV} [data-sound-toggle]`, 3000, 80));
    await check("stage shows 'Sound off' after muting", (await text(`${STAGE} [data-sound-chip]`)) === "Sound off");
    await check("master gain ramps to 0", (await waitGain(0)) && (await waitActual(0)), JSON.stringify(await au()));
    await sleep(500);
    await check("output level is silent while muted (already-playing sounds included)", (await peak(1200)) < 0.0008);
    await check("Beat Lab offers to unmute again", !!(await rectOf('[data-testid="beatlab-sound-hint"]')));
    await shot("stage-muted");

    // unmute from the navbar: the running Beat Lab should become audible again with no further input
    await clickEl(`${NAV} [data-sound-toggle]`);
    await check("navbar unmute restores gain to the saved volume", await waitGain(gainFor(0.5)), JSON.stringify(await au()));
    await check("stage chip gone after unmuting", !(await rectOf(`${STAGE} [data-sound-chip]`)));
    await check("Beat Lab is audible again after unmuting", (await peak(2200)) > 0.005);
    a = await au();
    await check("still exactly one node feeds the destination (everything shares the master)", a.nodes === 1 && a.contexts === 1, JSON.stringify(a));

    // 6. persistence and a second tab
    await open("/projects/beatlab");
    a = await au();
    await check("reload keeps the setting (label, saved volume)", (await toggleLabel(NAV)) === "Mute sound" && (await stored())?.volume === 0.5, `${await toggleLabel(NAV)} ${JSON.stringify(await stored())}`);
    await check("reload: still no AudioContext until the person interacts", a.contexts === 0, JSON.stringify(a));
    await clickEl(`${NAV} [data-sound-menu]`);
    await check("reload: slider shows 50%", (await value(NAV_SLIDER)) === 50, String(await value(NAV_SLIDER)));
    await press("Escape");
    // Beat Lab boots Python on its own; once it is playing, either it is waiting for a click ("Sound on") or the
    // browser already let it start (the click above counts as user activation), and then it is simply running
    const booted = await waitFor(() => [...document.querySelectorAll("button.hud-btn")].some((b) => /^(Sound on|Stop)/.test(b.textContent.trim())), null, 150000, 300);
    await check("reload: Beat Lab boots and plays", booted, "no Stop / Sound on button");
    const waiting = await hudButton("Sound on");
    if (waiting) {
      await clickAt(waiting.cx, waiting.cy);
      await waitGain(gainFor(0.5));
    }
    a = await au();
    await check("reload: after interaction the saved volume is applied and Beat Lab plays", a.contexts === 1 && a.state === "running" && Math.abs(a.gain - gainFor(0.5)) < 0.03 && (await peak(2200)) > 0.005, `${JSON.stringify(a)} waitingButton=${!!waiting}`);

    other = await openTab(`${BASE}/`);
    await other.until(`(() => { const e = document.querySelector('${NAV} [data-sound-toggle]'); return !!e && Object.keys(e).some((k) => k.startsWith("__reactProps")); })()`, 60000); // wait for hydration
    await other.click(`${NAV} [data-sound-toggle]`); // mute in the other tab
    const otherLabel = await other.ev(`document.querySelector('${NAV} [data-sound-toggle]')?.getAttribute('aria-label')`);
    await send("Page.bringToFront");
    await check("second tab: muting there mutes this tab (label)", await waitFor((s) => document.querySelector(s)?.getAttribute("aria-label") === "Unmute sound", `${NAV} [data-sound-toggle]`, 4000, 100), `other tab label after its click: ${otherLabel}; stored: ${JSON.stringify(await stored())}`);
    await check("second tab: ...and this tab's master gain goes to 0", await waitGain(0), JSON.stringify(await au()));
    await other.click(`${NAV} [data-sound-toggle]`); // unmute
    await other.click(`${NAV} [data-sound-menu]`);
    await other.key("ArrowLeft", 37, 20); // slider has focus: 50 -> 30
    await send("Page.bringToFront");
    await check("second tab: its volume change reaches this tab", await waitFor((s) => document.querySelector(s)?.getAttribute("aria-label") === "Mute sound", `${NAV} [data-sound-toggle]`, 4000, 100) && (await waitGain(gainFor(0.3))), `${JSON.stringify(await stored())} ${JSON.stringify(await au())}`);
    await other.close();
    other = null;

    // light/dark screenshot of the popover on a plain page
    await open("/");
    await clickEl(`${NAV} [data-sound-menu]`);
    await sleep(250);
    await shot("navbar-popover-home");
  }

  // ───────────────────────── phone: touch ─────────────────────────
  async function touch(type, x, y) {
    await send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  }
  async function tap(sel) {
    const r = await rectOf(sel);
    await touch("touchStart", r.cx, r.cy);
    await sleep(40);
    await touch("touchEnd", r.cx, r.cy);
    await sleep(200);
    return r;
  }
  async function touchFlow() {
    await freshPage("/", null);
    const a0 = await au();
    await check("phone: no AudioContext on load", a0.contexts === 0, JSON.stringify(a0));
    const toggle = await rectOf(`${NAV} [data-sound-toggle]`);
    const menu = await rectOf(`${NAV} [data-sound-menu]`);
    await check("phone: speaker button is visible and >= 40x40", toggle && toggle.w >= 40 && toggle.h >= 40, JSON.stringify(toggle));
    await check("phone: volume button is >= 40px tall and >= 28 wide", menu && menu.h >= 40 && menu.w >= 28, JSON.stringify(menu));
    const fits = await inPage(() => {
      const pill = document.querySelector("header > div").getBoundingClientRect();
      const kids = [...document.querySelectorAll("header > div > div:last-child > *")].map((e) => e.getBoundingClientRect());
      return { overflowX: document.documentElement.scrollWidth > window.innerWidth, outside: kids.filter((r) => r.width > 0 && (r.left < pill.left || r.right > pill.right)).length };
    });
    await check("phone: navbar still fits on one row with the sound control", !fits.overflowX && fits.outside === 0, JSON.stringify(fits));

    await tap(`${NAV} [data-sound-menu]`);
    const pop = await rectOf(`${NAV} [data-sound-popover]`);
    const vw = await inPage(() => window.innerWidth);
    await check("phone: popover opens by tap and fits the screen", pop && pop.x >= 0 && pop.right <= vw && pop.w >= 220, `${JSON.stringify(pop)} vw ${vw}`);
    await shot("navbar-popover");

    const sl = await rectOf(NAV_SLIDER);
    await check("phone: slider row is a comfortable touch target (>= 40px tall)", sl && sl.h >= 40, JSON.stringify(sl));
    const x = (p) => sl.x + 9 + (sl.w - 18) * p;
    await touch("touchStart", x(0.2), sl.cy);
    for (let i = 1; i <= 6; i++) {
      await sleep(30);
      await touch("touchMove", x(0.2 + (0.5 * i) / 6), sl.cy);
    }
    await touch("touchEnd", x(0.7), sl.cy);
    await sleep(200);
    const v = await value(NAV_SLIDER);
    await check("phone: dragging the slider by touch sets the volume", v >= 55 && v <= 85, `value ${v}`);
    await check("phone: touching the slider turns sound on and persists it", (await stored())?.enabled === true && Math.abs((await stored())?.volume - v / 100) < 0.01, JSON.stringify(await stored()));
    await check("phone: master gain follows the touch", await waitGain(gainFor(v / 100)), JSON.stringify(await au()));

    await tap(`${NAV} [data-sound-switch]`);
    await check("phone: the switch in the popover mutes", (await toggleLabel(NAV)) === "Unmute sound" && (await waitGain(0)), `${await toggleLabel(NAV)} ${JSON.stringify(await au())}`);
    await touch("touchStart", 8, 700);
    await touch("touchEnd", 8, 700);
    await sleep(200);
    await check("phone: tapping outside closes the popover", !(await rectOf(`${NAV} [data-sound-popover]`)));
  }
}
