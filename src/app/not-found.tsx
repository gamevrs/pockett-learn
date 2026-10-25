import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto grid w-full max-w-3xl flex-1 place-items-center px-4 py-24 text-center">
      <div>
        <p className="font-mono text-sm text-ink-3">404</p>
        <h1 className="font-display mt-2 text-3xl sm:text-4xl">Page not found</h1>
        <p className="mt-3 text-ink-2">The page you asked for doesn&apos;t exist or has moved.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/projects" className="btn btn-primary">Browse projects</Link>
          <Link href="/" className="btn">Home</Link>
        </div>
      </div>
    </div>
  );
}
