-- Run this in the Supabase SQL editor.
-- Enables chapter-level feedback (not tied to a paragraph pid).

create table if not exists public.chapter_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null,
  chapter_id text not null,
  comment_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

drop trigger if exists trg_chapter_feedback_updated_at on public.chapter_feedback;
create trigger trg_chapter_feedback_updated_at
before update on public.chapter_feedback
for each row
execute function public.set_updated_at();

-- RLS
alter table public.chapter_feedback enable row level security;

drop policy if exists "chapter_feedback_select_own" on public.chapter_feedback;
create policy "chapter_feedback_select_own"
  on public.chapter_feedback
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "chapter_feedback_insert_own" on public.chapter_feedback;
create policy "chapter_feedback_insert_own"
  on public.chapter_feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "chapter_feedback_update_own" on public.chapter_feedback;
create policy "chapter_feedback_update_own"
  on public.chapter_feedback
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Optional: allow deleting your own feedback
-- drop policy if exists "chapter_feedback_delete_own" on public.chapter_feedback;
-- create policy "chapter_feedback_delete_own"
--   on public.chapter_feedback
--   for delete
--   to authenticated
--   using (auth.uid() = user_id);
