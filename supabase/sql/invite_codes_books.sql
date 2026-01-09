-- Run this in the Supabase SQL editor.
-- Adds optional per-title scoping to invite codes.

alter table public.invite_codes
  add column if not exists allowed_book_ids text[];

create index if not exists invite_codes_allowed_book_ids_gin_idx
  on public.invite_codes using gin (allowed_book_ids);
