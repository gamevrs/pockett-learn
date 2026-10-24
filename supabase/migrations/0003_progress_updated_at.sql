-- Newest-wins sync needs to know when a completion / draft was last changed *on the learner's device*.
alter table public.lesson_completions add column updated_at timestamptz not null default now();
-- drafts carry the client's edit time; the server-side "now()" trigger would hide which edit is newer
drop trigger if exists lesson_drafts_set_updated_at on public.lesson_drafts;
