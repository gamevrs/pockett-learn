# Pockett-Learn ⚡
> **100% Free, Interactive Programming Academy powered by In-Browser WebAssembly.**

Inspired by the gamified, unit-tested feedback loops of **Boot.dev**, the visual bold editorial energy of **The Verge**, and the structured academic progression of **Coursera**.

---

## 🌟 Key Features

1. **Client-Side WebAssembly Python Engine (Pyodide 3.12)**
   - Zero remote server execution cost or queue latency.
   - Code runs securely inside the user's browser with real-time `sys.stdout` and `sys.stderr` capture.
   - Automated unit test assertion suites evaluated directly in the Python runtime.

2. **Gamified Engineering Progression (Boot.dev-style)**
   - Mission narratives with real-world scenarios.
   - XP system, Daily Streaks 🔥, Leveling up (Lv. 1 to Lv. 10+), and achievement badges.
   - Tiered progressive hints with reference solutions and explanations.
   - Celebratory triumph fanfare synthesized via browser Web Audio API + confetti particle bursts.

3. **Modern Cyber-Editorial Design (The Verge + Coursera)**
   - Neon Emerald / Cyan / Amber / Violet accents on Obsidian `#07090e`.
   - Real-time ticker tape and active terminal preview directly on the homepage.
   - Coursera-grade syllabus breakdown with completion tracking, estimated durations, and skill tags.
   - Printable / downloadable Certificate of Completion with verification hash.

4. **100% Free & AdSense-Ready**
   - Zero paywalls or credit card requirements.
   - Pre-styled, non-intrusive Google AdSense slots (Leaderboard, Sidebar Rectangle, and In-Feed) engineered with zero Cumulative Layout Shift (CLS).

5. **Local-First with Cloud Scaling Path**
   - **Local Mode (Default)**: Instant progress persistence in `localStorage`.
   - **Cloud Scaling (Supabase + Vercel)**: Modular adapter ready to plug into `@supabase/supabase-js` for user accounts, Postgres profiles, and cloud code backups.

---

## 🐍 Python Curriculum (Intro Basics to Professional)

| Module | Title | Key Concepts |
| :--- | :--- | :--- |
| **01** | **The Genesis Byte** | `print()`, dynamic typing, numbers, arithmetic, integer division `//`, modulo `%` |
| **02** | **Logic & Control Flow** | Booleans, comparison operators, `if`/`elif`/`else`, compound logic, short-circuiting |
| **03** | **Loops & Iterations** | `range()` sequences, `for` loops, accumulator patterns, convergent `while` loops |
| **04** | **Functions & Scope** | Function definitions, return signatures, dynamic `*args` and `**kwargs`, lexical scope |
| **05** | **Core Data Structures** | O(1) hash map dictionaries, list transformations, portfolio aggregators |
| **06** | **Object-Oriented Python** | Classes, `__init__`, state encapsulation, instance methods, resource allocators |
| **07** | **Error Handling & Resilience** | Defensive programming, `try`/`except`/`finally`, custom exceptions |
| **08** | **Pythonic Paradigms** | List comprehensions, higher-order functions, function decorators & closures |
| **09** | **Professional Python** | Modern `@dataclass` domain modeling, type contracts, financial packet settlement |

---

## 🚀 Getting Started Locally

```bash
# Clone and enter the repository
cd pockett-learn

# Install dependencies
pnpm install

# Start development server
pnpm dev
# Open http://localhost:3000

# Build and start production server
pnpm build
pnpm start
```

---

## ☁️ Scaling to Supabase & Vercel

### 1. Supabase Postgres Schema
When ready to enable cloud user profiles and leaderboard sync, run the following SQL inside your Supabase SQL Editor:

```sql
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  xp integer default 0,
  level integer default 1,
  streak integer default 1,
  completed_lessons text[] default '{}',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.lesson_submissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  lesson_id text not null,
  code text not null,
  passed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
```

### 2. Environment Variables
Add to `.env.local` or Vercel Project Settings:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxxxxxxxxxx
```

---

## 🛠 Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack, Partial Prerendering)
- **UI & Styling**: React 19, Tailwind CSS v4, Lucide Icons
- **Code Editor**: Monaco Editor (`@monaco-editor/react`)
- **Python Execution Engine**: Pyodide 0.26 WebAssembly (CPython 3.12)
- **Audio Synthesizer**: Zero-dependency Web Audio API oscillator synthesis
- **Celebration**: Canvas-Confetti
