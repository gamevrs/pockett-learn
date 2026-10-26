"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Dices, Link2, Lock, ShieldAlert } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Mono, Note, Readout, Segmented, Tag, noise } from "./ui";

/**
 * You are Dana (patient 41), logged in to the clinic portal. The page asks the server for
 * /appointments/<id>. Change the id and see what comes back under three server designs: no
 * ownership check, a check that the booking is yours, and "unguessable" ids with no check.
 */

interface Appt {
  id: number;
  patient: number;
  name: string;
  what: string;
  note: string;
}

const ME = { patient: 41, name: "Dana Whitfield" };
const APPTS: Appt[] = [
  { id: 118, patient: 41, name: "Dana Whitfield", what: "Check-up", note: "Annual blood test, fasting" },
  { id: 119, patient: 42, name: "Eli Marsh", what: "Physiotherapy", note: "Knee follow-up, mentions old injury" },
  { id: 120, patient: 41, name: "Dana Whitfield", what: "Flu jab", note: "Walk-in slot" },
  { id: 121, patient: 43, name: "Priya Raman", what: "Dermatology", note: "Mole check, referral attached" },
  { id: 122, patient: 44, name: "Tomas Berg", what: "Counselling", note: "Weekly session, private" },
  { id: 123, patient: 42, name: "Eli Marsh", what: "Pharmacy review", note: "Medication list changed" },
  { id: 124, patient: 45, name: "Mei Chen", what: "Antenatal scan", note: "Twelve-week appointment" },
  { id: 125, patient: 41, name: "Dana Whitfield", what: "Dentist hygiene", note: "Routine clean" },
];

type Mode = "none" | "owner" | "uuid";

const slug = (id: number) => Array.from({ length: 2 }, (_, i) => Math.floor(noise(id, i + 9) * 65536).toString(16).padStart(4, "0")).join("-");

export interface IdorLabProps {
  mode?: Mode;
  /** Show the server-design switch. */
  modeToggle?: boolean;
}

export interface IdorLabState {
  mode: Mode;
  id: string;
  /** Distinct bookings of other patients that were shown to Dana. */
  leaked: number;
  /** The last response was somebody else's booking. */
  lastLeak: boolean;
  lastStatus: 200 | 404;
}

export function IdorLab({ props, onChange, revealed }: WidgetProps<IdorLabProps>) {
  const [mode, setMode] = useState<Mode>(props.mode ?? "none");
  const [num, setNum] = useState(118);
  const [uid, setUid] = useState<string>(slug(118));
  const [seen, setSeen] = useState<number[]>([]);

  const current = (m: Mode, n: number, u: string) => {
    if (m === "uuid") {
      const a = APPTS.find((x) => slug(x.id) === u);
      return a ?? null;
    }
    return APPTS.find((x) => x.id === n) ?? null;
  };
  const respond = (m: Mode, a: Appt | null) => {
    if (!a) return { status: 404 as const, a: null, mine: false };
    const mine = a.patient === ME.patient;
    if (m === "owner" && !mine) return { status: 404 as const, a: null, mine: false };
    return { status: 200 as const, a, mine };
  };

  const emit = (m: Mode, n: number, u: string, s: number[]) => {
    const r = respond(m, current(m, n, u));
    onChange?.({ mode: m, id: m === "uuid" ? u : String(n), leaked: s.length, lastLeak: r.status === 200 && !r.mine, lastStatus: r.status } satisfies IdorLabState);
  };
  const visit = (m: Mode, n: number, u: string, s: number[]) => {
    const r = respond(m, current(m, n, u));
    const next = r.status === 200 && !r.mine && r.a && !s.includes(r.a.id) ? [...s, r.a.id] : s;
    setSeen(next);
    emit(m, n, u, next);
  };

  const pickMode = (m: Mode) => {
    if (revealed) return;
    setMode(m);
    const n = 118;
    const u = slug(118);
    setNum(n);
    setUid(u);
    setSeen([]);
    emit(m, n, u, []);
  };
  const step = (d: number) => {
    if (revealed) return;
    const n = Math.min(130, Math.max(110, num + d));
    setNum(n);
    visit(mode, n, uid, seen);
  };
  const setUuid = (u: string) => {
    if (revealed) return;
    setUid(u);
    visit(mode, num, u, seen);
  };

  const r = respond(mode, current(mode, num, uid));
  const display = mode === "uuid" ? uid : String(num);
  const sql = mode === "owner" ? "SELECT * FROM appointments\nWHERE id = :id AND patient_id = :me;" : "SELECT * FROM appointments\nWHERE id = :id;";
  const mineIds = APPTS.filter((a) => a.patient === ME.patient).map((a) => slug(a.id));

  return (
    <div className="w-full max-w-2xl">
      {props.modeToggle && (
        <div className="mb-3 flex justify-center">
          <Segmented
            label="Server design"
            value={mode}
            disabled={revealed}
            options={[
              { id: "none", label: "No check" },
              { id: "owner", label: "Owner check" },
              { id: "uuid", label: "Random ids" },
            ]}
            onChange={pickMode}
          />
        </div>
      )}

      <div className="rounded-xl border border-line bg-surface-2 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink-2">
            <Lock className="h-3.5 w-3.5 text-brand" /> logged in as <span className="font-semibold text-ink">{ME.name}</span> (patient {ME.patient})
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <Mono className="min-w-0 flex-1 !py-2">
            https://dovetail.example/appointments/<span className="font-semibold text-brand">{display}</span>
          </Mono>
        </div>

        {mode !== "uuid" ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" className="btn !h-10" onClick={() => step(-1)} disabled={revealed} aria-label="Previous id">
              <ChevronLeft className="h-4 w-4" /> id − 1
            </button>
            <button type="button" className="btn !h-10" onClick={() => step(1)} disabled={revealed} aria-label="Next id">
              id + 1 <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-xs text-ink-3">Edit the number in the address bar, the way anyone can.</span>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {mineIds.map((u, i) => (
              <button key={u} type="button" className={`btn !h-10 !px-3 font-mono text-[12px] ${uid === u ? "btn-primary" : ""}`} onClick={() => setUuid(u)} disabled={revealed}>
                my booking {i + 1}
              </button>
            ))}
            <button type="button" className="btn !h-10 !px-3" onClick={() => setUuid(slug(119))} disabled={revealed}>
              <Link2 className="h-4 w-4" /> Open a link a friend forwarded
            </button>
            <button type="button" className="btn !h-10 !px-3" onClick={() => setUuid("5b3e-91c0")} disabled={revealed}>
              <Dices className="h-4 w-4" /> Guess an id
            </button>
          </div>
        )}
        <p className="mt-2 font-mono text-[11.5px] leading-snug text-ink-3">{sql}</p>
      </div>

      <div className={`mt-2 rounded-xl border bg-surface p-3 ${r.status === 200 && !r.mine ? "border-[var(--bad)]/60" : "border-line"}`} aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Caption>The server answers</Caption>
          <div className="flex gap-1.5">
            <Tag tone={r.status === 200 ? "good" : "muted"}>{r.status === 200 ? "200 OK" : "404 Not Found"}</Tag>
            {r.status === 200 && (r.mine ? <Tag tone="good">yours</Tag> : <Tag tone="bad">NOT yours</Tag>)}
          </div>
        </div>
        {r.a ? (
          <div className="pop-in mt-2 grid gap-0.5 text-sm" key={`${mode}${display}`}>
            <p className="font-semibold text-ink">{r.a.what}</p>
            <p className={r.mine ? "text-ink-2" : "font-medium text-bad"}>{r.a.name}</p>
            <p className="text-ink-2">{r.a.note}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-3">{mode === "owner" ? "No booking of yours has that id. (Same answer whether it exists or not.)" : "Nothing at that id."}</p>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Readout label="Other patients' bookings seen" value={seen.length} accent={seen.length > 0} />
        {seen.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-bad">
            <ShieldAlert className="h-4 w-4" /> a login was enough to read someone else&apos;s record
          </span>
        )}
      </div>
      {mode === "uuid" && seen.length > 0 && <Note tone="bad" className="pop-in mt-2">The id was hard to guess, but once a link was forwarded it opened the booking for anyone logged in. Obscurity is not a lock.</Note>}
    </div>
  );
}

export function checkIdorLab(state: unknown, goal: Record<string, unknown>) {
  const st = state as IdorLabState | undefined;
  if (!st) return false;
  if (typeof goal.mode === "string" && st.mode !== goal.mode) return false;
  if (typeof goal.minLeaked === "number" && st.leaked < goal.minLeaked) return false;
  if (goal.leaked === 0 && st.leaked !== 0) return false;
  return true;
}
