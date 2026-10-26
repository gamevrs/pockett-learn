# Adding a project

A project is **content** (`src/content/projects/<slug>.ts`) plus a **scene** (`src/scenes/<slug>/`). Copy Turbo Garage; it is the reference.

1. **Content.** Export a `Project` with chapters and lessons. Every lesson has `starterAdd` (the new TODO appended to the learner's file; it must begin with the `✏️ YOUR TURN` marker), `solutionAdd`, `tests` (plain `assert`s run in the learner's namespace; `__stdout__` holds printed text), 2-3 `hints`, and `unlocks: [featureId]`. Python goes in `String.raw`; prose uses normal template strings with backticks escaped and `~~~python` fences.
2. **Scene.** A client component taking `SceneProps`. Read learner data through `program` only, gate every feature on `unlocked.has(id)`, support `autoplay` and both portrait and landscape stages, and clean up on unmount (routes are kept alive hidden, so effect cleanup matters).
3. **Demo program.** `demo.ts` exports a function returning `createStaticProgram({ vars, hooks })`, a JS stand-in for a finished learner program (used by the landing page).
4. **Register** in three places: `PROJECTS` (`src/content/index.ts`), `SCENES` (`src/engine/scenes.tsx`), `DEMO_PROGRAMS` (`src/scenes/demos.ts`). Optionally add key art to `ProjectArt`.
5. **Prove it.** `pnpm validate <slug>` must be clean. If the scene has physics, add a `scripts/tune-<slug>.mjs` that runs the reference solution headlessly.

## Tiers and paths

Every language is a path from zero to hero. A project's `difficulty` is its tier, in order: `Beginner` → `Intermediate` → `Advanced` → `Professional`. The projects page groups each language's projects by tier and shows planned ones beside them.

- **Planned projects** live in `PLANNED` in `src/content/index.ts` (`UpcomingProject`: `slug`, `language`, `difficulty`, `skills`, title, tagline, accent). `UPCOMING` is `PLANNED` minus anything already in `PROJECTS`, so when you register the real project with the **same slug** its "Planned" card disappears on its own. Use the planned slug for the real project. Add an icon for a new slug in `src/components/ui/icons.tsx`.
- **`prerequisites?: string[]`** lists slugs worth finishing first. The hub shows them as "Recommended first" (links for built projects, plain text for planned ones).
- Pick the tier by what the learner needs to already know: Beginner assumes nothing, Intermediate real-world input handling (strings, errors, data), Advanced design patterns, Professional production-style systems (APIs, databases, tests).

## Python packages

Pyodide ships some standard-library modules as separate packages (`sqlite3` is the common one). List them in `Project.packages` (Python only):

```ts
export const storeApi: Project = { slug: "store-api", packages: ["sqlite3"], /* … */ };
```

The runtime loads each package once per page after Pyodide boots (status "Loading sqlite3…"), so later runs and grading are instant. They are passed everywhere the project's code runs (workspace Run/Submit, hub boot). `pnpm validate` runs Python in local CPython, where `sqlite3` is built in; if a listed package cannot be imported locally the validator warns and skips that project's cases instead of failing.

## "Check your understanding"

A lesson can carry optional `checks` (shown at the end of the Learn tab, never gating Submit):

```ts
checks: [
  {
    prompt: "What type is the value `41.5`?",                    // mini-markdown
    question: { type: "text", answer: ["float"] },               // same Question type as Foundations
    explanation: "A number with a decimal point is a `float`.",  // shown once answered
  },
],
```

Supported `question` types: `choice` (one or many answers), `number`, `text`, `order`. (`widget` questions are not supported here.) Learners get Check, Try again, and Show answer after two misses. One or two per lesson is plenty: ask about the concept, not the exercise. The validator checks choice answers are in range.
