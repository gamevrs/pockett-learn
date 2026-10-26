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
      remote.ts             C# / C++ / Go / Rust via /api/run → a Vercel Sandbox microVM (src/server/runner)
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
            Scene reads vars ─┤─ Scene calls hooks (JSON in/out, 0.25s watchdog each; run_tests gets 2s)
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
| C#, C++, Go, Rust | pockett runner via `/api/run` | reads stdout and `@scene {json}` lines | JavaScript over `stdout`, `lines`, `scene` |

- **Names are Python-style at the scene boundary.** Scenes ask for `car_name` or `autopilot.steer`;
  the JavaScript runtime also tries camelCase (`carName`), so one scene serves several languages.
  Turbo Garage in JavaScript reuses the Python course's 3D scene unchanged.
- **JavaScript safety.** Code runs in a function scope with a captured `console`. Every loop body
  gets a `__guard()` call inserted with acorn (no newlines added, so error lines stay exact), which
  throws after the time budget: 2 s for a run, 60 ms per hook call, 1 s per check.
- **SQL setup.** `Project.setup` (schema + seed rows) runs before the learner's statements on a
  fresh database every time, so runs are deterministic and checks can `query()` the end state.
- **SQL schema-design courses.** The SQL runtime also hands scenes `log` (a diary of every statement that returns no rows: verb, one-line text, rows changed, rows changed indirectly by triggers or foreign-key actions) and, per table or view, the stored CREATE text, column flags (NOT NULL, default, primary-key position, generated), foreign keys, indexes and triggers. A comment line `-- expect error` directly above a statement says "the database should refuse this": the refusal is logged (and printed) instead of stopping the run, and a statement that is accepted anyway is logged without an error. Checks get `log` as an extra argument, so a lesson can verify that a probe was refused for the right reason. Schema Studio (`schema-studio`) is built on this; `scripts/gen-schema-studio-demo.mjs` freezes its finished run into the scene's demo data.
- **Compiled languages** (C#, C++, Go, Rust) run on Vercel Sandbox, a Firecracker microVM per run, via
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
  std build cache; Rust (stable via rustup, minimal profile, in `/opt/rust`, with `/opt/rust/toolchain` pointing at the
  installed toolchain so `run.sh` calls the real `rustc`, which links through `cc` from the g++ package); two unprivileged users (`pkbuild`, `pkrun`); and `/opt/pockett/run.sh`. Build it with
  `POST /api/run/setup` (bearer `RUNNER_ADMIN_TOKEN`, 404 if unset, `maxDuration` 800 s) or
  `node scripts/runner/build-snapshot.mjs`; both run the same routine (`provision.ts`), warm the caches by
  compiling and running a program per language, then self-test the saved snapshot through the real run path.
  Set the printed id as `RUNNER_SNAPSHOT_ID` and redeploy. Rebuild when you change `assets.ts` or want newer toolchains.
- **Per request** (`execute.ts`): create a sandbox from the snapshot (1-2 vCPU, `deny-all` network incl. DNS,
  about 25 s hard lifetime, not persistent), write the source and stdin, run `run.sh` as root with a random report marker,
  parse the report (`result.ts`), then stop the sandbox after the response (`after()`, backed by the sandbox's own
  timeout). `run.sh` compiles as `pkbuild` (10 s, `timeout`), runs as `pkrun` (3 s wall, no write access outside its
  scratch dir; stdout capped by `ulimit -f` and `head -c` at 100 KB; 256 processes; 1 GiB address space for C++/Go,
  256 MiB GC heap for .NET) and prints stdout, stderr, exit code, compiler output and timings. Auth is the
  deployment's Vercel OIDC token, picked up by the SDK; there are no long-lived secrets.
- **Line numbers.** Sources are never wrapped or renamed (`Program.cs`, `main.cpp`, `main.go`, `main.rs`), so compiler
  diagnostics and stack traces already use the learner's own lines. C# compiles in-process with Roslyn (debug build,
  portable pdb) and runs as a normal `dotnet program.dll`, so `Program.cs:line N` appears in exception traces; the
  usings that `dotnet new console` turns on are supplied as a separate hidden file.
- **Response mapping.** `{ stdout, stderr, exitCode, compileError, timedOut }`. Compiler output goes to `compileError`
  (temp paths and tool banners stripped); a timeout is exit 137 with a friendly message; silent crashes (segfault,
  divide by zero) get an explanation. Errors: 400/413 bad input, 429 rate limited or busy, 502 runner failure,
  503 not set up, snapshot gone, or the snapshot predates the language (`run.sh` exits 64 "unsupported language" and the
  route answers with a friendly "isn't available yet" message instead of a 502).
- **Rust.** `rustc --edition 2021 -C opt-level=1 -C debuginfo=0 -C codegen-units=4 -C debug-assertions=on -A warnings --color never`
  (debug assertions give "attempt to add with overflow" panics; warnings are muted so errors stay short). Diagnostics
  are parsed client-side in `remote-output.ts`: `error[E0382]: ...` plus ` --> main.rs:12:5` becomes
  `{ type: "E0382", message, line }` (first error wins); a `thread 'main' panicked at main.rs:7:5:` report on stderr
  (exit 101) becomes `{ type: "Panic", message, line }`. The compile step has no `ulimit -v`, so rustc/LLVM's large
  address-space mappings are unaffected.
- **Abuse protection.** 64 KB source and stdin limits, a per-IP sliding window (30/min) and a global in-flight cap (8),
  both in memory per server instance (best effort on serverless; Vercel's firewall and Sandbox quotas are the hard backstop).
- **Strategies** (`RUNNER_MODE`). `fresh` (default) is one microVM per run: the strongest isolation, because nothing a
  learner does can be observed by the next. `pool` keeps up to `RUNNER_POOL_SIZE` warm microVMs per server instance for
  ~4 minutes / 40 runs and skips the create cost; every run still gets fresh scratch dirs, a root-owned toolchain, and
  all `pkrun`/`pkbuild` processes and temp files are killed and deleted afterwards. The trade-off: learners then
  share a VM over time (no network, no secrets in it, but a determined learner could leave something behind that
  `pkbuild`'s caches or /tmp allow). Use it only if measured create latency is too high.
- **Cost controls.** Sandboxes bill for the time they run (and snapshots for storage), so nothing is allowed to linger. Code: `cost.ts` (pure helpers, unit-tested), constants in `config.ts`, `limits.ts`, `execute.ts`, `provision.ts`, `app/api/run/sweep/route.ts`, `vercel.json`.
  - *Per-run ceiling.* A fresh run sandbox is created with a platform `timeout` of compile + run + 12 s (`RUN_SANDBOX_TIMEOUT_MS`, about 25 s, derived from `LIMITS`), so one run can never bill more than that even if the function dies; the `runCommand` backstop (23 s) sits below it and `after()` stops the VM as soon as the response is sent.
  - *Pool idle ceiling.* `RUNNER_MODE=pool` (off by default) trades a small idle cost for latency: a warm VM bills while it waits. Each pool VM has a hard timeout of 4 min 30 s, and a check deferred with `after()` after every run stops VMs idle for 40 s, so an idle VM costs at most about 40 s and no VM outlives 4.5 min. Keep `fresh` unless create latency is measured to be a problem.
  - *Sweeper.* Sandboxes are named `pk-run-`, `pk-pool-`, `pk-setup-` plus a random suffix. A Vercel Cron job calls `GET /api/run/sweep` every 10 minutes (needs the `CRON_SECRET` env var, which Vercel sends as the bearer token; 404 if unset, 401 if wrong), lists the project's sandboxes and stops live ones older than 2 min (run), 6.5 min (pool) or 25 min (setup, and any name we don't recognise), logging each one. It is a backstop; normally it finds nothing.
  - *Snapshot clean-up.* `provision.ts` deletes a snapshot whose self-test failed, and after a good build deletes all older snapshots of the project except the new one and the current `RUNNER_SNAPSHOT_ID` (plus any ids in `RUNNER_KEEP_SNAPSHOT_IDS`). Deletions are best effort and listed in the report's `cleanup`. The live snapshot never expires. Note: if you switch `RUNNER_SNAPSHOT_ID` but don't redeploy before the next setup run, the running deployment still sees the old id; put the new id in `RUNNER_KEEP_SNAPSHOT_IDS` too, or redeploy first.
  - *Kill switch.* `RUNNER_DISABLED=1` makes `/api/run` answer 503 with the friendly "isn't available" message before it touches the SDK; redeploy after changing the variable.
  - *Rate guards.* Per-IP limit, in-flight cap, and a global per-instance cap on sandbox creations per minute (`RUNNER_MAX_CREATES_PER_MIN`, default 120; over it the route answers 429).
  - *Recommended (owner, in Vercel).* Turn on Spend Management for the team with a monthly cap and an alert threshold, so the account stops or warns before a surprise bill, whatever the code does.
- **Verify a deployment** with `node scripts/runner/smoke.mjs https://your.site --repeat 5` (hello, stdin, compile error,
  infinite loop and runtime exception per language, with latency). Offline checks: `node scripts/runner/test.mjs`.
- **Adding a language to the snapshot** (Rust was the last): the live snapshot is immutable, so the new code is safe to
  deploy first (old snapshot keeps serving C#/C++/Go; the new language answers "isn't available yet"). Then, as the owner:
  1. `curl -X POST -H "Authorization: Bearer $RUNNER_ADMIN_TOKEN" https://www.pockett.ai/api/run/setup` (takes several
     minutes; the JSON report must say `"ok": true`, its `selfTest` includes the Rust samples, a broken install fails it).
  2. Set `RUNNER_SNAPSHOT_ID` to the returned `snapshotId` in the Vercel project's environment variables.
  3. Redeploy.
  4. `node scripts/runner/smoke.mjs https://www.pockett.ai` (all four languages must pass), then
     `RUNNER_BASE_URL=https://www.pockett.ai pnpm validate <rust-project-slug>`.
  (From a dev machine, `node scripts/runner/build-snapshot.mjs` does step 1 with `vercel env pull` credentials.)

## Quality gates

- `pnpm validate`: runs every lesson through the real engine for its language (CPython for Python, the browser engines' own code in Node for JavaScript and SQL). Every lesson's reference solution must pass all tests and its starter must fail at least one (so nothing ships pre-solved or broken), and every feature must be unlocked by some lesson.
  - Server languages (C#, C++, Go, Rust) need the live runner: `RUNNER_BASE_URL=https://www.pockett.ai pnpm validate csharp-basics`. Each case is sent to `${RUNNER_BASE_URL}/api/run` (throttled to the route's ~30 runs/min, retried on 429/5xx) and judged by `engine/runtimes/remote-output.ts`, the same code the browser uses. `RUNNER_CACHE=1` reuses answers for identical source while authoring, and a third argument (`pnpm validate csharp-basics 5-loops`) limits it to lessons whose id contains that text. Without `RUNNER_BASE_URL` those lessons are skipped with a warning.
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
