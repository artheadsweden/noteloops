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

export async function GET(req: Request) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ ok: false }, { status: 403 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || null;
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") ?? "50") || 50));

  const supabase = getServerSupabaseAdminClient();
  let query = supabase
    .from("invite_deliveries")
    .select(
      "id,code,email,status,created_at,sent_at,accepted_at,expires_at,message_subject,message_text"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (q) {
    query = query.or(`email.ilike.%${q}%,code.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = (data ?? []) as Array<any>;
  const codes = Array.from(new Set(rows.map((r) => r.code).filter(Boolean)));

  let allowedByCode = new Map<string, string[] | null>();
  if (codes.length) {
    const { data: codeRows } = await supabase
      .from("invite_codes")
      .select("code,allowed_book_ids")
      .in("code", codes);

    for (const r of (codeRows ?? []) as Array<any>) {
      allowedByCode.set(r.code, Array.isArray(r.allowed_book_ids) ? r.allowed_book_ids : null);
    }
  }

  const items = rows.map((row) => ({
    ...row,
    allowed_book_ids: allowedByCode.get(row.code) ?? null
  }));

  return NextResponse.json({ ok: true, items });
}
