"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useIsNativeApp } from "@/lib/native/app";
import { readReminder, setReminder, type ReminderPrefs } from "@/lib/native/reminder";
import { currentStreak, getProgress, useProgress } from "@/data/progress/store";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { SoundControl } from "@/components/audio/SoundControl";

/**
 * The Account tab's lower half in the iOS and Android apps, where the web's navbar and footer controls live once the tab
 * bar replaces them: your progress, theme, sound, the daily reminder, and the brand and legal pages.
 * Only rendered inside the apps.
 */
export function AppSettings() {
  const native = useIsNativeApp();
  if (!native) return null;
  return <Settings />;
}

const ROW = "flex min-h-14 items-center justify-between gap-4 px-4 py-2";

function Settings() {
  const progress = useProgress();
  const streak = currentStreak(progress);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="mt-10 space-y-8">
      <section aria-labelledby="app-progress">
        <h2 id="app-progress" className="eyebrow">
          Progress
        </h2>
        <div className="card mt-3">
          <Link href="/dashboard" prefetch={false} className={ROW}>
            <span className="text-sm font-semibold">Your progress</span>
            <span className="flex items-center gap-2 text-sm tabular-nums text-ink-3">
              {progress.xp} XP · {streak}-day streak
              <ChevronRight className="h-4 w-4" aria-hidden />
            </span>
          </Link>
        </div>
      </section>

      <section aria-labelledby="app-settings">
        <h2 id="app-settings" className="eyebrow">
          Settings
        </h2>
        <div className="card mt-3 divide-y divide-line">
          <div className={ROW}>
            <span className="text-sm font-semibold" id="app-theme">
              Theme
            </span>
            <div role="radiogroup" aria-labelledby="app-theme" className="flex rounded-full bg-surface-2 p-1">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={theme === t}
                  onClick={() => theme !== t && toggleTheme()}
                  className={`min-h-9 rounded-full px-4 text-sm font-medium capitalize ${theme === t ? "bg-ink text-bg" : "text-ink-2"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className={ROW}>
            <span className="text-sm font-semibold">Sound</span>
            <SoundControl variant="navbar" />
          </div>
          <Reminder />
        </div>
      </section>

      <section aria-labelledby="app-about">
        <h2 id="app-about" className="eyebrow">
          About
        </h2>
        <div className="card mt-3 divide-y divide-line">
          {[
            { href: "/brand", label: "Brand and press" },
            { href: "/privacy", label: "Privacy" },
            { href: "/terms", label: "Terms" },
          ].map((l) => (
            <Link key={l.href} href={l.href} prefetch={false} className={ROW}>
              <span className="text-sm font-semibold">{l.label}</span>
              <ChevronRight className="h-4 w-4 text-ink-3" aria-hidden />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

function Reminder() {
  const [prefs, setPrefs] = useState<ReminderPrefs>(readReminder);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  const apply = async (next: ReminderPrefs) => {
    setBusy(true);
    try {
      const res = await setReminder(next, getProgress());
      setPrefs(res.prefs);
      setDenied(res.denied);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <label className={`${ROW} cursor-pointer`}>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">Daily reminder</span>
          <span className="block text-xs text-ink-3">
            {denied ? "Notifications are off for pockett. Turn them on in Settings, then try again." : "A nudge on days you haven't done a lesson."}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          className="app-switch"
          checked={prefs.enabled}
          aria-checked={prefs.enabled}
          disabled={busy}
          onChange={(e) => void apply({ ...prefs, enabled: e.target.checked })}
        />
      </label>
      {prefs.enabled && (
        <label className={ROW}>
          <span className="text-sm font-semibold">Time</span>
          <input
            type="time"
            className="min-h-9 rounded-full bg-surface-2 px-4 text-base tabular-nums"
            value={`${pad(prefs.hour)}:${pad(prefs.minute)}`}
            disabled={busy}
            onChange={(e) => {
              const [h, m] = e.target.value.split(":").map(Number);
              if (Number.isInteger(h) && Number.isInteger(m)) void apply({ ...prefs, hour: h, minute: m });
            }}
          />
        </label>
      )}
    </>
  );
}
