import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const jar = await cookies();

  // Clears the invite gate cookie so protected routes are no longer accessible.
  jar.set({
    name: "invite_ok",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  jar.set({
    name: "invite_code",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  jar.set({
    name: "sb_ok",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  jar.set({
    name: "ui_initials",
    value: "",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return NextResponse.json({ ok: true });
}
