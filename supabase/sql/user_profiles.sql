-- Run this in the Supabase SQL editor.
-- Stores user-facing profile info (name + optional preferences) and admin-only flags.

create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  preferred_genres text[] ,
  wants_release_invites boolean not null default false,
  access_mode text not null default 'all',
  blocked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_access_mode_chk check (access_mode in ('all','restricted'))
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

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

alter table public.user_profiles enable row level security;

-- Users can read their own profile.
drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
  on public.user_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can create their own profile.
drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
  on public.user_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can update their own profile (limited by app logic; admins use service role routes).
drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
  on public.user_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
