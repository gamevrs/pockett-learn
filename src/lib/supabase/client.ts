/**
 * Supabase Client & Schema Configuration
 *
 * pockett-learn is built local-first: all progress works out-of-the-box
 * in local storage. When you're ready to deploy to Supabase, provide:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 *
 * Postgres Schema for Supabase:
 * ----------------------------------------------------
 * create table public.profiles (
 *   id uuid references auth.users not null primary key,
 *   username text unique,
 *   xp integer default 0,
 *   level integer default 1,
 *   streak integer default 1,
 *   completed_lessons text[] default '{}',
 *   updated_at timestamp with time zone default timezone('utc'::text, now())
 * );
 *
 * create table public.lesson_submissions (
 *   id uuid default gen_random_uuid() primary key,
 *   user_id uuid references public.profiles(id),
 *   lesson_id text not null,
 *   code text not null,
 *   passed boolean default false,
 *   created_at timestamp with time zone default timezone('utc'::text, now())
 * );
 * ----------------------------------------------------
 */

export const isSupabaseConfigured = (): boolean => {
  return !!(
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export async function syncProgressToSupabase(userStats: any): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }
  // Future sync implementation with @supabase/supabase-js
  return true;
}
