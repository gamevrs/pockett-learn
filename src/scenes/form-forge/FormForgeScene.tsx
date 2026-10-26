"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  Bug,
  Check,
  Eraser,
  FileJson,
  Lock,
  Minus,
  Plus,
  RotateCcw,
  ScanLine,
  Send,
  ShieldCheck,
  ShoppingCart,
  X,
} from "lucide-react";
import type { SceneProps } from "@/engine/scene";
import { FeatureIcon } from "@/components/ui/icons";
import { COUNTRIES, FIELDS, FUZZ_TEXT, SAMPLES, SECTIONS, type FieldDef } from "./data";
import { DRAFT_PRESETS, FormSim, isOk, type AttemptError, type FieldView, type Res, type Snapshot } from "./sim";

/**
 * Form Forge: a live checkout form whose every verdict comes from the learner's JavaScript.
 *
 * The scene decides nothing. It types into the form, asks the learner's functions what they make
 * of it, and shows the answers: tidied text, tick marks, error messages, a password meter, the JSON
 * that would be sent. Until a lesson is passed, its feature is a dashed blueprint. If a function is
 * missing, crashes or returns the wrong kind of thing, the scene says so instead of breaking.
 * Lime means "your code produced this".
 */

const CSS = `
@keyframes ff-flash { 0% { background-color: rgba(197,238,138,.28); } 100% { background-color: transparent; } }
.ff-flash { animation: ff-flash .9s ease-out; }
@keyframes ff-caret { 0%, 100% { opacity: .2; } 50% { opacity: 1; } }
.ff-live { animation: ff-caret 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .ff-flash, .ff-live { animation: none !important; } }
.ff-input { color-scheme: dark; }
`;

// ───────────────────────── small pieces ─────────────────────────

function Panel({
  title,
  icon,
  meta,
  focus,
  flash,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  meta?: React.ReactNode;
  focus?: boolean;
  flash?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`hud-panel mb-3 break-inside-avoid px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""}`}>
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#c5ee8a]">{icon}</span>
        <h3 className="hud-title min-w-0 flex-1 truncate">{title}</h3>
        {meta && <span className="hud-value hud-muted shrink-0 text-[10px]">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

function LockedPanel({ title, lesson, clause, spot, children }: { title: string; lesson: number; clause: string; spot: boolean; children?: React.ReactNode }) {
  return (
    <section className={`mb-3 break-inside-avoid rounded-[10px] border border-dashed px-3 py-2.5 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}>
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
        <h3 className="hud-label min-w-0 flex-1 truncate">{title}</h3>
        <span className="hud-label shrink-0 text-white/30">L{lesson}</span>
      </header>
      {children}
      <p className="mt-2 truncate font-mono text-[10px] text-white/40">
        {spot ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
        {clause}
      </p>
    </section>
  );
}

function GhostLines({ widths }: { widths: number[] }) {
  return (
    <div className="space-y-1.5">
      {widths.map((w, i) => (
        <div key={i} className="h-1.5 rounded-sm bg-white/[0.05]" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

/** One line explaining why a learner function gave no answer (nothing for locked / not yet run). */
function Trouble({ res }: { res: Res<unknown> }) {
  if (res.s === "missing") {
    return (
      <p className="flex items-start gap-1.5 text-[10.5px] leading-snug text-[#fbbf24]">
        <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden />
        <span className="min-w-0 break-words">
          <span className="font-mono">{res.fn}()</span> is not defined yet. Check its name.
        </span>
      </p>
    );
  }
  if (res.s === "error") {
    return (
      <p className="flex items-start gap-1.5 text-[10.5px] leading-snug text-[#fca5a5]">
        <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden />
        <span className="min-w-0 break-words font-mono">{res.message}</span>
      </p>
    );
  }
  if (res.s === "bad") {
    return (
      <p className="flex items-start gap-1.5 text-[10.5px] leading-snug text-[#fbbf24]">
        <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden />
        <span className="min-w-0 break-words">
          <span className="font-mono">{res.fn}()</span> {res.note}
        </span>
      </p>
    );
  }
  return null;
}

const hasTrouble = (res: Res<unknown>) => res.s === "missing" || res.s === "error" || res.s === "bad";

function Chip({ children, tone = "", title }: { children: React.ReactNode; tone?: string; title?: string }) {
  return (
    <span className={`hud-tag h-auto max-w-full py-0.5 font-mono text-[9.5px] font-medium ${tone}`} title={title}>
      <span className="truncate">{children}</span>
    </span>
  );
}

// ───────────────────────── the form ─────────────────────────

type Status = "idle" | "good" | "bad";

function judge(view: FieldView | undefined, value: string, touched: boolean): { status: Status; messages: string[] } {
  if (!view) return { status: "idle", messages: [] };
  const filled = value.trim() !== "";
  const show = touched || filled;
  if (view.rules.s === "ok") {
    const failing = view.rules.value.filter((r) => !r.ok).map((r) => r.message);
    if (failing.length === 0) return { status: filled ? "good" : "idle", messages: [] };
    return show ? { status: "bad", messages: failing } : { status: "idle", messages: [] };
  }
  const answered = view.checks.flatMap((c) => (c.res.s === "ok" ? [{ label: c.label, ok: c.res.value }] : []));
  if (answered.length === 0 || !filled) return { status: "idle", messages: [] };
  const failing = answered.filter((c) => !c.ok);
  return failing.length > 0 ? { status: "bad", messages: failing.map((c) => `Not yet: ${c.label}`) } : { status: "good", messages: [] };
}

const FORMAT_TEXT: Record<string, (v: string) => string> = {
  cleanText: (v) => `→ ${v}`,
  titleCase: (v) => `→ ${v}`,
  formatCardNumber: (v) => `→ ${v}`,
  maskCard: (v) => `stored as ${v}`,
  formatPhone: (v) => `→ ${v}`,
  normalizePostcode: (v) => `→ ${v}`,
  parseExpiry: (v) => `reads as ${v}`,
  redactCards: (v) => `→ ${v}`,
};

const FORMAT_REJECT: Record<string, string> = {
  formatPhone: "not a 10-digit phone number",
  normalizePostcode: "not a valid postcode for this country",
  parseExpiry: "not a month and year",
};

function hintsFor(view: FieldView | undefined, value: string): { kind: "ok" | "warn"; text: string }[] {
  if (!view || value.trim() === "") return [];
  const out: { kind: "ok" | "warn"; text: string }[] = [];
  for (const f of view.formats) {
    if (f.res.s !== "ok") continue;
    const v = f.res.value;
    if (v === null) {
      out.push({ kind: "warn", text: FORMAT_REJECT[f.fn] ?? "could not be read" });
    } else if (v !== value && v !== "") {
      out.push({ kind: "ok", text: (FORMAT_TEXT[f.fn] ?? ((x: string) => `→ ${x}`))(v) });
    }
  }
  return out;
}

const SCORE_LABEL = ["Too weak", "Weak", "Fair", "Good", "Strong"];

function PasswordMeter({ snap, unlocked }: { snap: Snapshot; unlocked: ReadonlySet<string> }) {
  const { pwRules, pwScore } = snap.a;
  const pw = snap.values.password;
  if (!unlocked.has("ff-password")) {
    return (
      <div className="mt-1.5 rounded-md border border-dashed border-white/12 px-2 py-1.5">
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-1 flex-1 rounded-full bg-white/[0.06]" />
          ))}
        </div>
        <p className="mt-1 truncate font-mono text-[10px] text-white/35">Strength meter · lesson 7</p>
      </div>
    );
  }
  const score = isOk(pwScore) ? pwScore.value : null;
  const clamped = score === null ? 0 : Math.max(0, Math.min(4, Math.round(score)));
  const color = clamped >= 3 ? "#c5ee8a" : clamped === 2 ? "#fbbf24" : "#f87171";
  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-2" role="meter" aria-label="Password strength" aria-valuemin={0} aria-valuemax={4} aria-valuenow={clamped}>
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className="h-1 flex-1 rounded-full transition-colors" style={{ background: pw && clamped >= i ? color : "rgba(255,255,255,0.08)" }} />
          ))}
        </div>
        <span className="hud-label w-16 shrink-0 whitespace-nowrap text-right" style={{ color: pw && score !== null ? color : undefined }}>
          {pw && score !== null ? SCORE_LABEL[clamped] : "—"}
        </span>
      </div>
      {isOk(pwRules) && (
        <ul className="mt-1.5 flex flex-wrap gap-1">
          {pwRules.value.map((r) => (
            <li
              key={r.id}
              className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9.5px] ${r.ok ? "border-[#c5ee8a]/40 text-[#e0f6c1]" : "border-white/12 text-white/50"}`}
            >
              {r.ok ? <Check className="h-2.5 w-2.5" aria-hidden /> : <span className="inline-block h-1.5 w-1.5 rounded-full border border-white/35" aria-hidden />}
              {r.label}
            </li>
          ))}
        </ul>
      )}
      <Trouble res={pwScore} />
      <Trouble res={pwRules} />
    </div>
  );
}

const INPUT_BASE =
  "ff-input w-full rounded-md border bg-black/40 px-2.5 py-1.5 text-[12.5px] text-white/90 outline-none transition-colors placeholder:text-white/25 focus:bg-black/55";

function FieldBox({ def, snap, sim, unlocked, spot }: { def: FieldDef; snap: Snapshot; sim: FormSim; unlocked: ReadonlySet<string>; spot: boolean }) {
  const view = snap.a.fields[def.name];
  const value = snap.values[def.name] ?? "";
  const touched = snap.touched.includes(def.name);
  const { status, messages: allMessages } = judge(view, value, touched);
  const pwList = def.name === "password" && unlocked.has("ff-password") && view?.rules.s === "ok";
  const messages = allMessages;
  const hints = hintsFor(view, value).filter((h) => h.kind === "ok" || messages.length === 0);
  const star = snap.a.required.s === "ok" && snap.a.required.value.includes(def.name);
  const problem = view ? [...view.formats.map((f) => f.res), ...view.checks.map((c) => c.res), view.rules].find(hasTrouble) : undefined;
  const border = status === "bad" ? "border-[#f87171]/55" : status === "good" ? "border-[#c5ee8a]/40" : "border-white/10 focus:border-white/35";
  const id = `ff-${def.name}`;
  const common = {
    id,
    name: def.name,
    value,
    placeholder: def.placeholder,
    "aria-invalid": status === "bad",
    "aria-describedby": `${id}-help`,
    onFocus: () => sim.setFocus(def.name),
    onBlur: () => {
      sim.touch(def.name);
      sim.setFocus(null);
    },
    className: `${INPUT_BASE} ${border}`,
    spellCheck: false,
    autoComplete: "off",
    dir: "auto" as const,
  };

  return (
    <div className={`min-w-0 rounded-lg ${spot ? "ring-1 ring-[#c5ee8a]/40 ring-offset-0" : ""}`}>
      <div className="mb-1 flex min-w-0 items-center gap-1.5">
        <label htmlFor={id} className="min-w-0 truncate text-[11px] font-medium text-white/75">
          {def.label}
          {star && (
            <span className="ml-0.5 text-[#c5ee8a]" title="required (your requiredFields())" aria-label="required">
              *
            </span>
          )}
        </label>
        <span className="ml-auto flex h-3.5 w-3.5 shrink-0 items-center justify-center">
          {status === "good" && <Check className="h-3.5 w-3.5 text-[#c5ee8a]" aria-label="looks good" />}
          {status === "bad" && <X className="h-3.5 w-3.5 text-[#f87171]" aria-label="needs attention" />}
        </span>
      </div>
      {def.type === "select" ? (
        <select {...{ ...common, placeholder: undefined }} onChange={(e) => sim.setValue(def.name, e.target.value)}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      ) : def.type === "textarea" ? (
        <textarea {...common} rows={2} onChange={(e) => sim.setValue(def.name, e.target.value)} />
      ) : (
        <input {...common} type={def.type === "password" ? "password" : "text"} inputMode={def.type === "tel" ? "tel" : undefined} onChange={(e) => sim.setValue(def.name, e.target.value)} />
      )}
      <div id={`${id}-help`} className="min-w-0">
        {def.name === "password" && <PasswordMeter snap={snap} unlocked={unlocked} />}
        {hints.map((h, i) => (
          <p key={`${i}:${h.text}`} className={`mt-1 min-w-0 break-words font-mono text-[10.5px] leading-snug ${h.kind === "ok" ? "text-[#d3f3a4]" : "text-[#fbbf24]"}`} dir="auto">
            {h.text}
          </p>
        ))}
        {messages.length > 0 && !pwList && (
          <ul className="mt-1 space-y-0.5" role="alert">
            {messages.map((m, i) => (
              <li key={`${i}:${m}`} className="flex min-w-0 items-start gap-1 text-[10.5px] leading-snug text-[#fca5a5]">
                <span aria-hidden className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-[#f87171]" />
                <span className="min-w-0 break-words">{m}</span>
              </li>
            ))}
          </ul>
        )}
        {problem && (
          <div className="mt-1">
            <Trouble res={problem} />
          </div>
        )}
      </div>
    </div>
  );
}

function Blueprint({ lesson }: { lesson: number }) {
  return (
    <div className="space-y-3">
      {SECTIONS.map((s) => (
        <div key={s.id} className="rounded-xl border border-dashed border-white/15 px-3 py-3">
          <div className="mb-2.5 flex items-center gap-2">
            <Lock className="h-3 w-3 text-white/35" aria-hidden />
            <span className="hud-label">{s.title}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {FIELDS.filter((f) => f.section === s.id).map((f) => (
              <div key={f.name} className={`rounded-md border border-dashed border-white/12 px-2 py-2 ${f.type === "textarea" ? "col-span-2" : ""}`}>
                <div className="h-1.5 w-2/3 rounded-sm bg-white/[0.08]" />
                <div className="mt-2 h-1.5 w-1/3 rounded-sm bg-white/[0.04]" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="px-1 text-center font-mono text-[10.5px] text-white/45">Pass lesson {lesson}, then Run, to bring the checkout form to life.</p>
    </div>
  );
}

// ───────────────────────── panels ─────────────────────────

function money(snap: Snapshot, cents: number): string {
  const t = snap.a.totalText;
  if (t.s === "ok" && cents === (snap.a.total.s === "ok" ? snap.a.total.value : NaN)) return t.value;
  return `${cents.toLocaleString("en-US")}¢`;
}

function TracePanel({ snap, flashing, focusFeature }: { snap: Snapshot; flashing: boolean; focusFeature: string | null }) {
  const name = snap.focus;
  const def = FIELDS.find((f) => f.name === name);
  const view = name ? snap.a.fields[name] : undefined;
  const spot = focusFeature === "ff-clean" || focusFeature === "ff-patterns" || focusFeature === "ff-rules";

  type Row = { key: string; ok: boolean | null; label: string; fn: string; lesson?: number; locked?: boolean; detail?: string };
  const rows: Row[] = [];
  const troubles: Res<unknown>[] = [];
  if (view) {
    if (view.rules.s === "ok") {
      for (const r of view.rules.value) rows.push({ key: `rule:${r.id}`, ok: r.ok, label: r.message, fn: r.id });
    } else {
      if (view.rules.s === "locked") rows.push({ key: "rules-locked", ok: null, label: "Rule table: every rule, every keystroke", fn: "checkField()", lesson: 11, locked: true });
      if (hasTrouble(view.rules)) troubles.push(view.rules);
      for (const c of view.checks) {
        if (c.res.s === "locked") rows.push({ key: c.fn, ok: null, label: c.label, fn: `${c.fn}()`, lesson: c.lesson, locked: true });
        else if (c.res.s === "ok") rows.push({ key: c.fn, ok: c.res.value, label: c.label, fn: `${c.fn}()` });
        else if (hasTrouble(c.res)) troubles.push(c.res);
      }
    }
    for (const f of view.formats) {
      if (f.res.s === "locked") rows.push({ key: f.fn, ok: null, label: "rewrites the text", fn: `${f.fn}()`, lesson: f.lesson, locked: true });
      else if (f.res.s === "ok") rows.push({ key: f.fn, ok: f.res.value !== null, label: f.res.value === null ? "cannot read it" : "rewrites the text", fn: `${f.fn}()`, detail: f.res.value === null ? "null" : JSON.stringify(f.res.value) });
      else if (hasTrouble(f.res)) troubles.push(f.res);
    }
  }
  const spec = snap.a.spec;

  return (
    <Panel
      title={def ? `Live trace · ${def.label}` : "Live trace"}
      icon={<ScanLine className="h-3.5 w-3.5" />}
      meta={snap.tick > 0 ? `keystroke ${snap.tick} · ${snap.calls} calls · ${snap.ms < 1 ? "<1" : snap.ms.toFixed(0)} ms` : undefined}
      focus={spot}
      flash={flashing}
    >
      {!def || !view ? (
        <p className="text-[11px] leading-snug text-white/50">Click into a field and type. Every function of yours that looks at it appears here, and flashes when its answer changes.</p>
      ) : (
        <>
          {spec.s === "ok" && spec.value !== undefined && spec.value !== null && typeof spec.value === "object" && (
            <p className="mb-1.5 truncate font-mono text-[10px] text-white/45" title="findField(fields, name)">
              findField → {def.type} · {def.required ? "required" : "optional"} · {def.section}
            </p>
          )}
          {rows.length === 0 && troubles.length === 0 ? (
            <p className="text-[11px] text-white/50">No lesson checks this field yet.</p>
          ) : (
            <ul className="space-y-1">
              {rows.map((r) => {
                const flash = !r.locked && view.changed.includes(r.key);
                return (
                  <li
                    key={flash ? `${r.key}:${snap.tick}` : r.key}
                    className={`flex min-w-0 items-start gap-2 rounded-md border px-2 py-1.5 ${r.locked ? "border-dashed border-white/12" : "border-white/[0.07] bg-white/[0.02]"} ${flash ? "ff-flash" : ""}`}
                  >
                    <span className="mt-px shrink-0">
                      {r.locked ? <Lock className="h-3 w-3 text-white/35" aria-hidden /> : r.ok ? <Check className="h-3 w-3 text-[#c5ee8a]" aria-label="passes" /> : <X className="h-3 w-3 text-[#f87171]" aria-label="fails" />}
                    </span>
                    <span className={`min-w-0 flex-1 break-words text-[11px] leading-snug ${r.locked ? "text-white/40" : r.ok ? "text-white/85" : "text-[#fca5a5]"}`}>
                      {r.label}
                      {r.detail && <span className="block truncate font-mono text-[10px] text-white/45" dir="auto">{r.detail}</span>}
                    </span>
                    <span className="hud-value hud-muted max-w-[40%] shrink-0 truncate text-[10px]" title={r.fn}>
                      {r.locked ? `L${r.lesson}` : r.fn}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {troubles.slice(0, 2).map((t, i) => (
            <div key={i} className="mt-1.5">
              <Trouble res={t} />
            </div>
          ))}
        </>
      )}
    </Panel>
  );
}

function OrderPanel({ snap, sim, flash, spot }: { snap: Snapshot; sim: FormSim; flash: boolean; spot: boolean }) {
  const { sorted, total, skus } = snap.a;
  const list = isOk(sorted) ? sorted.value : null;
  return (
    <Panel title="Order summary" icon={<ShoppingCart className="h-3.5 w-3.5" />} meta="sortByPrice · orderTotal" focus={spot} flash={flash}>
      {list ? (
        <ul className="space-y-1.5">
          {list.map((item) => {
            const qty = snap.qty[item.sku] ?? item.qty;
            return (
              <li key={item.sku} className="min-w-0 rounded-md border border-white/[0.07] bg-white/[0.02] px-2 py-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-white/85">{item.name}</span>
                  <span className="hud-value shrink-0 text-[11px] text-white/70">{money(snap, item.priceCents)}</span>
                </div>
                <div className="mt-1 flex min-w-0 items-center gap-1.5">
                  <span className="hud-label shrink-0">{item.sku}</span>
                  {item.addOns?.map((a) => (
                    <Chip key={a.sku} title={`add-on ${a.name}`}>+ {a.name}</Chip>
                  ))}
                  <span className="ml-auto flex shrink-0 items-center gap-1">
                    <button type="button" className="grid h-5 w-5 place-items-center rounded-full border border-white/12 text-white/70 hover:bg-white/10 disabled:opacity-30" disabled={qty <= 1} onClick={() => sim.setQty(item.sku, qty - 1)} aria-label={`One fewer ${item.name}`}>
                      <Minus className="h-2.5 w-2.5" />
                    </button>
                    <span className="hud-value w-4 text-center text-[11px]">{qty}</span>
                    <button type="button" className="grid h-5 w-5 place-items-center rounded-full border border-white/12 text-white/70 hover:bg-white/10 disabled:opacity-30" disabled={qty >= 9} onClick={() => sim.setQty(item.sku, qty + 1)} aria-label={`One more ${item.name}`}>
                      <Plus className="h-2.5 w-2.5" />
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <GhostLines widths={[86, 64, 74]} />
      )}
      <div className="mt-2 flex items-baseline gap-2 border-t border-white/[0.07] pt-2">
        <span className="hud-label">Total</span>
        <span className="hud-value hud-accent ml-auto text-sm">{isOk(total) ? money(snap, total.value) : "—"}</span>
      </div>
      {isOk(skus) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className="hud-label mr-1">SKUs</span>
          {skus.value.map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
        </div>
      )}
      <div className="mt-1.5 space-y-1">
        <Trouble res={sorted} />
        <Trouble res={total} />
        <Trouble res={skus} />
      </div>
    </Panel>
  );
}

function StatePanel({ snap, flash, spot }: { snap: Snapshot; flash: boolean; spot: boolean }) {
  const { compact, summary, safe } = snap.a;
  const entries = isOk(compact) ? Object.entries(compact.value) : [];
  const removed = isOk(compact) && isOk(safe) ? Object.keys(compact.value).filter((k) => !(k in safe.value)) : [];
  return (
    <Panel title="State inspector" icon={<FeatureIcon id="ff-state" className="h-3.5 w-3.5" />} meta="compact · withoutSecrets" focus={spot} flash={flash}>
      {isOk(summary) && (
        <p className="mb-2 min-w-0 break-words rounded-md bg-black/35 px-2 py-1.5 font-mono text-[10.5px] text-[#e0f6c1]" dir="auto">
          {summary.value}
        </p>
      )}
      {entries.length === 0 ? (
        <p className="text-[11px] text-white/50">{isOk(compact) ? "Nothing filled in yet. compact() drops the blanks." : "Waiting for compact()."}</p>
      ) : (
        <dl className="space-y-0.5 font-mono text-[10.5px]">
          {entries.slice(0, 9).map(([k, v]) => (
            <div key={k} className="flex min-w-0 gap-2">
              <dt className="w-20 shrink-0 truncate text-white/45">{k}</dt>
              <dd className={`min-w-0 flex-1 truncate ${removed.includes(k) ? "text-white/30 line-through" : "text-white/85"}`} dir="auto" title={removed.includes(k) ? "removed by withoutSecrets()" : v}>
                {removed.includes(k) ? "••••••" : v}
              </dd>
            </div>
          ))}
          {entries.length > 9 && <p className="hud-label pt-1">+{entries.length - 9} more</p>}
        </dl>
      )}
      {removed.length > 0 && (
        <p className="mt-2 text-[10.5px] text-white/55">
          <span className="hud-accent">withoutSecrets()</span> kept {removed.join(", ")} out of the copy that is safe to log.
        </p>
      )}
      <div className="mt-1.5 space-y-1">
        <Trouble res={compact} />
        <Trouble res={summary} />
        <Trouble res={safe} />
      </div>
    </Panel>
  );
}

function ErrorsPanel({ snap, flash, spot }: { snap: Snapshot; flash: boolean; spot: boolean }) {
  const view = snap.a.fields.expiry;
  const check = view?.checks.find((c) => c.fn === "checkExpiry");
  const stats = snap.a.stats;
  const value = snap.values.expiry;
  const res = check?.res;
  return (
    <Panel title="Error console" icon={<FeatureIcon id="ff-errors" className="h-3.5 w-3.5" />} meta="checkExpiry · attempt" focus={spot} flash={flash}>
      {value.trim() === "" ? (
        <p className="text-[11px] leading-snug text-white/50">Type a card expiry (try 08/28, 01/20 or soon) and watch checkExpiry() return data instead of crashing.</p>
      ) : res?.s === "ok" ? (
        res.value ? (
          <p className="flex items-center gap-1.5 text-[11px] text-[#e0f6c1]">
            <Check className="h-3.5 w-3.5" aria-hidden /> ok: valid expiry
          </p>
        ) : (
          <ErrorCard error={attemptError(snap)} />
        )
      ) : res ? (
        <Trouble res={res} />
      ) : null}
      {isOk(stats) && (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {([
            ["Started", stats.value.started],
            ["Finished", stats.value.finished],
            ["Failed", stats.value.failed],
          ] as const).map(([label, n]) => (
            <div key={label} className="min-w-0 rounded-md border border-white/[0.07] bg-white/[0.02] px-2 py-1">
              <div className="hud-label truncate">{label}</div>
              <div className={`hud-value text-sm ${label === "Failed" && n > 0 ? "hud-warning" : ""}`}>{n}</div>
            </div>
          ))}
        </div>
      )}
      {isOk(stats) && stats.value.started !== stats.value.finished && <p className="mt-1.5 text-[10.5px] text-[#fbbf24]">started and finished differ: is the counter updated in finally?</p>}
      <div className="mt-1.5">
        <Trouble res={stats} />
      </div>
    </Panel>
  );
}


function attemptError(snap: Snapshot): AttemptError | null {
  const e = snap.a.expiry;
  return e.s === "ok" && !e.value.ok ? e.value.error : null;
}

/** The error object a learner's attempt() returned, drawn like a real error report. */
function ErrorCard({ error }: { error: AttemptError | null }) {
  if (!error) return null;
  return (
    <div className="rounded-md border border-[#f87171]/40 bg-[#f87171]/[0.07] px-2.5 py-2" role="status">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="font-mono text-[11px] font-semibold text-[#fca5a5]">{error.name}</span>
        <Chip>code: {error.code}</Chip>
        {error.field && <Chip>field: {error.field}</Chip>}
      </div>
      <p className="mt-1 break-words text-[11.5px] text-white/90" dir="auto">
        {error.message}
      </p>
      {error.chain.length > 1 && (
        <ol className="mt-1.5 space-y-0.5 border-l border-white/15 pl-2 font-mono text-[10px] text-white/55">
          {error.chain.map((c, i) => (
            <li key={`${i}:${c}`} className="break-words">
              {i === 0 ? "" : "caused by "}
              {c}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const TEXTAREA =
  "ff-input w-full resize-y rounded-md border border-white/10 bg-black/40 p-2 font-mono text-[10.5px] leading-[1.5] text-white/85 outline-none focus:border-white/35";

function DraftPanel({ snap, sim, flash, spot }: { snap: Snapshot; sim: FormSim; flash: boolean; spot: boolean }) {
  const { text, res } = snap.draft;
  return (
    <Panel title="Saved draft" icon={<FeatureIcon id="ff-draft" className="h-3.5 w-3.5" />} meta="loadDraft()" focus={spot} flash={flash}>
      <p className="mb-1.5 text-[10.5px] leading-snug text-white/50">Drafts sit in storage where anything can happen to them. Try a few.</p>
      <div className="mb-1.5 flex flex-wrap gap-1">
        {DRAFT_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="hud-btn !h-6 !px-2 text-[10px]"
            onClick={() => {
              sim.setDraftText(p.text);
              sim.runDraft(p.text);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <textarea value={text} onChange={(e) => sim.setDraftText(e.target.value)} rows={5} spellCheck={false} aria-label="Saved draft JSON" className={TEXTAREA} dir="ltr" />
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <button type="button" className="hud-btn hud-btn-on !h-7 !px-3 text-[11px]" onClick={() => sim.runDraft()}>
          <FileJson className="h-3 w-3" />
          Load draft
        </button>
        {res?.s === "ok" && res.value.ok && Object.keys(res.value.value).length > 0 && (
          <button type="button" className="hud-btn !h-7 !px-3 text-[11px]" onClick={() => sim.applyDraft()}>
            Fill the form
          </button>
        )}
      </div>
      <div className="mt-2">
        {res === null ? (
          <p className="text-[11px] text-white/45">Nothing loaded yet.</p>
        ) : res.s === "ok" ? (
          res.value.ok ? (
            <div role="status">
              <p className="mb-1 text-[11px] text-[#e0f6c1]">
                Restored {Object.keys(res.value.value).length} field{Object.keys(res.value.value).length === 1 ? "" : "s"}; everything else was ignored.
              </p>
              <dl className="space-y-0.5 font-mono text-[10.5px]">
                {Object.entries(res.value.value).map(([k, v]) => (
                  <div key={k} className="flex min-w-0 gap-2">
                    <dt className="w-20 shrink-0 truncate text-white/45">{k}</dt>
                    <dd className="min-w-0 flex-1 truncate text-white/85" dir="auto" title={v}>
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <ErrorCard error={res.value.error} />
          )
        ) : (
          <Trouble res={res} />
        )}
      </div>
    </Panel>
  );
}

function PayloadPanel({ snap, flash, spot, sendable }: { snap: Snapshot; flash: boolean; spot: boolean; sendable: boolean }) {
  const p = snap.a.payload;
  const bytes = p.s === "ok" ? new Blob([p.value]).size : 0;
  return (
    <Panel title={sendable ? "Request body" : "JSON payload"} icon={<FeatureIcon id="ff-payload" className="h-3.5 w-3.5" />} meta={p.s === "ok" ? `${bytes.toLocaleString("en-US")} bytes` : "buildPayload()"} focus={spot} flash={flash}>
      {p.s === "ok" ? (
        <pre className="max-h-64 overflow-auto rounded-md bg-black/40 p-2 font-mono text-[10.5px] leading-[1.5] text-white/80" dir="ltr" tabIndex={0} aria-label="JSON payload">
          {p.value}
        </pre>
      ) : (
        <GhostLines widths={[40, 78, 60, 70, 30]} />
      )}
      <p className="mt-1.5 text-[10.5px] leading-snug text-white/50">No password, CVC or full card number ever appears here.</p>
      <div className="mt-1">
        <Trouble res={p} />
      </div>
    </Panel>
  );
}

type Json = Record<string, unknown>;
const isJson = (v: unknown): v is Json => !!v && typeof v === "object" && !Array.isArray(v);
const child = (parent: Json, key: string): Json => {
  const existing = parent[key];
  if (isJson(existing)) return existing;
  const made: Json = {};
  parent[key] = made;
  return made;
};

const TAMPERS: { id: string; label: string }[] = [
  { id: "cheap", label: "Cheap total" },
  { id: "sku", label: "Fake SKU" },
  { id: "qty", label: "Qty -3" },
  { id: "email", label: "Bad email" },
  { id: "script", label: "Script name" },
  { id: "broken", label: "Broken JSON" },
];

/** Edits the request the way an attacker with developer tools (or curl) would. */
function tamper(kind: string, text: string, fallback: string): string {
  if (kind === "broken") return `${(text || fallback).trimEnd().replace(/\}$/, "")},}`;
  let body: Json;
  try {
    const parsed: unknown = JSON.parse(text);
    body = isJson(parsed) ? parsed : {};
  } catch {
    try {
      const parsed: unknown = JSON.parse(fallback);
      body = isJson(parsed) ? parsed : {};
    } catch {
      body = {};
    }
  }
  const order = child(body, "order");
  const items = Array.isArray(order.items) ? order.items : [];
  const first = isJson(items[0]) ? items[0] : null;
  if (kind === "cheap") order.total = { cents: 1, currency: "USD" };
  if (kind === "sku" && first) first.sku = "FREE-LAPTOP";
  if (kind === "qty" && first) first.qty = -3;
  if (kind === "email") child(body, "customer").email = "not an email";
  if (kind === "script") child(body, "customer").fullName = '<img src=x onerror="alert(1)">';
  return JSON.stringify(body, null, 2);
}

function statusTone(status: number): string {
  if (status >= 200 && status < 300) return "border-[#c5ee8a]/50 bg-[#c5ee8a]/10 text-[#d3f3a4]";
  if (status === 422) return "border-[#fbbf24]/50 bg-[#fbbf24]/10 text-[#fbbf24]";
  return "border-[#f87171]/50 bg-[#f87171]/10 text-[#fca5a5]";
}

function ErrorList({ errors }: { errors: Record<string, string[]> | undefined }) {
  const entries = Object.entries(errors ?? {});
  if (entries.length === 0) return null;
  return (
    <ul className="mt-1.5 space-y-0.5 font-mono text-[10.5px]">
      {entries.slice(0, 12).map(([field, messages]) => (
        <li key={field} className="flex min-w-0 gap-2">
          <span className="w-20 shrink-0 truncate text-white/45">{field}</span>
          <span className="min-w-0 flex-1 break-words text-[#fca5a5]">{Array.isArray(messages) ? messages.join(" · ") : String(messages)}</span>
        </li>
      ))}
      {entries.length > 12 && <li className="hud-label">+{entries.length - 12} more fields</li>}
    </ul>
  );
}

function ServerPanel({ snap, sim, flash, spot }: { snap: Snapshot; sim: FormSim; flash: boolean; spot: boolean }) {
  const { text, res, echo } = snap.server;
  const payload = snap.a.payload.s === "ok" ? snap.a.payload.value : "";
  const out = res?.s === "ok" ? res.value : null;
  return (
    <Panel title="Server checkpoint" icon={<ShieldCheck className="h-3.5 w-3.5" />} meta="handleSubmit()" focus={spot} flash={flash}>
      <p className="mb-1.5 text-[10.5px] leading-snug text-white/55">
        You are the attacker now. Edit the request, skip every browser check, and POST it straight to <span className="font-mono text-white/80">handleSubmit()</span>.
      </p>
      <div className="mb-1.5 flex flex-wrap gap-1">
        {TAMPERS.map((t) => (
          <button key={t.id} type="button" className="hud-btn !h-6 !px-2 text-[10px]" onClick={() => sim.setServerText(tamper(t.id, text, payload))}>
            {t.label}
          </button>
        ))}
        <button type="button" className="hud-btn !h-6 !px-2 text-[10px]" onClick={() => sim.resetServerText()}>
          <RotateCcw className="h-2.5 w-2.5" />
          Reset
        </button>
      </div>
      <textarea value={text} onChange={(e) => sim.setServerText(e.target.value)} rows={7} spellCheck={false} aria-label="Request body to send to the server" className={TEXTAREA} dir="ltr" placeholder="Fill in the form to get a request body" />
      <button type="button" className="hud-btn hud-btn-on mt-1.5 !h-7 !px-3 text-[11px]" onClick={() => sim.sendToServer()}>
        <Send className="h-3 w-3" />
        POST to the server
      </button>
      {res && (
        <div className="mt-2" role="status">
          {out ? (
            <>
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span className={`inline-flex h-5 items-center rounded-full border px-2 font-mono text-[10.5px] font-semibold ${statusTone(out.status)}`}>{out.status}</span>
                <span className="text-[11px] text-white/70">{out.status === 201 ? "Created" : out.status === 422 ? "Rejected: validation failed" : out.status === 400 ? "Bad request" : "Response"}</span>
                {out.total && <Chip tone="hud-accent">total {out.total.cents.toLocaleString("en-US")}¢ (recomputed)</Chip>}
              </div>
              <ErrorList errors={out.errors} />
            </>
          ) : (
            <Trouble res={res} />
          )}
        </div>
      )}
      {echo && (
        <div className="mt-2 rounded-md border border-white/[0.07] bg-white/[0.02] px-2 py-1.5">
          <p className="hud-label mb-1">Stored name, shown safely</p>
          <p className="break-words font-mono text-[10.5px] text-white/85" dir="auto">
            {echo.raw}
          </p>
          <p className="hud-label mb-0.5 mt-1.5">escapeHtml() output</p>
          {echo.escaped.s === "ok" ? (
            <p className="break-words font-mono text-[10.5px] text-[#d3f3a4]" dir="auto">
              {echo.escaped.value}
            </p>
          ) : (
            <Trouble res={echo.escaped} />
          )}
        </div>
      )}
    </Panel>
  );
}

function FuzzPanel({ snap, sim }: { snap: Snapshot; sim: FormSim }) {
  const f = snap.fuzz;
  if (!f) return null;
  const clean = !f.running && f.crashes === 0 && f.slow === 0 && f.calls > 0;
  const noTargets = !f.running && f.calls === 0;
  return (
    <Panel title="Fuzz report" icon={<Bug className="h-3.5 w-3.5" />} meta={f.running ? `${f.done}/${f.total}` : `${f.calls} calls`}>
      <div className="hud-bar mb-2">
        <span style={{ width: `${f.total ? (f.done / f.total) * 100 : 0}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {([
          ["Calls", f.calls, ""],
          ["Crashed", f.crashes, f.crashes > 0 ? "hud-danger" : "hud-accent"],
          ["Slow (25ms+)", f.slow, f.slow > 0 ? "hud-warning" : "hud-accent"],
        ] as const).map(([label, n, tone]) => (
          <div key={label} className="min-w-0 rounded-md border border-white/[0.07] bg-white/[0.02] px-2 py-1">
            <div className="hud-label truncate">{label}</div>
            <div className={`hud-value text-sm ${tone}`}>{n}</div>
          </div>
        ))}
      </div>
      {clean && <p className="mt-2 text-[11px] text-[#e0f6c1]">Survived: emoji, right-to-left text, enormous strings, script tags, prototype keys, wrong types and more.</p>}
      {noTargets && <p className="mt-2 text-[11px] text-white/50">Nothing to attack yet. Pass a lesson and Run first.</p>}
      <ul className="mt-2 space-y-1">
        {f.rows
          .filter((r) => r.crashes > 0 || r.slow > 0)
          .slice(0, 8)
          .map((r) => (
            <li key={r.fn} className="min-w-0 rounded-md border border-white/[0.07] bg-white/[0.02] px-2 py-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/90">{r.fn}()</span>
                {r.crashes > 0 && <span className="hud-value hud-danger shrink-0 text-[10.5px]">{r.crashes} crashed</span>}
                {r.slow > 0 && <span className="hud-value hud-warning shrink-0 text-[10.5px]">{r.slow} slow</span>}
                <span className="hud-label shrink-0 text-white/30">L{r.lesson}</span>
              </div>
              {r.crashMessage && (
                <p className="mt-1 break-words text-[10.5px] leading-snug text-[#fca5a5]">
                  on <span className="font-mono">{r.crashOn}</span>: <span className="font-mono">{r.crashMessage}</span>
                </p>
              )}
              {!r.crashMessage && r.slowOn && (
                <p className="mt-1 text-[10.5px] text-[#fbbf24]">
                  slowest on <span className="font-mono">{r.slowOn}</span> ({r.maxMs.toFixed(0)} ms)
                </p>
              )}
            </li>
          ))}
      </ul>
      <p className="hud-label mb-1 mt-2.5">Try one in the form</p>
      <div className="flex flex-wrap gap-1">
        {FUZZ_TEXT.map((t) => (
          <button key={t.id} type="button" className="hud-btn !h-6 !px-2 text-[10px]" onClick={() => sim.setValue(snap.focus && snap.focus !== "country" ? snap.focus : "fullName", t.text)}>
            {t.label}
          </button>
        ))}
      </div>
    </Panel>
  );
}

function SubmitCard({ snap }: { snap: Snapshot }) {
  const res = snap.submit;
  if (!res) return null;
  if (res.s !== "ok") {
    return (
      <div className="mt-2">
        <Trouble res={res} />
      </div>
    );
  }
  const o = res.value;
  const where = o.stage === "server" ? "The server answered" : "Stopped in the browser";
  return (
    <div className={`mt-2 rounded-lg border px-3 py-2 ${o.ok ? "border-[#c5ee8a]/40 bg-[#c5ee8a]/[0.07]" : "border-[#fbbf24]/40 bg-[#fbbf24]/[0.06]"}`} role="status">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className={`inline-flex h-5 items-center rounded-full border px-2 font-mono text-[10.5px] font-semibold ${statusTone(o.status)}`}>{o.status}</span>
        <span className="min-w-0 text-[11.5px] text-white/90">
          {o.ok ? `Order placed${o.total ? `: ${o.total.cents.toLocaleString("en-US")}¢ charged to the test card` : ""}` : `${where}: not sent`}
        </span>
      </div>
      <ErrorList errors={o.errors} />
    </div>
  );
}

// ───────────────────────── scene ─────────────────────────

export default function FormForgeScene({ program, unlocked, focus, celebration, interactive, autoplay }: SceneProps) {
  const [sim] = useState(() => new FormSim());
  const snap = useSyncExternalStore(sim.subscribe, sim.getSnapshot, sim.getSnapshot);
  const unlockedKey = [...unlocked].sort().join(",");

  useEffect(() => {
    sim.attach(program, new Set(unlockedKey ? unlockedKey.split(",") : []));
  }, [sim, program, unlockedKey]);

  useEffect(() => () => sim.dispose(), [sim]);

  useEffect(() => {
    if (autoplay && program) sim.fill(SAMPLES[1].values);
  }, [sim, autoplay, program]);

  const on = (id: string) => unlocked.has(id);
  const alive = !!program && on("ff-form");
  const flashing = new Set(celebration?.features ?? []);
  const flash = (id: string) => flashing.has(id);
  const spot = (id: string) => focus === id;
  const canFuzz = interactive && !!program && on("ff-form") && snap.fuzz?.running !== true;

  const a = snap.a;
  const requiredCount = a.required.s === "ok" ? a.required.value.length : null;
  const unfilled =
    a.required.s === "ok" ? a.required.value.filter((n) => (snap.values[n] ?? "").trim() === "").length : null;
  const problemFields = a.problems.s === "ok" ? Object.keys(a.problems.value).length : null;
  const submitReady = on("ff-schema");
  const typeChips = a.typeCounts.s === "ok" ? Object.entries(a.typeCounts.value) : [];

  return (
    <div className="@container absolute inset-0 overflow-y-auto overscroll-contain">
      <style>{CSS}</style>
      <div className="px-3 pb-4 pt-12">
        {/* title + controls */}
        <div className="mb-2.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-0.5">
          <h2 className="hud-title min-w-0 truncate">Checkout · test mode</h2>
          {alive && (
            <span className="hud-label shrink-0">
              <span className="hud-value hud-accent">{snap.calls}</span> learner calls per keystroke
            </span>
          )}
          {interactive && alive && (
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              {SAMPLES.map((s) => (
                <button key={s.id} type="button" className="hud-btn !h-7 !px-2.5 text-[11px]" title={s.hint} onClick={() => sim.fill(s.values)}>
                  {s.label}
                </button>
              ))}
              <button type="button" className="hud-btn !h-7 !px-2.5 text-[11px]" onClick={() => sim.reset()} aria-label="Clear the form">
                <Eraser className="h-3 w-3" />
                Clear
              </button>
              <button type="button" className="hud-btn hud-btn-on !h-7 !px-2.5 text-[11px] disabled:opacity-40" disabled={!canFuzz} onClick={() => sim.fuzz()} aria-label="Fuzz it: throw hostile input at your code">
                <Bug className="h-3 w-3" />
                {snap.fuzz?.running ? "Fuzzing…" : "Fuzz it"}
              </button>
            </div>
          )}
        </div>

        {!program && on("ff-form") && (
          <p className="mb-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/70">Run your code to power the form. The boxes work, but nothing is checking them yet.</p>
        )}

        <div className="grid min-w-0 gap-3 @2xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          {/* ── the form ── */}
          <div className="min-w-0">
            {on("ff-form") ? (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (submitReady) sim.submit();
                  else sim.touchAll();
                }}
                noValidate
                aria-label="Checkout form"
              >
                {SECTIONS.map((section) => {
                  const fields = FIELDS.filter((f) => f.section === section.id);
                  return (
                    <fieldset key={section.id} className={`hud-panel min-w-0 !p-3 ${flash("ff-form") ? "pop-in" : ""}`}>
                      <legend className="sr-only">{section.title}</legend>
                      <div className="mb-2.5 flex min-w-0 items-baseline gap-2">
                        <h3 className="hud-title">{section.title}</h3>
                        <span className="hud-label truncate">{section.blurb}</span>
                      </div>
                      <div className="grid min-w-0 grid-cols-2 gap-x-2.5 gap-y-3">
                        {fields.map((f) => {
                          const wide = !["city", "postcode", "expiry", "cvc", "phone"].includes(f.name);
                          return (
                            <div key={f.name} className={`min-w-0 ${wide ? "col-span-2" : ""}`}>
                              <FieldBox def={f} snap={snap} sim={sim} unlocked={unlocked} spot={spot("ff-rules") && snap.focus === f.name} />
                            </div>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}

                <div className="hud-panel !p-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {requiredCount !== null && (
                      <Chip tone={a.ready.s === "ok" && a.ready.value ? "hud-accent" : ""}>
                        {a.ready.s === "ok" && a.ready.value ? "all required fields filled" : `${unfilled ?? requiredCount} of ${requiredCount} required to fill`}
                      </Chip>
                    )}
                    {problemFields !== null && <Chip tone={problemFields === 0 ? "hud-accent" : "hud-warning"}>{problemFields === 0 ? "no problems" : `${problemFields} field${problemFields === 1 ? " needs" : "s need"} attention`}</Chip>}
                    {typeChips.length > 0 && (
                      <span className="hidden min-w-0 truncate font-mono text-[10px] text-white/40 @md:inline" title="countByType(fields)">
                        {typeChips.map(([t, n]) => `${t}×${n}`).join(" · ")}
                      </span>
                    )}
                  </div>
                  {interactive && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <button type="submit" className={`hud-btn !h-8 !px-4 text-[12px] ${submitReady ? "hud-btn-on" : ""}`} disabled={!alive}>
                        {submitReady ? <Send className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        {submitReady ? "Place order" : on("ff-rules") ? "Check the form" : "Show problems"}
                      </button>
                      {!submitReady && <span className="font-mono text-[10px] text-white/40">Place order unlocks in lesson 14</span>}
                    </div>
                  )}
                  <SubmitCard snap={snap} />
                </div>
              </form>
            ) : (
              <Blueprint lesson={1} />
            )}
          </div>

          {/* ── the learner's functions at work ── */}
          <div className="min-w-0">
            <FuzzPanel snap={snap} sim={sim} />

            {on("ff-clean") ? (
              <TracePanel snap={snap} flashing={flash("ff-clean") || flash("ff-patterns") || flash("ff-rules")} focusFeature={focus} />
            ) : (
              <LockedPanel title="Live trace" lesson={4} clause="every function that reads a field" spot={spot("ff-clean")}>
                <GhostLines widths={[80, 56, 68]} />
              </LockedPanel>
            )}

            {on("ff-order") ? (
              <OrderPanel snap={snap} sim={sim} flash={flash("ff-order")} spot={spot("ff-order")} />
            ) : (
              <LockedPanel title="Order summary" lesson={2} clause="sort · reduce · flatMap" spot={spot("ff-order")}>
                <GhostLines widths={[88, 62, 74, 40]} />
              </LockedPanel>
            )}

            {on("ff-state") ? (
              <StatePanel snap={snap} flash={flash("ff-state")} spot={spot("ff-state")} />
            ) : (
              <LockedPanel title="State inspector" lesson={3} clause="destructuring · ?? · fromEntries" spot={spot("ff-state")}>
                <GhostLines widths={[70, 52, 84]} />
              </LockedPanel>
            )}

            {on("ff-errors") ? (
              <ErrorsPanel snap={snap} flash={flash("ff-errors")} spot={spot("ff-errors")} />
            ) : (
              <LockedPanel title="Error console" lesson={8} clause="class ValidationError · try / catch / finally" spot={spot("ff-errors")}>
                <GhostLines widths={[56, 78, 40]} />
              </LockedPanel>
            )}

            {on("ff-draft") ? (
              <DraftPanel snap={snap} sim={sim} flash={flash("ff-draft")} spot={spot("ff-draft")} />
            ) : (
              <LockedPanel title="Saved draft" lesson={9} clause="JSON.parse · reviver" spot={spot("ff-draft")}>
                <GhostLines widths={[66, 84, 48]} />
              </LockedPanel>
            )}

            {on("ff-payload") ? (
              <PayloadPanel snap={snap} flash={flash("ff-payload")} spot={spot("ff-payload")} sendable={on("ff-secure")} />
            ) : (
              <LockedPanel title="JSON payload" lesson={10} clause="JSON.stringify · replacer · toJSON" spot={spot("ff-payload")}>
                <GhostLines widths={[44, 76, 62, 70, 36]} />
              </LockedPanel>
            )}

            {on("ff-secure") ? (
              <ServerPanel snap={snap} sim={sim} flash={flash("ff-secure")} spot={spot("ff-secure")} />
            ) : (
              <LockedPanel title="Server checkpoint" lesson={13} clause="re-validate · recompute · escape" spot={spot("ff-secure")}>
                <GhostLines widths={[72, 54, 80]} />
              </LockedPanel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
