-- Run this in the Supabase SQL editor.
-- Invite Wall (single shared invite codes, server-verified).

create table if not exists public.invite_codes (
  code text primary key,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.invite_codes enable row level security;

-- No RLS policies are intentionally created.
-- The app verifies codes via a server route using the service role key.
-- This prevents exposing invite codes to the client.
