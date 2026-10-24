-- pockett. accounts + progress schema.
-- Mirrors ProgressState in src/data/progress/types.ts so a SupabaseProgressRepository is a
-- small, mechanical addition. Sign-up itself is Supabase Auth; this migration makes every new
-- auth user get a profile row automatically, and locks every table to its owner with RLS.

-- ───────────── profiles: one per auth user ─────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  avatar_url text,
  xp integer not null default 0 check (xp >= 0),
  streak integer not null default 0 check (streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  last_active_date date,
  sound_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Public profile + aggregate progress for each learner (1:1 with auth.users).';

-- ───────────── lesson completions: the learner's whole main.py when they passed ─────────────
create table public.lesson_completions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_slug text not null,
  lesson_id text not null,
  code text not null check (char_length(code) <= 100000),
  attempts integer not null default 1 check (attempts >= 1),
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index lesson_completions_user_project_idx on public.lesson_completions (user_id, project_slug);

-- ───────────── drafts: work in progress, last write wins ─────────────
create table public.lesson_drafts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null,
  code text not null check (char_length(code) <= 100000),
  hints_seen integer not null default 0 check (hints_seen >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ───────────── updated_at bookkeeping ─────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger lesson_drafts_set_updated_at
  before update on public.lesson_drafts
  for each row execute function public.set_updated_at();

-- ───────────── new auth user -> profile ─────────────
-- security definer so it can write to public.profiles while running as the auth service;
-- empty search_path + fully-qualified names so it can't be hijacked.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), 60),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── row level security: owners only ─────────────
alter table public.profiles enable row level security;
alter table public.lesson_completions enable row level security;
alter table public.lesson_drafts enable row level security;

-- profiles are created by the trigger and removed by deleting the auth user (cascade),
-- so learners may only read and update their own row.
create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: update own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "completions: read own" on public.lesson_completions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "completions: insert own" on public.lesson_completions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "completions: update own" on public.lesson_completions
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "completions: delete own" on public.lesson_completions
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "drafts: read own" on public.lesson_drafts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "drafts: insert own" on public.lesson_drafts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "drafts: update own" on public.lesson_drafts
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "drafts: delete own" on public.lesson_drafts
  for delete to authenticated using ((select auth.uid()) = user_id);
