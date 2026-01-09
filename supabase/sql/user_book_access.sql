-- Run this in the Supabase SQL editor.
-- Per-user book access list (used when user_profiles.access_mode = 'restricted').

create extension if not exists pgcrypto;

create table if not exists public.user_book_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

alter table public.user_book_access enable row level security;

-- Users can read their own access list.
drop policy if exists "user_book_access_select_own" on public.user_book_access;
create policy "user_book_access_select_own"
  on public.user_book_access
  for select
  to authenticated
  using (auth.uid() = user_id);
