"use client";

import React, { useState } from "react";
import { Archive, Database, Laptop, MessageSquareText, ServerCog, ShieldCheck, Smartphone } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, sameSet } from "./ui";

/**
 * The Dovetail Clinic booking system as a map: what sits outside our control, what sits inside, and
 * the data flows between them. "explore" lets you tap a box to read what is worth stealing there
 * and who might try; "boundary" asks you to mark the flows that cross from outside to inside (or
 * back), which is where trust has to be earned.
 */

type Zone = "outside" | "inside";
interface NodeDef {
  id: string;
  zone: Zone;
  name: string;
  Icon: React.ComponentType<{ className?: string }>;
  assets: string;
  threat: string;
}

const NODES: NodeDef[] = [
  { id: "phone", zone: "outside", name: "Patient's phone", Icon: Smartphone, assets: "A patient's login session and whatever they type into a booking.", threat: "Lost, shared or infected phones, and people who simply lie about who they are. Whatever it sends is a claim, not a fact." },
  { id: "laptop", zone: "outside", name: "Staff laptop", Icon: Laptop, assets: "A receptionist's session, which can see and change many patients' bookings.", threat: "A phished password, a laptop left open on a café table, a leaver whose account was never switched off." },
  { id: "sms", zone: "outside", name: "SMS provider", Icon: MessageSquareText, assets: "Patients' phone numbers and the text of every reminder.", threat: "A breach at the provider, or someone faking the delivery callbacks it sends back to us. It is another company's computer." },
  { id: "api", zone: "inside", name: "Booking API", Icon: ServerCog, assets: "The rules for who may book what, and every patient's session.", threat: "Forged requests, appointment ids that belong to someone else, floods of traffic and clever input." },
  { id: "admin", zone: "inside", name: "Admin panel", Icon: ShieldCheck, assets: "Power: cancel any booking, export patient lists, create staff accounts.", threat: "A stolen staff login is exactly as dangerous as the panel is powerful. Small mistakes here are big incidents." },
  { id: "db", zone: "inside", name: "Patient database", Icon: Database, assets: "Every record the clinic holds. The crown jewels.", threat: "Injection bugs, an over-generous service account, a query that forgets whose data it is fetching." },
  { id: "backups", zone: "inside", name: "Nightly backups", Icon: Archive, assets: "A complete copy of the database, kept for months.", threat: "A storage bucket nobody remembered to lock, old copies that were never deleted, a restore into a laptop." },
];

interface Flow {
  id: string;
  from: string;
  to: string;
  /** True when the flow crosses the boundary between outside and inside. */
  crossing: boolean;
}

const FLOWS: Flow[] = [
  { id: "f1", from: "phone", to: "api", crossing: true },
  { id: "f2", from: "laptop", to: "admin", crossing: true },
  { id: "f3", from: "api", to: "sms", crossing: true },
  { id: "f4", from: "api", to: "db", crossing: false },
  { id: "f5", from: "admin", to: "db", crossing: false },
  { id: "f6", from: "db", to: "backups", crossing: false },
];

const byId = (id: string) => NODES.find((n) => n.id === id)!;

export interface ThreatMapProps {
  /** "explore": tap a box to read about it. "boundary": mark the flows that cross the trust boundary. */
  mode?: "explore" | "boundary";
}

export interface ThreatMapState {
  selected: string | null;
  marked: string[];
}

export function ThreatMap({ props, onChange, revealed, status, goal }: WidgetProps<ThreatMapProps>) {
  const mode = props.mode ?? "explore";
  const [selected, setSelected] = useState<string | null>(null);
  const [marked, setMarked] = useState<string[]>([]);
  const node = selected ? byId(selected) : null;
  const showTruth = Boolean(revealed) && status === "revealed" && Boolean(goal?.crossing);

  const report = (s: string | null, m: string[]) => onChange?.({ selected: s, marked: m } satisfies ThreatMapState);
  const pickNode = (id: string) => {
    if (mode === "boundary") return;
    const next = selected === id ? null : id;
    setSelected(next);
    report(next, marked);
  };
  const toggleFlow = (id: string) => {
    if (revealed || mode !== "boundary") return;
    const next = marked.includes(id) ? marked.filter((x) => x !== id) : [...marked, id];
    setMarked(next);
    report(selected, next);
  };

  const badgesFor = (id: string) => FLOWS.map((f, i) => ({ f, n: i + 1 })).filter(({ f }) => f.from === id || f.to === id);

  const zone = (z: Zone) => (
    <div className={`rounded-xl border p-2.5 ${z === "inside" ? "border-[var(--brand)]/40 bg-tint/50" : "border-dashed border-[var(--line-strong)] bg-surface-2"}`}>
      <Caption className="mb-2">{z === "inside" ? "Inside: systems we run" : "Outside: not ours"}</Caption>
      <div className="grid gap-2">
        {NODES.filter((n) => n.zone === z).map((n) => {
          const on = selected === n.id;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => pickNode(n.id)}
              aria-pressed={mode === "explore" ? on : undefined}
              className={`flex min-h-12 items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                on ? "border-[var(--brand)] bg-surface ring-1 ring-[var(--brand)]" : "border-line bg-surface hover:border-[var(--line-strong)]"
              } ${mode === "boundary" ? "cursor-default" : ""}`}
            >
              <n.Icon className="h-5 w-5 shrink-0 text-brand" />
              <span className="min-w-0 flex-1 text-sm font-medium text-ink">{n.name}</span>
              <span className="flex shrink-0 gap-1">
                {badgesFor(n.id).map(({ f, n: num }) => (
                  <span
                    key={f.id}
                    className={`grid h-5 w-5 place-items-center rounded-full border font-mono text-[10.5px] font-semibold ${
                      marked.includes(f.id) ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface-2 text-ink-3"
                    }`}
                    aria-hidden
                  >
                    {num}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-2xl">
      <div className="grid gap-2 sm:grid-cols-2">
        {zone("outside")}
        {zone("inside")}
      </div>
      <p className="mt-1.5 text-center font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">The dashed edge is the trust boundary</p>

      {mode === "explore" && (
        <div className="mt-2 min-h-[5.5rem] rounded-xl border border-line bg-surface p-3" aria-live="polite">
          {node ? (
            <div className="pop-in grid gap-1.5 text-sm" key={node.id}>
              <p className="font-semibold text-ink">{node.name}</p>
              <p className="text-ink-2">
                <span className="font-medium text-ink">Worth taking: </span>
                {node.assets}
              </p>
              <p className="text-ink-2">
                <span className="font-medium text-ink">Who and how: </span>
                {node.threat}
              </p>
            </div>
          ) : (
            <p className="py-3 text-center text-sm text-ink-3">Tap a box to see what is valuable there and who might come for it.</p>
          )}
        </div>
      )}

      {mode === "boundary" && (
        <div className="mt-2">
          <Caption className="mb-1.5">Data flows: tap the ones that cross the boundary</Caption>
          <div className="grid gap-1.5">
            {FLOWS.map((f, i) => {
              const on = marked.includes(f.id);
              const wrong = showTruth && on !== f.crossing;
              const right = showTruth && f.crossing;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFlow(f.id)}
                  disabled={revealed}
                  aria-pressed={on}
                  className={`flex min-h-10 items-center gap-2.5 rounded-lg border px-3 py-1.5 text-left text-sm transition-colors disabled:cursor-default ${
                    wrong ? "border-[var(--bad)]/60 bg-[var(--bad)]/[0.07]" : on || right ? "border-[var(--brand)] bg-tint" : "border-line bg-surface hover:border-[var(--line-strong)]"
                  }`}
                >
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[10.5px] font-semibold ${on || right ? "bg-primary text-primary-ink" : "bg-surface-2 text-ink-3"}`}>{i + 1}</span>
                  <span className="min-w-0 flex-1 text-ink">
                    {byId(f.from).name} <span className="text-ink-3">→</span> {byId(f.to).name}
                  </span>
                  {(on || right) && <span className="shrink-0 text-xs text-ink-2">crosses</span>}
                </button>
              );
            })}
          </div>
          {showTruth && (
            <Note tone="accent" className="pop-in mt-2">
              Three flows cross the line: the patient&apos;s phone, the staff laptop and the SMS provider all sit on the far side of it.
            </Note>
          )}
        </div>
      )}
    </div>
  );
}

export function checkThreatMap(state: unknown, goal: Record<string, unknown>) {
  const st = state as ThreatMapState | undefined;
  if (!st) return false;
  if (Array.isArray(goal.crossing) && !sameSet(st.marked, goal.crossing)) return false;
  if (typeof goal.selected === "string" && st.selected !== goal.selected) return false;
  return true;
}
