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

function genCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function getBaseUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");

  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return "";
  return `${proto}://${host}`;
}

async function sendEmailResend(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INVITE_FROM_EMAIL;
  if (!apiKey && !from) {
    return { ok: false, error: "Email not configured (missing RESEND_API_KEY and INVITE_FROM_EMAIL)" };
  }
  if (!apiKey) return { ok: false, error: "Email not configured (missing RESEND_API_KEY)" };
  if (!from) return { ok: false, error: "Email not configured (missing INVITE_FROM_EMAIL)" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: body || `Resend failed (${res.status})` };
  }
  return { ok: true };
}

async function getInviteTemplate(supabase: ReturnType<typeof getServerSupabaseAdminClient>): Promise<{
  subject: string;
  body_text: string;
}> {
  const { data } = await supabase
    .from("invite_templates")
    .select("subject,body_text")
    .eq("key", "default")
    .maybeSingle();

  if (data?.subject && data?.body_text) return { subject: data.subject, body_text: data.body_text };
  return {
    subject: "You're invited",
    body_text: "You have been invited. Open this link to continue:\n\n{{invite_link}}\n"
  };
}

export async function POST(req: Request) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ ok: false }, { status: 403 });

  const body = (await req.json().catch(() => null)) as null | {
    email?: string;
    code?: string;
    revoke_code?: string;
  };
  const email = body?.email?.trim();
  if (!email) return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });

  const supabase = getServerSupabaseAdminClient();

  const revokeCode = body?.revoke_code?.trim()?.toUpperCase() || null;
  if (revokeCode) {
    const now = new Date().toISOString();
    await supabase
      .from("invite_codes")
      .update({ active: false, revoked_at: now })
      .eq("code", revokeCode);

    await supabase
      .from("invite_deliveries")
      .update({ status: "expired", expired_at: now })
      .eq("code", revokeCode)
      .in("status", ["pending", "sent"]);
  }

  // Generate code (or accept one) and store it.
  const code = (body?.code?.trim() || genCode()).toUpperCase();

  const now = new Date();
  const ttlDays = Number(process.env.INVITE_TTL_DAYS ?? "7");
  const expiresAt = Number.isFinite(ttlDays) && ttlDays > 0
    ? new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000)
    : null;

  const { error: upsertErr } = await supabase.from("invite_codes").upsert({
    code,
    active: true,
    revoked_at: null,
    expires_at: expiresAt ? expiresAt.toISOString() : null,
    max_uses: 1
  });
  if (upsertErr) return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 500 });

  const base = getBaseUrl(req);
  const inviteLink = base ? `${base}/signup?code=${encodeURIComponent(code)}` : `/signup?code=${encodeURIComponent(code)}`;

  const tpl = await getInviteTemplate(supabase);
  const subject = tpl.subject;
  const text = tpl.body_text.replaceAll("{{invite_link}}", inviteLink);

  // Record invite delivery (best-effort).
  await supabase.from("invite_deliveries").insert({
    code,
    email,
    status: "pending",
    expires_at: expiresAt ? expiresAt.toISOString() : null,
    message_subject: subject,
    message_text: text
  });

  const sendRes = await sendEmailResend({ to: email, subject, text });
  if (!sendRes.ok) {
    return NextResponse.json({ ok: true, sent: false, inviteLink, error: sendRes.error });
  }

  await supabase
    .from("invite_deliveries")
    .update({ status: "sent", sent_at: now.toISOString() })
    .eq("code", code)
    .eq("email", email)
    .eq("status", "pending");

  return NextResponse.json({ ok: true, sent: true, inviteLink });
}
