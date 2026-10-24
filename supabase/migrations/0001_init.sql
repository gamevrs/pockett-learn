-- pockett. cloud schema (not applied yet: the app is local-first today).
-- Apply with the Supabase CLI once accounts are switched on. Mirrors ProgressState in
-- src/data/progress/types.ts so a SupabaseProgressRepository is a small, mechanical addition.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  xp integer not null default 0 check (xp >= 0),
  streak integer not null default 0,
  best_streak integer not null default 0,
  last_active_date date,
  sound_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per lesson a learner has passed. `code` is their whole main.py at that moment.
create table public.lesson_completions (
  user_id uuid not null references public.profiles on delete cascade,
  project_slug text not null,
  lesson_id text not null,
  code text not null,
  attempts integer not null default 1,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- Work in progress, one draft per lesson (last write wins).
create table public.lesson_drafts (
  user_id uuid not null references public.profiles on delete cascade,
  lesson_id text not null,
  code text not null,
  hints_seen integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.profiles enable row level security;
alter table public.lesson_completions enable row level security;
alter table public.lesson_drafts enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own completions" on public.lesson_completions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own drafts" on public.lesson_drafts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index lesson_completions_project_idx on public.lesson_completions (user_id, project_slug);
