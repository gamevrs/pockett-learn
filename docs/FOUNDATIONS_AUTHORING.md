# Writing Foundations lessons

Foundations is the concept track at `/learn`: from bits to design patterns, Brilliant-style. One
idea per step, and every step asks the learner to *do* something.

## Where things live

| What | Where |
| --- | --- |
| Data model (Track, Module, ConceptLesson, Step, Question, WidgetSpec) | `src/learn/types.ts` |
| Widget contract (`WidgetProps`, `WidgetDef.check`) | `src/learn/widget.ts` |
| Widgets, one folder + registry per module | `src/learn/widgets/<module>/` (`index.ts` exports the registry) |
| Lesson content, one file per module | `src/content/foundations/<module>.ts` |
| Player (renders steps, checks answers, feedback, completion) | `src/components/learn/LessonPlayer.tsx` |
| Module order and which part each module sits in | `src/content/foundations/index.ts` (the `part` is set there, not in the module file; `validate-content` checks parts stay contiguous) |
| Reference lesson and widget | `content/foundations/bits.ts` (lesson 1), `learn/widgets/bits/Bits.tsx` |

## Lesson levels

A lesson may set an optional `level` (`"Beginner" | "Intermediate" | "Advanced" | "Professional"`, the
`Difficulty` type from `src/engine/types.ts`). When a module's lessons carry levels, the hub shows a level
divider before the first lesson of each level, a "Beginner → Professional" range chip on the module card,
and a level chip on the lesson page. Levels must never go backwards within a module (`validate-content`
errors on an unknown level or a lower level after a higher one). Lessons without `level` are unaffected.
The Hardware path (CPU, memory, GPU) uses levels throughout: see [HARDWARE_PATH.md](./HARDWARE_PATH.md).

## Steps

- `explain`: prose (mini-markdown, see `src/components/ui/Prose.tsx`) plus an optional widget to play with.
- `question`: optional widget plus a question: `choice` (single or multi), `number`, `text`,
  `order`, or `widget` (get the widget into a goal state; the widget's `check(state, goal)` decides).
  Always include an `explanation` that says **why**, shown after answering.
- `code`: write a few lines that are checked by tests, using the same engines and check format as
  projects (Python `assert` for Python). The starter must fail the checks; the solution must pass.
- `recap`: 3 to 5 bullet points to close the lesson.

## Rules of thumb

1. **One idea per step.** If a step needs two paragraphs, split it.
2. **At least half the steps are interactive**, and the learner should touch something within the
   first two steps.
3. **Ask about understanding, not trivia.** Good questions predict ("what does this print?"),
   apply ("make 13"), or compare ("which of these is encapsulation?").
4. **Wrong options should be plausible**: the mistakes people really make.
5. **Concepts first, syntax second.** Explanations are language-neutral; code examples are Python
   unless a comparison helps.
6. **Original writing.** Don't copy from other courses or sites.
7. 6 to 10 steps per lesson, 4 to 8 minutes, and a recap at the end.

## Widgets

Client components drawn on a themed card (light and dark). Use the theme tokens (`bg-surface`,
`bg-surface-2`, `text-ink`, `text-ink-2/3`, `border-line`, `bg-primary` / `text-primary-ink` for the
accent, `bg-tint`) and the `btn` / `chip` classes. Touch targets are at least 40px, layouts work from
320px wide, and there are no external assets or libraries beyond React and lucide-react. Keep
widgets configurable through `props` so several lessons can reuse them, and report state through
`onChange` if a `widget` question might check it.

## Checking your work

`node scripts/validate-content.mjs foundations` checks ids, answers, that every widget exists, and
runs every code step.

## Player features for widgets

- `status` prop: `"idle" | "correct" | "wrong" | "revealed"`. On `"revealed"` a widget can draw
  the solution; on `"wrong"` it can mark the learner's mistake.
- `WidgetSpec.after: true` hides the widget until the question is answered, then shows it playable
  ("predict first, then check it yourself").
- `WidgetSpec.live: true` keeps a widget playable after the question is answered ("predict, then
  try it").
- Enter inside a widget's own input does not trigger Check (the widget's card is marked
  `data-widget`).
- Fences: ```python, ```js, ```sql, ```c/```cpp, ```java/```cs, ```asm, ```sh, ```go, and ```text / ```http (plain, no highlighting).
- Number questions get a ± button (phone keypads often lack a minus key).

## Code traces

The `trace` widget's step data in `content/foundations/programs.ts` (between the `// <traces>`
markers) is generated from real CPython runs, so it is always exact:

```bash
python scripts/foundations/gentrace.py scripts/foundations/specs.py src/content/foundations/programs.ts
```

`--list NAME` prints one program's steps, so you can attach notes to the right step in `specs.py`.

## Motion explainers

Step-through animations live in `src/learn/widgets/explain/` on the shared `Explainer` player
(play / pause, previous / next, scrubber, caption). See `LlmExplainer.tsx` for a model.

- **A scene is a pure `render(t, reduced)`** of progress `t` (0 to 1): no state, no timers, no
  `Math.random`. Scrubbing, stepping and playing then all draw the same picture. Helpers (`seg`,
  `ease`, `lerp`, `r2`) are in `anim.ts`; round computed coordinates with `r2` so server and browser
  print the same numbers. `reduced` is true under reduced motion, where `t` is always 1: the
  finished picture must show everything the caption talks about (draw a representative frame if the
  animation ends on an empty one).
- **Durations**: 8 to 12 s per scene. Stage one idea at a time and let one thing finish before the
  next starts (nothing fading out while something else flies in).
- **The caption carries the meaning.** The stage is `aria-hidden`; the plain-text `caption` must say
  everything the picture shows, so someone who never sees it loses nothing.
- **Subsets**: export one component taking `props.scenes` (ids, in order; unknown ids are ignored,
  none means all). Use the full set in an opening step and one scene per later step, so each idea
  gets a step and a question.
- **Drawing**: one `viewBox` (360 wide, height as needed) that scales to the card. SVG text is at
  least 14 units so it stays about 14px on a phone. Use theme variables (`var(--ink)`, `--ink-2`,
  `--ink-3`, `--brand`, `--surface`, `--line-strong`) so both themes work; hardcode a colour only
  for a second data hue that must be the same in both (check it on dark and light).
- **Registering**: add the component to `EXPLAIN_WIDGETS` in `explain/index.ts` as a key prefixed
  `ex-` in the literal form `"ex-name": { Component: Name },`. The validator finds widget types
  with a regex over that file, so no computed keys, spreads or shorthand.
- **Pair each explainer step with a question** that checks the idea it just showed. Vary the
  position of the right answer across the lesson: choice options are shown in the order you
  write them, never shuffled.
- Check it at 390 and 320 wide, with reduced motion on, and add the lesson to `EXPLAINER_LESSONS`
  in `scripts/ui-check-learn.mjs` so `ui:check` covers it.
