-- Waitlist signups (public landing page)

create extension if not exists pgcrypto;

create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_entries_email_lower_unique
  on public.waitlist_entries (lower(email));
