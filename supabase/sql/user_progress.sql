-- Run this in the Supabase SQL editor.
-- Enables per-user progress syncing for the Beta Reader Platform.

create table if not exists public.user_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null,
  last_chapter_id text not null,
  last_pid text,
  last_timestamp double precision not null default 0,
  -- Monotonic progress markers (never move backwards)
  furthest_chapter_id text,
  furthest_pid text,
  furthest_timestamp double precision not null default 0,
  updated_at timestamptz not null default now(),

  primary key (user_id, book_id)
);

-- Backfill / migrate existing installs
alter table public.user_progress
  add column if not exists furthest_chapter_id text;

alter table public.user_progress
  add column if not exists furthest_pid text;

alter table public.user_progress
  add column if not exists furthest_timestamp double precision not null default 0;

update public.user_progress
set
  furthest_chapter_id = coalesce(furthest_chapter_id, last_chapter_id),
  furthest_pid = coalesce(furthest_pid, last_pid),
  furthest_timestamp = greatest(coalesce(furthest_timestamp, 0), coalesce(last_timestamp, 0))
where
  furthest_chapter_id is null
  or furthest_pid is null
  or furthest_timestamp is null;

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_progress_updated_at on public.user_progress;
create trigger trg_user_progress_updated_at
before update on public.user_progress
for each row
execute function public.set_updated_at();

-- RLS
alter table public.user_progress enable row level security;

drop policy if exists "user_progress_select_own" on public.user_progress;
create policy "user_progress_select_own"
  on public.user_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_progress_upsert_own" on public.user_progress;
create policy "user_progress_upsert_own"
  on public.user_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_progress_update_own" on public.user_progress;
create policy "user_progress_update_own"
  on public.user_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
