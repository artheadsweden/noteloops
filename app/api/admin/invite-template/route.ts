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

  const supabase = getServerSupabaseAdminClient();
  const { data, error } = await supabase
    .from("invite_templates")
    .select("key,subject,body_text,updated_at")
    .eq("key", "default")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, template: data ?? null });
}

export async function POST(req: Request) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ ok: false }, { status: 403 });

  const body = (await req.json().catch(() => null)) as null | { subject?: string; body_text?: string };
  const subject = body?.subject?.trim();
  const bodyText = body?.body_text;
  if (!subject) return NextResponse.json({ ok: false, error: "Missing subject" }, { status: 400 });
  if (typeof bodyText !== "string") {
    return NextResponse.json({ ok: false, error: "Missing body" }, { status: 400 });
  }

  const supabase = getServerSupabaseAdminClient();
  const { error } = await supabase.from("invite_templates").upsert({
    key: "default",
    subject,
    body_text: bodyText,
    updated_at: new Date().toISOString()
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
