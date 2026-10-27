// Site-wide UX, performance and accessibility checks for scripts/ui-check.mjs (run with: node scripts/ui-check.mjs --only site).
// Everything is driven with real mouse, touch and key events over CDP; the page is only *observed*.
//
//   all widths   robots.txt and sitemap.xml are served, no horizontal overflow on every main route, skip link (first Tab stop,
//                moves focus to <main>), lesson tabs have tablist/tab/tabpanel roles with arrow-key navigation, the theme toggle
//                names its action, the XP chip has an accessible name, the nav pill lines up with the page container,
//                /dashboard ships a small payload (not the whole course catalogue), /brand has no preload or image-size warnings,
//                the workspace splitter moves with the arrow keys and announces aria-valuenow (>= 1024 px wide only).
//   < 700 px     the mobile menu (aria-expanded / aria-controls, label, focus in and back, Esc, tap outside, scroll, route change,
//                link order) and the tap-target audit: every visible control is at least 40 x 40 CSS px (measured by hit-testing,
//                so a pseudo-element hit area counts, and inline links inside a sentence are exempt, as in WCAG 2.5.8).

const MAIN_ROUTES = [
  ["home", "/"],
  ["projects", "/projects"],
  ["dashboard", "/dashboard"],
  ["foundations", "/learn"],
  ["sandbox", "/playground"],
  ["privacy", "/privacy"],
  ["terms", "/terms"],
  ["brand", "/brand"],
  ["account", "/account"],
  ["project-hub", "/projects/garage"],
  ["lesson-workspace", "/projects/garage/garage-3-engine"],
  ["foundations-lesson", "/learn/fnd-programs-1-instructions"],
];

/** Routes audited for tap targets on phones. */
const TAP_ROUTES = MAIN_ROUTES.filter(([name]) => name !== "account");

const MIN_TAP = 40;

export async function checkSite(h) {
  const { send, evaluate, inPage, waitFor, sleep, clickAt, press, record, open, screenshot, getCtx, BASE } = h;
  const ctx = getCtx();
  const mobile = ctx.width < 700;

  const check = async (name, ok, detail = "") => {
    const shot = ok ? null : await screenshot(`site-${name}`);
    record("site", name, !!ok, ok ? "" : detail, shot);
    return !!ok;
  };

  // ── real input helpers ──
  const tap = async (x, y) => {
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await sleep(40);
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await sleep(160);
  };
  /** A tap on phones (touch), a click on desktop. */
  const poke = (x, y) => (mobile ? tap(x, y) : clickAt(x, y));
  const wheel = async (x, y, dy) => {
    await send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY: dy });
    await sleep(250);
  };
  const rectOf = (sel) =>
    inPage((s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2, right: r.right, bottom: r.bottom };
    }, sel);
  const attr = (sel, a) => inPage(({ sel, a }) => document.querySelector(sel)?.getAttribute(a) ?? null, { sel, a });
  const focusedDesc = () =>
    inPage(() => {
      const a = document.activeElement;
      return a ? `${a.tagName.toLowerCase()}${a.id ? "#" + a.id : ""}[${(a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 40)}]` : null;
    });
  const fetchInfo = (path, headers) =>
    inPage(
      async ({ path, headers }) => {
        const r = await fetch(path, { headers: headers ?? {} });
        const b = await r.text();
        return { status: r.status, length: new TextEncoder().encode(b).length, type: r.headers.get("content-type"), head: b.slice(0, 4000), body: path.endsWith(".xml") ? b : "" };
      },
      { path, headers },
    );

  // ───────────── robots.txt / sitemap.xml / payload ─────────────
  await open("/", 400);
  {
    const robots = await fetchInfo("/robots.txt");
    await check("robots.txt is served", robots.status === 200 && /User-Agent: \*/i.test(robots.head) && /Sitemap: https?:\/\/\S+\/sitemap\.xml/i.test(robots.head), `status ${robots.status}\n${robots.head.slice(0, 300)}`);
    const map = await fetchInfo("/sitemap.xml");
    const locs = (map.body.match(/<loc>[^<]+<\/loc>/g) ?? []).map((l) => l.replace(/<\/?loc>/g, ""));
    const has = (p) => locs.some((l) => l.endsWith(p));
    await check(
      "sitemap.xml lists the site",
      map.status === 200 && locs.length > 300 && has("/projects") && has("/learn") && has("/privacy") && has("/brand") && has("/projects/garage") && has("/projects/garage/garage-3-engine") && has("/learn/fnd-programs-1-instructions"),
      `status ${map.status}, ${locs.length} urls`,
    );
    const dash = await fetchInfo("/dashboard", { RSC: "1" });
    await check("/dashboard payload is small", dash.status === 200 && dash.length < 200000, `${dash.length} bytes (RSC); the whole course catalogue used to be sent`);
  }

  // ───────────── no horizontal overflow on every main route ─────────────
  for (const [name, path] of MAIN_ROUTES) {
    await open(path, 900);
    const o = await inPage(() => {
      const de = document.documentElement;
      const vw = de.clientWidth;
      const off = [];
      for (const e of document.querySelectorAll("body *")) {
        const r = e.getBoundingClientRect();
        if (r.width && r.right > vw + 1 && !e.closest("[class*=overflow-x], pre, .monaco-editor, [data-allow-overflow]") && getComputedStyle(e).position !== "fixed") {
          off.push(`${e.tagName.toLowerCase()}.${String(e.className).slice(0, 40)} right=${Math.round(r.right)}`);
          if (off.length >= 4) break;
        }
      }
      return { scroll: de.scrollWidth, vw, off };
    });
    await check(`no horizontal overflow: ${name}`, o.scroll <= o.vw, `scrollWidth ${o.scroll} > ${o.vw}\n${o.off.join("\n")}`);
  }

  // ───────────── skip link ─────────────
  await open("/", 600);
  {
    await inPage(() => {
      document.activeElement?.blur();
      window.scrollTo(0, 0);
    });
    await press("Tab");
    const first = await inPage(() => {
      const a = document.activeElement;
      const r = a?.getBoundingClientRect();
      return { text: (a?.textContent ?? "").trim(), href: a?.getAttribute("href"), visible: !!r && r.width > 20 && r.height > 20 && r.top >= 0 && r.left >= 0 };
    });
    await check("skip link is the first Tab stop and visible on focus", /skip to content/i.test(first.text) && first.href === "#main" && first.visible, JSON.stringify(first));
    await press("Enter");
    await sleep(200);
    const landed = await inPage(() => ({ hash: location.hash, active: document.activeElement?.id, tag: document.activeElement?.tagName }));
    await check("skip link moves focus to the main content", landed.hash === "#main" && landed.active === "main", JSON.stringify(landed));
  }

  // ───────────── header: theme toggle, XP chip, alignment ─────────────
  await open("/privacy", 600);
  {
    const before = await attr('header button[aria-label^="Switch to"]', "aria-label");
    const wasDark = await inPage(() => document.documentElement.classList.contains("dark"));
    const expected = wasDark ? "Switch to light theme" : "Switch to dark theme";
    await check("theme toggle names the action it will perform", before === expected, `label "${before}", expected "${expected}"`);
    const r = await rectOf('header button[aria-label^="Switch to"]');
    await poke(r.cx, r.cy);
    await sleep(150);
    const after = await attr('header button[aria-label^="Switch to"]', "aria-label");
    const nowDark = await inPage(() => document.documentElement.classList.contains("dark"));
    await check("theme toggle flips the theme and its label", nowDark !== wasDark && after !== before && /^Switch to (light|dark) theme$/.test(after ?? ""), `dark ${wasDark} -> ${nowDark}, label "${before}" -> "${after}"`);
    await poke(r.cx, r.cy); // put the theme back for the rest of the run
    await sleep(150);
  }
  if (!mobile) {
    const chip = await inPage(() => {
      const a = document.querySelector('header a[href="/dashboard"][aria-label]');
      return a ? { label: a.getAttribute("aria-label") } : null;
    });
    await check("XP chip has an accessible name (XP and streak)", !!chip && /^\d+ XP, \d+ day streak$/.test(chip.label), JSON.stringify(chip));
  }
  for (const [name, path, sel] of [
    ["home", "/", "main > section"],
    ["projects", "/projects", "main > div"],
    ["dashboard", "/dashboard", "main > div"],
  ]) {
    await open(path, 700);
    const a = await inPage((sel) => {
      const pill = document.querySelector("header > div");
      const sec = document.querySelector(sel);
      const foot = document.querySelector("footer .mx-auto");
      if (!pill || !sec || !foot) return null;
      const box = (e) => {
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        return { l: r.left + parseFloat(cs.paddingLeft), r: r.right - parseFloat(cs.paddingRight) };
      };
      const p = pill.getBoundingClientRect();
      return { pill: { l: p.left, r: p.right }, section: box(sec), footer: box(foot) };
    }, sel);
    const ok = !!a && Math.abs(a.pill.l - a.section.l) <= 1.5 && Math.abs(a.pill.r - a.section.r) <= 1.5 && Math.abs(a.footer.l - a.section.l) <= 1.5 && Math.abs(a.footer.r - a.section.r) <= 1.5;
    await check(`navbar, content and footer share one container width: ${name}`, ok, JSON.stringify(a));
  }

  // ───────────── /brand: no preload or image warnings ─────────────
  {
    await send("Page.addScriptToEvaluateOnNewDocument", { source: "window.__warns=[];const w=console.warn;console.warn=function(...a){window.__warns.push(a.map(String).join(' ').slice(0,200));return w.apply(this,a)};" });
    await open("/brand", 1500);
    const b = await inPage(() => ({ preloads: [...document.querySelectorAll('link[rel="preload"][as="image"]')].map((l) => l.getAttribute("href")), warns: window.__warns ?? [] }));
    await check("/brand has no image preload links or image-size warnings", b.preloads.length === 0 && b.warns.length === 0, JSON.stringify(b));
  }

  // ───────────── lesson tabs: roles and arrow keys ─────────────
  await open("/projects/garage/garage-3-engine", 1500);
  {
    const info = await inPage(() => {
      const list = document.querySelector('[role="tablist"]');
      const tabs = [...document.querySelectorAll('[role="tab"]')].filter((t) => t.closest('[role="tablist"]') === list);
      const sel = tabs.filter((t) => t.getAttribute("aria-selected") === "true");
      const panel = document.querySelector('[role="tabpanel"]');
      return {
        hasList: !!list,
        names: tabs.map((t) => t.textContent.trim()),
        selected: sel.map((t) => t.textContent.trim()),
        tabbable: tabs.filter((t) => t.tabIndex === 0).length,
        panelLabelled: !!panel && panel.getAttribute("aria-labelledby") === sel[0]?.id,
        controls: sel[0]?.getAttribute("aria-controls") === panel?.id,
      };
    });
    await check(
      "lesson tabs expose tablist / tab / tabpanel",
      info.hasList && info.names.length === 3 && info.selected.length === 1 && info.tabbable === 1 && info.panelLabelled && info.controls,
      JSON.stringify(info),
    );
    await inPage(() => document.querySelector('[role="tab"][aria-selected="true"]').focus());
    await press("ArrowRight");
    await sleep(120);
    const second = await inPage(() => ({ sel: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.trim(), focus: document.activeElement?.textContent.trim(), role: document.activeElement?.getAttribute("role") }));
    await press("End");
    await sleep(120);
    const last = await inPage(() => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.trim());
    await press("ArrowRight");
    await sleep(120);
    const wrapped = await inPage(() => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.trim());
    await press("Home");
    await sleep(120);
    const home = await inPage(() => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.trim());
    await check(
      "lesson tabs: arrow keys, Home and End move focus and selection",
      second.sel === "Learn" && second.focus === "Learn" && second.role === "tab" && /^Hints/.test(last ?? "") && wrapped === "Mission" && home === "Mission",
      JSON.stringify({ second, last, wrapped, home }),
    );
  }

  // ───────────── workspace splitter: arrow keys + aria-valuenow (desktop layouts) ─────────────
  if (ctx.width >= 1024) {
    await open("/projects/garage/garage-3-engine", 1500);
    const sepSel = '[role="separator"][aria-label^="Resize lesson panel"]';
    const hasSep = await rectOf(sepSel);
    if (!hasSep) await check("workspace splitter is focusable with a value", false, "no lesson-panel separator found");
    else {
      const before = { now: Number(await attr(sepSel, "aria-valuenow")), x: hasSep.x };
      await inPage((s) => document.querySelector(s).focus(), sepSel);
      await press("ArrowRight");
      await press("ArrowRight");
      await sleep(250);
      const after = { now: Number(await attr(sepSel, "aria-valuenow")), x: (await rectOf(sepSel)).x };
      await press("ArrowLeft");
      await sleep(250);
      const back = { now: Number(await attr(sepSel, "aria-valuenow")), x: (await rectOf(sepSel)).x };
      await check(
        "workspace splitter moves with the arrow keys and announces aria-valuenow",
        Number.isFinite(before.now) && before.now > 0 && after.x > before.x + 20 && after.now >= before.now && back.x < after.x && back.x > before.x,
        JSON.stringify({ before, after, back }),
      );
      // put the stored layout back
      await inPage(() => localStorage.removeItem("pockett_ws_layout_v1"));
    }
  }

  // ───────────── phones: menu and tap targets ─────────────
  if (mobile) {
    await checkMobileMenu();
    await checkTapTargets();
  }

  // ───────────────────────── mobile menu ─────────────────────────
  function menuButton() {
    return rectOf("header button[aria-controls]");
  }
  async function menuState() {
    return inPage(() => {
      const btn = document.querySelector('header button[aria-controls]');
      const menu = btn ? document.getElementById(btn.getAttribute("aria-controls")) : null;
      const r = menu?.getBoundingClientRect();
      return {
        label: btn?.getAttribute("aria-label"),
        expanded: btn?.getAttribute("aria-expanded"),
        menuVisible: !!r && r.width > 0 && r.height > 0,
        links: menu ? [...menu.querySelectorAll("a")].map((a) => (a.getAttribute("aria-label") || a.textContent).trim()) : [],
        focusInMenu: !!menu && menu.contains(document.activeElement),
        focusOnButton: document.activeElement === btn,
        path: location.pathname,
      };
    });
  }


  async function checkMobileMenu() {
    await open("/privacy", 900);
    const closed = await menuState();
    await check("menu button: label Menu, collapsed, controls an element", closed.label === "Menu" && closed.expanded === "false" && !closed.menuVisible, JSON.stringify(closed));

    let b = await menuButton();
    await tap(b.cx, b.cy);
    await sleep(200);
    let s = await menuState();
    await check("tap opens the menu: expanded, label Close, focus moves inside", s.expanded === "true" && /^Close/.test(s.label ?? "") && s.menuVisible && s.focusInMenu, JSON.stringify(s));
    await check(
      "menu links in order: Foundations, Projects, Progress, Sandbox, Sign in/Account",
      JSON.stringify(s.links.slice(0, 4)) === JSON.stringify(["Foundations", "Projects", "Progress", "Sandbox"]) && /^(Sign in|Account)$/.test(s.links[4] ?? "") && !s.links.includes("Home"),
      JSON.stringify(s.links),
    );
    await check("menu keeps the header's sound and theme controls reachable", await inPage(() => !!document.querySelector('header [data-sound-toggle]') && !!document.querySelector('header button[aria-label^="Switch to"]')), "sound or theme control missing from the header");
    await screenshot("site-menu-open");

    await press("Escape");
    await sleep(150);
    s = await menuState();
    await check("Esc closes the menu and returns focus to the button", s.expanded === "false" && !s.menuVisible && s.focusOnButton, JSON.stringify(s));

    // tap outside
    b = await menuButton();
    await tap(b.cx, b.cy);
    await sleep(200);
    await tap(195, 640);
    await sleep(200);
    s = await menuState();
    await check("tapping outside closes the menu", s.expanded === "false" && !s.menuVisible, JSON.stringify(s));

    // scroll
    b = await menuButton();
    await tap(b.cx, b.cy);
    await sleep(200);
    await wheel(195, 700, 400);
    s = await menuState();
    await check("scrolling the page closes the menu", s.expanded === "false" && !s.menuVisible, JSON.stringify(s));
    await inPage(() => window.scrollTo(0, 0));
    await sleep(150);

    // keyboard: Enter opens, Tab leaves the menu -> closes
    await inPage(() => document.querySelector("header button[aria-controls]").focus());
    await press("Enter");
    await sleep(200);
    s = await menuState();
    const openedByKey = s.expanded === "true" && s.focusInMenu;
    for (let i = 0; i < 8 && s.expanded === "true"; i++) {
      await press("Tab");
      await sleep(80);
      s = await menuState();
    }
    await check("keyboard: Enter opens the menu with focus inside, tabbing out of it closes it", openedByKey && s.expanded === "false", `opened ${openedByKey}, ${JSON.stringify(s)} focus ${await focusedDesc()}`);

    // route change
    await open("/privacy", 700);
    b = await menuButton();
    await tap(b.cx, b.cy);
    await sleep(200);
    const link = await inPage(() => {
      const btn = document.querySelector("header button[aria-controls]");
      const a = [...document.getElementById(btn.getAttribute("aria-controls")).querySelectorAll("a")].find((x) => x.textContent.trim() === "Projects");
      const r = a.getBoundingClientRect();
      return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, h: r.height };
    });
    await tap(link.cx, link.cy);
    await waitFor(() => location.pathname === "/projects", null, 8000, 100);
    await sleep(500);
    s = await menuState();
    await check("choosing a link navigates and leaves the menu closed", s.path === "/projects" && s.expanded === "false" && !s.menuVisible, JSON.stringify(s));
  }

  // ───────────────────────── tap targets ─────────────────────────
  async function checkTapTargets() {
    const probe = ({ min }) => {
      const visible = (e) => {
        const r = e.getBoundingClientRect();
        const st = getComputedStyle(e);
        if (!r.width || !r.height || (r.width <= 1 && r.height <= 1) || st.visibility === "hidden" || st.display === "none" || st.pointerEvents === "none") return false;
        if (r.bottom < -1 || r.right < -1 || r.left > innerWidth + 1) return false;
        for (let p = e; p && p !== document.body; p = p.parentElement) {
          const s = getComputedStyle(p);
          if (s.display === "none" || s.visibility === "hidden" || p.hasAttribute("hidden") || p.getAttribute("aria-hidden") === "true") return false;
        }
        return true;
      };
      const nameOf = (e) => (e.getAttribute("aria-label") || e.textContent || e.getAttribute("title") || e.getAttribute("href") || "").trim().replace(/\s+/g, " ").slice(0, 36);
      const inlineInSentence = (e) => {
        if (e.tagName !== "A" || getComputedStyle(e).display !== "inline") return false;
        const p = e.parentElement;
        return !!p && p.textContent.trim().length > e.textContent.trim().length + 12;
      };
      // how far the element's own hit area reaches (rect plus any transparent padding / pseudo-element), by hit-testing
      const reach = (e, r, axis) => {
        const own = (x, y) => {
          const t = document.elementFromPoint(x, y);
          return !!t && (t === e || e.contains(t));
        };
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        let a = 0;
        let b = 0;
        for (let d = 1; d <= 14; d++) {
          if (axis === "x" ? own(r.left - d, cy) : own(cx, r.top - d)) a = d;
          else break;
        }
        for (let d = 1; d <= 14; d++) {
          if (axis === "x" ? own(r.right + d, cy) : own(cx, r.bottom + d)) b = d;
          else break;
        }
        return a + b;
      };
      const out = [];
      const seen = new Set();
      const els = document.querySelectorAll("a[href], button, [role=button], [role=tab], [role=switch], [role=checkbox], [role=radio], summary, input:not([type=hidden]), select, textarea, [role=separator][tabindex]");
      for (const e of els) {
        if (!visible(e) || e.closest(".monaco-editor, .monaco-hover, .suggest-widget") || e.disabled) continue;
        if (inlineInSentence(e)) continue;
        if (e.tagName === "INPUT" && e.type === "range") continue; // 40px tall via its own styles; thumb is the target
        let r = e.getBoundingClientRect();
        if (r.top < 0 || r.bottom > innerHeight) {
          e.scrollIntoView({ block: "center" });
          r = e.getBoundingClientRect();
        }
        const w = r.width + reach(e, r, "x");
        const hgt = r.height + reach(e, r, "y");
        if (w < min - 0.5 || hgt < min - 0.5) {
          const key = `${e.tagName}|${nameOf(e)}|${Math.round(w)}x${Math.round(hgt)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(`${e.tagName.toLowerCase()} "${nameOf(e)}" ${Math.round(w)}x${Math.round(hgt)}`);
        }
      }
      return out;
    };

    for (const [name, path] of TAP_ROUTES) {
      await open(path, 1300);
      const small = await inPage(probe, { min: MIN_TAP });
      await check(`tap targets >= ${MIN_TAP}x${MIN_TAP}: ${name}`, small.length === 0, `${small.length} too small\n${small.slice(0, 14).join("\n")}`);
    }
  }
}
