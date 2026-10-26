# pockett brand guide

© 2026 Gameverse, LLC. The pockett name, logo and brand assets are the property of Gameverse, LLC.

Everything in this folder is generated from one source of truth (`brand/build.mjs`). Edit the artwork there, run `npm run brand`, and every SVG, PNG, social image and the downloadable zip updates together. The same guide is published at `/brand` on the site.

## 1. The logo

### Construction and meaning

The mark is a **square envelope with a command line in it**.

- **Envelope** – a rounded square (corner radius 23% of the side) with a short, closed flap. Letters, delivered. It says "something real is being sent your way".
- **Command line** – the `>_` prompt sits in the body of the envelope, centred in the space below the flap tip. It says "this is code".
- **Flap** – a V shape that fills with a green gradient: deepest olive along the fold at the V tip, fading out to the body colour toward the two top corners until it melts into the envelope. No outlines, ever; tone does the drawing.

Together: pockett is where code is made and delivered, one real project at a time.

Grid: the mark is drawn on a 32-unit grid. The envelope is 26 x 26 units (3 to 29), the flap tip sits at y = 12, the prompt chevron is 8.2 units tall and the prompt stroke is 2.6 units (3 units below 40 px, see "Small sizes").

### The wordmark

"pockett" is set in **Geist SemiBold (600)**, lower case, tracking -0.02em. In the supplied lockup files the wordmark is converted to outlines, so it never depends on an installed font. Do not retype it.

### Lockups

| Lockup | Use |
| --- | --- |
| Mark | App icon, favicon, avatars, anywhere a square fits |
| Horizontal | Default. Headers, footers, documents, slides |
| Stacked | Centred layouts, posters, covers, social cards |

In the horizontal lockup the mark is 1.00 tall, the gap to the wordmark is 0.40, and the wordmark's cap height is 0.52 of the mark height; the two share one vertical centre line (the centre of the mark is the centre of the capital-height band).

### Versions

| File suffix | Use on |
| --- | --- |
| `-light` | Full colour. Light backgrounds (#f6f5f1, white, light photography). Wordmark in ink #0a0a0a. |
| `-dark` | Full colour. Dark backgrounds (#0a0a0a to about #2a2a2a). Wordmark in #fafafa. |
| `-black` | One colour. Single-colour print, engraving, fax-grade reproduction. |
| `-white` | One colour. Photography, video, coloured backgrounds where full colour would clash. |

The envelope mark itself is identical in the `-light` and `-dark` full-colour files: the pastel body has contrast against both. In the one-colour versions the fold is a thin cut-out sliver under the flap and the prompt is cut out of the body, so they read without any outline.

### Clear space

Keep a clear zone of **half the mark's width** (0.5 M) on every side of any lockup or mark. Nothing (text, edges, other logos) enters that zone, and on photographic backgrounds it should be calm and low-contrast.

### Minimum sizes

| Asset | Minimum |
| --- | --- |
| Mark | 16 px on screen / 5 mm in print |
| Horizontal lockup | 96 px wide / 25 mm |
| Stacked lockup | 80 px wide / 20 mm |

Below 40 px use the small-size drawing (`png/mark/*-16.png` and `-32.png` are already exported that way): a deeper, tighter gradient and a heavier prompt so the fold and the `>_` survive at tiny sizes. The favicon (`src/app/icon.svg`) uses it as well.

### Do and don't

Do:
- Use the supplied files; scale proportionally.
- Use the full-colour logo on near-black or off-white backgrounds, and the one-colour versions when colour is not possible.
- Keep the flap gradient: deepest at the fold, fading to the body colour at the corners.
- Keep the prompt in ink (#0a0a0a) on the pastel body.

Don't:
- Add an outline or a border around the envelope or the flap.
- Recolour the mark (no blue, purple, rainbow, or other greens), or swap the ink prompt for another colour.
- Stretch, squash, rotate or skew it.
- Add shadows, glows, bevels, 3D effects or animation that alters the shape.
- Replace the gradient flap with a flat fill in the full-colour version.
- Place the full-colour mark on a mid-tone or busy background without enough contrast. Switch to white or black.
- Retype the wordmark or change its font, case or spacing.
- Crop the envelope or put it inside another container shape.

## 2. Colour

pockett uses one accent. The pastel lime is a **fill**, always with dark ink on top; it is never used as text on a light background (1.2:1 on #f6f5f1). For text and thin lines on light surfaces use the deep olive.

### Brand

| Name | Hex | RGB | HSL | Use |
| --- | --- | --- | --- | --- |
| Pastel lime | `#c5ee8a` | 197, 238, 138 | 85, 75%, 74% | Envelope body, primary buttons, highlights. Site token `--primary`. |
| Ink | `#0a0a0a` | 10, 10, 10 | 0, 0%, 4% | The `>_` prompt, text on pastel (15.1:1), dark backgrounds. Token `--primary-ink`. |
| Olive | `#4b7411` | 75, 116, 17 | 85, 74%, 26% | Accessible accent for text and lines on light surfaces (5.1:1 on #f6f5f1, 5.5:1 on white). Token `--brand` (light). |
| Deep olive | `#354e12` | 53, 78, 18 | 85, 63%, 19% | Pressed and emphasis states on light surfaces. Token `--brand-deep` (light). |
| Soft lime | `#d3f3a4` | 211, 243, 164 | 84, 77%, 80% | Hover state for the pastel. Token `--primary-hover`. |

### Flap gradient

Radial gradient centred on the V tip, squashed vertically so it hugs the fold. Stops, in order:

| Stop | Standard (40 px and up) | Small (under 40 px) |
| --- | --- | --- |
| 0% (at the tip) | `#4a771d` (74, 119, 29) | `#3f6a16` (63, 106, 22) |
| middle | `#7eaa45` at 40% | `#5f8d2c` at 50% |
| end (body colour) | `#c5ee8a` at 82% | `#c5ee8a` at 92% |

### Neutrals

| Name | Light | Dark |
| --- | --- | --- |
| Page | `#f6f5f1` (246, 245, 241) | `#0a0a0a` (10, 10, 10) |
| Surface | `#ffffff` | `#121212` |
| Text | `#121211` | `#fafafa` |
| Secondary text | `#56554f` (6.9:1 on page) | `#a3a3a3` |
| Tertiary text | `#8a8880` | `#737373` |
| Hairlines | `#e5e3dc` | `rgba(255,255,255,0.08)` |

On dark surfaces the pastel itself is the accent for text and lines (15.1:1 on #0a0a0a).

## 3. Typography

| Role | Typeface | Weights | Notes |
| --- | --- | --- | --- |
| Interface and body | **Geist** | 400, 500, 600 | Body 15-16 px / 1.6. Buttons and labels 13-14 px / 500. Headings 600 with -0.02em tracking. |
| Display | **Source Serif 4** | 500, 600 | Page and hero headlines, 40-84 px, line height 1.04-1.15, tracking -0.01em. One serif headline per view. |
| Code | **Geist Mono** | 400, 500 | Code, filenames, the small caps eyebrow labels. 13-14 px / 1.6. |
| Wordmark | Geist 600, outlined | n/a | Supplied as vector outlines only. |

All three families are open source (SIL Open Font License) and free to use from Google Fonts. `brand/fonts/` carries the variable files the build uses to render the social images.

## 4. Voice and tone

- **Confident, plain, warm.** Say what the learner gets, not how it works. Real projects, live demos, instant feedback.
- **Short sentences, active verbs.** "Build a drum machine." Not "Learners will be enabled to create audio applications."
- **Professional, never patronising.** No exclamation marks, no emoji in product copy, no gamified shouting.
- **Don't explain the machinery.** Leave out hosting, runtimes and implementation detail. Nobody has to know how it runs.

## 5. About pockett (press boilerplate)

**50 words**

> pockett is a free learning platform where people learn to code by building real, working projects. Every lesson brings a live demo to life, so learners see their code do something from day one and get instant feedback along the way. It takes beginners all the way to professional-grade software.

**100 words**

> pockett is a free learning platform where people learn to code by building real, working projects. Every lesson brings a live demo to life, so learners see their code do something from day one and get instant feedback along the way. Courses and projects span Python, JavaScript, SQL and more, and are designed as a path: start with the foundations, build projects that look and behave like the real thing, and finish with the habits of a professional engineer. There is no paywall, ever. pockett exists to make learning to code feel like making something real, not studying for it.

Short descriptor (for bios and listings): *pockett: learn to code by building real projects.*

pockett is a product of **Gameverse, LLC**. Copyright line: `© 2026 Gameverse, LLC`.

## 6. Files

```
brand/
  svg/          vector masters: mark, horizontal lockup, stacked lockup x light / dark / black / white
  png/mark/     mark, 16 / 32 / 64 / 128 / 256 / 512 / 1024 px, transparent
  png/lockup-horizontal/, png/lockup-stacked/   lockups, 128 / 256 / 512 / 1024 px wide, transparent
  social/       pockett-og-1200x630.png (link preview), pockett-avatar-1080.png (profile picture)
  fonts/        Geist, Geist Mono, Source Serif 4 (OFL), used by the build
  build.mjs     regenerates everything above and the zip
  tools/extract-wordmark.mjs   one-off: outlines the wordmark from Geist (run only if the wordmark changes)
```

Rebuild with `npm run brand` (needs Chrome; set `CHROME` if it is not in the default location). The build also refreshes `public/brand/` (the press-kit page assets and `pockett-brand-kit.zip`) and the site's default Open Graph / Twitter image in `src/app/`. The in-app mark lives in `src/components/brand/Logo.tsx` and the favicon in `src/app/icon.svg`; they use the same geometry as `build.mjs`.

## 7. Requesting assets

Everything you need is in the kit at `/brand` (zip download). For anything else (a different format, a co-branded lockup, permission for a use not covered here, or a press quote), email support@pockett.ai and include what you are making, where it will appear, and your deadline. Please send artwork for approval before publishing if it places the logo next to other brands.
