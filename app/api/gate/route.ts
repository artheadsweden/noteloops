import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const jar = await cookies();
  const inviteOk = jar.get("invite_ok")?.value === "1";
  const sessionOk = jar.get("sb_ok")?.value === "1";
  return NextResponse.json({ ok: true, inviteOk, sessionOk });
}
