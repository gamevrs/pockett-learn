import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { Download } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { CopyButton, CopyTextButton } from "@/components/brand/CopyButton";

export const metadata: Metadata = {
  title: "Brand & press",
  description: "The pockett logo, colours, typography and press kit. Download the full brand kit or individual assets.",
};

/** Set to a real address to show a "Contact" button; left empty until the press contact is confirmed. */
const PRESS_CONTACT = "support@pockett.ai";

const VARIANTS = [
  { id: "light", label: "Full colour, light", bg: "#f6f5f1", note: "For light backgrounds" },
  { id: "dark", label: "Full colour, dark", bg: "#0a0a0a", note: "For dark backgrounds" },
  { id: "black", label: "One colour, black", bg: "#ffffff", note: "Single-colour print" },
  { id: "white", label: "One colour, white", bg: "#1a1a1a", note: "Photos and colour fields" },
] as const;

const ASSETS = [
  { id: "mark", title: "Mark", file: "pockett-mark", png: (v: string) => `/brand/png/mark/pockett-mark-${v}-512.png`, w: 96, h: 96, blurb: "The envelope and command line on their own. Icons, avatars and anywhere a square fits." },
  { id: "horizontal", title: "Horizontal lockup", file: "pockett-lockup-horizontal", png: (v: string) => `/brand/png/lockup-horizontal/pockett-lockup-horizontal-${v}-512.png`, w: 200, h: 51, blurb: "The default logo. Mark and wordmark on one line." },
  { id: "stacked", title: "Stacked lockup", file: "pockett-lockup-stacked", png: (v: string) => `/brand/png/lockup-stacked/pockett-lockup-stacked-${v}-512.png`, w: 150, h: 115, blurb: "Centred layouts, covers and posters." },
] as const;

const COLORS = [
  { name: "Pastel lime", hex: "#c5ee8a", rgb: "197, 238, 138", hsl: "85, 75%, 74%", use: "Envelope body, primary buttons. Always a fill, with ink on top.", dark: false },
  { name: "Ink", hex: "#0a0a0a", rgb: "10, 10, 10", hsl: "0, 0%, 4%", use: "The >_ prompt, text on pastel (15.1:1), dark backgrounds.", dark: true },
  { name: "Olive", hex: "#4b7411", rgb: "75, 116, 17", hsl: "85, 74%, 26%", use: "Accessible accent for text and lines on light surfaces (5.1:1 on the page).", dark: true },
  { name: "Deep olive", hex: "#354e12", rgb: "53, 78, 18", hsl: "85, 63%, 19%", use: "Pressed and emphasis states on light surfaces.", dark: true },
  { name: "Soft lime", hex: "#d3f3a4", rgb: "211, 243, 164", hsl: "84, 77%, 80%", use: "Hover state for the pastel.", dark: false },
] as const;

const GRADIENT = [
  { name: "Fold", hex: "#4a771d", at: "0%", small: "#3f6a16", dark: true },
  { name: "Mid", hex: "#7eaa45", at: "40%", small: "#5f8d2c at 50%", dark: false },
  { name: "Body", hex: "#c5ee8a", at: "82%", small: "#c5ee8a at 92%", dark: false },
] as const;

const NEUTRALS = [
  { name: "Page", light: "#f6f5f1", dark: "#0a0a0a" },
  { name: "Surface", light: "#ffffff", dark: "#121212" },
  { name: "Text", light: "#121211", dark: "#fafafa" },
  { name: "Secondary text", light: "#4a4943", dark: "#a3a3a3" },
  { name: "Tertiary text", light: "#67655f", dark: "#8a8a8a" },
] as const;

const BOILERPLATE_50 =
  "pockett is a free learning platform where people learn to code by building real, working projects. Every lesson brings a live demo to life, so learners see their code do something from day one and get instant feedback along the way. It takes beginners all the way to professional-grade software.";
const BOILERPLATE_100 =
  "pockett is a free learning platform where people learn to code by building real, working projects. Every lesson brings a live demo to life, so learners see their code do something from day one and get instant feedback along the way. Courses and projects span Python, JavaScript, SQL and more, and are designed as a path: start with the foundations, build projects that look and behave like the real thing, and finish with the habits of a professional engineer. There is no paywall, ever. pockett exists to make learning to code feel like making something real, not studying for it.";

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line py-12 sm:py-14">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="font-display mt-3 text-balance text-[1.9rem] sm:text-[2.25rem]">{title}</h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Swatch({ hex, label, dark, children }: { hex: string; label: string; dark: boolean; children?: React.ReactNode }) {
  return (
    <div
      className="flex h-28 items-end justify-between rounded-xl border border-line p-3"
      style={{ background: hex, color: dark ? "#fafafa" : "#0a0a0a" }}
    >
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

function Example({ ok, caption, children }: { ok: boolean; caption: string; children: React.ReactNode }) {
  return (
    <figure className="m-0">
      <div className="relative grid h-36 place-items-center overflow-hidden rounded-xl border border-line bg-surface">
        {children}
        <span
          className={`absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${ok ? "bg-primary text-primary-ink" : "bg-ink text-bg"}`}
          aria-hidden
        >
          {ok ? "✓" : "✕"}
        </span>
      </div>
      <figcaption className="mt-2 text-sm text-ink-2">
        <span className="sr-only">{ok ? "Do: " : "Don't: "}</span>
        {caption}
      </figcaption>
    </figure>
  );
}

export default function BrandPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      {/* ── hero ── */}
      <p className="eyebrow">Brand &amp; press</p>
      <h1 className="font-display mt-3 max-w-3xl text-balance text-[2.5rem] sm:text-[3.25rem]">The pockett brand kit</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
        Logos, colours, type and a short press boilerplate. Everything here is free to use to write about or link to pockett, within the
        guidelines below.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <a className="btn btn-primary" href="/brand/pockett-brand-kit.zip" download>
          <Download className="h-4 w-4" /> Download the brand kit (.zip)
        </a>
        <a className="btn" href="#logo">Browse the logos</a>
        {PRESS_CONTACT ? <a className="btn btn-ghost" href={`mailto:${PRESS_CONTACT}`}>Contact the team</a> : null}
      </div>
      <p className="mt-3 text-sm text-ink-3">SVG and PNG logos, social images and the brand guide. About 1 MB.</p>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        <div className="grid h-56 place-items-center rounded-2xl border border-line" style={{ background: "#f6f5f1" }}>
          <Image src="/brand/svg/pockett-lockup-horizontal-light.svg" alt="pockett logo on a light background" width={280} height={71} unoptimized priority />
        </div>
        <div className="grid h-56 place-items-center rounded-2xl border border-line" style={{ background: "#0a0a0a" }}>
          <Image src="/brand/svg/pockett-lockup-horizontal-dark.svg" alt="pockett logo on a dark background" width={280} height={71} unoptimized priority />
        </div>
      </div>

      {/* ── logo downloads ── */}
      <Section id="logo" eyebrow="Logo" title="Download the logo">
        <div className="space-y-12">
          {ASSETS.map((a) => (
            <div key={a.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h3 className="text-lg font-semibold tracking-tight">{a.title}</h3>
                <p className="text-sm text-ink-2">{a.blurb}</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {VARIANTS.map((v) => (
                  <div key={v.id} className="overflow-hidden rounded-xl border border-line bg-surface">
                    <div className="grid h-40 place-items-center" style={{ background: v.bg }}>
                      <Image src={`/brand/svg/${a.file}-${v.id}.svg`} alt={`${a.title}, ${v.label.toLowerCase()}`} width={a.w} height={a.h} unoptimized />
                    </div>
                    <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{v.label}</p>
                        <p className="truncate text-xs text-ink-3">{v.note}</p>
                      </div>
                      <div className="flex shrink-0 gap-1.5 font-mono text-xs">
                        <a className="rounded-md border border-line px-2 py-1 text-ink-2 hover:border-line-strong hover:text-ink" href={`/brand/svg/${a.file}-${v.id}.svg`} download aria-label={`Download ${a.title}, ${v.label}, SVG`}>SVG</a>
                        <a className="rounded-md border border-line px-2 py-1 text-ink-2 hover:border-line-strong hover:text-ink" href={a.png(v.id)} download aria-label={`Download ${a.title}, ${v.label}, PNG`}>PNG</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-ink-3">
          PNGs here are 512 px with a transparent background. The zip also has the mark at 16, 32, 64, 128, 256, 512 and 1024 px, and the
          lockups at 128 to 1024 px wide.
        </p>

        <h3 className="mt-12 text-lg font-semibold tracking-tight">Social images</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1.9fr_1fr]">
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <Image src="/brand/social/pockett-og-1200x630.png" alt="pockett link preview image" width={1200} height={630} unoptimized className="block h-auto w-full" />
            <div className="flex items-center justify-between px-3 py-2.5 text-sm">
              <span className="font-medium">Link preview <span className="font-normal text-ink-3">1200 x 630</span></span>
              <a className="rounded-md border border-line px-2 py-1 font-mono text-xs text-ink-2 hover:border-line-strong hover:text-ink" href="/brand/social/pockett-og-1200x630.png" download>PNG</a>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <Image src="/brand/social/pockett-avatar-1080.png" alt="pockett profile picture" width={1080} height={1080} unoptimized className="block h-auto w-full" />
            <div className="flex items-center justify-between px-3 py-2.5 text-sm">
              <span className="font-medium">Avatar <span className="font-normal text-ink-3">1080 x 1080</span></span>
              <a className="rounded-md border border-line px-2 py-1 font-mono text-xs text-ink-2 hover:border-line-strong hover:text-ink" href="/brand/social/pockett-avatar-1080.png" download>PNG</a>
            </div>
          </div>
        </div>
      </Section>

      {/* ── construction ── */}
      <Section id="construction" eyebrow="Construction" title="An envelope with a command line in it">
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,320px)_1fr]">
          <div className="grid aspect-square place-items-center rounded-2xl border border-line bg-surface p-8">
            <svg viewBox="0 0 32 32" className="h-full w-full" role="img" aria-label="Construction diagram of the pockett mark">
              <rect x="3" y="3" width="26" height="26" rx="6" fill="var(--primary)" opacity="0.35" />
              <g stroke="var(--ink-3)" strokeWidth="0.12" strokeDasharray="0.5 0.5" fill="none">
                <path d="M3 12.2H29M3 16H29M16 3V29M3 29H29M3 3H29" />
                <circle cx="16" cy="12.2" r="0.6" />
              </g>
              <path d="M3.5 6.6A6 6 0 0 1 9 3H23A6 6 0 0 1 28.5 6.6L17.64 11.46Q16 12.6 14.36 11.46Z" fill="var(--ink-3)" opacity="0.35" />
              <g fill="none" stroke="var(--ink-2)" strokeWidth="0.35" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.8 15.4 15 19.5 9.8 23.6M17.4 23.8H22.6" />
              </g>
              <text x="29.4" y="12.5" fontSize="1.1" fill="var(--ink-2)" fontFamily="var(--font-mono)">tip</text>
            </svg>
          </div>
          <div className="space-y-4 text-ink-2">
            <p><strong className="text-ink">Envelope.</strong> A rounded square with a short, closed flap: letters, delivered. Something real is on its way to you.</p>
            <p><strong className="text-ink">Command line.</strong> The <code className="font-mono text-ink">&gt;_</code> prompt sits in the body, centred in the space below the flap tip. This is code.</p>
            <p><strong className="text-ink">Flap.</strong> A V filled with a gradient, deepest olive along the fold and fading to the body colour at the top corners until it melts into the envelope. No outlines; tone does the drawing.</p>
            <p><strong className="text-ink">Wordmark.</strong> &ldquo;pockett&rdquo; in Geist SemiBold, lower case, tracking &minus;0.02em, supplied as outlines. Do not retype it.</p>
            <p className="text-sm text-ink-3">The mark is drawn on a 32-unit grid. The envelope is 26 units square with a 6-unit corner radius.</p>
          </div>
        </div>
      </Section>

      {/* ── clear space and sizes ── */}
      <Section id="space" eyebrow="Space and size" title="Clear space and minimum sizes">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <div className="grid h-56 place-items-center rounded-2xl border border-line bg-surface">
              <div className="relative p-[28px]" style={{ outline: "1px dashed var(--line-strong)", outlineOffset: 0 }}>
                <div className="flex items-center gap-[10px]">
                  <div style={{ outline: "1px dashed var(--ink-3)", outlineOffset: 0 }}>
                    <LogoMark size={56} detail="full" />
                  </div>
                  <span className="font-semibold leading-none tracking-[-0.02em]" style={{ fontSize: 37 }}>pockett</span>
                </div>
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-ink-3">½M</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-ink-2">
              Keep a clear zone of <strong className="text-ink">half the mark&rsquo;s width</strong> (½M) on every side. Nothing enters it.
            </p>
          </div>
          <div>
            <div className="flex h-56 items-end gap-8 rounded-2xl border border-line bg-surface px-8 pb-8">
              {[16, 24, 32, 48, 64].map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <LogoMark size={s} />
                  <span className="font-mono text-[11px] text-ink-3">{s}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-ink-2">
              Smallest sizes: mark <strong className="text-ink">16 px</strong> (5 mm in print), horizontal lockup <strong className="text-ink">96 px</strong> wide
              (25 mm), stacked lockup <strong className="text-ink">80 px</strong> wide (20 mm). Under 40 px the small-size drawing is used: a tighter
              gradient and a heavier prompt.
            </p>
          </div>
        </div>
      </Section>

      {/* ── colour ── */}
      <Section id="colour" eyebrow="Colour" title="One accent, used as a fill">
        <p className="max-w-2xl text-ink-2">
          Pastel lime is a fill with dark ink on top. It is never used as text on a light background (1.2:1). For text and thin lines on
          light surfaces use the olive. Click a value to copy it.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COLORS.map((c) => (
            <div key={c.hex}>
              <Swatch hex={c.hex} label={c.name} dark={c.dark} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <CopyButton text={c.hex} label={`Copy ${c.name} hex`} />
                <CopyButton text={`rgb(${c.rgb})`} label={`Copy ${c.name} RGB`} />
                <CopyButton text={`hsl(${c.hsl})`} label={`Copy ${c.name} HSL`} />
              </div>
              <p className="mt-2 text-sm text-ink-2">{c.use}</p>
            </div>
          ))}
        </div>

        <h3 className="mt-12 text-lg font-semibold tracking-tight">Flap gradient</h3>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">
          A radial gradient centred on the V tip, squashed vertically so it hugs the fold. Deepest at the fold, fading to the body colour by the
          top corners.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {GRADIENT.map((g) => (
            <div key={g.name}>
              <Swatch hex={g.hex} label={`${g.name} · ${g.at}`} dark={g.dark} />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <CopyButton text={g.hex} label={`Copy ${g.name} gradient stop`} />
                <span className="text-xs text-ink-3">small sizes: {g.small}</span>
              </div>
            </div>
          ))}
        </div>

        <h3 className="mt-12 text-lg font-semibold tracking-tight">Neutrals</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {NEUTRALS.map((n) => (
            <div key={n.name} className="overflow-hidden rounded-xl border border-line">
              <div className="h-14" style={{ background: n.light }} />
              <div className="h-14" style={{ background: n.dark }} />
              <div className="space-y-1 bg-surface p-2.5">
                <p className="text-sm font-medium">{n.name}</p>
                <CopyButton text={n.light} label={`Copy ${n.name} light`} />
                <CopyButton text={n.dark} label={`Copy ${n.name} dark`} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── type ── */}
      <Section id="type" eyebrow="Typography" title="Three typefaces, all open source">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="card p-5">
            <p className="eyebrow">Interface and body</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.02em]">Geist</p>
            <p className="mt-2 text-sm text-ink-2">Weights 400, 500, 600. Body 15 to 16 px / 1.6. Buttons and labels 13 to 14 px, 500. Headings 600, tracking &minus;0.02em.</p>
          </div>
          <div className="card p-5">
            <p className="eyebrow">Display</p>
            <p className="font-display mt-3 text-3xl">Source Serif 4</p>
            <p className="mt-2 text-sm text-ink-2">Weights 500 and 600. Headlines from 40 to 84 px, line height 1.04 to 1.15. One serif headline per view.</p>
          </div>
          <div className="card p-5">
            <p className="eyebrow">Code</p>
            <p className="mt-3 font-mono text-3xl">Geist Mono</p>
            <p className="mt-2 text-sm text-ink-2">Weights 400 and 500. Code, filenames and small-caps eyebrow labels. 13 to 14 px / 1.6.</p>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <p className="eyebrow">Specimen</p>
          <p className="font-display mt-3 text-[2.5rem] leading-[1.08] sm:text-[3.25rem]">Learn to code by building real projects.</p>
          <p className="mt-4 max-w-xl text-ink-2">Every lesson brings a live demo to life. Write real code, see it work, and keep going until it is professional-grade.</p>
          <p className="mt-4 font-mono text-sm text-ink-2">print(&quot;hello, pockett&quot;)</p>
        </div>
      </Section>

      {/* ── do / don't ── */}
      <Section id="usage" eyebrow="Usage" title="Do and don&rsquo;t">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Example ok caption="Use the supplied files. Scale proportionally."><LogoMark size={72} detail="full" /></Example>
          <Example ok caption="Full colour on near-black or off-white.">
            <div className="grid h-full w-full place-items-center" style={{ background: "#0a0a0a" }}><LogoMark size={72} detail="full" /></div>
          </Example>
          <Example ok caption="One colour when colour is not possible.">
            <div className="grid h-full w-full place-items-center" style={{ background: "#ffffff" }}>
              <Image src="/brand/svg/pockett-mark-black.svg" alt="" width={72} height={72} unoptimized />
            </div>
          </Example>
          <Example ok caption="Keep the gradient: deepest at the fold, fading at the corners.">
            <LogoMark size={72} detail="full" />
          </Example>
          <Example ok={false} caption="No outlines or borders.">
            <div style={{ filter: "drop-shadow(1.5px 0 0 #0a0a0a) drop-shadow(-1.5px 0 0 #0a0a0a) drop-shadow(0 1.5px 0 #0a0a0a) drop-shadow(0 -1.5px 0 #0a0a0a)" }}>
              <LogoMark size={72} detail="full" />
            </div>
          </Example>
          <Example ok={false} caption="Don&rsquo;t recolour it.">
            <div style={{ filter: "hue-rotate(200deg) saturate(1.6)" }}><LogoMark size={72} detail="full" /></div>
          </Example>
          <Example ok={false} caption="Don&rsquo;t stretch, squash or rotate it.">
            <div style={{ transform: "scale(1.5, 0.8) rotate(-8deg)" }}><LogoMark size={64} detail="full" /></div>
          </Example>
          <Example ok={false} caption="No shadows, glows or other effects.">
            <div style={{ filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.45)) drop-shadow(0 0 10px #c5ee8a)" }}><LogoMark size={72} detail="full" /></div>
          </Example>
        </div>
        <p className="mt-6 max-w-2xl text-sm text-ink-3">
          Also: don&rsquo;t replace the gradient flap with a flat fill in the full-colour version, don&rsquo;t place the full-colour mark on a mid-tone or busy
          background (switch to white or black), don&rsquo;t retype the wordmark, and don&rsquo;t crop the envelope or put it inside another shape.
        </p>
      </Section>

      {/* ── voice ── */}
      <Section id="voice" eyebrow="Voice" title="Confident, plain, warm">
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            ["Say what the learner gets.", "Real projects, live demos, instant feedback. Not how it works under the hood."],
            ["Short sentences, active verbs.", "“Build a drum machine.” Not “Learners will be enabled to create audio applications.”"],
            ["Professional, never patronising.", "No exclamation marks, no emoji in product copy, no gamified shouting."],
            ["Leave out the machinery.", "No hosting, runtime or implementation detail. Nobody has to know how it runs."],
          ].map(([t, d]) => (
            <li key={t} className="card p-5">
              <p className="font-semibold tracking-tight">{t}</p>
              <p className="mt-1 text-sm text-ink-2">{d}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* ── boilerplate ── */}
      <Section id="about" eyebrow="Press" title="About pockett">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card flex flex-col p-5">
            <p className="eyebrow">50 words</p>
            <p className="mt-3 flex-1 leading-relaxed text-ink-2">{BOILERPLATE_50}</p>
            <div className="mt-4"><CopyTextButton text={BOILERPLATE_50} caption="Copy text" /></div>
          </div>
          <div className="card flex flex-col p-5">
            <p className="eyebrow">100 words</p>
            <p className="mt-3 flex-1 leading-relaxed text-ink-2">{BOILERPLATE_100}</p>
            <div className="mt-4"><CopyTextButton text={BOILERPLATE_100} caption="Copy text" /></div>
          </div>
        </div>
        <p className="mt-4 text-sm text-ink-3">
          Short descriptor for bios and listings: <em>pockett: learn to code by building real projects.</em> pockett is a product of Gameverse, LLC.
        </p>
      </Section>

      {/* ── requests ── */}
      <Section id="requests" eyebrow="Requests" title="Need something else?">
        <p className="max-w-2xl text-ink-2">
          Everything you need is in the kit above. For a different format, a co-branded lockup, permission for a use not covered here or a
          press quote, contact the pockett team with what you are making, where it will appear and your deadline. Please send artwork for
          approval before publishing if it places the logo next to other brands.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a className="btn btn-primary" href="/brand/pockett-brand-kit.zip" download><Download className="h-4 w-4" /> Download the brand kit</a>
          {PRESS_CONTACT ? <a className="btn" href={`mailto:${PRESS_CONTACT}`}>Contact the team</a> : null}
        </div>
        <p className="mt-6 text-xs text-ink-3">The pockett name, logo and brand assets are the property of Gameverse, LLC. © 2026 Gameverse, LLC.</p>
      </Section>
    </div>
  );
}
