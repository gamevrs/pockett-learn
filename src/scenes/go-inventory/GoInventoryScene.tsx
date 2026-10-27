"use client";

import React from "react";
import type { SceneProps } from "@/engine/scene";
import { FeatureIcon } from "@/components/ui/icons";
import { readAny, readBoard, SCENE_KEYS, type Board } from "./data";
import { Compose, ConsolePanel, ErrorDesk, Inbox, Lane, Printout, Probe, Shelves, ShelvesGhost, StockIndex } from "./panels";
import { CloseOut, Helpers, Importer, LedgerPanel, LogPanel, SkuStrip, Tests, Validation } from "./panels2";
import { ErrorStrip, Overview, OVERVIEW_H, OVERVIEW_W } from "./overview";
import { Frame, LockedPanel, WaitingPanel, type GhostKind } from "./ui";

/**
 * Cairn Depot ledger board: the live scene for the Go Intermediate course.
 *
 * Go runs on the pockett runner, so the board can't call the program back. It draws what the program
 * printed: stdout for the console, and every `scene("key", value)` line (an `@scene` line) for the
 * panels. A failed build arrives as a `build_error` value and is shown on the console with its line
 * number. Each panel is a blueprint until its lesson is passed, and shows a "press Run" hint when it
 * is unlocked but nothing has been built on this page yet. Short, wide stages (the project hub, the
 * landing page) get the one-screen overview.
 *
 * Colour follows the Pockett Stage system: neutral greys for structure, lime only for values the
 * learner's code produced, amber for caution, red for failures.
 */

interface PanelSpec {
  id: string;
  title: string;
  lesson: number;
  clause: string;
  ghost: GhostKind;
}

const SHELVES: PanelSpec = { id: "gi-shelves", title: "Shelves", lesson: 1, clause: "methods · pointer receivers", ghost: "tiles" };

const PANELS: PanelSpec[] = [
  { id: "gi-lane", title: "Handler lane", lesson: 2, clause: "interface · implicit satisfaction", ghost: "rows" },
  { id: "gi-kinds", title: "Type probe", lesson: 3, clause: "type switch · v, ok := x.(T)", ghost: "chips" },
  { id: "gi-compose", title: "Composition", lesson: 4, clause: "struct embedding · promotion", ghost: "cards" },
  { id: "gi-printout", title: "Printout", lesson: 5, clause: "Stringer · %v %+v %#v · tabwriter", ghost: "lines" },
  { id: "gi-inbox", title: "Rejected inbox", lesson: 6, clause: "%w · errors.Is", ghost: "rows" },
  { id: "gi-typed", title: "Error desk", lesson: 7, clause: "errors.As · recover", ghost: "rows" },
  { id: "gi-index", title: "Stock index", lesson: 8, clause: "map[K]*T · slices.SortFunc", ghost: "bars" },
  { id: "gi-helpers", title: "Generic helpers", lesson: 9, clause: "Map[T, U] · Sum[T Number]", ghost: "rows" },
  { id: "gi-ledger", title: "Generic ledger", lesson: 10, clause: "Ledger[K, V] · Stack[T]", ghost: "chips" },
  { id: "gi-import", title: "JSON import", lesson: 11, clause: "json.Decoder · *int", ghost: "cards" },
  { id: "gi-validate", title: "Validation", lesson: 12, clause: "errors.Join", ghost: "rows" },
  { id: "gi-sku", title: "SKU strip", lesson: 13, clause: "regexp · named groups", ghost: "chips" },
  { id: "gi-log", title: "Movement log", lesson: 14, clause: "bufio.Scanner · line numbers", ghost: "tiles" },
  { id: "gi-tests", title: "Test results", lesson: 15, clause: "table-driven tests", ghost: "rows" },
  { id: "gi-close", title: "Close-out", lesson: 16, clause: "your whole program", ghost: "tiles" },
];

const ALL_IDS = ["gi-console", SHELVES.id, ...PANELS.map((p) => p.id)];
const TOTAL_SYSTEMS = ALL_IDS.length;

function panelBody(id: string, b: Board): React.ReactNode {
  switch (id) {
    case "gi-lane":
      return <Lane d={b.lane} />;
    case "gi-kinds":
      return <Probe d={b.probe} />;
    case "gi-compose":
      return <Compose d={b.compose} />;
    case "gi-printout":
      return <Printout d={b.printout} />;
    case "gi-inbox":
      return <Inbox d={b.inbox} />;
    case "gi-typed":
      return <ErrorDesk d={b.typed} />;
    case "gi-index":
      return <StockIndex d={b.index} />;
    case "gi-helpers":
      return <Helpers d={b.helpers} />;
    case "gi-ledger":
      return <LedgerPanel d={b.ledger} />;
    case "gi-import":
      return <Importer d={b.importer} />;
    case "gi-validate":
      return <Validation d={b.validation} />;
    case "gi-sku":
      return <SkuStrip d={b.sku} />;
    case "gi-log":
      return <LogPanel d={b.log} />;
    case "gi-tests":
      return <Tests d={b.tests} />;
    default:
      return <CloseOut d={b.close} />;
  }
}

/** A short count shown in each card header, when the card has something to count. */
function panelMeta(id: string, b: Board): string | undefined {
  switch (id) {
    case "gi-shelves":
      return b.shelves.items ? `${b.shelves.items.length} lines` : undefined;
    case "gi-lane":
      return b.lane.rows ? `${b.lane.rows.length} moved` : undefined;
    case "gi-inbox":
      return b.inbox.rows ? `${b.inbox.rows.length} refused` : undefined;
    case "gi-typed":
      return b.typed.rows ? `${b.typed.rows.length} typed` : undefined;
    case "gi-ledger":
      return b.ledger.len !== undefined ? `${b.ledger.len} entries` : undefined;
    case "gi-import":
      return b.importer.decoded || b.importer.failed ? `${b.importer.decoded?.length ?? 0}/${(b.importer.decoded?.length ?? 0) + (b.importer.failed?.length ?? 0)} decoded` : undefined;
    case "gi-validate":
      return b.validation.total !== undefined ? `${b.validation.total} problems` : undefined;
    case "gi-log":
      return b.log.movements !== undefined ? `${b.log.movements} movements` : undefined;
    case "gi-tests": {
      const all = [...(b.tests.rows ?? []), ...(b.tests.gate ?? [])];
      return all.length ? `${all.filter((t) => t.pass).length}/${all.length} pass` : undefined;
    }
    case "gi-close":
      return b.close.balanced === undefined ? undefined : b.close.balanced ? "balanced" : "off";
    default:
      return undefined;
  }
}

/** Space the stage shell keeps for its own label and expand button along the top edge. */
const SHELL_TOP = 44;

/** Short and wide stages (the project hub, the landing page) get the one-screen overview. */
const isCompact = (box: { w: number; h: number } | null) => box !== null && box.w >= 420 && box.h <= 600 && box.w / box.h >= 1.2;

export default function GoInventoryScene({ program, unlocked, focus, celebration, interactive }: SceneProps) {
  const [box, setBox] = React.useState<{ w: number; h: number } | null>(null);
  const measure = React.useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox((prev) => (prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1 ? prev : { w: width, h: height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const board = readBoard(program);
  const flashing = new Set(celebration?.features ?? []);
  const compileFailed = board.error?.type === "CompileError";
  const liveCount = ALL_IDS.filter((id) => unlocked.has(id)).length;

  const keys: [string, unknown][] = program
    ? SCENE_KEYS.flatMap((k): [string, unknown][] => {
        const v = readAny(program, k);
        return v === undefined ? [] : [[k, v]];
      })
    : [];

  const renderPanel = (p: PanelSpec) => {
    if (!unlocked.has(p.id)) {
      return <LockedPanel key={p.id} id={p.id} title={p.title} kind={p.ghost} lesson={p.lesson} clause={p.clause} spot={focus === p.id} />;
    }
    if (!program) return <WaitingPanel key={p.id} id={p.id} title={p.title} kind={p.ghost} lesson={p.lesson} />;
    return (
      <Frame
        key={flashing.has(p.id) ? `${p.id}:${celebration?.nonce}` : p.id}
        id={p.id}
        title={p.title}
        icon={<FeatureIcon id={p.id} className="h-3.5 w-3.5" />}
        meta={compileFailed ? undefined : panelMeta(p.id, board)}
        focus={focus === p.id}
        flash={flashing.has(p.id)}
      >
        {compileFailed ? <p className="hud-log hud-muted py-1 text-[11px]">Waiting for a successful build. Fix the error on the console and press Run.</p> : panelBody(p.id, board)}
      </Frame>
    );
  };

  const title = (
    <div className="flex min-w-0 items-baseline gap-x-3 gap-y-0.5 px-0.5">
      <h2 className="hud-title min-w-0 truncate">Cairn Depot ledger board</h2>
      <span className="hud-label ml-auto shrink-0">
        <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/55"}`}>{liveCount}</span>/{TOTAL_SYSTEMS} systems live
      </span>
    </div>
  );

  if (box && isCompact(box)) {
    const availH = Math.max(box.h - SHELL_TOP, 120);
    const scale = Math.min(box.w / OVERVIEW_W, availH / OVERVIEW_H);
    return (
      <div ref={measure} className="absolute inset-0 overflow-hidden">
        <div
          className="absolute flex flex-col gap-2"
          style={{ width: OVERVIEW_W, height: OVERVIEW_H, left: (box.w - OVERVIEW_W * scale) / 2, top: SHELL_TOP + (availH - OVERVIEW_H * scale) / 2, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          {title}
          <div className="min-h-0 flex-1">
            {board.error ? (
              <ErrorStrip error={board.error} />
            ) : (
              <Overview board={compileFailed ? readBoard(null) : board} unlocked={unlocked} built={!!program} focus={focus} flashing={flashing} />
            )}
          </div>
        </div>
      </div>
    );
  }

  const focused = PANELS.find((p) => p.id === focus) ?? null;
  const rest = PANELS.filter((p) => p.id !== focused?.id);

  const consolePanel = (
    <ConsolePanel
      key="gi-console"
      stdout={program?.stdout ?? ""}
      built={!!program}
      error={board.error}
      keys={keys}
      live={!!program}
      interactive={interactive}
      focus={focus === "gi-console"}
      flash={flashing.has("gi-console")}
      locked={!unlocked.has("gi-console")}
    />
  );

  const shelvesUnlocked = unlocked.has(SHELVES.id);

  return (
    <div ref={measure} className={`absolute inset-0 [container-type:size] ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
      <div className={`px-3 pt-12 ${interactive ? "pb-3" : "pb-2"}`}>
        <div className={interactive ? "mb-3" : "mb-1.5"}>{title}</div>
        {/* the hero: every bin on the shelves */}
        {!interactive && board.error ? (
          consolePanel
        ) : (
          <div className="mb-3">
            {!shelvesUnlocked ? (
              <section data-panel={SHELVES.id} data-locked="" className={`rounded-[10px] border border-dashed px-3 py-2.5 ${focus === SHELVES.id ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}>
                <header className="mb-2 flex items-center gap-2">
                  <span className="hud-label min-w-0 flex-1 truncate">Shelves</span>
                  <span className="hud-label text-white/45">L{SHELVES.lesson}</span>
                </header>
                <ShelvesGhost />
                <p className="mt-2 truncate font-mono text-[10px] text-white/45">
                  {focus === SHELVES.id ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
                  {SHELVES.clause}
                </p>
              </section>
            ) : !program ? (
              <WaitingPanel id={SHELVES.id} title={SHELVES.title} kind={SHELVES.ghost} lesson={SHELVES.lesson} />
            ) : (
              <Frame
                key={flashing.has(SHELVES.id) ? `${SHELVES.id}:${celebration?.nonce}` : SHELVES.id}
                id={SHELVES.id}
                title={SHELVES.title}
                icon={<FeatureIcon id={SHELVES.id} className="h-3.5 w-3.5" />}
                meta={compileFailed ? undefined : panelMeta(SHELVES.id, board)}
                focus={focus === SHELVES.id}
                flash={flashing.has(SHELVES.id)}
              >
                {compileFailed ? <p className="hud-log hud-muted py-1 text-[11px]">Waiting for a successful build. Fix the error on the console and press Run.</p> : <Shelves d={board.shelves} />}
              </Frame>
            )}
          </div>
        )}
        {interactive && (
          <div className="gap-3 @xl:columns-2 @4xl:columns-3 @7xl:columns-4">
            {consolePanel}
            {focused && renderPanel(focused)}
            {rest.map(renderPanel)}
          </div>
        )}
      </div>
    </div>
  );
}
