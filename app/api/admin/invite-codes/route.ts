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

type InviteCodeRow = {
  code: string;
  active: boolean;
  created_at: string;
  revoked_at: string | null;
  expires_at?: string | null;
  max_uses?: number | null;
  uses_count?: number | null;
  last_used_at?: string | null;
  allowed_book_ids?: string[] | null;
};

export async function GET(req: Request) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ ok: false }, { status: 403 });

  const supabase = getServerSupabaseAdminClient();
  const { data, error } = await supabase
    .from("invite_codes")
    .select("code,active,created_at,revoked_at,expires_at,max_uses,uses_count,last_used_at,allowed_book_ids")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, items: (data ?? []) as InviteCodeRow[] });
}

export async function POST(req: Request) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ ok: false }, { status: 403 });

  const body = (await req.json().catch(() => null)) as null | {
    code?: string;
    allowedBookIds?: string[] | null;
  };
  const code = body?.code?.trim();
  if (!code) return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });

  const allowedBookIds = Array.isArray(body?.allowedBookIds)
    ? body?.allowedBookIds.map((s) => String(s)).filter(Boolean)
    : null;

  const supabase = getServerSupabaseAdminClient();
  const { error } = await supabase.from("invite_codes").upsert({
    code,
    active: true,
    revoked_at: null,
    allowed_book_ids: allowedBookIds && allowedBookIds.length > 0 ? allowedBookIds : null
  });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
