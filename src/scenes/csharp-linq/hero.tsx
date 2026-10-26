"use client";

import React, { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { fmtNum, type PortData } from "./data";
import { Chip, dash, Empty, Pill, Tile, type Tone } from "./ui";

/**
 * The hero of the board: the manifest as a departures-board table. Click a column header to sort,
 * use the category chips to filter. Urgent rows (urgentIds) carry an amber edge, heavy rows
 * (heavyIds) a HEAVY tag and a stronger mass bar. Everything comes from what the program sent.
 */

type SortKey = "id" | "cargo" | "category" | "massKg" | "priority";
type Sort = { key: SortKey; dir: 1 | -1 } | null;

const COLS: { key: SortKey; label: string; right?: boolean; wide?: boolean }[] =
  [
    { key: "id", label: "ID" },
    { key: "cargo", label: "Cargo" },
    { key: "category", label: "Category", wide: true },
    { key: "massKg", label: "kg", right: true },
    { key: "priority", label: "P", right: true },
  ];

const MAX_ROWS = 40;

export function BoardPanel({ d }: { d: PortData["board"] }) {
  const [sort, setSort] = useState<Sort>(null);
  const [cat, setCat] = useState<string | null>(null);

  const all = d.rows ?? [];
  const hasAny =
    all.length > 0 ||
    Object.entries(d).some(([k, v]) => k !== "rows" && v !== undefined);
  if (!hasAny)
    return (
      <Empty>
        Nothing yet. Send board, urgentIds, heavyIds... with Port.Show.
      </Empty>
    );

  const categories = [
    ...new Set(all.map((r) => r.category).filter((c) => c !== "")),
  ].sort((a, b) => a.localeCompare(b));
  const activeCat = cat !== null && categories.includes(cat) ? cat : null;
  const filtered = activeCat
    ? all.filter((r) => r.category === activeCat)
    : all;
  const sorted = sort
    ? [...filtered].sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        if (av === undefined && bv === undefined) return 0;
        if (av === undefined) return 1;
        if (bv === undefined) return -1;
        const c =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv), undefined, {
                numeric: true,
                sensitivity: "base",
              });
        return c * sort.dir;
      })
    : filtered;
  const shown = sorted.slice(0, MAX_ROWS);

  const urgent = new Set(d.urgentIds ?? []);
  const heavy = new Set(d.heavyIds ?? []);
  const heavyRank = new Map((d.heavyIds ?? []).map((id, i) => [id, i + 1]));
  const maxMass = Math.max(1, ...all.map((r) => r.massKg ?? 0));

  const toggle = (key: SortKey) =>
    setSort((prev) =>
      !prev || prev.key !== key
        ? { key, dir: 1 }
        : prev.dir === 1
          ? { key, dir: -1 }
          : null,
    );

  const yesNo = (v: boolean | undefined, yes = "Yes", no = "No") =>
    v === undefined ? dash : v ? yes : no;
  const tone = (v: boolean | undefined, whenTrue: Tone): Tone =>
    v === undefined ? "plain" : v ? whenTrue : "plain";

  return (
    <div className="min-w-0">
      {all.length > 0 && (
        <>
          <div
            className="mb-2 flex min-w-0 flex-wrap gap-1.5"
            role="group"
            aria-label="Filter by category"
          >
            <Chip active={activeCat === null} onClick={() => setCat(null)}>
              All · {all.length}
            </Chip>
            {categories.map((c) => (
              <Chip
                key={c}
                active={activeCat === c}
                onClick={() => setCat(activeCat === c ? null : c)}
              >
                {c} · {all.filter((r) => r.category === c).length}
              </Chip>
            ))}
          </div>

          <div className="overflow-hidden rounded-md border border-white/[0.07] bg-black/25">
            <table className="w-full table-fixed border-collapse text-left text-[11px]">
              <colgroup>
                <col style={{ width: "4.1rem" }} />
                <col />
                <col
                  className="hidden @3xl:table-column"
                  style={{ width: "5.6rem" }}
                />
                <col style={{ width: "3.9rem" }} />
                <col style={{ width: "2.3rem" }} />
              </colgroup>
              <thead>
                <tr className="bg-white/[0.04]">
                  {COLS.map((c) => {
                    const active = sort?.key === c.key;
                    const Icon = !active
                      ? ArrowUpDown
                      : sort.dir === 1
                        ? ArrowUp
                        : ArrowDown;
                    return (
                      <th
                        key={c.key}
                        scope="col"
                        aria-sort={
                          active
                            ? sort.dir === 1
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        className={`h-7 px-0 font-normal ${c.right ? "text-right" : ""} ${c.wide ? "hidden @3xl:table-cell" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggle(c.key)}
                          className={`hud-label inline-flex h-7 w-full items-center gap-1 px-2 transition-colors hover:text-white ${c.right ? "justify-end" : ""} ${active ? "!text-[#d3f3a4]" : ""}`}
                        >
                          {c.label}
                          <Icon
                            className={`h-2.5 w-2.5 shrink-0 ${active ? "" : "opacity-40"}`}
                            aria-hidden
                          />
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => {
                  const isUrgent = urgent.has(r.id);
                  const isHeavy = heavy.has(r.id);
                  const pct =
                    r.massKg === undefined
                      ? 0
                      : Math.max(2, (r.massKg / maxMass) * 100);
                  const bar = `rgba(197,238,138,${isHeavy ? 0.16 : 0.06})`;
                  return (
                    <tr
                      key={r.id}
                      className="hp-flip border-t border-white/[0.06]"
                      style={{
                        background: `linear-gradient(90deg, ${bar} ${pct}%, transparent ${pct}%)`,
                        ["--i" as string]: Math.min(i, 14),
                      }}
                    >
                      <td
                        className={`px-2 py-1 font-mono text-[10.5px] ${isUrgent ? "shadow-[inset_2px_0_0_#fbbf24] text-[#fde68a]" : "text-white/80"}`}
                      >
                        {r.id}
                      </td>
                      <td className="min-w-0 px-2 py-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="min-w-0 truncate text-white/90"
                            title={r.cargo}
                          >
                            {r.cargo || dash}
                          </span>
                          {isHeavy && (
                            <span
                              className="shrink-0 rounded border border-white/20 px-1 text-[8.5px] font-semibold uppercase leading-[13px] tracking-wide text-white/70"
                              title={`Heavy #${heavyRank.get(r.id)}`}
                            >
                              heavy
                            </span>
                          )}
                        </div>
                        <span className="hud-muted block truncate text-[10px] @3xl:hidden">
                          {r.category}
                        </span>
                      </td>
                      <td className="hidden px-2 py-1 text-white/65 @3xl:table-cell">
                        <span className="block truncate">{r.category}</span>
                      </td>
                      <td
                        className={`px-2 py-1 text-right font-mono text-[10.5px] tabular-nums ${isHeavy ? "font-semibold text-[#d3f3a4]" : "text-white/75"}`}
                      >
                        {r.massKg === undefined ? dash : fmtNum(r.massKg)}
                      </td>
                      <td className="px-2 py-1 text-right">
                        {r.priority === undefined ? (
                          <span className="text-white/30">{dash}</span>
                        ) : r.priority === 1 ? (
                          <span className="inline-block rounded bg-[#fbbf24]/15 px-1 font-mono text-[10px] font-semibold text-[#fbbf24]">
                            P1
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-white/50">
                            P{r.priority}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={5} className="hud-muted px-2 py-2 text-[11px]">
                      No shipments in this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/50">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-3 w-0.5 rounded bg-[#fbbf24]" />
              urgent{d.urgentIds ? ` · ${d.urgentIds.length}` : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="rounded border border-white/20 px-1 text-[8.5px] font-semibold uppercase leading-[12px] text-white/70"
              >
                heavy
              </span>
              {d.heavyIds
                ? `${d.heavyIds.length} over the line`
                : "heavy cargo"}
            </span>
            <span className="ml-auto font-mono">
              {activeCat
                ? `${filtered.length} of ${all.length}`
                : `${all.length} shipments`}
              {sorted.length > MAX_ROWS ? ` · first ${MAX_ROWS}` : ""}
            </span>
          </div>
        </>
      )}

      {(d.medicalCount !== undefined ||
        d.firstFuel !== undefined ||
        d.anyMail !== undefined ||
        d.hazmatFound !== undefined) && (
        <dl className="mt-2.5 grid grid-cols-2 gap-1.5 @xl:grid-cols-4">
          <Tile
            label="Medical"
            value={d.medicalCount === undefined ? dash : fmtNum(d.medicalCount)}
            tone="accent"
            unit="crates"
          />
          <Tile label="First fuel" value={d.firstFuel ?? dash} tone="accent" />
          <Tile
            label="Any mail"
            value={yesNo(d.anyMail)}
            tone={tone(d.anyMail, "accent")}
          />
          <Tile
            label="Hazmat"
            value={yesNo(d.hazmatFound, "Found", "None")}
            tone={tone(d.hazmatFound, "warning")}
          />
        </dl>
      )}
      {d.urgentIds && d.urgentIds.length > 0 && all.length === 0 && (
        <p className="mt-2 flex flex-wrap gap-1.5">
          {d.urgentIds.map((id) => (
            <Pill key={id} tone="warning">
              {id}
            </Pill>
          ))}
        </p>
      )}
    </div>
  );
}
