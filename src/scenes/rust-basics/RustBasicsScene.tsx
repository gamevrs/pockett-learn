"use client";

import React, { useEffect, useState } from "react";
import type { SceneProps } from "@/engine/scene";
import { ROOMS, SCENE_KEYS, readAny, readStation, tileValue, type Room, type Station } from "./data";
import { Cutaway } from "./diagram";
import {
  AirlockDesk,
  AlarmBoard,
  BallastPumps,
  CompilerPanel,
  ConsolePanel,
  DiveLog,
  DroneBay,
  Frame,
  IntakeDesk,
  LockedPanel,
  MissionOrders,
  OxygenPlant,
  PressureGauge,
  RadioMast,
  SampleCatalogue,
  SampleVault,
  SensorArray,
  StationReport,
  TetherLine,
  WaitingPanel,
} from "./panels";

/**
 * Halcyon Reef Station: the live board for the Reef Station course.
 *
 * Rust runs through the compiled-language path, so the station can't call the program back. It draws
 * what the program printed: stdout for the console, and every `scene("key", value)` line (an
 * `@scene {json}` line) for the modules. A failed build arrives as `build_error` ({ type, message,
 * line }, where type is the rustc code such as E0382, or "Panic") and is explained by the compiler
 * panel. Each room of the cutaway is a ghost until its lesson is passed, and shows a "press Run" hint
 * when it is unlocked but nothing has been built on this page yet.
 *
 * Colour follows the Pockett Stage system: neutral greys for structure, lime only for values the
 * learner's code produced, copper for the station's hull, amber for caution, red for failures.
 */

function moduleBody(id: string, s: Station, allLive: boolean): React.ReactNode {
  switch (id) {
    case "rs-oxygen":
      return <OxygenPlant s={s} />;
    case "rs-pressure":
      return <PressureGauge s={s} />;
    case "rs-airlock":
      return <AirlockDesk s={s} />;
    case "rs-alarms":
      return <AlarmBoard s={s} />;
    case "rs-pumps":
      return <BallastPumps s={s} />;
    case "rs-sensors":
      return <SensorArray s={s} />;
    case "rs-divelog":
      return <DiveLog s={s} />;
    case "rs-vault":
      return <SampleVault s={s} />;
    case "rs-tether":
      return <TetherLine s={s} />;
    case "rs-radio":
      return <RadioMast s={s} />;
    case "rs-drones":
      return <DroneBay s={s} />;
    case "rs-orders":
      return <MissionOrders s={s} />;
    case "rs-catalogue":
      return <SampleCatalogue s={s} />;
    case "rs-intake":
      return <IntakeDesk s={s} />;
    default:
      return <StationReport s={s} allLive={allLive} />;
  }
}

export default function RustBasicsScene({ program, unlocked, focus, celebration, interactive, autoplay }: SceneProps) {
  const station = readStation(program);
  const flashing = new Set(celebration?.features ?? []);
  const failed = station.error !== null;
  const liveRooms = ROOMS.filter((r) => unlocked.has(r.id));
  const liveCount = liveRooms.length;
  const allLive = liveCount === ROOMS.length;

  // Which room's readout is open. A click wins; otherwise a fresh unlock, then the lesson's room,
  // then the newest live room. With autoplay (the landing page) the board tours the live rooms itself.
  const [picked, setPicked] = useState<string | null>(null);
  const [tour, setTour] = useState(0);
  useEffect(() => {
    if (!autoplay || picked !== null) return;
    const id = setInterval(() => setTour((n) => n + 1), 3400);
    return () => clearInterval(id);
  }, [autoplay, picked]);

  const newest = liveRooms.length > 0 ? liveRooms[liveRooms.length - 1].id : null;
  const fresh = celebration?.features.find((f) => ROOMS.some((r) => r.id === f)) ?? null;
  const touring = autoplay && picked === null && liveRooms.length > 0 ? liveRooms[tour % liveRooms.length].id : null;
  const selectedId = picked ?? touring ?? fresh ?? focus ?? newest;
  const selected = ROOMS.find((r) => r.id === selectedId) ?? null;

  const keys: [string, unknown][] = program
    ? SCENE_KEYS.flatMap((k): [string, unknown][] => {
        const v = readAny(program, k);
        return v === undefined ? [] : [[k, v]];
      })
    : [];

  const renderRoom = (room: Room) => {
    if (!unlocked.has(room.id)) {
      return <LockedPanel key={room.id} id={room.id} title={room.title} lesson={room.lesson} clause={room.clause} spot={focus === room.id} />;
    }
    if (!program) return <WaitingPanel key={room.id} id={room.id} title={room.title} lesson={room.lesson} />;
    const body = failed ? (
      <p className="hud-log hud-muted py-1 text-[11px]">Waiting for a successful build. Fix the error and press Run.</p>
    ) : (
      moduleBody(room.id, station, allLive)
    );
    return (
      <Frame
        key={flashing.has(room.id) ? `${room.id}:${celebration?.nonce}` : room.id}
        id={room.id}
        title={room.title}
        meta={failed ? undefined : tileValue(room.id, station)}
        focus={focus === room.id}
        flash={flashing.has(room.id)}
      >
        {body}
      </Frame>
    );
  };

  const consolePanel = (
    <ConsolePanel
      key="rs-console"
      stdout={program?.stdout ?? ""}
      built={!!program}
      error={station.error}
      keys={keys}
      live={!!program}
      interactive={interactive}
      focus={focus === "rs-console" || selectedId === "rs-console"}
      flash={flashing.has("rs-console")}
      locked={!unlocked.has("rs-console")}
    />
  );

  const detail = selected && selected.id !== "rs-console" ? renderRoom(selected) : null;
  const rest = ROOMS.filter((r) => r.id !== "rs-console" && r.id !== selected?.id);

  return (
    <div className={`@container absolute inset-0 ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
      <div className="px-3 pb-3 pt-12">
        <div className="mb-3 flex min-w-0 items-baseline gap-x-3 gap-y-0.5 px-0.5">
          <h2 className="hud-title min-w-0 truncate">Halcyon Reef Station</h2>
          <span className="hud-label ml-auto shrink-0">
            <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/45"}`}>{liveCount}</span>/{ROOMS.length} modules live
          </span>
        </div>
        <div className="grid gap-3 @4xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] @4xl:items-start">
          <Cutaway
            station={station}
            unlocked={unlocked}
            selected={selectedId}
            focus={focus}
            flashing={flashing}
            nonce={celebration?.nonce}
            interactive={interactive}
            onSelect={setPicked}
          />
          <div className="min-w-0">
            {station.error && <CompilerPanel error={station.error} />}
            {consolePanel}
            {detail}
          </div>
        </div>
        <div className="mt-3 gap-3 @xl:columns-2 @4xl:columns-3">{rest.map(renderRoom)}</div>
      </div>
    </div>
  );
}
