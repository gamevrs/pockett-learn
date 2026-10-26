# Smart Home Hub: lesson sources

`src/content/projects/smart-home.ts` is **generated** from this folder. Edit the sources here, then rebuild.

```
node content-src/smart-home/build.mjs
NODE_NO_WARNINGS=1 node scripts/validate-content.mjs smart-home
```

## Layout

- `project.json`: title, pitch, features (ids prefixed `sh-`), chapters (lists lesson folder numbers).
- `lessons/NN/` one folder per lesson:
  - `meta.json`: id, title, minutes, xp, concepts, tasks, `unlocks`, explanation, hints, `checks`.
  - `learn.md`, `mission.md`: lesson prose (mini-markdown, see `src/components/ui/Prose.tsx`).
  - `starter.py`: the new TODO appended to the learner's file; must begin with the YOUR TURN marker.
  - `solution.py`: the reference solution for this lesson's addition.
  - `tests.py`: tests, each starting with a line `### t1 | description`; plain asserts with learner-facing messages.

## Rules

- Python must not contain a backtick or a dollar-brace (it ends up in `String.raw`). Backticks in `starter.py` comments are turned into quotes automatically.
- Hints are single-line plain text (they render in one paragraph).
- Choice checks are shuffled deterministically at build time, so write the correct option wherever it reads best.
- Tests share one namespace with the learner's code: prefix test helpers with `_` and never reuse a name from a solution.
- Do not edit the generated `.ts` by hand; the next rebuild would overwrite it.
