import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getServerSupabaseAdminClient } from "@/services/supabase/server";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as null | { code?: string };
  const code = body?.code?.trim();

  if (!code) {
    return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });
  }

  const supabase = getServerSupabaseAdminClient();

  const userAgent = req.headers.get("user-agent") ?? null;
  const logAttempt = async (params: {
    outcome: "invalid" | "expired" | "used" | "ok";
    email?: string | null;
    deliveryId?: string | null;
  }) => {
    await supabase.from("invite_attempts").insert({
      code,
      outcome: params.outcome,
      email: params.email ?? null,
      delivery_id: params.deliveryId ?? null,
      user_agent: userAgent
    });
  };

  const findDelivery = async (): Promise<{ id: string; email: string } | null> => {
    const { data } = await supabase
      .from("invite_deliveries")
      .select("id,email")
      .eq("code", code)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data?.id || !data?.email) return null;
    return { id: data.id, email: data.email };
  };

  const { data, error } = await supabase
    .from("invite_codes")
    .select("code,active,expires_at,max_uses,uses_count")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    // Best-effort log invalid attempts.
    await logAttempt({ outcome: "invalid" });
    return NextResponse.json({ ok: false, error: "Invalid code" }, { status: 401 });
  }

  const now = new Date();
  const expiresAt = (data as any).expires_at ? new Date((data as any).expires_at) : null;
  if (expiresAt && expiresAt.getTime() <= now.getTime()) {
    const delivery = await findDelivery();

    // Lazy-expire the code + related deliveries (best-effort).
    await supabase
      .from("invite_codes")
      .update({ expired_at: now.toISOString(), active: false })
      .eq("code", code);

    await supabase
      .from("invite_deliveries")
      .update({ status: "expired", expired_at: now.toISOString() })
      .eq("code", code)
      .in("status", ["pending", "sent"]);

    await logAttempt({
      outcome: "expired",
      email: delivery?.email ?? null,
      deliveryId: delivery?.id ?? null
    });
    return NextResponse.json({ ok: false, error: "Invite expired" }, { status: 401 });
  }

  const maxUses = (data as any).max_uses as number | null;
  const usesCount = ((data as any).uses_count as number | null) ?? 0;
  if (typeof maxUses === "number" && Number.isFinite(maxUses) && maxUses > 0 && usesCount >= maxUses) {
    const delivery = await findDelivery();

    // Lazy-deactivate: code is already used up.
    await supabase
      .from("invite_codes")
      .update({ active: false, expired_at: now.toISOString(), last_used_at: now.toISOString() })
      .eq("code", code);

    await logAttempt({
      outcome: "used",
      email: delivery?.email ?? null,
      deliveryId: delivery?.id ?? null
    });
    return NextResponse.json({ ok: false, error: "Invite already used" }, { status: 401 });
  }

  // Best-effort: increment uses_count and stamp last_used_at.
  await supabase
    .from("invite_codes")
    .update({ uses_count: usesCount + 1, last_used_at: now.toISOString() })
    .eq("code", code)
    .eq("active", true);

  // If this was the last allowed use, deactivate immediately.
  if (typeof maxUses === "number" && Number.isFinite(maxUses) && maxUses > 0 && usesCount + 1 >= maxUses) {
    await supabase
      .from("invite_codes")
      .update({ active: false, expired_at: now.toISOString() })
      .eq("code", code);
  }

  // Best-effort: mark any pending invite delivery for this code as accepted.
  await supabase
    .from("invite_deliveries")
    .update({ status: "accepted", accepted_at: now.toISOString() })
    .eq("code", code)
    .eq("status", "pending");

  {
    const delivery = await findDelivery();
    await logAttempt({
      outcome: "ok",
      email: delivery?.email ?? null,
      deliveryId: delivery?.id ?? null
    });
  }

  const jar = await cookies();
  jar.set({
    name: "invite_ok",
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  // Store the specific code so we can apply per-title access on signup.
  jar.set({
    name: "invite_code",
    value: code,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return NextResponse.json({ ok: true });
}
