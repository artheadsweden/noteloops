import { NextResponse } from "next/server";

import { listBookManifests } from "@/services/input/books";
import { titleFromSlug } from "@/lib/display";
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

  const manifests = await listBookManifests().catch(() => []);
  const items = manifests.map((m) => ({ book_id: m.book_id, title: titleFromSlug(m.book_id) }));
  return NextResponse.json({ ok: true, items });
}
