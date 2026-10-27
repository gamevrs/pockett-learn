"use client";

import React from "react";

export interface TabItem<T extends string> {
  id: T;
  label: React.ReactNode;
}

export const tabDomId = (base: string, id: string) => `${base}-tab-${id}`;
export const panelDomId = (base: string, id: string) => `${base}-panel-${id}`;

/**
 * An accessible tab strip (WAI-ARIA tabs pattern): `role="tablist"` with `role="tab"` buttons, `aria-selected`,
 * a roving tabindex (only the selected tab is in the Tab order) and Left/Right/Home/End to move between tabs.
 * Moving with the arrows also activates the tab. The caller renders the panel with
 * `role="tabpanel" id={panelDomId(idBase, value)} aria-labelledby={tabDomId(idBase, value)}`.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  idBase,
  label,
  className = "",
  tabClassName,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Unique per tab strip on the page (e.g. from `useId`); ties each tab to its panel. */
  idBase: string;
  label: string;
  className?: string;
  tabClassName: (selected: boolean) => string;
}) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key) || e.altKey || e.ctrlKey || e.metaKey) return;
    const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'));
    const current = tabs.findIndex((t) => t === document.activeElement);
    if (current < 0) return;
    e.preventDefault();
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (current + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].focus();
    onChange(items[next].id);
  };

  return (
    <div role="tablist" aria-label={label} aria-orientation="horizontal" className={className} onKeyDown={onKeyDown}>
      {items.map((t) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={tabDomId(idBase, t.id)}
            aria-selected={selected}
            aria-controls={selected ? panelDomId(idBase, t.id) : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={tabClassName(selected)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
