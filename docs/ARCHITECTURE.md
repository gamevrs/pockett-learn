# Architecture

```
src/
  app/                  Next.js routes (App Router, Cache Components on)
    page.tsx              landing (live self-driving hero + "watch it come alive" explorer)
    projects/             picker, project hub, lesson workspace
    dashboard/ playground/
    api/projects/         public catalog + per-project curriculum (answer keys stripped)
  engine/               the framework: knows nothing about any one project
    types.ts              Project / Chapter / Lesson / Feature contracts
    program.ts            ProgramHandle (what scenes see of the learner's program)
    python/prelude.ts     Python-side: sandboxed run, watchdog, hook calls, JSON snapshot
    python/host.ts        loads Pyodide, runs + grades code in isolated namespaces
    compose.ts            the cumulative main.py (starter / reference solution per lesson)
    scene.ts, scene-kit   SceneProps contract + keyboard/touch input
    three-kit.ts          shared three.js stage: renderer, shadows, bloom, resize, pause, dispose
    scenes.tsx            scene registry (sceneId -> lazy component)
  content/projects/     pure data: one file per project (curriculum, tests, hints)
  scenes/<project>/     live demos: pure sim (testable in Node) + three.js world + React scene with an
                        HTML HUD + demo program
  components/           stage chrome, workspace, landing, dashboard, sandbox
  data/progress/        ProgressRepository (local today) + React store
supabase/migrations/    Postgres schema for the future cloud mode
scripts/                validate-content, seed-progress, tune-garage
```

## The runtime loop

```
 learner types ──► Run ──► host.runProgram(code)         new Pyodide namespace
                              │  prelude: exec under a trace-based watchdog (4s)
                              ▼
                       ProgramHandle  ◄── snapshot of JSON-able globals + callable names
                              │
            Scene reads vars ─┤─ Scene calls hooks (JSON in/out, 0.25s watchdog each)
                              │
 gradeProgram(code, tests) ───┘  separate namespace so tests can't disturb the live scene
        all pass ──► completeLesson() ──► unlock features ──► celebration
```

Design choices worth knowing:

- **JSON across the Python boundary.** Hooks receive and return JSON strings, so there are no PyProxy leaks and no JS-object-vs-dict surprises: learners get real `dict`s and `list`s.
- **Watchdog, not workers.** A `sys.settrace` deadline stops runaway loops (`while True:` spanning several lines) with a friendly, line-numbered error. A Web Worker would be stricter but makes per-frame hook calls async; revisit if a project needs heavy compute. (A single-line `while True: pass` is not caught by CPython line tracing.)
- **Scenes are gated, not branched.** A scene draws everything, but each feature is ghosted until `unlocked.has(id)`. That keeps "what you're building towards" visible from lesson 1.
- **3D with one visual language.** Every scene renders through `useThreeStage` (ACES tone mapping, soft
  shadows, bloom) with one violet accent; locked features are violet wireframe. All HUD text is HTML, not
  canvas text, so it stays crisp and matches the site.
- **Pure sims.** `scenes/<project>/sim.ts` has no DOM or imports, so `scripts/tune-garage.mjs` can prove the reference autopilot laps without a browser.
- **Content is data.** Projects are serializable. `toPublicProject()` whitelists fields for the API so reference solutions and test source never leave the server through it.

## Quality gates

- `pnpm validate`: every lesson's reference solution must pass all tests and its starter must fail at least one (so nothing ships pre-solved or broken), and every feature must be unlocked by some lesson.
- `pnpm typecheck`, `pnpm build`, `eslint` (React Compiler rules are on).

## Going to Supabase + Vercel

1. Apply `supabase/migrations/0001_init.sql`.
2. Add a `SupabaseProgressRepository` implementing `ProgressRepository` and return it from `getRepository()` in `src/data/progress/store.ts` when the env vars are set (merge local → cloud on first sign-in).
3. Deploy to Vercel as-is: no server-side code execution is needed, pages are prerendered, and the only dynamic surface is the two JSON routes.

## Known limits

- Pyodide and Monaco load from CDNs (jsDelivr). Self-host them under `/public` for offline or locked-down environments.
- Progress is per-device until accounts exist.
- Learners' hook functions run on the main thread (guarded by the watchdog); a pathological hook can still cost a frame.
- The lesson page ships the whole project (including reference solutions and tests) to the client, so a determined learner can read answers. Fine for a free learning site; use `toPublicProject()` + server grading if that ever matters.
