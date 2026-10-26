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
    program.ts            ProgramHandle (what scenes see of the learner's program, any language)
    languages.ts          per-language metadata (label, file name, Monaco id, browser vs server)
    runtimes/             one Runtime per language behind a common interface, code-split
      python.ts             Pyodide (python/host.ts + python/prelude.ts)
      javascript/           acorn loop-guard instrumentation + scoped execution
      sql/                  SQLite via sql.js, result sets + schema for scenes
      remote.ts             C# / C++ / Go via /api/run → a Vercel Sandbox microVM (src/server/runner)
    stage-style.ts        Pockett Stage design system for 3D demos (see STAGE_DESIGN_SYSTEM.md)
    compose.ts            the cumulative file (starter / reference solution per lesson)
    scene.ts, scene-kit   SceneProps contract + keyboard/touch input
    three-kit.ts          shared three.js stage: renderer, shadows, bloom, resize, pause, dispose
    scenes.tsx            scene registry (sceneId -> lazy component)
  content/projects/     pure data: one file per project (curriculum, tests, hints)
  scenes/<project>/     live demos: pure sim (testable in Node) + three.js world + React scene with an
                        HTML HUD + demo program
  components/           stage chrome, workspace, landing, dashboard, sandbox
  data/progress/        local store + cloud sync engine + merge
  data/auth/            Supabase Auth session store and actions
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
  shadows, bloom) with one lime accent; locked features are lime wireframe. All HUD text is HTML, not
  canvas text, so it stays crisp and matches the site.
- **Pure sims.** `scenes/<project>/sim.ts` has no DOM or imports, so `scripts/tune-garage.mjs` can prove the reference autopilot laps without a browser.
- **Content is data.** Projects are serializable. `toPublicProject()` whitelists fields for the API so reference solutions and test source never leave the server through it.

## Languages

Every project names a `language` (default `python`). The workspace, hub and sandbox only talk to
`loadRuntime(language)`, which returns a `Runtime`:

```ts
interface Runtime {
  preload(): void;
  run(source, { onStatus, setup }): Promise<RunOutcome>;   // → ProgramHandle for the scene
  grade(source, tests, { onStatus, setup }): Promise<GradeOutcome>;
}
```

| Language | Where it runs | Live scene hooks | Checks are written in |
| --- | --- | --- | --- |
| Python | browser, Pyodide (main thread) | yes, synchronous | Python `assert` |
| JavaScript | browser, main thread + loop guard | yes, synchronous | JavaScript (`assert`, `assertEqual`, `assertClose`) |
| SQL | browser, SQLite (sql.js) | reads result sets + schema | JavaScript over `result`, `rows`, `results`, `query()` |
| C#, C++, Go | pockett runner via `/api/run` | reads stdout and `@scene {json}` lines | JavaScript over `stdout`, `lines`, `scene` |

- **Names are Python-style at the scene boundary.** Scenes ask for `car_name` or `autopilot.steer`;
  the JavaScript runtime also tries camelCase (`carName`), so one scene serves several languages.
  Turbo Garage in JavaScript reuses the Python course's 3D scene unchanged.
- **JavaScript safety.** Code runs in a function scope with a captured `console`. Every loop body
  gets a `__guard()` call inserted with acorn (no newlines added, so error lines stay exact), which
  throws after the time budget: 2 s for a run, 60 ms per hook call, 1 s per check.
- **SQL setup.** `Project.setup` (schema + seed rows) runs before the learner's statements on a
  fresh database every time, so runs are deterministic and checks can `query()` the end state.
- **Compiled languages** (C#, C++, Go) run on Vercel Sandbox, a Firecracker microVM per run, via
  `/api/run` (code in `src/server/runner`). See "The compiled-language runner" below. Without
  `RUNNER_SNAPSHOT_ID` the route answers 503 and those courses show "coming soon".

Adding a language: implement `Runtime` in `src/engine/runtimes/<lang>`, register it in
`runtimes/index.ts` and `languages.ts`, and teach `scripts/validate-content.mjs` to run it.

## Tiers and paths

`Project.difficulty` is a tier: Beginner → Intermediate → Advanced → Professional (`TIERS` in `engine/types.ts`). The projects page renders one **path** per language, with a numbered tier ladder; each tier lists built projects (cards) and planned ones (`PLANNED` in `content/index.ts`, filtered by `PROJECTS` slugs into `UPCOMING`, so a built project replaces its planned entry automatically). `Project.prerequisites` feed the hub's "Recommended first" line. See ADDING_A_PROJECT.md.

Python projects can declare Pyodide `packages` (e.g. `sqlite3`); `RunOptions.packages` carries them to `python/host.ts`, which loads each once per page. Lessons can add ungraded `checks` ("Check your understanding") rendered by `components/workspace/LessonChecks.tsx`.

### The compiled-language runner

- **Snapshot.** A Sandbox snapshot holds the toolchains: .NET 10 (LTS) runtime plus `/opt/pockett/runner`, a
  ReadyToRun-compiled Roslyn host; g++ with a precompiled `bits/stdc++.h`; Go (official tarball) with a warm
  std build cache; two unprivileged users (`pkbuild`, `pkrun`); and `/opt/pockett/run.sh`. Build it with
  `POST /api/run/setup` (bearer `RUNNER_ADMIN_TOKEN`, 404 if unset, `maxDuration` 800 s) or
  `node scripts/runner/build-snapshot.mjs`; both run the same routine (`provision.ts`), warm the caches by
  compiling and running a program per language, then self-test the saved snapshot through the real run path.
  Set the printed id as `RUNNER_SNAPSHOT_ID` and redeploy. Rebuild when you change `assets.ts` or want newer toolchains.
- **Per request** (`execute.ts`): create a sandbox from the snapshot (1-2 vCPU, `deny-all` network incl. DNS,
  60 s lifetime, not persistent), write the source and stdin, run `run.sh` as root with a random report marker,
  parse the report (`result.ts`), then stop the sandbox after the response (`after()`, backed by the sandbox's own
  timeout). `run.sh` compiles as `pkbuild` (10 s, `timeout`), runs as `pkrun` (3 s wall, no write access outside its
  scratch dir; stdout capped by `ulimit -f` and `head -c` at 100 KB; 256 processes; 1 GiB address space for C++/Go,
  256 MiB GC heap for .NET) and prints stdout, stderr, exit code, compiler output and timings. Auth is the
  deployment's Vercel OIDC token, picked up by the SDK; there are no long-lived secrets.
- **Line numbers.** Sources are never wrapped or renamed (`Program.cs`, `main.cpp`, `main.go`), so compiler
  diagnostics and stack traces already use the learner's own lines. C# compiles in-process with Roslyn (debug build,
  portable pdb) and runs as a normal `dotnet program.dll`, so `Program.cs:line N` appears in exception traces; the
  usings that `dotnet new console` turns on are supplied as a separate hidden file.
- **Response mapping.** `{ stdout, stderr, exitCode, compileError, timedOut }`. Compiler output goes to `compileError`
  (temp paths and tool banners stripped); a timeout is exit 137 with a friendly message; silent crashes (segfault,
  divide by zero) get an explanation. Errors: 400/413 bad input, 429 rate limited or busy, 502 runner failure,
  503 not set up or snapshot gone.
- **Abuse protection.** 64 KB source and stdin limits, a per-IP sliding window (30/min) and a global in-flight cap (8),
  both in memory per server instance (best effort on serverless; Vercel's firewall and Sandbox quotas are the hard backstop).
- **Strategies** (`RUNNER_MODE`). `fresh` (default) is one microVM per run: the strongest isolation, because nothing a
  learner does can be observed by the next. `pool` keeps up to `RUNNER_POOL_SIZE` warm microVMs per server instance for
  ~4 minutes / 40 runs and skips the create cost; every run still gets fresh scratch dirs, a root-owned toolchain, and
  all `pkrun`/`pkbuild` processes and temp files are killed and deleted afterwards. The trade-off: learners then
  share a VM over time (no network, no secrets in it, but a determined learner could leave something behind that
  `pkbuild`'s caches or /tmp allow). Use it only if measured create latency is too high.
- **Verify a deployment** with `node scripts/runner/smoke.mjs https://your.site --repeat 5` (hello, stdin, compile error,
  infinite loop and runtime exception per language, with latency). Offline checks: `node scripts/runner/test.mjs`.

## Quality gates

- `pnpm validate`: runs every lesson through the real engine for its language (CPython for Python, the browser engines' own code in Node for JavaScript and SQL). Every lesson's reference solution must pass all tests and its starter must fail at least one (so nothing ships pre-solved or broken), and every feature must be unlocked by some lesson.
- `pnpm typecheck`, `pnpm build`, `eslint` (React Compiler rules are on).

## Accounts and cloud sync (Supabase)

- **Auth**: Supabase email + password (`src/data/auth/store.ts`), with email confirmation and password reset.
  The `/account` page hosts sign in, sign up, reset and "choose a new password".
- **Database**: `supabase/migrations/` (project `pockett`). A trigger on `auth.users` creates a `profiles` row
  for every sign-up; `lesson_completions` and `lesson_drafts` hold progress. Row level security restricts every
  table to its owner; the trigger function is not callable through the API.
- **Sync** (`src/data/progress/sync.ts`): localStorage stays the source of truth for the UI, so the app is instant
  and works offline. When signed in, the engine pulls cloud rows and merges them with this device
  (`merge.ts`, tested by `pnpm test:sync`), then pushes only what changed, debounced.
- The Supabase URL and publishable key are public by design and default to the production project
  (`src/data/supabase/client.ts`); env vars can override them.

## Deployment

Vercel project `pockett` builds `main` on every push. No server-side code execution is needed: pages are
prerendered, Python runs in the browser, and auth/data go straight from the browser to Supabase.

## Known limits

- Pyodide and Monaco load from CDNs (jsDelivr). Self-host them under `/public` for offline or locked-down environments.
- Without an account, progress lives only in that browser.
- Learners' hook functions run on the main thread (guarded by the watchdog); a pathological hook can still cost a frame.
- The lesson page ships the whole project (including reference solutions and tests) to the client, so a determined learner can read answers. Fine for a free learning site; use `toPublicProject()` + server grading if that ever matters.
