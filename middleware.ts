import { NextResponse, type NextRequest } from "next/server";

// App pages require a Supabase login (tracked via httpOnly sb_ok cookie).
// Invites are used to *create* accounts (sign up), not to browse once logged in.
const LOGIN_REQUIRED_PREFIXES = ["/dashboard", "/book", "/admin", "/account", "/guide"];
const LOGIN_PREFIXES = ["/login"];
const PUBLIC_PREFIXES = [
  "/_next",
  "/api/invite/verify",
  "/api/auth/session",
  "/api/auth/signout",
  "/api/gate"
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isLogin = LOGIN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  const sessionOk = req.cookies.get("sb_ok")?.value === "1";

  if (isLogin) {
    if (sessionOk) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  const needsLogin = LOGIN_REQUIRED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (needsLogin && !sessionOk) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!favicon.ico|sitemap.xml|robots.txt).*)"]
};
