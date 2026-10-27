// Foundations lesson player checks for scripts/ui-check.mjs (run with: node scripts/ui-check.mjs --only learn).
// Everything is driven with real mouse and key events over CDP; the page is only *observed*.
//
//   enter    Enter submits (Check, then Continue) from the answer box, a selected MCQ option and a bit switch, and Space still
//            toggles; Enter stays a newline in the code editor and "send" in a terminal widget; explain-step widgets keep their keys.
//   wrong    a wrong answer says more than "Not quite.": per-option feedback, the question's hint, or a generic fallback.
//   resume   closing a lesson half-way and reopening resumes at that step ("Start over" goes back to step 1; finishing clears it).
//   leave    closing a code step with typed code asks first; closing an untouched step does not; the code is not kept.
//   checks   a project check never shows a raw TypeError (pit-wall: submit the untouched starter).

const LESSON = "fnd-bits-1-switches";
const POSITION_KEY = "pockett_lesson_position_v1";

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
  const stored = () => evaluate(`localStorage.getItem(${JSON.stringify(POSITION_KEY)})`);

  /** Clean browser state (theme kept, optional lesson position seeded), then open the page and wait for the player. */
  async function fresh(path, positions) {
    await send("Page.navigate", { url: `${BASE}/robots.txt` });
    await sleep(350);
    await evaluate(`localStorage.clear(); localStorage.setItem("pockett_theme_mode", ${JSON.stringify(ctx.theme)});` + (positions ? `localStorage.setItem(${JSON.stringify(POSITION_KEY)}, ${JSON.stringify(JSON.stringify(positions))});` : ""));
    await open(path, 900);
    return waitFor(() => !!document.querySelector('[aria-label^="Step "]'), null, 30000, 150);
  }

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
  await t("progress is saved per step", ((await stored()) ?? "").includes(`"${LESSON}":2`), String(await stored()));
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
  await evaluate(`localStorage.setItem(${JSON.stringify(POSITION_KEY)}, "{not json")`);
  await open(`/learn/${LESSON}`, 700);
  await waitFor(() => !!document.querySelector('[aria-label^="Step "]'), null, 20000, 150);
  await t("a corrupt saved position falls back to step 1", (await stepNo()) === 1);
  await fresh(`/learn/${LESSON}`, { [LESSON]: 99 });
  await t("a saved step past the end falls back to step 1", (await stepNo()) === 1);

  // ───────────────────────── leaving a code step ─────────────────────────
  // fnd-bits-5-text step 8 is a code step
  await fresh("/learn/fnd-bits-5-text", { "fnd-bits-5-text": 7 });
  const monaco = await waitFor(() => typeof window.monaco !== "undefined" && window.monaco.editor.getEditors().length > 0 && !!document.querySelector(".monaco-editor .view-line"), null, 60000, 200);
  if (!monaco) return t("code step mounts the editor", false, "no editor");
  await t("a code step resumes at step 8", (await stepNo()) === 8);
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
  await open("/learn/fnd-bits-5-text", 900);
  await waitFor(() => typeof window.monaco !== "undefined" && window.monaco.editor.getEditors().length > 0 && !!document.querySelector(".monaco-editor .view-line"), null, 60000, 200);
  await t("reopening returns to the same code step with the starter code", (await stepNo()) === 8 && (await inPage(() => window.monaco.editor.getEditors()[0].getModel().getValue())) === starter);

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
