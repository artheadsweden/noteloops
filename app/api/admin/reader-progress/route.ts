import { NextResponse } from "next/server";

import { listBookManifests } from "@/services/input/books";
import { getServerSupabaseAdminClient } from "@/services/supabase/server";

async function requireAdmin(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
  if (!token) return null;

  const supabase = getServerSupabaseAdminClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) return null;

  const userId = userData.user.id;
  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return adminRow ? userId : null;
}

type ProgressRow = {
  user_id: string;
  book_id: string;
  last_chapter_id: string;
  last_pid: string | null;
  last_timestamp: number;
  furthest_chapter_id: string | null;
  furthest_pid: string | null;
  furthest_timestamp: number;
  updated_at: string;
};

export type ReaderProgressItem = {
  user_id: string;
  email: string | null;
  book_id: string;
  percent_complete: number | null;
  chapter_index: number | null;
  total_chapters: number | null;
  furthest_chapter_id: string | null;
  last_chapter_id: string;
  last_pid: string | null;
  last_timestamp: number;
  updated_at: string;
};

function computeCompletion(params: {
  orderedChapterIds: string[];
  lastChapterId: string;
}): { percent: number; idx: number; total: number } | null {
  const total = params.orderedChapterIds.length;
  if (total <= 0) return null;

  const idx = params.orderedChapterIds.findIndex((id) => id === params.lastChapterId);
  if (idx < 0) return { percent: 0, idx: -1, total };

  const percent = Math.max(0, Math.min(100, Math.round(((idx + 1) / total) * 100)));
  return { percent, idx, total };
}

export async function GET(req: Request) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ ok: false }, { status: 403 });

  const supabase = getServerSupabaseAdminClient();

  const { data: progressData, error: progressErr } = await supabase
    .from("user_progress")
    .select(
      "user_id,book_id,last_chapter_id,last_pid,last_timestamp,furthest_chapter_id,furthest_pid,furthest_timestamp,updated_at"
    )
    .order("updated_at", { ascending: false });

  if (progressErr) {
    return NextResponse.json({ ok: false, error: progressErr.message }, { status: 500 });
  }

  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (usersErr) {
    return NextResponse.json({ ok: false, error: usersErr.message }, { status: 500 });
  }

  const emailById = new Map<string, string | null>();
  for (const u of usersData.users) {
    emailById.set(u.id, u.email ?? null);
  }

  const manifests = await listBookManifests().catch(() => []);
  const orderedChapterIdsByBook = new Map<string, string[]>();
  for (const m of manifests) {
    orderedChapterIdsByBook.set(
      m.book_id,
      m.chapters.slice().sort((a, b) => a.order_index - b.order_index).map((c) => c.chapter_id)
    );
  }

  const items: ReaderProgressItem[] = ((progressData ?? []) as ProgressRow[]).map((r) => {
    const chapterIds = orderedChapterIdsByBook.get(r.book_id) ?? null;
    const completionChapterId = r.furthest_chapter_id ?? r.last_chapter_id;
    const completion = chapterIds
      ? computeCompletion({ orderedChapterIds: chapterIds, lastChapterId: completionChapterId })
      : null;

    return {
      user_id: r.user_id,
      email: emailById.get(r.user_id) ?? null,
      book_id: r.book_id,
      percent_complete: completion ? completion.percent : null,
      chapter_index: completion ? completion.idx : null,
      total_chapters: completion ? completion.total : null,
      furthest_chapter_id: r.furthest_chapter_id ?? null,
      last_chapter_id: r.last_chapter_id,
      last_pid: r.last_pid,
      last_timestamp: r.last_timestamp,
      updated_at: r.updated_at
    };
  });

  return NextResponse.json({ ok: true, items });
}
