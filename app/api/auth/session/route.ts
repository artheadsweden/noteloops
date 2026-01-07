import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getServerSupabaseAdminClient } from "@/services/supabase/server";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const supabase = getServerSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ ok: false }, { status: 401 });

  const jar = await cookies();
  jar.set({
    name: "sb_ok",
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return NextResponse.json({ ok: true });
}
