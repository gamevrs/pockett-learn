"use client";

import React, { useEffect, useRef } from "react";

/** Smallest rendered size, in CSS px, for any text inside a widget diagram. */
export const MIN_SVG_TEXT_PX = 11;

/**
 * Widget diagrams are authored in a ~360-unit viewBox with 11-14 unit labels, so on a 320 px phone
 * they scale down to 9-10 px. Two things fix it for every widget at once, without touching their
 * literals: the card's `max-sm:` classes (edge to edge, tight padding) give the SVG the full phone width, and this effect raises
 * any <text> whose rendered size (font-size x the SVG's screen scale) is under MIN_SVG_TEXT_PX to
 * exactly that size. Wide screens render labels larger than the floor, so nothing changes there.
 */
function applyFloor(root: HTMLElement) {
  for (const svg of root.querySelectorAll("svg")) {
    // undo our previous pass so we always decide from the authored values
    const vb0 = svg.dataset.floorVb;
    if (vb0 !== undefined) {
      svg.setAttribute("viewBox", vb0);
      delete svg.dataset.floorVb;
    }
    const raised: SVGTextElement[] = [];
    for (const text of svg.querySelectorAll("text")) {
      text.style.removeProperty("font-size");
      text.style.removeProperty("translate");
      const m = text.getScreenCTM();
      if (!m) continue; // not rendered (display: none)
      const scale = Math.hypot(m.a, m.b);
      const size = parseFloat(getComputedStyle(text).fontSize);
      if (!(scale > 0) || !(size > 0) || size * scale >= MIN_SVG_TEXT_PX - 0.01) continue;
      text.style.fontSize = `${(MIN_SVG_TEXT_PX / scale).toFixed(3)}px`;
      raised.push(text);
    }
    if (!raised.length) continue;
    const sr = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const scale = vb.width > 0 ? sr.width / vb.width : 0;
    let top = 0;
    let bottom = 0;
    for (const text of raised) {
      const r = text.getBoundingClientRect();
      const m = text.getScreenCTM();
      // a bigger label can poke past the side of the diagram (axis ticks, end labels): slide it back inside
      if (m && Math.abs(m.b) < 0.01 && Math.abs(m.c) < 0.01) {
        let dx = 0;
        if (r.right > sr.right) dx = sr.right - r.right;
        if (r.left + dx < sr.left) dx = sr.left - r.left;
        if (dx) text.style.translate = `${(dx / Math.hypot(m.a, m.b)).toFixed(2)}px 0px`;
      }
      top = Math.max(top, sr.top - r.top);
      bottom = Math.max(bottom, r.bottom - sr.bottom);
    }
    // ...and past the top or bottom: grow the viewBox (the width, so the scale, stays the same)
    if ((top > 0.5 || bottom > 0.5) && scale > 0) {
      svg.dataset.floorVb = svg.getAttribute("viewBox") ?? "";
      const t = Math.max(0, top) / scale;
      const b = Math.max(0, bottom) / scale;
      svg.setAttribute("viewBox", `${vb.x} ${vb.y - t} ${vb.width} ${vb.height + t + b}`);
    }
  }
}

export function WidgetCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        mo.disconnect(); // our own style writes must not re-trigger us
        applyFloor(root);
        mo.observe(root, { childList: true, subtree: true });
      });
    };
    const mo = new MutationObserver(schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(root);
    mo.observe(root, { childList: true, subtree: true });
    schedule();
    return () => {
      cancelAnimationFrame(raf);
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
