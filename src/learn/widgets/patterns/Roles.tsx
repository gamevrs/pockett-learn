"use client";

import React, { useState } from "react";
import { ArrowDown } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";

/**
 * UML-lite role diagram: rows of boxes joined by labelled connectors, top to bottom.
 * Each pattern has a preset; tapping a box explains its job. Lessons can highlight the roles
 * being discussed, hide the pattern name (for "which pattern is this?" questions) or pass
 * their own rows.
 */

export interface RoleBox {
  id: string;
  /** Role name, e.g. "Strategy". */
  name: string;
  /** Example class in this lesson, e.g. "ShippingOption". Shown under the role name. */
  example?: string;
  kind?: "interface" | "class" | "client";
  members?: string[];
  /** What this role does, shown when tapped. */
  job: string;
  /** Draw as a stack of several (e.g. many concrete strategies). */
  many?: boolean;
}

export interface RoleRow {
  boxes: RoleBox[];
  /** Label on the arrow down to the next row, e.g. "calls". */
  link?: string;
}

export interface RolesProps {
  pattern?: keyof typeof PRESETS;
  /** Custom diagram instead of a preset. */
  rows?: RoleRow[];
  /** Box ids drawn with the accent outline. */
  highlight?: string[];
  /** Hide the pattern name above the diagram. */
  hideTitle?: boolean;
  /** Show only example names (not role names) so the pattern isn't given away. */
  examplesOnly?: boolean;
  /** Title shown above the diagram (defaults to the preset's). */
  title?: string;
  /** Box whose job is shown first. */
  initial?: string;
}

export interface RolesState {
  selected: string;
}

const PRESETS = {
  strategy: {
    title: "Strategy",
    rows: [
      {
        boxes: [{ id: "context", name: "Context", example: "Checkout", kind: "client", members: ["strategy", "shipping(kg)"], job: "Holds one strategy and asks it to do the work. Its code never mentions a specific option, so it never changes when options are added." }],
        link: "asks its strategy",
      },
      {
        boxes: [{ id: "strategy", name: "Strategy", example: "ShippingOption", kind: "interface", members: ["cost(kg)"], job: "The promise every option keeps: \"I have a cost(kg) method.\" The context only relies on this." }],
        link: "implemented by",
      },
      {
        boxes: [{ id: "concrete", name: "Concrete strategies", example: "Standard · Express · Pickup", kind: "class", many: true, members: ["cost(kg)"], job: "One small class per option. A new option is a new class here; nothing above it is edited." }],
      },
    ],
  },
  observer: {
    title: "Observer",
    rows: [
      {
        boxes: [{ id: "subject", name: "Subject", example: "Lighthouse", kind: "class", members: ["observers", "subscribe(o)", "unsubscribe(o)", "publish(value)"], job: "Keeps a list of whoever subscribed and, when something changes, calls update() on each one. It doesn't know what they are." }],
        link: "notifies each",
      },
      {
        boxes: [{ id: "observer", name: "Observer", example: "Listener", kind: "interface", members: ["update(value)"], job: "The one method a subscriber must have. That's all the subject relies on." }],
        link: "implemented by",
      },
      {
        boxes: [{ id: "concrete", name: "Concrete observers", example: "PhoneApp · Display · Logger", kind: "class", many: true, members: ["update(value)"], job: "Each reacts in its own way. They can subscribe and unsubscribe at runtime without touching the subject." }],
      },
    ],
  },
  factory: {
    title: "Factory",
    rows: [
      {
        boxes: [{ id: "client", name: "Client", example: "Editor", kind: "client", members: ['make_shape("circle")'], job: "Asks for a kind of thing by name and gets back something that follows the Shape interface. It never calls Circle() itself." }],
        link: "asks",
      },
      {
        boxes: [{ id: "factory", name: "Factory", example: "make_shape", kind: "class", members: ["create(kind)"], job: "The one place that knows which class goes with which name, and how to build it. Adding a kind means editing only here." }],
        link: "creates",
      },
      {
        boxes: [{ id: "product", name: "Product", example: "Shape", kind: "interface", members: ["area()", "draw()"], job: "What every built object can do. The client works with this, not with concrete classes." }],
        link: "implemented by",
      },
      {
        boxes: [{ id: "concrete", name: "Concrete products", example: "Circle · Square · Triangle", kind: "class", many: true, members: ["area()", "draw()"], job: "The real classes. Only the factory constructs them directly." }],
      },
    ],
  },
  singleton: {
    title: "Singleton",
    rows: [
      {
        boxes: [
          { id: "client", name: "Any code", example: "header.py", kind: "client", job: "Reaches the shared object through Settings.get_instance(). Nothing in its signature says it depends on it." },
          { id: "client2", name: "Any code", example: "billing.py", kind: "client", job: "Also reaches in. A change made here is seen by every other caller, for good or bad." },
        ],
        link: "get_instance()",
      },
      {
        boxes: [{ id: "singleton", name: "Singleton", example: "Settings", kind: "class", members: ["_instance", "get_instance()"], job: "Creates itself the first time it's asked, then hands out that same object forever. In effect, a global variable with a class around it." }],
      },
    ],
  },
  decorator: {
    title: "Decorator",
    rows: [
      {
        boxes: [{ id: "component", name: "Component", example: "Shipment", kind: "interface", members: ["cost()", "description()"], job: "The interface everyone shares: plain parcels and wrappers alike. That's why wrappers can wrap wrappers." }],
        link: "implemented by",
      },
      {
        boxes: [
          { id: "base", name: "Concrete component", example: "Parcel", kind: "class", members: ["cost()", "description()"], job: "The plain object at the centre. It knows nothing about label options." },
          { id: "decorator", name: "Decorator", example: "LabelOption", kind: "class", members: ["inner", "cost()", "description()"], job: "Holds an inner Shipment and is itself a Shipment. Its methods call the inner one and add a little on top." },
        ],
        link: "subclassed by",
      },
      {
        boxes: [{ id: "concrete", name: "Concrete decorators", example: "BubbleWrap · Tracking · Insurance", kind: "class", many: true, members: ["cost() = inner.cost() + extra"], job: "Each adds one thing. Stack them in any combination and order at runtime instead of writing a class per combination." }],
      },
    ],
  },
  adapter: {
    title: "Adapter",
    rows: [
      {
        boxes: [{ id: "client", name: "Client", example: "Checkout", kind: "client", members: ["gateway.pay(amount)"], job: "Written against the interface it wants. It never learns that an old bank is behind it." }],
        link: "calls",
      },
      {
        boxes: [{ id: "target", name: "Target", example: "PaymentGateway", kind: "interface", members: ["pay(amount)"], job: "The interface the client expects: pay() in dollars, returns True or False." }],
        link: "implemented by",
      },
      {
        boxes: [{ id: "adapter", name: "Adapter", example: "BankAdapter", kind: "class", members: ["bank", "pay(amount)"], job: "Looks like the target on the outside. Inside, it translates each call: renames, converts units, reshapes the result." }],
        link: "translates to",
      },
      {
        boxes: [{ id: "adaptee", name: "Adaptee", example: "LegacyBank", kind: "class", members: ["send_payment(cents, currency)"], job: "The existing code with the wrong shape. You can't (or shouldn't) change it." }],
      },
    ],
  },
  command: {
    title: "Command",
    rows: [
      {
        boxes: [{ id: "invoker", name: "Invoker", example: "History / Toolbar", kind: "client", members: ["run(cmd)", "undo()", "redo()"], job: "Triggers commands and keeps them in a list. It can undo, redo, queue or log them without knowing what any of them does." }],
        link: "calls",
      },
      {
        boxes: [{ id: "command", name: "Command", example: "Command", kind: "interface", members: ["execute()", "undo()"], job: "An action packed into an object: it can be stored, passed around and reversed." }],
        link: "implemented by",
      },
      {
        boxes: [{ id: "concrete", name: "Concrete commands", example: "TypeText · Uppercase", kind: "class", many: true, members: ["execute()", "undo()"], job: "Each remembers what it needs to reverse itself, like the text it added or the text before it." }],
        link: "act on",
      },
      {
        boxes: [{ id: "receiver", name: "Receiver", example: "Document", kind: "class", members: ["text"], job: "The object that really changes. It doesn't know about commands or history at all." }],
      },
    ],
  },
  state: {
    title: "State",
    rows: [
      {
        boxes: [{ id: "context", name: "Context", example: "Player", kind: "client", members: ["state", "play()", "pause()", "stop()"], job: "Holds the current state object and forwards every button press to it. No if/elif on a mode string." }],
        link: "forwards to",
      },
      {
        boxes: [{ id: "state", name: "State", example: "PlayerState", kind: "interface", members: ["play(p)", "pause(p)", "stop(p)"], job: "One method per event. Every state answers every event, even if the answer is \"do nothing\"." }],
        link: "implemented by",
      },
      {
        boxes: [{ id: "concrete", name: "Concrete states", example: "Stopped · Playing · Paused", kind: "class", many: true, members: ["play(p)", "pause(p)", "stop(p)"], job: "Each holds the behaviour for one stage, and decides which state comes next by setting p.state." }],
      },
    ],
  },
} satisfies Record<string, { title: string; rows: RoleRow[] }>;

export function Roles({ props, onChange, revealed }: WidgetProps<RolesProps>) {
  const preset = props.pattern ? PRESETS[props.pattern] : undefined;
  const rows: RoleRow[] = props.rows ?? preset?.rows ?? [];
  const all = rows.flatMap((r) => r.boxes);
  const [selected, setSelected] = useState<string | null>(props.initial ?? null);
  const highlight = props.highlight ?? [];
  const title = props.title ?? preset?.title;
  const picked = all.find((b) => b.id === selected);

  const pick = (id: string) => {
    if (revealed) return;
    setSelected(id);
    onChange?.({ selected: id } satisfies RolesState);
  };

  return (
    <div className="w-full max-w-md">
      {title && !props.hideTitle && <p className="mb-3 text-center font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{title} · roles</p>}
      <div className="flex flex-col items-center">
        {rows.map((row, ri) => (
          <React.Fragment key={ri}>
            <div className="flex w-full flex-wrap justify-center gap-2">
              {row.boxes.map((b) => (
                <Box key={b.id} box={b} on={selected === b.id} lit={highlight.includes(b.id)} examplesOnly={props.examplesOnly} onPick={() => pick(b.id)} locked={revealed} />
              ))}
            </div>
            {ri < rows.length - 1 && (
              <div className="flex flex-col items-center py-1 text-ink-3" aria-hidden>
                <span className="h-2.5 w-px bg-[var(--line-strong)]" />
                <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 font-mono text-[10.5px] text-ink-2">{row.link ?? ""}</span>
                <ArrowDown className="h-3.5 w-3.5" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-4 min-h-[4.5rem] rounded-xl border border-line bg-surface-2 p-3 text-sm" aria-live="polite">
        {picked ? (
          <div key={picked.id} className="pop-in">
            <p className="font-semibold text-ink">{props.examplesOnly ? (picked.example ?? picked.name) : picked.name}</p>
            <p className="mt-0.5 leading-relaxed text-ink-2">{picked.job}</p>
          </div>
        ) : (
          <p className="text-ink-3">Tap a box to see its job.</p>
        )}
      </div>
    </div>
  );
}

function Box({ box, on, lit, examplesOnly, onPick, locked }: { box: RoleBox; on: boolean; lit: boolean; examplesOnly?: boolean; onPick: () => void; locked?: boolean }) {
  const main = examplesOnly ? (box.example ?? box.name) : box.name;
  const sub = examplesOnly ? null : box.example;
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={on}
      disabled={locked}
      className={`relative min-h-11 min-w-[8.5rem] max-w-full flex-1 rounded-xl border px-3 py-2 text-left transition-colors disabled:cursor-default sm:flex-none ${
        on ? "border-ink bg-surface ring-1 ring-ink" : lit ? "border-[var(--brand)] bg-tint ring-1 ring-[var(--brand)]" : "border-line bg-surface hover:border-[var(--line-strong)]"
      } ${box.many ? "shadow-[3px_3px_0_-1px_var(--surface),3px_3px_0_0_var(--line-strong),6px_6px_0_-1px_var(--surface),6px_6px_0_0_var(--line)]" : ""}`}
    >
      {box.kind === "interface" && <span className="block font-mono text-[10px] italic text-ink-3">«interface»</span>}
      <span className="block text-[0.9rem] font-semibold leading-tight text-ink">{main}</span>
      {sub && <span className="mt-0.5 block font-mono text-[11px] text-ink-2">{sub}</span>}
      {box.members && box.members.length > 0 && (
        <span className="mt-1.5 block border-t border-line pt-1.5">
          {box.members.map((m) => (
            <span key={m} className="block font-mono text-[11px] leading-snug text-ink-2">
              {m}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

export function checkRoles(state: unknown, goal: Record<string, unknown>) {
  const sel = (state as RolesState | undefined)?.selected;
  if (Array.isArray(goal.selected)) return goal.selected.includes(sel);
  return typeof goal.selected === "string" && sel === goal.selected;
}
