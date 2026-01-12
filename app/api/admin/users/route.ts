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
  const { data: usersData, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const users = usersData?.users ?? [];
  const ids = users.map((u) => u.id);

  const profileById = new Map<
    string,
    {
      full_name: string | null;
      blocked_at: string | null;
      access_mode: string | null;
    }
  >();

  try {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id,full_name,blocked_at,access_mode")
      .in("user_id", ids);

    for (const p of (profiles ?? []) as any[]) {
      profileById.set(String(p.user_id), {
        full_name: (p.full_name as string | null) ?? null,
        blocked_at: (p.blocked_at as string | null) ?? null,
        access_mode: (p.access_mode as string | null) ?? null
      });
    }
  } catch {
    // If profiles table isn't deployed yet, fall back to auth metadata.
  }

  const items = users.map((u) => {
    const metaName = ((u as any).user_metadata?.full_name as string | undefined) ?? null;
    const prof = profileById.get(u.id) ?? null;
    const name = (prof?.full_name ?? metaName) ?? null;

    return {
      id: u.id,
      email: u.email ?? null,
      full_name: name,
      blocked: Boolean(prof?.blocked_at),
      access_mode: (prof?.access_mode as any) ?? "all",
      created_at: (u as any).created_at ?? null,
      last_sign_in_at: (u as any).last_sign_in_at ?? null
    };
  });

  return NextResponse.json({ ok: true, items });
}
