-- Run this in the Supabase SQL editor.
-- Enables deleting your own feedback (paragraph, chapter, and book).

-- Paragraph feedback delete policy
alter table public.feedback enable row level security;

drop policy if exists "feedback_delete_own" on public.feedback;
create policy "feedback_delete_own"
  on public.feedback
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Chapter feedback delete policy
alter table public.chapter_feedback enable row level security;

drop policy if exists "chapter_feedback_delete_own" on public.chapter_feedback;
create policy "chapter_feedback_delete_own"
  on public.chapter_feedback
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Book feedback delete policy
alter table public.book_feedback enable row level security;

drop policy if exists "book_feedback_delete_own" on public.book_feedback;
create policy "book_feedback_delete_own"
  on public.book_feedback
  for delete
  to authenticated
  using (auth.uid() = user_id);
