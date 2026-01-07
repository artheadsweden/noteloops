import { getBrowserSupabaseClient, isSupabaseConfigured } from "@/services/supabase/browser";
import { getCurrentUserId } from "@/services/supabase/auth";

import type { BookFeedbackItem, ChapterFeedbackItem, FeedbackItem } from "@/services/feedback/types";

type FeedbackRow = {
  id: string;
  book_id: string;
  chapter_id: string;
  pid: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
};

export async function listFeedbackForPid(params: {
  bookId: string;
  chapterId: string;
  pid: string;
}): Promise<FeedbackItem[]> {
  if (!isSupabaseConfigured()) return [];

  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = getBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("feedback")
    .select("id,book_id,chapter_id,pid,comment_text,created_at,updated_at")
    .eq("book_id", params.bookId)
    .eq("chapter_id", params.chapterId)
    .eq("pid", params.pid)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as FeedbackRow[]).map((r) => ({
    id: r.id,
    book_id: r.book_id,
    chapter_id: r.chapter_id,
    pid: r.pid,
    comment_text: r.comment_text,
    created_at: r.created_at,
    updated_at: r.updated_at
  }));
}

export async function addFeedback(params: {
  bookId: string;
  chapterId: string;
  pid: string;
  commentText: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase not configured" };

  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not logged in" };

  const supabase = getBrowserSupabaseClient();

  const { error } = await supabase.from("feedback").insert({
    user_id: userId,
    book_id: params.bookId,
    chapter_id: params.chapterId,
    pid: params.pid,
    comment_text: params.commentText
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteFeedback(params: { id: string }): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase not configured" };

  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not logged in" };

  const supabase = getBrowserSupabaseClient();
  const { error } = await supabase.from("feedback").delete().eq("id", params.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

type ChapterFeedbackRow = {
  id: string;
  book_id: string;
  chapter_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
};

export async function listChapterFeedback(params: {
  bookId: string;
  chapterId: string;
}): Promise<ChapterFeedbackItem[]> {
  if (!isSupabaseConfigured()) return [];

  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = getBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("chapter_feedback")
    .select("id,book_id,chapter_id,comment_text,created_at,updated_at")
    .eq("book_id", params.bookId)
    .eq("chapter_id", params.chapterId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as ChapterFeedbackRow[]).map((r) => ({
    id: r.id,
    book_id: r.book_id,
    chapter_id: r.chapter_id,
    comment_text: r.comment_text,
    created_at: r.created_at,
    updated_at: r.updated_at
  }));
}

export async function addChapterFeedback(params: {
  bookId: string;
  chapterId: string;
  commentText: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase not configured" };

  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not logged in" };

  const supabase = getBrowserSupabaseClient();

  const { error } = await supabase.from("chapter_feedback").insert({
    user_id: userId,
    book_id: params.bookId,
    chapter_id: params.chapterId,
    comment_text: params.commentText
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteChapterFeedback(params: {
  id: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase not configured" };

  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not logged in" };

  const supabase = getBrowserSupabaseClient();
  const { error } = await supabase.from("chapter_feedback").delete().eq("id", params.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

type BookFeedbackRow = {
  id: string;
  book_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
};

export async function listBookFeedback(params: { bookId: string }): Promise<BookFeedbackItem[]> {
  if (!isSupabaseConfigured()) return [];

  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = getBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("book_feedback")
    .select("id,book_id,comment_text,created_at,updated_at")
    .eq("book_id", params.bookId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as BookFeedbackRow[]).map((r) => ({
    id: r.id,
    book_id: r.book_id,
    comment_text: r.comment_text,
    created_at: r.created_at,
    updated_at: r.updated_at
  }));
}

export async function addBookFeedback(params: {
  bookId: string;
  commentText: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase not configured" };

  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not logged in" };

  const supabase = getBrowserSupabaseClient();
  const { error } = await supabase.from("book_feedback").insert({
    user_id: userId,
    book_id: params.bookId,
    comment_text: params.commentText
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteBookFeedback(params: {
  id: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase not configured" };

  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not logged in" };

  const supabase = getBrowserSupabaseClient();
  const { error } = await supabase.from("book_feedback").delete().eq("id", params.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
