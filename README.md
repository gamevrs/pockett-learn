# pockett.

Free, interactive Python. You pick a **project** (a car, a rocket, a drum machine) and your code makes it *come alive*: every lesson you pass bolts a new part onto a live demo. Python runs entirely in the browser (Pyodide / WebAssembly); there is no code-execution server, and no account is needed (an optional free account syncs progress).

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck    # tsc
pnpm validate     # runs every lesson's solution + starter through the real Python engine
pnpm build
```

## What's in the box

| Project | Python concepts | Comes alive |
| --- | --- | --- |
| 🏎️ **Turbo Garage** | print, variables, math, functions, if/else, loops, lists, dicts, classes | a car you can drive, then an autopilot you write |
| 🚀 **Launch Control** | loops, math, functions, conditionals, dicts, classes | a rocket flight to orbit |
| 🥁 **Beat Lab** | strings, lists, loops, functions, dicts, classes | a synthesized drum machine |

Plus a dashboard (XP, streak, badges) and a free-play Python sandbox.

## How a "living project" works

1. The learner edits **one growing `main.py`** per project. Each lesson appends a TODO to what they already wrote.
2. **Run** executes it in Pyodide, then grades it with the lesson's `assert` tests.
3. The result is a `ProgramHandle`: the scene reads plain values (`program.num("top_speed", 120)`) and calls the learner's functions (`program.call("steer", left, right)`) every frame.
4. Passing a lesson **unlocks features** (`lesson.unlocks`). Scenes render locked features as blueprints and unlocked ones fully alive.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full picture, and [docs/ADDING_A_PROJECT.md](docs/ADDING_A_PROJECT.md) to build a new one.

## Accounts

Learning needs no account: progress saves in the browser. A free account (Supabase Auth) syncs progress,
code and streaks across devices; see `supabase/migrations/` and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
