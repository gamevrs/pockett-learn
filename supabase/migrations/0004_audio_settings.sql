-- App-wide audio preference (UI sounds + demo scenes), synced per account.
-- Audio is OFF by default: the old `sound_enabled` column defaulted to true, so it is ignored by the app from now on
-- (nobody should be un-muted by a default they never chose). The new columns only hold an explicit choice, and
-- `audio_updated_at` stays null until the person actually changes something, so a never-touched profile never overrides a device.
-- The app tolerates this migration not being applied yet (audio then stays on the device only).
alter table public.profiles
  add column if not exists audio_enabled boolean not null default false,
  add column if not exists audio_volume real not null default 0.6 check (audio_volume >= 0 and audio_volume <= 1),
  add column if not exists audio_updated_at timestamptz;

comment on column public.profiles.audio_enabled is 'Explicit opt-in to sound. Default false.';
comment on column public.profiles.audio_volume is 'Master volume 0..1.';
comment on column public.profiles.audio_updated_at is 'When the person last changed their audio setting (newest wins across devices).';
