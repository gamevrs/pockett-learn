-- Self-service account deletion (App Store guideline 5.1.1(v), Google Play's account deletion policy).
-- A signed-in learner calls supabase.rpc('delete_my_account') from the Account page; there is no service-role key
-- anywhere. The function runs as its owner (security definer) and only ever touches the caller's own rows, found by
-- auth.uid() from the caller's JWT, which it cannot choose.
--
-- What belongs to a learner (migrations 0001-0004), and how each row goes:
--   public.lesson_drafts       user_id -> public.profiles(id)  on delete cascade   (deleted explicitly below)
--   public.lesson_completions  user_id -> public.profiles(id)  on delete cascade   (deleted explicitly below)
--   public.profiles            id      -> auth.users(id)       on delete cascade   (deleted explicitly below)
--   auth.users                 the account itself                                  (deleted explicitly below)
--   auth.identities, auth.sessions, auth.refresh_tokens, auth.mfa_*, auth.one_time_tokens: Supabase's own tables,
--     on delete cascade from auth.users, so every sign-in and refresh token of the account ends with it.
-- No storage buckets are used (avatar_url is only text from sign-up metadata). Every FK already cascades, so deleting
-- the auth.users row alone would be enough; the explicit deletes run child to parent anyway, so if a later migration
-- adds a learner table WITHOUT a cascade, this fails loudly (foreign key violation, nothing deleted) instead of leaving
-- rows behind. The whole call is one transaction: it deletes everything or nothing.
--
-- Safe to run once on a database with 0001-0004 applied; re-running it only replaces the function and re-states grants.

-- The owner must be able to delete from auth.users (true for `postgres` on Supabase). Fail here, at apply time, rather
-- than on a learner's first attempt.
do $$
begin
  if not has_table_privilege(current_user, 'auth.users', 'DELETE') then
    raise exception 'delete_my_account: % cannot delete from auth.users; apply this migration as postgres', current_user;
  end if;
end;
$$;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  delete from public.lesson_drafts where user_id = uid;
  delete from public.lesson_completions where user_id = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

alter function public.delete_my_account() owner to postgres;

comment on function public.delete_my_account() is
  'Deletes the calling learner''s progress, drafts, profile and auth account. Callable by authenticated users only; acts on auth.uid() only.';

-- Supabase's default privileges grant EXECUTE on new public functions to anon and authenticated: take it back from
-- everyone, then give it to signed-in users only.
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Verification (run by hand after applying; read-only):
--
-- 1. The function: security definer, empty search_path, owned by postgres, callable by authenticated only.
--    Expect: prosecdef = true, proconfig = {search_path=""}, owner = postgres, anon_exec = false, public_exec = false,
--    authenticated_exec = true.
-- select p.prosecdef,
--        p.proconfig,
--        pg_get_userbyid(p.proowner)                                   as owner,
--        has_function_privilege('anon', p.oid, 'execute')              as anon_exec,
--        has_function_privilege('authenticated', p.oid, 'execute')     as authenticated_exec,
--        exists (select 1 from aclexplode(p.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') as public_exec
-- from pg_proc p
-- where p.oid = 'public.delete_my_account()'::regprocedure;
--
-- 2. Every foreign key that points at an account or a profile, and what happens on delete.
--    Expect confdeltype = 'c' (cascade) on every row; any other value is a table this function must learn about.
-- select c.conrelid::regclass  as from_table,
--        c.confrelid::regclass as to_table,
--        c.conname,
--        c.confdeltype
-- from pg_constraint c
-- where c.contype = 'f'
--   and c.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
-- order by 2, 1;
--
-- 3. An anonymous call is refused (run as anon, e.g. via the REST API with only the publishable key):
--    POST /rest/v1/rpc/delete_my_account  ->  401/403 permission denied for function delete_my_account
