-- Run this in the Supabase SQL editor.
-- Adds invite tracking (who was invited), TTL, and editable invite message templates.

-- 1) Extend invite_codes with TTL + usage tracking
alter table public.invite_codes
  add column if not exists expires_at timestamptz,
  add column if not exists expired_at timestamptz,
  add column if not exists max_uses integer,
  add column if not exists uses_count integer not null default 0,
  add column if not exists last_used_at timestamptz;

-- Optional: index for expiry cleanup / lookups
create index if not exists invite_codes_expires_at_idx on public.invite_codes (expires_at);

-- 2) Track delivered invites (email -> code), with pending/accepted/expired status
create table if not exists public.invite_deliveries (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.invite_codes(code) on delete cascade,
  email text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz,
  expired_at timestamptz,
  message_subject text,
  message_text text
);

create index if not exists invite_deliveries_code_idx on public.invite_deliveries (code);
create index if not exists invite_deliveries_email_idx on public.invite_deliveries (email);
create index if not exists invite_deliveries_status_idx on public.invite_deliveries (status);

alter table public.invite_deliveries enable row level security;

-- No RLS policies: app uses service role on server routes.

-- 3) Editable invite message template(s)
create table if not exists public.invite_templates (
  key text primary key,
  subject text not null,
  body_text text not null,
  updated_at timestamptz not null default now()
);

alter table public.invite_templates enable row level security;

-- Seed a default template if missing.
insert into public.invite_templates (key, subject, body_text)
values (
  'default',
  'You\'re invited',
  'You have been invited. Open this link to continue:\n\n{{invite_link}}\n'
)
on conflict (key) do nothing;

-- 4) Log invite code attempts (invalid/expired/used/ok), so admins can see failed tries.
create table if not exists public.invite_attempts (
  id uuid primary key default gen_random_uuid(),
  code text,
  outcome text not null,
  email text,
  delivery_id uuid references public.invite_deliveries(id) on delete set null,
  created_at timestamptz not null default now(),
  user_agent text
);

create index if not exists invite_attempts_created_at_idx on public.invite_attempts (created_at);
create index if not exists invite_attempts_code_idx on public.invite_attempts (code);
create index if not exists invite_attempts_outcome_idx on public.invite_attempts (outcome);
create index if not exists invite_attempts_email_idx on public.invite_attempts (email);

alter table public.invite_attempts enable row level security;
