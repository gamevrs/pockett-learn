"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copies `text` to the clipboard and flips to a check mark for a moment. */
export function CopyButton({ text, label, className = "" }: { text: string; label: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        navigator.clipboard?.writeText(text).then(
          () => {
            setDone(true);
            window.setTimeout(() => setDone(false), 1400);
          },
          () => {},
        );
      }}
      className={`inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 font-mono text-xs max-sm:min-h-10 text-ink-2 transition-colors hover:border-line-strong hover:text-ink ${className}`}
    >
      {done ? <Check className="h-3.5 w-3.5 text-brand" /> : <Copy className="h-3.5 w-3.5" />}
      <span aria-live="polite">{done ? "Copied" : text}</span>
    </button>
  );
}

/** A copy button that shows a fixed caption instead of the copied text (for paragraphs). */
export function CopyTextButton({ text, caption }: { text: string; caption: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(
          () => {
            setDone(true);
            window.setTimeout(() => setDone(false), 1400);
          },
          () => {},
        );
      }}
      className="btn btn-sm"
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span aria-live="polite">{done ? "Copied" : caption}</span>
    </button>
  );
}
