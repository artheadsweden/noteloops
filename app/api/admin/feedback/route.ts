import { NextResponse } from "next/server";

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

type Scope = "paragraph" | "chapter" | "book" | "all";

type AdminFeedbackItem = {
  scope: Exclude<Scope, "all">;
  id: string;
  user_id: string;
  email: string | null;
  book_id: string;
  chapter_id: string | null;
  pid: string | null;
  comment_text: string;
  created_at: string;
  updated_at: string;
};

function normLower(s: string): string {
  return s.trim().toLowerCase();
}

function clampLimit(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(200, Math.floor(n)));
}

function ilikePattern(q: string): string {
  const trimmed = q.trim();
  return `%${trimmed}%`;
}

export async function GET(req: Request) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ ok: false }, { status: 403 });

  const url = new URL(req.url);
  const scope = (url.searchParams.get("scope") ?? "all") as Scope;
  const bookId = url.searchParams.get("book_id")?.trim() || null;
  const chapterId = url.searchParams.get("chapter_id")?.trim() || null;
  const userQ = url.searchParams.get("user")?.trim() || null;
  const q = url.searchParams.get("q")?.trim() || null;
  const limit = clampLimit(url.searchParams.get("limit"));

  const supabase = getServerSupabaseAdminClient();

  const scopesToFetch: Array<Exclude<Scope, "all">> =
    scope === "all" ? ["paragraph", "chapter", "book"] : [scope as Exclude<Scope, "all">];

  const out: AdminFeedbackItem[] = [];

  type ListedUser = { id: string; email: string | null };
  let cachedUsers: ListedUser[] | null = null;
  const getUsers = async (): Promise<ListedUser[]> => {
    if (cachedUsers) return cachedUsers;
    const { data: usersData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    cachedUsers = (usersData?.users ?? []).map((u) => ({ id: u.id, email: u.email ?? null }));
    return cachedUsers;
  };

  // Optional user filter: can be a user_id or an email substring.
  // We resolve it up-front so we can filter at query time.
  let allowedUserIds: string[] | null = null;
  if (userQ) {
    const needle = normLower(userQ);
    const users = await getUsers();
    const ids: string[] = [];
    for (const u of users) {
      const email = u.email ?? "";
      if (normLower(u.id) === needle) ids.push(u.id);
      else if (email && normLower(email).includes(needle)) ids.push(u.id);
    }

    // If no users match, we can return empty immediately.
    if (ids.length === 0) return NextResponse.json({ ok: true, items: [] });
    allowedUserIds = ids;
  }

  const fetchParagraph = async () => {
    let query = supabase
      .from("feedback")
      .select("id,user_id,book_id,chapter_id,pid,comment_text,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (bookId) query = query.eq("book_id", bookId);
    if (chapterId) query = query.eq("chapter_id", chapterId);
    if (allowedUserIds) query = query.in("user_id", allowedUserIds);
    if (q) query = query.ilike("comment_text", ilikePattern(q));

    const { data, error } = await query;
    if (error || !data) return;

    for (const r of data as Array<any>) {
      out.push({
        scope: "paragraph",
        id: r.id,
        user_id: r.user_id,
        email: null,
        book_id: r.book_id,
        chapter_id: r.chapter_id,
        pid: r.pid,
        comment_text: r.comment_text,
        created_at: r.created_at,
        updated_at: r.updated_at
      });
    }
  };

  const fetchChapter = async () => {
    let query = supabase
      .from("chapter_feedback")
      .select("id,user_id,book_id,chapter_id,comment_text,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (bookId) query = query.eq("book_id", bookId);
    if (chapterId) query = query.eq("chapter_id", chapterId);
    if (allowedUserIds) query = query.in("user_id", allowedUserIds);
    if (q) query = query.ilike("comment_text", ilikePattern(q));

    const { data, error } = await query;
    if (error || !data) return;

    for (const r of data as Array<any>) {
      out.push({
        scope: "chapter",
        id: r.id,
        user_id: r.user_id,
        email: null,
        book_id: r.book_id,
        chapter_id: r.chapter_id,
        pid: null,
        comment_text: r.comment_text,
        created_at: r.created_at,
        updated_at: r.updated_at
      });
    }
  };

  const fetchBook = async () => {
    let query = supabase
      .from("book_feedback")
      .select("id,user_id,book_id,comment_text,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (bookId) query = query.eq("book_id", bookId);
    if (allowedUserIds) query = query.in("user_id", allowedUserIds);
    if (q) query = query.ilike("comment_text", ilikePattern(q));

    const { data, error } = await query;
    if (error || !data) return;

    for (const r of data as Array<any>) {
      out.push({
        scope: "book",
        id: r.id,
        user_id: r.user_id,
        email: null,
        book_id: r.book_id,
        chapter_id: null,
        pid: null,
        comment_text: r.comment_text,
        created_at: r.created_at,
        updated_at: r.updated_at
      });
    }
  };

  for (const s of scopesToFetch) {
    if (s === "paragraph") await fetchParagraph();
    if (s === "chapter") await fetchChapter();
    if (s === "book") await fetchBook();
  }

  // Sort across scopes for a combined inbox.
  out.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));

  // Enrich with email (best-effort).
  const userIds = Array.from(new Set(out.map((x) => x.user_id)));
  if (userIds.length > 0) {
    const emailById = new Map<string, string | null>();
    const users = await getUsers();
    for (const u of users) {
      emailById.set(u.id, u.email);
    }

    for (const item of out) {
      item.email = emailById.get(item.user_id) ?? null;
    }
  }

  return NextResponse.json({ ok: true, items: out });
}
