"use client";

import React, { useEffect, useRef, useState, type RefObject } from "react";

/** Logical input state shared by keyboard and on-screen touch buttons. */
export class InputState {
  private down = new Set<string>();
  focused = false;
  isDown(action: string) {
    return this.down.has(action);
  }
  set(action: string, value: boolean) {
    if (value) this.down.add(action);
    else this.down.delete(action);
  }
  clear() {
    this.down.clear();
  }
}

/**
 * Keyboard input scoped to an element (usually the canvas) so typing in the code
 * editor never steers the car. `keyMap` maps KeyboardEvent.key (lowercased) to an action name.
 */
export function useInput(targetRef: RefObject<HTMLElement | null>, keyMap: Record<string, string>): InputState {
  const [input] = useState(() => new InputState());
  const keyMapRef = useRef(keyMap);

  useEffect(() => {
    keyMapRef.current = keyMap;
  });

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      const action = keyMapRef.current[e.key.toLowerCase()];
      if (!action) return;
      e.preventDefault();
      input.set(action, down);
    };
    const onDown = onKey(true);
    const onUp = onKey(false);
    const onFocus = () => {
      input.focused = true;
    };
    const onBlur = () => {
      input.focused = false;
      input.clear();
    };
    const onPointer = () => el.focus({ preventScroll: true });

    el.addEventListener("keydown", onDown);
    el.addEventListener("keyup", onUp);
    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);
    el.addEventListener("pointerdown", onPointer);
    return () => {
      el.removeEventListener("keydown", onDown);
      el.removeEventListener("keyup", onUp);
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("blur", onBlur);
      el.removeEventListener("pointerdown", onPointer);
    };
  }, [targetRef, input]);

  return input;
}

export interface TouchAction {
  action: string;
  label: string;
}

/** On-screen buttons that only appear on touch devices. Feed the same InputState as the keyboard. */
export function TouchControls({
  input,
  left,
  right,
  className = "",
}: {
  input: InputState;
  left: TouchAction[];
  right: TouchAction[];
  className?: string;
}) {
  const group = (items: TouchAction[]) => (
    <div className="flex gap-2">
      {items.map((t) => (
        <button
          key={t.action}
          type="button"
          aria-label={t.action}
          onPointerDown={(e) => {
            e.preventDefault();
            input.set(t.action, true);
          }}
          onPointerUp={() => input.set(t.action, false)}
          onPointerLeave={() => input.set(t.action, false)}
          onPointerCancel={() => input.set(t.action, false)}
          className="grid h-14 w-14 select-none place-items-center rounded-full border-2 border-white/30 bg-white/10 text-xl font-bold text-white backdrop-blur active:bg-white/30"
          style={{ touchAction: "none" }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
  return (
    <div
      className={`pointer-events-none absolute inset-x-3 bottom-14 hidden items-end justify-between [@media(pointer:coarse)]:flex ${className}`}
    >
      <div className="pointer-events-auto">{group(left)}</div>
      <div className="pointer-events-auto">{group(right)}</div>
    </div>
  );
}
