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

type Scope = "paragraph" | "chapter" | "book";

function tableForScope(scope: Scope): string {
  if (scope === "paragraph") return "feedback";
  if (scope === "chapter") return "chapter_feedback";
  return "book_feedback";
}

export async function POST(req: Request) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ ok: false }, { status: 403 });

  const body = (await req.json().catch(() => null)) as null | { scope?: Scope; id?: string };
  const scope = body?.scope;
  const id = body?.id;
  if (!scope || !id) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = getServerSupabaseAdminClient();
  const table = tableForScope(scope);

  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
