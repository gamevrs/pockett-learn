# Adding a project

A project is **content** (`src/content/projects/<slug>.ts`) plus a **scene** (`src/scenes/<slug>/`). Copy Turbo Garage; it is the reference.

1. **Content.** Export a `Project` with chapters and lessons. Every lesson has `starterAdd` (the new TODO appended to the learner's file; it must begin with the `✏️ YOUR TURN` marker), `solutionAdd`, `tests` (plain `assert`s run in the learner's namespace; `__stdout__` holds printed text), 2-3 `hints`, and `unlocks: [featureId]`. Python goes in `String.raw`; prose uses normal template strings with backticks escaped and `~~~python` fences.
2. **Scene.** A client component taking `SceneProps`. Read learner data through `program` only, gate every feature on `unlocked.has(id)`, support `autoplay` and both portrait and landscape stages, and clean up on unmount (routes are kept alive hidden, so effect cleanup matters).
3. **Demo program.** `demo.ts` exports a function returning `createStaticProgram({ vars, hooks })`, a JS stand-in for a finished learner program (used by the landing page).
4. **Register** in three places: `PROJECTS` (`src/content/index.ts`), `SCENES` (`src/engine/scenes.tsx`), `DEMO_PROGRAMS` (`src/scenes/demos.ts`). Optionally add key art to `ProjectArt`.
5. **Prove it.** `pnpm validate <slug>` must be clean. If the scene has physics, add a `scripts/tune-<slug>.mjs` that runs the reference solution headlessly.
