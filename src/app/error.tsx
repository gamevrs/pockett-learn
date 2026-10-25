"use client";

import React from "react";
import { TriangleAlert } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto grid w-full max-w-3xl flex-1 place-items-center px-4 py-24 text-center">
      <div>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-ink-2"><TriangleAlert className="h-5 w-5" /></span>
        <h1 className="font-display mt-4 text-3xl sm:text-4xl">Something went wrong on our side</h1>
        <p className="mt-3 text-ink-2">Your progress is safe. Try again, and if it keeps happening, reload the page.</p>
        <button onClick={reset} className="btn btn-primary mt-8">Try again</button>
      </div>
    </div>
  );
}
