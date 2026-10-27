// Lesson-workspace and code-running feedback checks for scripts/ui-check.mjs (run: node scripts/ui-check.mjs --only workspace).
//
// Everything is driven with real mouse and key events over CDP; the page is only observed. The compiled-language runner
// (/api/run) and the CDN downloads (Pyodide, Monaco) are faked at the network layer with Fetch interception, so the same
// failure the learner would see (503, 429, offline, a request that never answers, a blocked CDN) is reproduced exactly.
//
//   remote runner  503 / 429 + Retry-After / offline / hang: calm notice (not red, never "EngineError"), Retry, Cancel,
//                  client timeout; Submit pressed during a Run is queued, Run during Submit says it is busy
//   console        language- and project-aware empty state, "ran and printed nothing" after a silent run
//   sandbox        Python starts downloading when the page opens and shows progress, also right after Run
//   engine         blocked Pyodide / Monaco CDN: clear message + Retry, Run/Submit disabled with a tooltip
//   feedback bar   "Not quite yet" / "Lesson complete" never cover a check
//   stage hints    no "Press Run" where there is no Run button; touch vs keyboard hints; autopilot label
//   shortcuts      Ctrl on Windows/Linux, ⌘ on macOS
//   learn tab      wide code blocks scroll sideways with a visible affordance

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RUN_LESSON = "/projects/csharp-basics/csharp-basics-1-hello"; // a compiled language: goes through /api/run
const OK_RESULT = { stdout: "Cinder Street Depot\n", stderr: "", exitCode: 0, compileError: null };

export async function checkWorkspace(h) {
  const { send, evaluate, inPage, waitFor, sleep, clickAt, press, record, open, screenshot, onEvent, getCtx, BASE, OUT } = h;
  const ctx = getCtx();
  const mobile = ctx.width < 700;
  const shotsDir = process.env.WORKSPACE_SHOTS || join(OUT, "workspace");
  mkdirSync(shotsDir, { recursive: true });

  const check = async (name, ok, detail = "") => {
    record("work", name, !!ok, ok ? "" : detail, ok ? null : await screenshot(`work-${name.replace(/\W+/g, "-").slice(0, 40)}`));
    return !!ok;
  };
  const shot = async (name) => {
    try {
      const r = await send("Page.captureScreenshot", { format: "png" });
      writeFileSync(join(shotsDir, `${name}-${ctx.width}.png`), Buffer.from(r.result.data, "base64"));
    } catch {
      /* screenshots are a bonus */
    }
  };

  // WORKSPACE_ONLY=runner,bar re-runs just those sections (runner, console, sandbox, engine, bar, hints, shortcuts, learn)
  const only = process.env.WORKSPACE_ONLY?.split(",");
  const on = (name) => !only || only.includes(name);

  // ───────────── network faking ─────────────
  /** rules: first match wins. action: "continue" | "fail" | "hold" | {delay} | {status, headers, json}. */
  const net = { rules: [], held: [], hits: [] };
  const b64 = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64");
  const stopEvents = onEvent(async (msg) => {
    if (msg.method !== "Fetch.requestPaused") return;
    const { requestId, request } = msg.params;
    const rule = net.rules.find((r) => request.url.includes(r.match));
    const act = rule?.action ?? "continue";
    if (rule) net.hits.push({ url: request.url, at: Date.now(), body: request.postData });
    try {
      if (act === "continue") await send("Fetch.continueRequest", { requestId });
      else if (act === "fail") await send("Fetch.failRequest", { requestId, errorReason: "ConnectionFailed" });
      else if (act === "offline") await send("Fetch.failRequest", { requestId, errorReason: "InternetDisconnected" });
      else if (act === "hold") net.held.push(requestId);
      else if (act.delay) {
        await sleep(act.delay);
        await send("Fetch.continueRequest", { requestId });
      } else {
        await send("Fetch.fulfillRequest", {
          requestId,
          responseCode: act.status ?? 200,
          responseHeaders: [{ name: "Content-Type", value: "application/json" }, ...Object.entries(act.headers ?? {}).map(([name, value]) => ({ name, value }))],
          body: b64(act.json ?? {}),
        });
      }
    } catch {
      /* the page navigated away: the request is gone */
    }
  });
  const rules = (...r) => {
    net.rules = r;
    net.held = [];
    net.hits = [];
  };
  const runHits = () => net.hits.filter((x) => x.url.includes("/api/run")).length;
  const releaseHeld = async (json = OK_RESULT) => {
    for (const requestId of net.held.splice(0)) {
      await send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: b64(json) }).catch(() => {});
    }
  };
  const RUNNER = (action) => ({ match: "/api/run", action });
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/run*" }, { urlPattern: "*cdn.jsdelivr.net*" }] });
  await send("Network.enable");

  // ───────────── page helpers ─────────────
  const rectOf = (sel) =>
    inPage((s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2, right: r.right, bottom: r.bottom };
    }, sel);
  const clickEl = async (sel) => {
    const r = await rectOf(sel);
    if (!r || !r.w) throw new Error(`no visible element ${sel}`);
    await clickAt(r.cx, r.cy);
    return r;
  };
  const clickButtonText = async (text) => {
    const r = await inPage((t) => {
      const b = [...document.querySelectorAll("button,[role=tab]")].find((e) => e.getBoundingClientRect().width && e.innerText.trim() === t);
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
    }, text);
    if (!r) throw new Error(`no button "${text}"`);
    await clickAt(r.cx, r.cy);
  };
  const text = (sel) => inPage((s) => document.querySelector(s)?.innerText?.replace(/\s+/g, " ").trim() ?? null, sel);
  const toast = () => text("[data-testid=workspace-toast]");
  const waitNotice = (kind, timeout = 8000) => waitFor((k) => document.querySelector("[data-testid=service-notice]")?.dataset.kind === k, kind, timeout, 100);
  const runDisabled = () => inPage(() => ({ run: document.querySelector("[data-testid=run-button]")?.disabled ?? null, submit: document.querySelector("[data-testid=submit-button]")?.disabled ?? null }));

  /** Fresh storage, then a lesson with the editor mounted. */
  async function lesson(path, { settle = 600, editor = true } = {}) {
    await send("Page.navigate", { url: `${BASE}/robots.txt` });
    await sleep(350);
    await evaluate(`localStorage.clear(); localStorage.setItem("pockett_theme_mode", ${JSON.stringify(ctx.theme)});`);
    await open(path, 400);
    await waitFor(() => !!document.querySelector("[data-testid=run-button]"), null, 30000, 150);
    if (editor) await waitFor(() => !!document.querySelector(".monaco-editor .view-lines"), null, 30000, 150);
    await sleep(settle);
  }
  /** On a phone only one panel shows at a time; bring the panel with this tab label forward. */
  const mobileTab = async (label) => {
    if (!mobile) return;
    const r = await inPage((t) => {
      const b = [...document.querySelectorAll("nav button")].find((e) => e.innerText.trim() === t);
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
    }, label);
    if (r) await clickAt(r.cx, r.cy);
    await sleep(250);
  };
  const consoleTab = async () => {
    await mobileTab("Checks");
    await clickButtonText("Console").catch(() => {});
    await sleep(200);
  };

  try {
    // ═════════════ 1. remote runner failures ═════════════
    if (on("runner")) {
    await lesson(RUN_LESSON);

    // 503: runner unavailable
    rules(RUNNER({ status: 503, json: { error: "runner unavailable" } }));
    await clickEl("[data-testid=run-button]");
    await waitNotice("unavailable");
    {
      const bodyText = await inPage(() => document.body.innerText);
      const styles = await inPage(() => {
        const n = document.querySelector("[data-testid=service-notice]");
        const reds = [n, ...n.querySelectorAll("*")].filter((e) => { const cs = getComputedStyle(e); return /rgb\((2[0-9]{2}|1[7-9][0-9]), (4[0-9]|[0-9]|1[0-2][0-9]), (4[0-9]|[0-9]|1[0-2][0-9])\)/.test(cs.color) || /rgb\((2[0-9]{2}|1[7-9][0-9]), (4[0-9]|[0-9]|1[0-2][0-9]), (4[0-9]|[0-9]|1[0-2][0-9])\)/.test(cs.backgroundColor) || /rgb\((2[0-9]{2}|1[7-9][0-9]), (4[0-9]|[0-9]|1[0-2][0-9]), (4[0-9]|[0-9]|1[0-2][0-9])\)/.test(cs.borderTopColor); });
        return { reds: reds.length, retry: !!n.querySelector("[data-testid=service-retry]"), says: n.innerText.replace(/\s+/g, " ") };
      });
      await shot("1-503");
      await check("503: calm 'unavailable' notice, never raw EngineError text", !/EngineError|runner unavailable/i.test(bodyText) && /code is fine/i.test(styles.says), `page text: ${styles.says}`);
      await check("503: notice is not red and offers Retry", styles.reds === 0 && styles.retry, `red elements: ${styles.reds}, retry: ${styles.retry}`);
      const d = await runDisabled();
      await check("503: Run and Submit are usable again (nothing left spinning)", d.run === false && d.submit === false && !(await text("[data-testid=cancel-run]")), JSON.stringify(d));
    }
    // Retry works once the runner is back
    rules(RUNNER({ json: OK_RESULT }));
    await clickEl("[data-testid=service-retry]");
    const cleared = await waitFor(() => !document.querySelector("[data-testid=service-notice]"), null, 8000, 100);
    await check("503: Retry runs again and the notice goes away", cleared && runHits() === 1, `notice still there: ${!cleared}, requests: ${runHits()}`);

    // 429 with Retry-After
    rules(RUNNER({ status: 429, headers: { "Retry-After": "4" }, json: { error: "Busy right now." } }));
    await clickEl("[data-testid=run-button]");
    await waitNotice("busy");
    {
      const t0 = Date.now();
      const says = await text("[data-testid=service-notice]");
      const countdown = await inPage(() => { const b = document.querySelector("[data-testid=service-retry]"); return { disabled: b.disabled, label: b.innerText.trim() }; });
      await shot("2-429");
      await check("429: 'Lots of people are running code right now' and the code is fine", /Lots of people are running code right now/.test(says) && /code is fine/i.test(says), says);
      await check("429: Retry shows the Retry-After countdown and waits for it", countdown.disabled && /Retry in \d+s/.test(countdown.label), JSON.stringify(countdown));
      const enabled = await waitFor(() => { const b = document.querySelector("[data-testid=service-retry]"); return b && !b.disabled && b.innerText.trim() === "Retry"; }, null, 9000, 150);
      await check("429: Retry becomes available once the wait is over", enabled && Date.now() - t0 >= 2500, `enabled: ${enabled}, after ${Date.now() - t0}ms`);
    }

    // network failure
    rules(RUNNER("offline"));
    await mobileTab("Code");
    await clickEl("[data-testid=run-button]");
    await waitNotice("offline");
    await shot("3-offline");
    await check("offline: calm 'can't reach' notice with Retry", /Can't reach the code runner/.test((await text("[data-testid=service-notice]")) ?? "") && !!(await rectOf("[data-testid=service-retry]")), (await text("[data-testid=service-notice]")) ?? "no notice");
    await check("offline: no 'Failed to fetch' anywhere", !/Failed to fetch|EngineError/.test(await inPage(() => document.body.innerText)));

    // a request that never answers: visible progress + Cancel, Run/Submit never stuck
    rules(RUNNER("hold"));
    await mobileTab("Code");
    await clickEl("[data-testid=run-button]");
    await sleep(700);
    {
      const state = await inPage(() => ({ header: document.querySelector("[data-testid=cancel-run-header]")?.innerText.trim() ?? null, status: document.body.innerText.includes("Compiling and running") }));
      await check("hung run: shows 'Compiling and running…' and a Cancel button", state.status && state.header === "Cancel", JSON.stringify(state));
      await mobileTab("Checks");
      await shot("4-hung");
      await check("hung run: results panel also has Cancel", !!(await rectOf("[data-testid=cancel-run]")), "no cancel in results panel");
      await mobileTab("Code");
      await clickEl("[data-testid=cancel-run-header]");
      await sleep(500);
      const after = await inPage(() => ({ spinning: !!document.querySelector("[data-testid=cancel-run-header]"), notice: !!document.querySelector("[data-testid=service-notice]"), runDisabled: document.querySelector("[data-testid=run-button]")?.disabled }));
      await check("Cancel stops the run: no spinner, no error, Run usable", !after.spinning && !after.notice && after.runDisabled === false && /cancelled/i.test((await toast()) ?? ""), JSON.stringify(after) + " toast: " + (await toast()));
    }

    // Submit during Run is queued, never dropped
    rules(RUNNER("hold"));
    await mobileTab("Code");
    await clickEl("[data-testid=run-button]");
    await sleep(500);
    await clickEl("[data-testid=submit-button]"); // Run is in flight (the left button is now Cancel): Submit queues
    await sleep(300);
    {
      const t = (await toast()) ?? "";
      const label = await text("[data-testid=submit-button]");
      await shot("5-queued");
      await check("Submit during a Run is queued (toast and 'Queued' label), not ignored", /queued/i.test(t) && /Queued/.test(label ?? ""), `toast: ${t}; button: ${label}`);
      net.rules = [RUNNER({ json: OK_RESULT })]; // later requests (the queued Submit's run and grading) answer straight away
      await releaseHeld(OK_RESULT);
      // wait until the Run is over and the queued Submit has made its two requests (run, then grading) and finished
      let went = false;
      const trace = [];
      for (let i = 0; i < 100 && !went; i++) {
        const v = await inPage(() => ({ cancel: !!document.querySelector("[data-testid=cancel-run-header]"), label: document.querySelector("[data-testid=submit-button]")?.innerText ?? "" }));
        trace.push(`${v.cancel ? "C" : "-"}:${v.label.split(" ")[0]}`);
        went = runHits() === 3 && !v.cancel && /^Submit/.test(v.label); // all three requests were made and nothing is in flight any more
        if (!went) await sleep(100);
      }
      await sleep(300);
      const total = runHits();
      await check("the queued Submit runs and grades as soon as the Run is done", !!went && total === 3, `requests in total (Run, then the queued Submit's run and grading = 3): ${total}; went=${went}; trace=${trace.slice(-8).join(" ")}; state: ${JSON.stringify(await inPage(() => ({ cancel: !!document.querySelector("[data-testid=cancel-run-header]"), submit: document.querySelector("[data-testid=submit-button]")?.innerText })))}`);
    }

    // Run (via shortcut) during Submit says it is busy
    rules(RUNNER("hold"));
    await mobileTab("Code");
    await clickEl("[data-testid=submit-button]");
    await sleep(500);
    await press("Enter", 2); // Ctrl+Enter
    await sleep(250);
    {
      const t = (await toast()) ?? "";
      await check("Run during Submit tells the learner it is busy", /already running/i.test(t), `toast: ${t}`);
      await press("Enter", 2 | 8);
      await sleep(200);
      const t2 = (await toast()) ?? "";
      await check("Submit during Submit says it is still checking", /still checking/i.test(t2), `toast: ${t2}`);
      await clickEl("[data-testid=cancel-run-header]");
      await sleep(400);
    }

    // client timeout (desktop only: it takes the whole budget)
    if (!mobile) {
      rules(RUNNER("hold"));
      const t0 = Date.now();
      await clickEl("[data-testid=run-button]");
      const got = await waitNotice("timeout", 32000);
      const took = Date.now() - t0;
      await shot("6-timeout");
      await check("hung run times out on its own (~25 s) with a calm notice", got && took > 22000 && took < 30000, `notice: ${got}, after ${took}ms`);
      const d = await runDisabled();
      await check("after the timeout Run and Submit are usable", d.run === false && d.submit === false, JSON.stringify(d));
      rules(RUNNER({ json: OK_RESULT }));
      await clickEl("[data-testid=service-retry]");
      await waitFor(() => !document.querySelector("[data-testid=service-notice]"), null, 8000, 100);
    }

    }
    // ═════════════ 2. console empty states ═════════════
    if (on("console")) {
    if (!mobile) {
      rules();
      const hint = async (path, expect, forbid, label) => {
        await lesson(path, { editor: false, settle: 300 });
        await consoleTab();
        const t = (await text("[data-testid=console-empty]")) ?? "";
        await check(`console empty state (${label}) names ${expect}${forbid ? " and drops the car" : ""}`, t.includes(expect) && (forbid ? !/car/i.test(t) : /car's dashboard/.test(t)), t);
      };
      await hint("/projects/garage/garage-1-ignition", "print()", false, "Turbo Garage, Python");
      await hint("/projects/garage-js/garage-js-1-ignition", "console.log()", false, "Turbo Garage, JavaScript");
      await hint("/projects/csharp-basics/csharp-basics-1-hello", "Console.WriteLine()", true, "C#");
      await hint("/projects/cpp-basics/cpp-basics-1-hello", "std::cout", true, "C++");
      await hint("/projects/go-basics/go-basics-1-hello", "fmt.Println()", true, "Go");
      await hint("/projects/rust-basics/rust-basics-1-hello", "println!()", true, "Rust");
      await hint("/projects/season-analytics/season-analytics-1-benchmarks", "SELECT", true, "SQL");
      // a Run that prints nothing says so
      await lesson("/projects/garage/garage-1-ignition");
      await inPage(() => window.monaco.editor.getEditors()[0].getModel().setValue("x = 1\n"));
      await clickEl("[data-testid=run-button]");
      await waitFor(() => !document.querySelector("[data-testid=cancel-run-header]") && document.querySelector("[data-testid=run-button]")?.innerText.includes("Run") && !document.querySelector("[data-testid=run-button]")?.innerText.includes("Running"), null, 60000, 200);
      await consoleTab();
      const after = (await text("[data-testid=console-empty]")) ?? "";
      await shot("7-ran-nothing");
      await check("a Run that printed nothing says the program ran and printed nothing", /ran and printed nothing/.test(after), after);
    }

    }
    // ═════════════ 3. sandbox: Python feedback from the first moment ═════════════
    if (on("sandbox")) {
    if (!mobile) {
      await send("Network.setCacheDisabled", { cacheDisabled: true });
      rules({ match: "cdn.jsdelivr.net/pyodide", action: { delay: 2500 } });
      await send("Page.navigate", { url: `${BASE}/robots.txt` });
      await sleep(350);
      await evaluate(`localStorage.clear(); localStorage.setItem("pockett_theme_mode", ${JSON.stringify(ctx.theme)});`);
      await send("Page.navigate", { url: `${BASE}/playground` });
      const early = await waitFor(() => /Getting ready|Starting Python/.test(document.querySelector("[data-testid=sandbox-status]")?.innerText ?? ""), null, 20000, 60);
      await check("sandbox: 'Starting Python…' shows as soon as the page opens, before any Run", !!early, (await text("[data-testid=sandbox-status]")) ?? "no status");
      await waitFor(() => !!document.querySelector("[data-testid=sandbox-run]"), null, 20000, 100);
      await clickEl("[data-testid=sandbox-run]");
      await sleep(250);
      const prog = (await text("[data-testid=sandbox-progress]")) ?? "";
      await shot("8-sandbox-cold");
      await check("sandbox: Run on a cold cache shows progress right away", /Getting ready|Starting Python/.test(prog), prog || "nothing shown");
      const done = await waitFor(() => document.body.innerText.includes("Hello, Ada!"), null, 60000, 250);
      await check("sandbox: the first run completes with the program's output", !!done);
      await send("Network.setCacheDisabled", { cacheDisabled: false });
    }

    }
    // ═════════════ 4. engine and editor CDN failures ═════════════
    if (on("engine")) {
    if (!mobile) {
      await send("Network.setCacheDisabled", { cacheDisabled: true });
      // Python blocked
      rules({ match: "cdn.jsdelivr.net/pyodide", action: "fail" });
      await send("Page.navigate", { url: `${BASE}/robots.txt` });
      await sleep(350);
      await evaluate(`localStorage.clear(); localStorage.setItem("pockett_theme_mode", ${JSON.stringify(ctx.theme)});`);
      await open("/projects/garage/garage-1-ignition", 400);
      await waitFor(() => !!document.querySelector("[data-testid=run-button]"), null, 30000, 150);
      const seen = await waitNotice("engine", 15000);
      const d = await inPage(() => ({ run: document.querySelector("[data-testid=run-button]")?.disabled, submit: document.querySelector("[data-testid=submit-button]")?.disabled, title: document.querySelector("[data-testid=run-button]")?.title }));
      await shot("9-python-blocked");
      await check("Python blocked: a clear 'didn't load' message with Retry", seen && /Python didn't load/.test((await text("[data-testid=service-notice]")) ?? "") && !!(await rectOf("[data-testid=service-retry]")), (await text("[data-testid=service-notice]")) ?? "no notice");
      await check("Python blocked: Run and Submit are disabled with an explaining tooltip", d.run === true && d.submit === true && /couldn't load/.test(d.title ?? ""), JSON.stringify(d));
      rules(); // CDN reachable again
      await clickEl("[data-testid=service-retry]");
      const back = await waitFor(() => !document.querySelector("[data-testid=service-notice]") && document.querySelector("[data-testid=run-button]")?.disabled === false, null, 60000, 250);
      await check("Python blocked: Retry loads Python and re-enables Run", !!back);
      // Python hangs (CDN accepts the connection and never answers): times out into the same message
      rules({ match: "cdn.jsdelivr.net/pyodide", action: "hold" });
      // timed inside the page (a MutationObserver stamps when the download starts and when the notice appears): the 3D stage
      // keeps a software-rendered browser so busy that a DevTools poll can answer 30 s late, which would skew a Node-side clock
      const stamp = await send("Page.addScriptToEvaluateOnNewDocument", {
        source: `(() => { const t = (window.__pyTimes = {}); new MutationObserver(() => { const now = performance.now(); if (!t.script && [...document.scripts].some((s) => /pyodide/.test(s.src))) t.script = now; if (t.script && !t.notice && document.querySelector("[data-testid=service-notice][data-kind=engine]")) t.notice = now; }).observe(document, { childList: true, subtree: true }); })();`,
      });
      await send("Page.navigate", { url: `${BASE}/projects/garage/garage-1-ignition` });
      await sleep(1500);
      const hung = await waitNotice("engine", 120000);
      await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: stamp.result?.identifier }).catch(() => {});
      const times = await inPage(() => window.__pyTimes);
      const took = times?.script && times?.notice ? times.notice - times.script : null;
      await check("Python hanging: gives up after ~30 s with the same message and Retry", hung && took !== null && took > 29000 && took < 34000 && !!(await rectOf("[data-testid=service-retry]")), `notice: ${hung}; ${took === null ? "no timestamps" : Math.round(took)}ms after the download started`);
      const loaded = await waitFor(() => document.readyState === "complete", null, 8000, 200);
      await check("Python hanging: the abandoned download no longer blocks the page", !!loaded);
      await releaseHeld({});
      // Monaco blocked
      rules({ match: "cdn.jsdelivr.net/npm/monaco-editor", action: "fail" });
      await open("/projects/csharp-basics/csharp-basics-1-hello", 400);
      const slow = await waitFor(() => !!document.querySelector("[data-testid=editor-slow]"), null, 25000, 250);
      await shot("10-editor-blocked");
      await check("editor blocked: after ~12 s it says so, with Retry and a basic editor", !!slow && !!(await rectOf("[data-testid=editor-retry]")) && !!(await rectOf("[data-testid=editor-basic]")), "no notice");
      await clickEl("[data-testid=editor-basic]");
      await sleep(300);
      await clickEl("[data-testid=basic-editor]");
      for (const ch of "zq") {
        await send("Input.dispatchKeyEvent", { type: "char", text: ch });
        await sleep(40);
      }
      const typed = await inPage(() => document.querySelector("[data-testid=basic-editor]")?.value.includes("zq"));
      await check("editor blocked: the basic editor takes real typing", typed);
      rules();
      await send("Network.setCacheDisabled", { cacheDisabled: false });
      await open("/projects/csharp-basics/csharp-basics-1-hello", 400);
      const monaco = await waitFor(() => !!document.querySelector(".monaco-editor .view-lines"), null, 40000, 250);
      await check("editor blocked: with the CDN back the real editor loads and no notice remains", !!monaco && !(await inPage(() => !!document.querySelector("[data-testid=editor-slow]"))));
    }

    }
    // ═════════════ 5. result bar never covers a check ═════════════
    if (on("bar")) {
    rules();
    await lesson("/projects/garage/garage-1-ignition");
    await clickEl("[data-testid=submit-button]");
    await waitFor(() => !!document.querySelector("[data-testid=feedback-bar]"), null, 60000, 200);
    await mobileTab("Checks");
    await sleep(1000);
    const covered = async (label) => {
      await shot(label); // a headless tab only lays out on a rendered frame: capture one first so the measurement is of the settled page
      await sleep(400);
      const g = await inPage(() => {
        const bar = document.querySelector("[data-testid=feedback-bar]");
        const b = bar?.getBoundingClientRect();
        // the results panel is the section that holds the Checks tab
        const tab = [...document.querySelectorAll("button")].find((x) => x.innerText.trim().startsWith("Checks") && x.closest("section"));
        const panel = tab?.closest("section");
        const scroller = panel?.querySelector(".overflow-y-auto");
        const sr = scroller?.getBoundingClientRect();
        const rows = [...(panel?.querySelectorAll("li") ?? [])].filter((li) => li.getBoundingClientRect().height > 0 && li.querySelector("svg"));
        const hidden = rows.filter((li) => {
          const r = li.getBoundingClientRect();
          if (sr && (r.bottom > sr.bottom + 1 || r.top < sr.top - 1)) return false; // scrolled out of its own panel is fine
          const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return !(el && (li === el || li.contains(el)));
        });
        return { bar: b && { top: b.top, bottom: b.bottom, h: b.height }, panelBottom: panel?.getBoundingClientRect().bottom ?? null, scrollerBottom: sr?.bottom ?? null, rows: rows.length, hidden: hidden.map((li) => li.innerText.slice(0, 40)), viewport: innerHeight };
      });
      await check(`${label}: the result bar sits below the checks and hides none of them (rows: ${g.rows})`, g.bar && g.rows > 0 && g.hidden.length === 0 && g.scrollerBottom <= g.bar.top + 1 && g.bar.bottom <= g.viewport + 1, JSON.stringify(g));
    };
    await covered("bar-not-quite");
    // pass the lesson with real code
    await mobileTab("Code");
    await inPage(() => window.monaco.editor.getEditors()[0].getModel().setValue('print("BOOT SEQUENCE START")\nprint("ENGINE: OK")\nprint("SYSTEMS GO")\n'));
    await clickEl("[data-testid=submit-button]");
    await waitFor(() => /Lesson complete|Still passing/.test(document.querySelector("[data-testid=feedback-bar]")?.innerText ?? ""), null, 60000, 200);
    await mobileTab("Checks");
    await sleep(1000);
    await covered("bar-complete");

    }
    // ═════════════ 6. stage hints that match what is on screen ═════════════
    if (on("hints")) {
    {
      const noRun = async (path, label) => {
        await send("Page.navigate", { url: `${BASE}/robots.txt` });
        await sleep(350);
        await evaluate(`localStorage.clear(); localStorage.setItem("pockett_theme_mode", ${JSON.stringify(ctx.theme)});`);
        await open(path, 1800);
        const stage = await inPage(() => {
          const t = document.body.innerText;
          const pill = document.querySelector("[data-testid=stage-hint]");
          return { pressRun: /Press Run/i.test(t), hasRunButton: !!document.querySelector("[data-testid=run-button]"), pill: pill?.innerText.trim() ?? null, pillIcon: pill?.querySelector("svg")?.getAttribute("class") ?? "", cursor: pill ? getComputedStyle(pill).cursor : null };
        });
        await check(`${label}: no 'Press Run' hint where there is no Run button`, !stage.pressRun, JSON.stringify(stage));
        return stage;
      };
      const hub = await noRun("/projects/garage", "project hub");
      if (!mobile) await shot("11-hub-hint");
      await check("project hub: the 'power it up' pill is a lock, not a play button, and is not clickable", /power it up/i.test(hub.pill ?? "") && /lucide-lock/.test(hub.pillIcon) && hub.cursor === "default", JSON.stringify(hub));
      await noRun("/", "landing page");
      // the workspace does have a Run button, so its blueprint hint is right to mention it
      await lesson("/projects/garage/garage-1-ignition", { editor: false });
      await mobileTab("Live");
      const ws = await inPage(() => ({ hint: document.querySelector("[data-testid=stage-hint]")?.innerText.trim(), car: document.body.innerText.includes("Press Run to boot the car") }));
      await check("lesson workspace: the blueprint hint points at the Run button", /Press Run/.test(ws.hint ?? "") && ws.car, JSON.stringify(ws));

      // touch vs keyboard on the landing demo (autopilot starts on; turn it off with a real tap/click)
      await send("Page.navigate", { url: `${BASE}/robots.txt` });
      await sleep(350);
      await evaluate(`localStorage.clear(); localStorage.setItem("pockett_theme_mode", ${JSON.stringify(ctx.theme)});`);
      await open("/", 2500);
      const hero = await inPage(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Auto(pilot)? (on|off)/.test(x.innerText.trim())); if (!b) return null; b.scrollIntoView({ block: "center" }); const r = b.getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, label: b.innerText.trim(), aria: b.getAttribute("aria-label") }; });
      await check("autopilot toggle reads 'Auto(pilot) on' with a full accessible name, not just 'On'", !!hero && /^Auto(pilot)? on$/.test(hero.label) && /Autopilot on/.test(hero.aria ?? ""), JSON.stringify(hero));
      if (hero) {
        await sleep(900); // the page scrolls smoothly: measure only once it has stopped
        // turn the autopilot off with a real click (retry while the page is still hydrating), then confirm it is off
        const autoLabel = () => inPage(() => [...document.querySelectorAll("button")].find((x) => /^Auto(pilot)? (on|off)/.test(x.innerText.trim()))?.innerText.trim() ?? null);
        let label = await autoLabel();
        for (let i = 0; i < 4 && !/off$/.test(label ?? ""); i++) {
          const p = await inPage(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Auto(pilot)? (on|off)/.test(x.innerText.trim())); b.scrollIntoView({ block: "center" }); const r = b.getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; });
          await sleep(700);
          const q2 = await inPage(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Auto(pilot)? (on|off)/.test(x.innerText.trim())); const r = b.getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; });
          await clickAt(q2.cx ?? p.cx, q2.cy ?? p.cy);
          await sleep(500);
          label = await autoLabel();
        }
        await clickAt(2, 450); // click away so the stage is not focused: the drive hint only shows while it is not
        await sleep(900);
        const hints = await inPage(() => {
          const stage = document.querySelector("canvas")?.closest(".relative.isolate") ?? document.body;
          const t = stage.innerText;
          return { wasd: /W A S D/.test(t), touchHint: /buttons below|on-screen/.test(t), pads: ["◀", "▶", "■", "▲"].filter((s) => t.includes(s)).length, touchPrimary: matchMedia("(pointer: coarse)").matches, aria: document.querySelector("canvas[aria-label]")?.getAttribute("aria-label") };
        });
        await shot("12-hero-hints");
        if (mobile) await check("touch: the stage offers on-screen buttons and never the W A S D instructions", !hints.wasd && (hints.pads === 4 || !hints.touchPrimary) && !/W A S D/.test(hints.aria ?? ""), JSON.stringify({ ...hints, autopilot: label }));
        else await check("keyboard: the stage says to drive with W A S D and shows no touch pads", hints.wasd && hints.pads === 0, JSON.stringify({ ...hints, autopilot: label }));
      }
    }

    }
    // ═════════════ 7. shortcut labels follow the platform ═════════════
    if (on("shortcuts")) {
    if (!mobile) {
      const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
      await send("Emulation.setUserAgentOverride", { userAgent: MAC, platform: "MacIntel", userAgentMetadata: { platform: "macOS", platformVersion: "14.0.0", architecture: "arm", model: "", mobile: false, brands: [{ brand: "Chromium", version: "130" }] } });
      await lesson("/projects/garage/garage-1-ignition", { editor: false });
      const mac = await inPage(() => ({ runTitle: document.querySelector("[data-testid=run-button]").title, kbd: [...document.querySelectorAll("[data-testid=run-button] kbd, [data-testid=submit-button] kbd")].map((k) => k.textContent.trim()), body: document.body.innerText.includes("Ctrl") }));
      await check("macOS: shortcut labels show ⌘, not Ctrl", /⌘ \+ Enter/.test(mac.runTitle) && mac.kbd.join("|") === "⌘ ↵|⌘ ⇧ ↵" && !mac.body, JSON.stringify(mac));
      await send("Emulation.setUserAgentOverride", { userAgent: "", platform: "" });
      await lesson("/projects/garage/garage-1-ignition", { editor: false });
      const win = await inPage(() => ({ runTitle: document.querySelector("[data-testid=run-button]").title, kbd: [...document.querySelectorAll("[data-testid=run-button] kbd, [data-testid=submit-button] kbd")].map((k) => k.textContent.trim()) }));
      await check("Windows/Linux: shortcut labels keep Ctrl", /Ctrl \+ Enter/.test(win.runTitle) && win.kbd.join("|") === "Ctrl ↵|Ctrl ⇧ ↵", JSON.stringify(win));
    }

    }
    // ═════════════ 8. Learn-tab code blocks scroll, visibly ═════════════
    if (on("learn")) {
    await lesson("/projects/garage/garage-2-paint", { editor: false });
    await mobileTab("Learn");
    await clickButtonText("Learn").catch(() => {});
    await sleep(400);
    {
      const pre = await inPage(() => {
        const p = [...document.querySelectorAll(".prose-lesson pre")].find((e) => e.scrollWidth > e.clientWidth + 8);
        if (!p) return null;
        p.scrollIntoView({ block: "center" });
        const cs = getComputedStyle(p);
        const r = p.getBoundingClientRect();
        return { cx: r.x + 60, cy: r.y + 30, sw: p.scrollWidth, cw: p.clientWidth, overflowX: cs.overflowX, bar: cs.scrollbarWidth, bg: cs.backgroundImage.includes("gradient") };
      });
      await check("Learn tab: a wide code block scrolls sideways with a thin bar and edge glows", !!pre && pre.overflowX === "auto" && pre.bg && pre.bar === "thin", JSON.stringify(pre));
      if (pre) {
        await sleep(150);
        const r = await inPage(() => { const p = [...document.querySelectorAll(".prose-lesson pre")].find((e) => e.scrollWidth > e.clientWidth + 8); const b = p.getBoundingClientRect(); return { x: b.x + 60, y: b.y + 30 }; });
        await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: r.x, y: r.y, deltaX: 120, deltaY: 0 });
        await sleep(400);
        const left = await inPage(() => [...document.querySelectorAll(".prose-lesson pre")].find((e) => e.scrollWidth > e.clientWidth + 8).scrollLeft);
        await shot("13-learn-scrolled");
        await check("Learn tab: the code block really scrolls to reveal the clipped text", left > 20, `scrollLeft ${left}`);
      }
    }
    }
  } finally {
    stopEvents();
    await send("Fetch.disable").catch(() => {});
    await send("Network.setCacheDisabled", { cacheDisabled: false }).catch(() => {});
    await send("Emulation.setUserAgentOverride", { userAgent: "", platform: "" }).catch(() => {});
  }
}
