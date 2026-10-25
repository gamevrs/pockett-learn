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
| Reference lesson and widget | `content/foundations/bits.ts` (lesson 1), `learn/widgets/bits/Bits.tsx` |

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
- `WidgetSpec.live: true` keeps a widget playable after the question is answered ("predict, then
  try it").
- Enter inside a widget's own input does not trigger Check (the widget's card is marked
  `data-widget`).
- Fences: ```python, ```js, ```sql, ```java/```cs, and ```text (plain output, no highlighting).

## Code traces

The `trace` widget's step data in `content/foundations/programs.ts` (between the `// <traces>`
markers) is generated from real CPython runs, so it is always exact:

```bash
python scripts/foundations/gentrace.py scripts/foundations/specs.py src/content/foundations/programs.ts
```

`--list NAME` prints one program's steps, so you can attach notes to the right step in `specs.py`.
