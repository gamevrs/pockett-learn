// Foundations lesson player checks for scripts/ui-check.mjs (run with: node scripts/ui-check.mjs --only learn).
// Everything is driven with real mouse and key events over CDP; the page is only *observed*.
//
//   enter    Enter submits (Check, then Continue) from the answer box, a selected MCQ option and a bit switch, and Space still
//            toggles; Enter stays a newline in the code editor and "send" in a terminal widget; explain-step widgets keep their keys.
//   wrong    a wrong answer says more than "Not quite.": per-option feedback, the question's hint, or a generic fallback.
//   resume   closing a lesson half-way and reopening resumes at that step ("Start over" goes back to step 1; finishing clears it).
//   leave    closing a code step with typed code asks first; closing an untouched step does not; the code is not kept.
//   checks   a project check never shows a raw TypeError (pit-wall: submit the untouched starter).
//   explain  the motion explainers (src/learn/widgets/explain) in fnd-ai-0b-inside and fnd-asm-9-decompile: the player mounts with an SVG stage and
//            a caption, starts paused, Play <-> Pause moves the scene progress, Next / Previous change the counter and caption (Next is disabled on
//            the last scene), reduced motion draws the finished picture and keeps the stage still, and on phones (390, 320) the player does not
//            overflow and every control is at least 40 x 40.

const LESSON = "fnd-bits-1-switches";
const POSITION_KEY = "pockett_lesson_position_v1"; // legacy bare-number format, still read
const POSITION_KEY_V2 = "pockett_lesson_position_v2";

// lessons with motion explainers: [lesson id, 0-based step index of each explain step that holds a player, scenes in that player]
const EXPLAINER_LESSONS = [
  ["fnd-ai-0b-inside", [[0, 4], [1, 1], [3, 1], [5, 1], [7, 1]]],
  ["fnd-asm-9-decompile", [[0, 1], [2, 1], [4, 1], [6, 1]]],
];

export async function checkLearn(h) {
  const { send, evaluate, inPage, waitFor, sleep, clickAt, record, open, screenshot, getCtx, BASE } = h;
  const ctx = getCtx();
  const t = async (name, ok, detail = "") => {
    const shot = ok ? null : await screenshot(`learn-${name}`);
    record("learn", name, !!ok, ok ? "" : detail, shot);
    return !!ok;
  };

  // ── real input ──
  const KEYS = { Enter: [13, "Enter", "\r"], Space: [32, "Space", " "], Tab: [9, "Tab", "\t"], Escape: [27, "Escape", undefined] };
  async function key(name, modifiers = 0) {
    const [vk, code, text] = KEYS[name];
    const k = name === "Space" ? " " : name;
    await send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", key: k, code, text, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
    await sleep(160);
  }
  async function typeText(text) {
    for (const ch of text) {
      await send("Input.dispatchKeyEvent", { type: "char", text: ch });
      await sleep(30);
    }
  }
  /** Real click on the centre of the first visible element that `find()` (run in the page) returns. */
  async function clickWhere(find, arg) {
    const at = await inPage(
      ({ src, arg }) => {
        const el = new Function("arg", `return (${src})(arg)`)(arg);
        if (!el) return null;
        el.scrollIntoView({ block: "center" });
        const r = el.getBoundingClientRect();
        return r.width > 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
      },
      { src: find.toString(), arg },
    );
    if (!at) return false;
    await clickAt(at.x, at.y);
    await sleep(120);
    return true;
  }
  const clickButton = (text) => clickWhere((tx) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim().replace(/\s+/g, " ").startsWith(tx) && b.getBoundingClientRect().width > 0), text);
  const clickOption = (text) => clickWhere((tx) => [...document.querySelectorAll("button[data-answer]")].find((b) => b.textContent.trim() === tx), text);
  const clickBit = (value) => clickWhere((v) => document.querySelector(`button[aria-label^="Bit worth ${v}:"]`), value);

  // ── observation ──
  const stepNo = () => inPage(() => Number(/Step (\d+) of/.exec(document.querySelector('[aria-label^="Step "]')?.getAttribute("aria-label") ?? "")?.[1] ?? 0));
  const bodyText = () => evaluate("document.body.innerText");
  const helpText = () => inPage(() => document.querySelector("[data-wrong-help]")?.textContent?.trim() ?? "");
  const hasText = async (re) => re.test(await bodyText());
  const waitStep = (n) => waitFor((n) => Number(/Step (\d+) of/.exec(document.querySelector('[aria-label^="Step "]')?.getAttribute("aria-label") ?? "")?.[1]) === n, n, 8000, 100);
  const waitText = (src) => waitFor((src) => new RegExp(src).test(document.body.innerText), src, 8000, 100);
  const pressed = (v) => inPage((v) => document.querySelector(`button[aria-label^="Bit worth ${v}:"]`)?.getAttribute("aria-pressed") === "true", v);
  const stored = () => evaluate(`localStorage.getItem(${JSON.stringify(POSITION_KEY_V2)})`);

  /** Clean browser state (theme kept, optional lesson position seeded), then open the page and wait for the player. */
  async function fresh(path, positions) {
    await send("Page.navigate", { url: `${BASE}/robots.txt` });
    await sleep(350);
    await evaluate(`localStorage.clear(); localStorage.setItem("pockett_theme_mode", ${JSON.stringify(ctx.theme)});` + (positions ? `localStorage.setItem(${JSON.stringify(POSITION_KEY)}, ${JSON.stringify(JSON.stringify(positions))});` : ""));
    await open(path, 900);
    return waitFor(() => !!document.querySelector('[aria-label^="Step "]'), null, 30000, 150);
  }

  // ───────────────────────── motion explainers ─────────────────────────
  /** Everything the explainer checks read, in one page round trip. */
  const player = () =>
    inPage(() => {
      const svg = document.querySelector("[data-widget] > div > svg[aria-hidden]");
      if (!svg) return null;
      const root = svg.closest("[data-widget]");
      const btns = [...root.querySelectorAll("button")];
      const named = (re) => btns.find((b) => re.test(b.getAttribute("aria-label") || b.textContent.trim()));
      const play = btns.find((b) => /^(Play|Pause|Replay)$/.test(b.textContent.trim()));
      const bar = root.querySelector("[aria-current=step] span span");
      const caption = root.querySelector("[aria-live=polite]");
      const small = [...root.querySelectorAll("button, input")]
        .map((el) => [el, el.getBoundingClientRect()])
        .filter(([, r]) => r.width > 0 && (r.width < 39.5 || r.height < 39.5))
        .map(([el, r]) => `${el.getAttribute("aria-label") || el.textContent.trim() || el.type} ${Math.round(r.width)}x${Math.round(r.height)}`);
      const rect = root.getBoundingClientRect();
      return {
        stage: svg.innerHTML,
        counter: root.querySelector('[aria-label^="Scene "][aria-label*=" of "]')?.textContent.replace(/\s+/g, " ").trim() ?? "",
        title: caption?.querySelector("p")?.textContent ?? "",
        caption: caption?.textContent ?? "",
        play: play?.textContent.trim() ?? "",
        fill: parseFloat(bar?.style.width ?? "0"),
        prevDisabled: !!named(/^Previous scene$/)?.disabled,
        nextDisabled: !!named(/^Next scene$/)?.disabled,
        scrubber: !!root.querySelector("input[type=range]"),
        small,
        overflow: document.documentElement.scrollWidth > innerWidth + 1 || rect.right > innerWidth + 1 || rect.left < -1,
      };
    });
  const widgetButton = (re) =>
    clickWhere(
      (src) => [...document.querySelectorAll("[data-widget] button")].find((b) => new RegExp(src).test(b.getAttribute("aria-label") || b.textContent.trim()) && b.getBoundingClientRect().width > 0 && !b.disabled),
      re,
    );
  const phone = (width) => send("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: true });
  const media = (reduce) =>
    send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: ctx.theme }, { name: "prefers-reduced-motion", value: reduce ? "reduce" : "no-preference" }] });
  /** Open one explainer step of a lesson and wait for its stage. */
  async function explainerAt(lesson, step) {
    await fresh(`/learn/${lesson}`, { [lesson]: step });
    await waitFor(() => !!document.querySelector("[data-widget] > div > svg[aria-hidden]"), null, 20000, 100);
    await sleep(200);
    return player();
  }
  const settleFalse = (name, fails) => t(name, fails.length === 0, fails.join("\n"));

  async function checkExplainers() {
    for (const [lesson, steps] of EXPLAINER_LESSONS) {
      const tag = lesson.replace(/^fnd-/, "");
      const fails = { mount: [], paused: [], play: [], still: [], single: [] };
      for (const [step, scenes] of steps) {
        const at = `step ${step + 1}`;
        const p0 = await explainerAt(lesson, step);
        if (!p0 || !p0.stage.length || p0.caption.trim().length < 40 || p0.counter !== `1 / ${scenes}`) {
          fails.mount.push(`${at}: ${p0 ? `stage ${p0.stage.length} chars, caption ${p0.caption.trim().length} chars, counter "${p0.counter}"` : "no stage"}`);
          continue;
        }
        // starts paused: Play on offer, nothing advancing
        await sleep(450);
        const p1 = await player();
        if (p1.play !== "Play" || p1.stage !== p0.stage || p1.fill !== p0.fill) fails.paused.push(`${at}: label "${p1.play}", stage ${p1.stage === p0.stage ? "still" : "moved"}, progress ${p0.fill} -> ${p1.fill}`);
        // Play: the label flips to Pause, the progress bar fills, the stage changes; Pause freezes it again
        await widgetButton("^Play$");
        await sleep(900);
        let p2 = await player();
        if (p2.stage === p1.stage) {
          await sleep(2500); // some scenes hold their first picture for a moment
          p2 = await player();
        }
        await widgetButton("^Pause$");
        await sleep(150);
        const p3 = await player();
        await sleep(450);
        const p4 = await player();
        if (p2.play !== "Pause" || !(p2.fill > p1.fill) || p2.stage === p1.stage) fails.play.push(`${at}: playing: label "${p2.play}", progress ${p1.fill} -> ${p2.fill}, stage ${p2.stage === p1.stage ? "unchanged" : "changed"}`);
        else if (p3.play !== "Play" || p4.stage !== p3.stage || p4.fill !== p3.fill) fails.play.push(`${at}: Pause: label "${p3.play}", stage ${p4.stage === p3.stage ? "still" : "kept moving"}`);
        if (scenes === 1 && !(p0.prevDisabled && p0.nextDisabled)) fails.single.push(`${at}: a one-scene player has Previous disabled=${p0.prevDisabled}, Next disabled=${p0.nextDisabled}`);
      }
      await settleFalse(`explain ${tag}: the player mounts with an SVG stage and a caption (every explainer step)`, fails.mount);
      await settleFalse(`explain ${tag}: it starts paused and nothing moves`, fails.paused);
      await settleFalse(`explain ${tag}: Play flips to Pause and the scene progress advances; Pause freezes it`, fails.play);
      await settleFalse(`explain ${tag}: a one-scene player has Previous and Next disabled`, fails.single);

      // the multi-scene player: stepping changes the counter and the caption, and Next stops at the last scene
      const [mStep, mScenes] = steps.find(([, n]) => n > 1) ?? [];
      if (mScenes) {
        const first = await explainerAt(lesson, mStep);
        const seen = [first];
        const problems = [];
        if (!first.prevDisabled) problems.push("Previous is enabled on scene 1");
        for (let i = 2; i <= mScenes; i++) {
          await widgetButton("^Next scene$");
          await sleep(150);
          const q = await player();
          seen.push(q);
          if (q.counter !== `${i} / ${mScenes}`) problems.push(`Next: counter "${q.counter}", wanted "${i} / ${mScenes}"`);
          if (q.caption === seen[i - 2].caption) problems.push(`Next to scene ${i}: caption did not change`);
          if (q.stage === seen[i - 2].stage) problems.push(`Next to scene ${i}: stage did not change`);
        }
        const end = seen[seen.length - 1];
        if (!end.nextDisabled) problems.push("Next is still enabled on the last scene");
        await widgetButton("^Previous scene$");
        await sleep(150);
        const back = await player();
        if (back.counter !== `${mScenes - 1} / ${mScenes}` || back.caption !== seen[mScenes - 2].caption) problems.push(`Previous: counter "${back.counter}", caption ${back.caption === seen[mScenes - 2].caption ? "back" : "not back"}`);
        if (back.nextDisabled) problems.push("Next is disabled again after going back");
        await settleFalse(`explain ${tag}: Next and Previous change the scene counter and caption; Next is disabled on the last scene`, problems);
      }

      // reduced motion: every scene is its finished picture, the stage holds still, Play steps through the scenes
      await media(true);
      try {
        const rm = [];
        for (const [step, scenes] of steps) {
          const at = `step ${step + 1}`;
          const a = await explainerAt(lesson, step);
          await sleep(400);
          const b = await player();
          if (a.stage !== b.stage) rm.push(`${at}: the stage changed between two samples with nothing pressed`);
          if (b.fill !== 100) rm.push(`${at}: the progress bar shows ${b.fill}%, not the finished scene`);
          if (b.scrubber) rm.push(`${at}: the scrubber is shown (there is nothing to scrub)`);
          await widgetButton("^Play$");
          await sleep(250);
          const c = await player();
          await sleep(400);
          const d = await player();
          if (c.stage !== d.stage) rm.push(`${at}: the stage changed while playing (a tween is running)`);
          if (c.play !== "Pause") rm.push(`${at}: Play did not turn into Pause`);
          await widgetButton("^Pause$");
          if (scenes > 1) {
            await widgetButton("^Next scene$");
            await sleep(150);
            const e = await player();
            if (e.counter !== `2 / ${scenes}` || e.fill !== 100) rm.push(`${at}: Next under reduced motion: counter "${e.counter}", progress ${e.fill}%`);
          }
        }
        await settleFalse(`explain ${tag}: with reduced motion each scene is finished and the stage stays still, also while playing`, rm);
      } finally {
        await media(false);
      }

      // phones: no horizontal overflow and every control at least 40 x 40
      for (const width of [390, 320]) {
        await phone(width);
        try {
          const bad = [];
          for (const [step] of steps) {
            const q = await explainerAt(lesson, step);
            if (!q) bad.push(`step ${step + 1}: no stage`);
            else {
              if (q.overflow) bad.push(`step ${step + 1}: the page or the player is wider than the ${width}px screen`);
              if (q.small.length) bad.push(`step ${step + 1}: controls under 40px: ${q.small.join(", ")}`);
            }
          }
          await settleFalse(`explain ${tag}: no horizontal overflow and all controls at least 40px at ${width}px`, bad);
        } finally {
          await send("Emulation.setDeviceMetricsOverride", { width: ctx.width, height: 900, deviceScaleFactor: 1, mobile: false });
        }
      }
    }
  }
  await checkExplainers();

  // ───────────────────────── Enter submits, Space toggles ─────────────────────────
  if (!(await fresh(`/learn/${LESSON}`))) return t("lesson player mounts", false, "no step indicator");
  await t("a fresh lesson starts at step 1 with no resume note", (await stepNo()) === 1 && !(await hasText(/Picked up where you left off/)));

  await clickButton("Continue");
  await waitStep(2);
  await t("Continue (mouse) goes to step 2", (await stepNo()) === 2);

  // number box: Enter checks, then continues
  await clickWhere(() => document.querySelector('input[aria-label="Your answer"]'));
  await typeText("4");
  await key("Enter");
  await t("Enter in the answer box checks it", await waitText("Correct\\."));
  await key("Enter");
  await t("Enter after a correct answer continues", (await waitStep(3)) && (await stepNo()) === 3);

  // MCQ: pick a wrong option with the mouse, Enter checks (and must not re-toggle the option)
  await clickOption("16");
  await key("Enter");
  await t("Enter on a picked MCQ option checks it", await waitText("Not quite\\."));
  await t("the picked option stays picked (Enter did not toggle it)", await inPage(() => [...document.querySelectorAll("button[data-answer]")].find((b) => b.textContent.trim() === "16")?.getAttribute("aria-pressed") === "true"));
  const feedback = await helpText();
  await t("a wrong MCQ pick shows that option's own feedback", /16 is what 4 bits make/.test(feedback), JSON.stringify(feedback));
  await t("a wrong MCQ pick also shows the question's hint", /double it once for every bit/.test(feedback), JSON.stringify(feedback));
  await key("Enter");
  await t("Enter on 'Try again' clears the miss", !(await hasText(/Not quite\./)));
  await clickOption("256");
  await key("Enter");
  await t("the right option checks as Correct with Enter", await waitText("Correct\\."));
  await key("Enter");
  await waitStep(4);

  // explain step: a widget you are only playing with keeps its own Enter (it must not skip the step)
  await clickBit(1);
  await key("Enter");
  await t("Enter on a widget in an explain step does not skip the step", (await stepNo()) === 4);
  await clickButton("Continue");
  await waitStep(5);

  // widget question: bit switches. Enter checks and must NOT flip the focused bit back.
  await clickBit(4);
  await clickBit(2);
  await key("Enter");
  await t("Enter on a bit switch checks the widget answer", await waitText("Correct\\."));
  await t("the bit you were on is still on (Enter did not toggle it)", (await pressed(2)) && (await pressed(4)));
  await key("Enter");
  await waitStep(6);

  // wrong widget answer: the hint appears; Space toggles bits from the keyboard; Enter submits
  await clickBit(8);
  await key("Enter");
  await t("a wrong widget answer says 'Not quite.'", await waitText("Not quite\\."));
  await t("a wrong widget answer shows the question's hint", /biggest place value that fits/.test(await helpText()), JSON.stringify(await helpText()));
  await key("Tab");
  await key("Space");
  await t("Space toggles the focused bit", await pressed(4));
  await key("Tab");
  await key("Tab");
  await key("Space");
  await t("Space toggles another bit (8 + 4 + 1 = 13)", (await pressed(1)) && (await pressed(8)) && (await pressed(4)) && !(await pressed(2)));
  await key("Enter");
  await t("Enter on a bit switch checks 13", await waitText("Correct\\."));
  await key("Enter");
  await waitStep(7);
  await t("the recap step is reached", await hasText(/What you learned|recap|Finish lesson/i));
  await key("Enter");
  await t("Enter on the last step finishes the lesson", await waitText("Lesson complete"));
  await t("finishing a lesson clears its saved position", !((await stored()) ?? "").includes(LESSON));

  // ───────────────────────── resume where you stopped ─────────────────────────
  await fresh(`/learn/${LESSON}`);
  await clickButton("Continue");
  await waitStep(2);
  await clickWhere(() => document.querySelector('input[aria-label="Your answer"]'));
  await typeText("4");
  await key("Enter");
  await key("Enter");
  await waitStep(3);
  await t("progress is saved per step", ((await stored()) ?? "").includes(`"${LESSON}":{"s":2`), String(await stored()));
  await clickWhere(() => document.querySelector('a[aria-label="Back to Foundations"]'));
  await waitFor(() => location.pathname === "/learn", null, 10000, 100);
  await t("closing a lesson with nothing typed leaves straight away", (await evaluate("location.pathname")) === "/learn");
  await open(`/learn/${LESSON}`, 900);
  await waitFor(() => !!document.querySelector('[aria-label^="Step "]'), null, 20000, 150);
  await t("reopening resumes at the step you left", (await stepNo()) === 3);
  await t("the resume note offers Start over", (await hasText(/Picked up where you left off: step 3 of 7/)) && (await hasText(/Start over/)));
  await clickButton("Start over");
  await waitStep(1);
  await t("Start over goes back to step 1", (await stepNo()) === 1 && !(await hasText(/Picked up where you left off/)));
  await t("Start over forgets the saved step", !((await stored()) ?? "").includes(LESSON), String(await stored()));

  // garbage in storage never breaks a lesson
  await fresh(`/learn/${LESSON}`, null);
  await evaluate(`localStorage.setItem(${JSON.stringify(POSITION_KEY)}, "{not json"); localStorage.setItem(${JSON.stringify(POSITION_KEY_V2)}, "{not json")`);
  await open(`/learn/${LESSON}`, 700);
  await waitFor(() => !!document.querySelector('[aria-label^="Step "]'), null, 20000, 150);
  await t("a corrupt saved position falls back to step 1", (await stepNo()) === 1);
  await fresh(`/learn/${LESSON}`, { [LESSON]: 99 });
  await t("a saved step past the end falls back to step 1", (await stepNo()) === 1);

  // ───────────────────────── leaving a code step ─────────────────────────
  // fnd-programs-1-instructions step 6 is a code step
  await fresh("/learn/fnd-programs-1-instructions", { "fnd-programs-1-instructions": 5 });
  const monaco = await waitFor(() => typeof window.monaco !== "undefined" && window.monaco.editor.getEditors().length > 0 && !!document.querySelector(".monaco-editor .view-line"), null, 60000, 200);
  if (!monaco) return t("code step mounts the editor", false, "no editor");
  await t("a code step resumes at step 6", (await stepNo()) === 6);
  const lines = () => inPage(() => window.monaco.editor.getEditors()[0].getModel().getLineCount());
  const starter = await inPage(() => window.monaco.editor.getEditors()[0].getModel().getValue());
  await clickWhere(() => document.querySelector(".monaco-editor .view-lines"));
  const before = await lines();
  await key("Enter");
  await t("Enter in the code editor is a newline, not a submit", (await lines()) === before + 1 && !(await hasText(/Not quite|All checks pass/)));
  await typeText("# my note");
  await clickWhere(() => document.querySelector('a[aria-label="Back to Foundations"]'));
  await sleep(300);
  await t("closing a code step with typed code asks first", await inPage(() => !!document.querySelector('[role="alertdialog"]') && location.pathname.startsWith("/learn/")));
  await key("Escape");
  await t("Escape on the question keeps you in the lesson", await inPage(() => !document.querySelector('[role="alertdialog"]') && location.pathname.startsWith("/learn/")));
  await clickWhere(() => document.querySelector('a[aria-label="Back to Foundations"]'));
  await sleep(300);
  await clickWhere(() => [...document.querySelectorAll('[role="alertdialog"] a')].find((a) => a.textContent.includes("Leave anyway")));
  await waitFor(() => location.pathname === "/learn", null, 10000, 100);
  await t("'Leave anyway' leaves", (await evaluate("location.pathname")) === "/learn");
  await open("/learn/fnd-programs-1-instructions", 900);
  await waitFor(() => typeof window.monaco !== "undefined" && window.monaco.editor.getEditors().length > 0 && !!document.querySelector(".monaco-editor .view-line"), null, 60000, 200);
  await t("reopening returns to the same code step with the starter code", (await stepNo()) === 6 && (await inPage(() => window.monaco.editor.getEditors()[0].getModel().getValue())) === starter);

  // ───────────────────────── a terminal widget keeps its Enter ─────────────────────────
  // fnd-unix-4-shell step 3 is a terminal task
  await fresh("/learn/fnd-unix-4-shell", { "fnd-unix-4-shell": 2 });
  await waitFor(() => !!document.querySelector("[data-widget] input"), null, 20000, 150);
  await clickWhere(() => document.querySelector("[data-widget] input"));
  await typeText("ls");
  await key("Enter");
  await t("Enter in a terminal runs the command and does not check the step", (await stepNo()) === 3 && !(await hasText(/Not quite|Correct\./)) && (await hasText(/projects/)));

  // ───────────────────────── project checks never show raw JS errors ─────────────────────────
  // submit the untouched pit-wall starter: its checks read `result`, which is null until a SELECT runs
  await open("/projects/pit-wall/pit-wall-1-roster", 1200);
  if (!(await clickButton("Submit"))) return t("pit-wall: Submit button found", false, "no Submit button");
  const verdict = await waitFor(() => /0 of 3 checks passed|Not quite yet/.test(document.body.innerText), null, 30000, 200);
  const page = await bodyText();
  await t("pit-wall: submitting the untouched starter reports failing checks", !!verdict && /Not quite yet/.test(page));
  await t("pit-wall: no raw TypeError / 'Cannot read properties' on screen", !/TypeError|Cannot read propert/.test(page), (page.match(/.{0,60}(TypeError|Cannot read propert).{0,60}/) ?? [""])[0]);
  await t("pit-wall: an empty submission is told to run a SELECT", /Run a SELECT that returns/.test(page));
  await t("pit-wall: all three checks fail with nothing run ('The rows are real drivers' no longer passes vacuously)", /0 of 3 checks passed/.test(page));
}
