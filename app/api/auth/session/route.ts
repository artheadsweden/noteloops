import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getServerSupabaseAdminClient } from "@/services/supabase/server";

function initialsFromName(name: string): string | null {
  const parts = name
    .trim()
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const first = parts[0]?.[0] ?? "";
  const last = (parts.length > 1 ? parts[parts.length - 1]?.[0] : "") ?? "";
  const out = (first + last).toUpperCase();
  return out.trim() ? out : null;
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const supabase = getServerSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ ok: false }, { status: 401 });

  const userId = data.user.id;
  const fullName = ((data.user as any).user_metadata?.full_name as string | undefined)?.trim() ?? null;

  const jar = await cookies();

  // Best-effort UI helper: let the header render initials even when session reads fail on some devices.
  const initials = fullName ? initialsFromName(fullName) : null;
  if (initials) {
    jar.set({
      name: "ui_initials",
      value: initials,
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }

  // If the user is blocked, do not grant app access (sb_ok).
  // This is enforced via middleware using sb_ok.
  try {
    const { data: prof } = await supabase
      .from("user_profiles")
      .select("blocked_at")
      .eq("user_id", userId)
      .maybeSingle();

    if ((prof as any)?.blocked_at) {
      jar.set({
        name: "sb_ok",
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0
      });
      return NextResponse.json({ ok: false, error: "Blocked" }, { status: 403 });
    }
  } catch {
    // If profiles table isn't deployed yet, don't break login.
  }

  // Ensure a profile row exists and seed full_name from auth metadata if empty.
  try {
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("user_id,full_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existing) {
      await supabase.from("user_profiles").insert({ user_id: userId, full_name: fullName });
    } else if (!((existing as any).full_name as string | null) && fullName) {
      await supabase.from("user_profiles").update({ full_name: fullName }).eq("user_id", userId);
    }
  } catch {
    // Best-effort.
  }

  // Apply book access rules from the verified invite code (if present).
  // The invite verification route stores the code in an httpOnly cookie.
  const inviteCode = jar.get("invite_code")?.value?.trim() ?? null;
  if (inviteCode) {
    try {
      const { data: codeRow } = await supabase
        .from("invite_codes")
        .select("allowed_book_ids")
        .eq("code", inviteCode)
        .maybeSingle();

      const allowed = ((codeRow as any)?.allowed_book_ids as string[] | null) ?? null;

      if (Array.isArray(allowed) && allowed.length > 0) {
        await supabase
          .from("user_profiles")
          .upsert({ user_id: userId, access_mode: "restricted" }, { onConflict: "user_id" });

        await supabase.from("user_book_access").delete().eq("user_id", userId);

        await supabase.from("user_book_access").insert(
          allowed.map((bookId) => ({ user_id: userId, book_id: String(bookId) }))
        );
      }

      // Clear the cookie so this is applied at most once.
      jar.set({
        name: "invite_code",
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0
      });
    } catch {
      // Best-effort.
    }
  }
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
