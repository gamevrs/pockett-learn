"use client";

import React, { useEffect, useRef } from "react";

/** Smallest rendered size, in CSS px, for any text inside a widget diagram. */
export const MIN_SVG_TEXT_PX = 11;

/** Mutation-triggered passes run at most this often; resizes run at once. */
const THROTTLE_MS = 150;

/**
 * Widget diagrams are authored in a ~360-unit viewBox with 11-14 unit labels, so on a 320 px phone
 * they scale down to 9-10 px. Two things fix it for every widget at once, without touching their
 * literals: the card's `max-sm:` classes (edge to edge, tight padding) give the SVG the full phone
 * width, and this effect raises any <text> whose rendered size (font-size x the SVG's screen scale)
 * is under MIN_SVG_TEXT_PX to exactly that size. Wide screens render labels larger than the floor,
 * so they cost one getScreenCTM per SVG and nothing else.
 *
 * Cheap on purpose (animated widgets re-render every frame): the scale is read once per SVG, an SVG
 * whose labels already clear the floor is skipped, styles are written only when the value changes,
 * and mutation-triggered passes are throttled.
 */

/**
 * What we last wrote to an SVG's viewBox: the string, the value the widget itself authored, and how
 * many user units we added above and below. Only a viewBox we did not write counts as authored, so
 * a widget that changes its own viewBox (state-dependent height) is never overwritten with a stale one.
 */
const viewBoxes = new WeakMap<SVGSVGElement, { written: string; authored: string; top: number; bottom: number }>();
/** Smallest authored font size (user units) we saw in an SVG, cached by its text count. */
const smallest = new WeakMap<SVGSVGElement, { count: number; min: number }>();

function setStyle(el: SVGElement, prop: "font-size" | "translate", value: string) {
  if (value) {
    if (el.style.getPropertyValue(prop) !== value) el.style.setProperty(prop, value);
  } else if (el.style.getPropertyValue(prop) !== "") el.style.removeProperty(prop);
}

function applyFloor(root: HTMLElement) {
  for (const svg of root.querySelectorAll("svg")) {
    const texts = svg.querySelectorAll("text");
    if (!texts.length) continue;

    const current = svg.getAttribute("viewBox") ?? "";
    const known = viewBoxes.get(svg);
    const ours = known && known.written === current ? known : undefined;
    const authored = ours ? ours.authored : current;
    const addedTop = ours ? ours.top : 0;
    const addedBottom = ours ? ours.bottom : 0;
    if (known && !ours) viewBoxes.delete(svg);

    const m = svg.getScreenCTM();
    const scale = m ? Math.hypot(m.a, m.b) : 0;
    if (!(scale > 0)) continue; // not rendered

    // fast exit: every label already clears the floor (desktop). Authored sizes are read once and
    // re-read only when the number of labels changes.
    let info = smallest.get(svg);
    if (!info || info.count !== texts.length) {
      // our own inline font-size would hide the authored one, so measure with it cleared
      let min = Infinity;
      for (const t of texts) {
        const had = t.style.getPropertyValue("font-size");
        if (had) t.style.removeProperty("font-size");
        const s = parseFloat(getComputedStyle(t).fontSize);
        if (had) t.style.setProperty("font-size", had);
        if (s > 0 && s < min) min = s;
      }
      info = { count: texts.length, min };
      smallest.set(svg, info);
    }
    if (info.min * scale >= MIN_SVG_TEXT_PX - 0.01) {
      // nothing to raise; undo anything left from a narrower layout
      for (const t of texts) {
        setStyle(t, "font-size", "");
        setStyle(t, "translate", "");
      }
      if (ours) {
        svg.setAttribute("viewBox", authored);
        viewBoxes.delete(svg);
      }
      continue;
    }

    // measure against the authored box: the viewBox we may have grown earlier is subtracted, so nothing is reset and re-grown
    const sr = svg.getBoundingClientRect();
    const k = scale;
    const boxTop = sr.top + addedTop * k;
    const boxBottom = sr.bottom - addedBottom * k;
    const raised: SVGTextElement[] = [];
    for (const t of texts) {
      const tm = t.getScreenCTM();
      if (!tm) continue;
      const ts = Math.hypot(tm.a, tm.b);
      const had = t.style.getPropertyValue("font-size");
      if (had) t.style.removeProperty("font-size");
      const size = parseFloat(getComputedStyle(t).fontSize);
      if (had) t.style.setProperty("font-size", had);
      if (!(ts > 0) || !(size > 0) || size * ts >= MIN_SVG_TEXT_PX - 0.01) {
        setStyle(t, "font-size", "");
        setStyle(t, "translate", "");
        continue;
      }
      setStyle(t, "font-size", `${(MIN_SVG_TEXT_PX / ts).toFixed(3)}px`);
      raised.push(t);
    }

    let top = 0;
    let bottom = 0;
    for (const t of raised) {
      const r = t.getBoundingClientRect();
      const tm = t.getScreenCTM();
      let tr = "";
      // a bigger label can poke past the side of the diagram (axis ticks, end labels): slide it back inside
      if (tm && Math.abs(tm.b) < 0.01 && Math.abs(tm.c) < 0.01) {
        const own = t.style.getPropertyValue("translate");
        const prev = own ? parseFloat(own) * Math.hypot(tm.a, tm.b) : 0; // translate already applied, in px
        const left = r.left - prev;
        const right = r.right - prev;
        let dx = 0;
        if (right > sr.right) dx = sr.right - right;
        if (left + dx < sr.left) dx = sr.left - left;
        if (dx) tr = `${(dx / Math.hypot(tm.a, tm.b)).toFixed(2)}px 0px`;
      }
      setStyle(t, "translate", tr);
      top = Math.max(top, boxTop - r.top);
      bottom = Math.max(bottom, r.bottom - boxBottom);
    }
    // ...and past the top or bottom: grow the viewBox (the width, so the scale, stays the same)
    const t = top > 0.5 ? top / k : 0;
    const bt = bottom > 0.5 ? bottom / k : 0;
    if (t || bt) {
      const [x, y, w, h] = authored.split(/[\s,]+/).map(Number);
      const next = `${x} ${y - t} ${w} ${h + t + bt}`;
      if (next !== current) svg.setAttribute("viewBox", next);
      viewBoxes.set(svg, { written: next, authored, top: t, bottom: bt });
    } else if (ours) {
      svg.setAttribute("viewBox", authored);
      viewBoxes.delete(svg);
    }
  }
}

export function WidgetCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let timer = 0;
    let last = 0;
    const run = () => {
      timer = 0;
      last = performance.now();
      mo.disconnect(); // our own style writes must not re-trigger us
      applyFloor(root);
      mo.observe(root, { childList: true, subtree: true, characterData: true });
    };
    // mutation-driven: at most one pass per THROTTLE_MS (trailing)
    const soon = () => {
      if (timer) return;
      timer = window.setTimeout(run, Math.max(0, THROTTLE_MS - (performance.now() - last)));
    };
    // resize-driven: immediately (next frame)
    let raf = 0;
    const now = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (timer) {
          clearTimeout(timer);
          timer = 0;
        }
        run();
      });
    };
    const mo = new MutationObserver(soon);
    // only a width change alters the scale; our own viewBox growth changes the height and must not re-trigger us
    let lastW = -1;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w !== lastW) {
        lastW = w;
        now();
      }
    });
    ro.observe(root);
    mo.observe(root, { childList: true, subtree: true, characterData: true });
    // web fonts arriving changes label metrics without touching the DOM
    const fonts = document.fonts;
    fonts?.addEventListener?.("loadingdone", now);
    fonts?.ready?.then(now);
    now();
    // late layout (fonts, images, lazy chunks) changes label metrics without a DOM mutation: re-check shortly after mount
    const settle = [200, 600, 1500].map((ms) => window.setTimeout(now, ms));
    return () => {
      settle.forEach(clearTimeout);
      fonts?.removeEventListener?.("loadingdone", now);
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      mo.disconnect();
      ro.disconnect();
    };
  }, []);
  return (
    <div ref={ref} className={`card mt-6 flex justify-center sm:p-6 max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0 max-sm:px-2 max-sm:py-3 ${className}`} data-widget>
      {children}
    </div>
  );
}
