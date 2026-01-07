import { getBrowserSupabaseClient, isSupabaseConfigured } from "@/services/supabase/browser";
import { getCurrentUserId } from "@/services/supabase/auth";

import type { UserProgress } from "@/services/progress/types";

type UserProgressRow = {
  user_id: string;
  book_id: string;
  last_chapter_id: string;
  last_pid: string | null;
  last_timestamp: number;
  furthest_chapter_id: string | null;
  furthest_pid: string | null;
  furthest_timestamp: number;
  updated_at?: string;
};

export async function upsertSupabaseProgress(
  progress: Omit<UserProgress, "updated_at">
): Promise<{ saved: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { saved: false };

  const userId = await getCurrentUserId();
  if (!userId) return { saved: false };

  const supabase = getBrowserSupabaseClient();

  const row: UserProgressRow = {
    user_id: userId,
    book_id: progress.book_id,
    last_chapter_id: progress.last_chapter_id,
    last_pid: progress.last_pid,
    last_timestamp: progress.last_timestamp,
    furthest_chapter_id: progress.furthest_chapter_id,
    furthest_pid: progress.furthest_pid,
    furthest_timestamp: progress.furthest_timestamp
  };

  const { error } = await supabase
    .from("user_progress")
    .upsert(row, { onConflict: "user_id,book_id" });

  if (error) return { saved: false, error: error.message };
  return { saved: true };
}

export async function getSupabaseProgress(bookId: string): Promise<UserProgress | null> {
  if (!isSupabaseConfigured()) return null;

  const userId = await getCurrentUserId();
  if (!userId) return null;

  const supabase = getBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("user_progress")
    .select(
      "book_id,last_chapter_id,last_pid,last_timestamp,furthest_chapter_id,furthest_pid,furthest_timestamp,updated_at"
    )
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    book_id: data.book_id,
    last_chapter_id: data.last_chapter_id,
    last_pid: data.last_pid,
    last_timestamp: data.last_timestamp,
    furthest_chapter_id: data.furthest_chapter_id ?? null,
    furthest_pid: data.furthest_pid ?? null,
    furthest_timestamp: typeof data.furthest_timestamp === "number" ? data.furthest_timestamp : 0,
    updated_at: data.updated_at
  };
}

export async function listSupabaseProgressForBooks(bookIds: string[]): Promise<UserProgress[]> {
  if (!isSupabaseConfigured()) return [];

  const userId = await getCurrentUserId();
  if (!userId) return [];

  const ids = bookIds.filter(Boolean);
  if (ids.length === 0) return [];

  const supabase = getBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("user_progress")
    .select(
      "book_id,last_chapter_id,last_pid,last_timestamp,furthest_chapter_id,furthest_pid,furthest_timestamp,updated_at"
    )
    .eq("user_id", userId)
    .in("book_id", ids)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as Array<Record<string, unknown>>).flatMap((row) => {
    const book_id = typeof row.book_id === "string" ? row.book_id : null;
    const last_chapter_id = typeof row.last_chapter_id === "string" ? row.last_chapter_id : null;
    const last_timestamp = typeof row.last_timestamp === "number" ? row.last_timestamp : null;
    const updated_at = typeof row.updated_at === "string" ? row.updated_at : null;

    if (!book_id || !last_chapter_id || last_timestamp === null || !updated_at) return [];

    return [
      {
        book_id,
        last_chapter_id,
        last_pid: typeof row.last_pid === "string" ? row.last_pid : null,
        last_timestamp,
        furthest_chapter_id:
          typeof row.furthest_chapter_id === "string" ? row.furthest_chapter_id : null,
        furthest_pid: typeof row.furthest_pid === "string" ? row.furthest_pid : null,
        furthest_timestamp:
          typeof row.furthest_timestamp === "number" ? row.furthest_timestamp : 0,
        updated_at
      }
    ];
  });
}
