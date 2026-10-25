"use client";

import React, { useState } from "react";
import { FileText, FolderOpen, Keyboard, Power as PowerIcon, Save } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Icon, Note } from "./ui";

export interface PowerProps {
  /** Text the "Type" button types, one letter per press. Default "HELLO WORLD". */
  text?: string;
}

export interface PowerState {
  power: boolean;
  ram: string;
  disk: string | null;
  /** Times the power was switched off and on again. */
  cycles: number;
  /** The file was opened again after the latest power cut. */
  reopened: boolean;
  /** Letters lost in power cuts so far. */
  lost: number;
}

/** RAM vs storage: type into memory, save to storage, pull the plug and see what survives. */
export function Power({ props, onChange, revealed }: WidgetProps<PowerProps>) {
  const text = props.text ?? "HELLO WORLD";
  const [s, setS] = useState<PowerState>({ power: true, ram: "", disk: null, cycles: 0, reopened: false, lost: 0 });
  const [note, setNote] = useState("Type a few letters. They go into memory first.");
  const locked = Boolean(revealed);

  const apply = (next: PowerState, msg: string) => {
    setS(next);
    setNote(msg);
    onChange?.(next);
  };
  const type = () => {
    if (s.ram.length >= text.length) return apply(s, "That's the whole message.");
    const ram = s.ram + text[s.ram.length];
    apply({ ...s, ram }, `Typed “${text[s.ram.length] === " " ? "space" : text[s.ram.length]}”. It lives in memory (RAM) for now.`);
  };
  const save = () => apply({ ...s, disk: s.ram }, `Saved: storage now holds a copy of “${s.ram}”.`);
  const open = () => {
    if (s.disk === null) return apply(s, "There's no saved file to open.");
    apply({ ...s, ram: s.disk, reopened: s.cycles > 0 }, `Opened note.txt: storage copied “${s.disk}” back into memory.`);
  };
  const toggle = () => {
    if (s.power) {
      const unsaved = s.ram.startsWith(s.disk ?? "") ? s.ram.length - (s.disk ?? "").length : s.ram.length;
      const lost = s.lost + Math.max(0, unsaved);
      apply(
        { ...s, power: false, ram: "", reopened: false, lost },
        unsaved > 0 ? `Power off. Memory went blank: ${unsaved} unsaved letter${unsaved === 1 ? "" : "s"} gone for good. Storage kept its copy.` : "Power off. Memory went blank, but storage kept everything you saved.",
      );
    } else apply({ ...s, power: true, cycles: s.cycles + 1 }, "Power on. Memory starts out empty. Your file is still in storage: open it.");
  };

  const slots = Math.max(text.length, 6);
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Bank title="Memory (RAM)" icon="ram" on={s.power} sub={s.power ? "fast, forgets without power" : "no power: blank"}>
          <Letters text={s.power ? s.ram : ""} slots={slots} dim={!s.power} />
        </Bank>
        <Bank title="Storage (SSD)" icon="storage" on sub="slow, keeps data without power">
          {s.disk === null ? (
            <p className="py-2 text-center text-xs text-ink-3">No file yet</p>
          ) : (
            <div>
              <p className="mb-1 flex items-center gap-1 font-mono text-[11px] text-ink-2">
                <FileText className="h-3.5 w-3.5" /> note.txt
              </p>
              <Letters text={s.disk} slots={slots} />
            </div>
          )}
        </Bank>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Btn onClick={type} disabled={locked || !s.power}>
          <Keyboard className="h-4 w-4" /> Type
        </Btn>
        <Btn onClick={save} disabled={locked || !s.power || s.ram === ""}>
          <Save className="h-4 w-4" /> Save
        </Btn>
        <Btn onClick={open} disabled={locked || !s.power || s.disk === null}>
          <FolderOpen className="h-4 w-4" /> Open
        </Btn>
        <Btn primary={s.power} onClick={toggle} disabled={locked}>
          <PowerIcon className="h-4 w-4" /> {s.power ? "Power off" : "Power on"}
        </Btn>
      </div>
      <div className="mt-3">
        <Note tone={s.cycles > 0 || !s.power ? "accent" : "plain"}>{note}</Note>
      </div>
    </div>
  );
}

function Bank({ title, icon, on, sub, children }: { title: string; icon: string; on: boolean; sub: string; children: React.ReactNode }) {
  return (
    <div className={`min-w-0 rounded-xl border p-2.5 transition-colors sm:p-3 ${on ? "border-line bg-surface" : "border-dashed border-[var(--line-strong)] bg-surface-2"}`}>
      <div className="mb-2 flex items-center gap-1.5">
        <span className={on ? "text-brand" : "text-ink-3"}>
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <p className="truncate text-[0.8rem] font-semibold text-ink sm:text-sm">{title}</p>
      </div>
      <Caption className="mb-2 !normal-case !tracking-normal">{sub}</Caption>
      {children}
    </div>
  );
}

function Letters({ text, slots, dim }: { text: string; slots: number; dim?: boolean }) {
  return (
    <div className="grid grid-cols-4 gap-1 sm:grid-cols-6">
      {Array.from({ length: slots }, (_, i) => {
        const ch = text[i];
        return (
          <span
            key={i}
            className={`grid h-7 place-items-center rounded-md border font-mono text-[0.8rem] font-semibold ${
              ch !== undefined ? "border-[var(--brand)]/40 bg-tint text-ink" : dim ? "border-dashed border-[var(--line-strong)] text-ink-3" : "border-line bg-surface-2 text-ink-3"
            }`}
          >
            {ch === undefined ? "" : ch === " " ? "␣" : ch}
          </span>
        );
      })}
    </div>
  );
}

/** goal: { survived: n }: after a power cut, the file was opened again and memory holds at least n letters. */
export function checkPower(state: unknown, goal: Record<string, unknown>) {
  const s = state as PowerState | undefined;
  if (!s) return false;
  if (typeof goal.survived === "number") return s.power && s.cycles > 0 && s.reopened && s.ram.length >= goal.survived;
  if (typeof goal.lost === "number") return s.lost >= goal.lost;
  return false;
}
