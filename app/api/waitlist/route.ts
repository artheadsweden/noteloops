import { NextResponse } from "next/server";

import { getServerSupabaseAdminClient } from "@/services/supabase/server";

function isValidEmail(email: string): boolean {
  // Intentionally simple validation; DB uniqueness handles duplicates.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as null | { email?: unknown };
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!email) return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }

  const supabase = getServerSupabaseAdminClient();

  // Insert; treat duplicates as success.
  const { error } = await supabase.from("waitlist_entries").insert({ email });

  if (error) {
    // Postgres unique violation
    if ((error as { code?: string } | null)?.code === "23505") {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
