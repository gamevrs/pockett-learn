import React from "react";
import Link from "next/link";
import { COPYRIGHT, EFFECTIVE_DATE } from "@/lib/legal";

// Typography for the prose inside the sections (paragraphs, lists, links, code).
const BODY =
  "[&_p]:mt-3 [&_p]:leading-7 [&_p]:text-ink-2 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:text-ink-2 " +
  "[&_li]:leading-7 [&_li]:marker:text-ink-3 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink " +
  "[&_strong]:font-semibold [&_strong]:text-ink [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:opacity-80 " +
  "[&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

/** Long-form layout shared by the Privacy Policy and Terms of Service. */
export function LegalPage({
  title,
  intro,
  sections,
  other,
}: {
  title: string;
  intro: React.ReactNode;
  sections: LegalSection[];
  other: { href: string; label: string };
}) {
  return (
    <article className="mx-auto w-full max-w-[720px] px-5 pb-24 pt-14 sm:pt-20">
      <header>
        <p className="eyebrow">Legal</p>
        <h1 className="font-display mt-3 text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-4 font-mono text-sm text-ink-3">Effective {EFFECTIVE_DATE}</p>
        <div className={`${BODY} mt-6 text-lg`}>{intro}</div>
      </header>

      <nav aria-label={`${title} contents`} className="mt-10 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <p className="eyebrow">Contents</p>
        <ol className="mt-2 grid gap-x-8 text-[0.95rem] sm:mt-3 sm:grid-cols-2 sm:gap-y-1.5">
          {sections.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2.5 sm:items-baseline">
              <span className="w-5 shrink-0 text-right font-mono text-ink-3">{i + 1}</span>
              <a className="inline-flex min-h-10 min-w-10 items-center text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink sm:min-h-0 sm:min-w-0" href={`#${s.id}`}>
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className={`${BODY} mt-4`}>
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-24 border-t border-line pt-8 mt-10 first:mt-6">
            <h2 className="font-display text-2xl sm:text-[1.75rem]">
              <span className="mr-2 font-mono text-base text-ink-3">{i + 1}.</span>
              {s.title}
            </h2>
            {s.body}
          </section>
        ))}
      </div>

      <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-sm text-ink-3">
        <p>{COPYRIGHT}. All rights reserved.</p>
        <Link href={other.href} prefetch={false} className="inline-flex min-h-10 items-center text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
          {other.label}
        </Link>
      </footer>
    </article>
  );
}
