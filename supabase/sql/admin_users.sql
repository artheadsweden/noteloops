-- Run this in the Supabase SQL editor.
-- Marks a subset of authenticated users as "admins".

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Allow a logged-in user to check whether THEY are an admin.
drop policy if exists "admin_users_select_self" on public.admin_users;
create policy "admin_users_select_self"
  on public.admin_users
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update/delete policies.
-- Admin assignment is done via SQL editor or server-only routes using the service role key.
