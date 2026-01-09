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

export async function GET(req: Request, ctx: any) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ ok: false }, { status: 403 });

  const { userId } = ctx.params as { userId: string };
  if (!userId) return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });

  const supabase = getServerSupabaseAdminClient();

  const { data: authRes, error: authErr } = await supabase.auth.admin.getUserById(userId);
  if (authErr || !authRes?.user) {
    return NextResponse.json({ ok: false, error: authErr?.message ?? "Not found" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_id,full_name,preferred_genres,wants_release_invites,access_mode,blocked_at,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: accessRows } = await supabase
    .from("user_book_access")
    .select("book_id")
    .eq("user_id", userId);

  return NextResponse.json({
    ok: true,
    user: {
      id: authRes.user.id,
      email: authRes.user.email ?? null,
      created_at: (authRes.user as any).created_at ?? null,
      user_metadata: (authRes.user as any).user_metadata ?? {}
    },
    profile: profile ?? null,
    accessBookIds: (accessRows ?? []).map((r: any) => r.book_id)
  });
}

export async function POST(req: Request, ctx: any) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ ok: false }, { status: 403 });

  const { userId } = ctx.params as { userId: string };
  if (!userId) return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as any;
  const action = body?.action as string | undefined;
  if (!action) return NextResponse.json({ ok: false, error: "Missing action" }, { status: 400 });

  const supabase = getServerSupabaseAdminClient();

  if (action === "updateProfile") {
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : undefined;
    const wants = typeof body.wants_release_invites === "boolean" ? body.wants_release_invites : undefined;
    const genres = Array.isArray(body.preferred_genres)
      ? body.preferred_genres.map((s: any) => String(s).trim()).filter(Boolean)
      : undefined;

    const row: Record<string, unknown> = { user_id: userId };
    if (fullName !== undefined) row.full_name = fullName || null;
    if (wants !== undefined) row.wants_release_invites = wants;
    if (genres !== undefined) row.preferred_genres = genres.length ? genres : null;

    const { error } = await supabase.from("user_profiles").upsert(row);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    if (fullName !== undefined) {
      await supabase.auth.admin.updateUserById(userId, { user_metadata: { full_name: fullName || null } }).catch(() => null);
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "setAccess") {
    const accessMode = body?.access_mode === "restricted" ? "restricted" : "all";
    const bookIds = Array.isArray(body?.book_ids)
      ? body.book_ids.map((s: any) => String(s).trim()).filter(Boolean)
      : [];

    const { error: profErr } = await supabase
      .from("user_profiles")
      .upsert({ user_id: userId, access_mode: accessMode }, { onConflict: "user_id" });
    if (profErr) return NextResponse.json({ ok: false, error: profErr.message }, { status: 500 });

    if (accessMode === "all") {
      await supabase.from("user_book_access").delete().eq("user_id", userId);
      return NextResponse.json({ ok: true });
    }

    await supabase.from("user_book_access").delete().eq("user_id", userId);
    if (bookIds.length > 0) {
      const { error: insErr } = await supabase
        .from("user_book_access")
        .insert(bookIds.map((bookId: string) => ({ user_id: userId, book_id: bookId })));
      if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "setBlocked") {
    const blocked = Boolean(body?.blocked);
    const blockedAt = blocked ? new Date().toISOString() : null;
    const { error } = await supabase
      .from("user_profiles")
      .upsert({ user_id: userId, blocked_at: blockedAt }, { onConflict: "user_id" });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "deleteUser") {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
