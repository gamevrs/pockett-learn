"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Pill, Readout, Segmented } from "./ui";
import { DOCS, FILTER_K, QUERY_PRESETS, TENANTS, runFilter, type FilterMode, type TenantId } from "./filter-core";

/**
 * One shared index holds help articles from four bike shops. You are searching on behalf of one
 * of them. With no filter the nearest articles leak across shops; filtering *after* the search
 * leaves holes when your shop owns a thin slice of the space; filtering *before* the search always
 * fills the page.
 */

export interface FilterSearchProps {
  /** Starting shop (default the biggest). */
  tenant?: TenantId;
  /** Modes to offer (default all). */
  modes?: FilterMode[];
}

export interface FilterSearchState {
  mode: FilterMode;
  tenant: TenantId;
  overfetch: number;
  returned: number;
  leaked: number;
  short: boolean;
  k: number;
}

const MODE_LABEL: Record<FilterMode, string> = { none: "No filter", post: "Filter after", pre: "Filter first" };
const OVERFETCH = [1, 4, 10];

export function FilterSearch({ props, onChange, revealed }: WidgetProps<FilterSearchProps>) {
  const modes = props.modes ?? (["none", "post", "pre"] as FilterMode[]);
  const [mode, setMode] = useState<FilterMode>(modes[0]);
  const [tenant, setTenant] = useState<TenantId>(props.tenant ?? "orchard");
  const [overfetch, setOverfetch] = useState(1);
  const [qn, setQn] = useState("A");
  const [q, setQ] = useState(QUERY_PRESETS.A);

  const run = runFilter(mode, tenant, overfetch, q);
  const t = TENANTS.find((x) => x.id === tenant)!;

  const report = (m: FilterMode, tt: TenantId, o: number, qq: { x: number; y: number }) => {
    const r = runFilter(m, tt, o, qq);
    onChange?.({ mode: m, tenant: tt, overfetch: o, returned: r.ids.length, leaked: r.leaked, short: r.ids.length < FILTER_K, k: FILTER_K } satisfies FilterSearchState);
  };
  const pickMode = (m: FilterMode) => {
    if (revealed) return;
    setMode(m);
    report(m, tenant, overfetch, q);
  };
  const pickTenant = (id: TenantId) => {
    if (revealed) return;
    setTenant(id);
    report(mode, id, overfetch, q);
  };
  const pickOver = (o: number) => {
    if (revealed) return;
    setOverfetch(o);
    report(mode, tenant, o, q);
  };
  const pickQuery = (name: string) => {
    if (revealed) return;
    setQn(name);
    setQ(QUERY_PRESETS[name]);
    report(mode, tenant, overfetch, QUERY_PRESETS[name]);
  };

  const hit = new Set(run.ids);
  const own = DOCS.filter((d) => d.tenant === tenant).length;

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {modes.length > 1 && <Segmented label="Filtering strategy" value={mode} disabled={revealed} options={modes.map((m) => ({ id: m, label: MODE_LABEL[m] }))} onChange={pickMode} />}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-ink-3">Query</span>
          {Object.keys(QUERY_PRESETS).map((name) => (
            <Pill key={name} on={qn === name} disabled={revealed} onClick={() => pickQuery(name)} label={`Query ${name}`} className="!min-w-10 !px-3">
              {name}
            </Pill>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <Caption className="mb-1.5 text-center">You are searching as</Caption>
        <div className="flex flex-wrap justify-center gap-2">
          {TENANTS.map((x) => (
            <button
              key={x.id}
              type="button"
              disabled={revealed}
              aria-pressed={tenant === x.id}
              onClick={() => pickTenant(x.id)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors ${tenant === x.id ? "border-[var(--ink)] bg-surface-2 text-ink ring-1 ring-[var(--ink)]" : "border-line bg-surface text-ink-2 hover:text-ink"}`}
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: x.colour }} />
              {x.name}
              <span className="font-mono text-[11px] text-ink-3">{Math.round((x.share / DOCS.length) * 100)}%</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,200px)]">
        <div className="rounded-xl border border-line bg-surface-2 p-2">
          <svg viewBox="0 0 100 100" className="aspect-square w-full" role="img" aria-label="Articles from four shops, scattered by meaning, with the query marked.">
            {DOCS.map((d) => {
              const col = TENANTS.find((x) => x.id === d.tenant)!.colour;
              const mine = d.tenant === tenant;
              const chosen = hit.has(d.id);
              return (
                <g key={d.id}>
                  {chosen && <circle cx={d.x} cy={d.y} r={3.6} fill="none" stroke="var(--ink)" strokeWidth={0.7} />}
                  <circle cx={d.x} cy={d.y} r={chosen ? 2.1 : mine ? 1.6 : 1.3} fill={col} fillOpacity={mine || chosen ? 1 : 0.35} />
                </g>
              );
            })}
            {mode === "post" && (() => {
              // the circle that holds the candidates the vector search handed back
              const far = Math.max(...DOCS.slice().sort((a, b) => Math.hypot(a.x - q.x, a.y - q.y) - Math.hypot(b.x - q.x, b.y - q.y)).slice(0, FILTER_K * overfetch).map((d) => Math.hypot(d.x - q.x, d.y - q.y)));
              return <circle cx={q.x} cy={q.y} r={far} fill="var(--brand)" fillOpacity={0.07} stroke="var(--brand)" strokeWidth={0.5} strokeDasharray="2 1.5" />;
            })()}
            <g stroke="var(--ink)" strokeWidth={1} strokeLinecap="round">
              <line x1={q.x - 2.6} y1={q.y - 2.6} x2={q.x + 2.6} y2={q.y + 2.6} />
              <line x1={q.x - 2.6} y1={q.y + 2.6} x2={q.x + 2.6} y2={q.y - 2.6} />
            </g>
          </svg>
          <p className="mt-1 px-1 text-[11px] leading-snug text-ink-3">
            Bright dots are {t.name}&apos;s articles; faint ones belong to other shops. Ringed dots are the results.
            {mode === "post" ? " The dashed circle is what the vector search handed back before the filter ran." : ""}
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {mode === "post" && (
            <div>
              <Caption className="mb-1">Fetch extra before filtering</Caption>
              <Segmented label="Over-fetch factor" value={overfetch} disabled={revealed} options={OVERFETCH.map((o) => ({ id: o, label: `×${o}` }))} onChange={pickOver} />
              <p className="mt-1 text-[11px] text-ink-3">Search for the {FILTER_K * overfetch} nearest, then keep {t.name}&apos;s.</p>
            </div>
          )}
          {mode === "pre" && <p className="text-sm text-ink-2">The search only ever looks at the {own} articles that belong to {t.name}, then takes the nearest {FILTER_K}.</p>}
          {mode === "none" && <p className="text-sm text-ink-2">Nothing restricts the search: it returns the {FILTER_K} nearest articles from <em>anyone</em>.</p>}
          <div className="flex flex-wrap gap-2">
            <Readout label="Results" value={`${run.ids.length} of ${FILTER_K}`} accent={run.ids.length === FILTER_K && run.leaked === 0} />
            <Readout label="From other shops" value={run.leaked} />
            {mode !== "pre" && <Readout label="Fetched" value={run.fetched} />}
          </div>
        </div>
      </div>

      <Note tone={run.leaked > 0 ? "bad" : run.ids.length < FILTER_K ? "bad" : "good"} className="mt-3">
        {run.leaked > 0
          ? `${run.leaked} of the ${FILTER_K} results belong to other shops. That is a data leak, not a ranking quirk.`
          : run.ids.length < FILTER_K
            ? `Only ${run.ids.length} result${run.ids.length === 1 ? "" : "s"}: the nearest articles mostly belong to other shops, so the filter threw them away. ${mode === "post" ? "Fetching more helps, at a cost." : ""}`
            : `A full page of ${FILTER_K}, all from ${t.name}.`}
      </Note>
    </div>
  );
}

export function checkFilterSearch(state: unknown, goal: Record<string, unknown>) {
  const st = state as FilterSearchState | undefined;
  if (!st) return false;
  if (typeof goal.mode === "string" && st.mode !== goal.mode) return false;
  if (typeof goal.tenant === "string" && st.tenant !== goal.tenant) return false;
  if (goal.leaked === true && st.leaked === 0) return false;
  if (goal.leaked === false && st.leaked > 0) return false;
  if (goal.short === true && !st.short) return false;
  if (goal.full === true && st.returned < st.k) return false;
  return true;
}
