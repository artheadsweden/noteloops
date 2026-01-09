"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, BookText, LogIn, LogOut, Menu, Shield, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { getAccessToken } from "@/services/supabase/auth";
import { signOut } from "@/services/supabase/auth";
import { getBrowserSupabaseClient, isSupabaseConfigured } from "@/services/supabase/browser";

export default function HeaderNav() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState<string | null>(null);

  const initialsFromName = (name: string): string | null => {
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
  };

  const getCookie = (key: string): string | null => {
    if (typeof document === "undefined") return null;
    const m = document.cookie.match(new RegExp(`(?:^|; )${key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  };

  useEffect(() => {
    const supabase = isSupabaseConfigured() ? getBrowserSupabaseClient() : null;
    let cancelled = false;

    const refresh = async () => {
      let hasUser = false;
      let email: string | null = null;

      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          hasUser = Boolean(data.session?.user);
          email = data.session?.user?.email ?? null;
          const fullName = (data.session?.user as any)?.user_metadata?.full_name as string | undefined;
          const fromName = fullName ? initialsFromName(fullName) : null;
          const fromEmail = email ? email.slice(0, 1).toUpperCase() : null;
          setUserInitials(fromName ?? fromEmail);
        } catch {
          // Some mobile environments (notably iOS Safari/PWA) can block storage access,
          // causing Supabase session reads to fail. We'll fall back to the server gate.
          hasUser = false;
          email = null;
        }
      }

      if (cancelled) return;

      if (!hasUser) {
        // Fall back to server-side gate cookie (httpOnly sb_ok) so nav works on mobile.
        const gate = await fetch("/api/gate", { cache: "no-store" }).catch(() => null);
        const json = (await gate?.json().catch(() => null)) as null | { sessionOk?: boolean };
        const sessionOk = Boolean(json?.sessionOk);
        setSignedIn(sessionOk);
        setIsAdmin(false);
        setUserEmail(null);

        // If we can't read the Supabase session, try to display initials from the last known name.
        // This is a best-effort UI hint only.
        if (sessionOk) {
          const cookieInitials = getCookie("ui_initials");
          setUserInitials(cookieInitials ? cookieInitials.toUpperCase() : null);
        } else {
          setUserInitials(null);
        }
        return;
      }

      setSignedIn(true);
      setUserEmail(email);

      const token = await getAccessToken();
      if (!token) {
        setIsAdmin(false);
        return;
      }

      // Keep the server-side auth gate cookie in sync with the client session.
      // This prevents cases where the header shows "signed in" but middleware
      // blocks protected routes (e.g. /account) due to a missing sb_ok cookie.
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` }
      }).catch(() => null);

      const res = await fetch("/api/admin/me", {
        headers: { authorization: `Bearer ${token}` }
      }).catch(() => null);
      if (!res || !res.ok) {
        setIsAdmin(false);
        return;
      }

      const json = (await res.json().catch(() => null)) as null | { ok?: boolean; isAdmin?: boolean };
      setIsAdmin(Boolean(json?.isAdmin));
    };

    void refresh();

    if (!supabase) {
      return () => {
        cancelled = true;
      };
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const isLibraryActive = pathname === "/dashboard" || pathname.startsWith("/book/");
  const isGuideActive = pathname === "/guide" || pathname.startsWith("/guide/");
  const isAdminActive = pathname === "/admin" || pathname.startsWith("/admin/");

  const onSignOut = async () => {
    await signOut().catch(() => null);
    await fetch("/api/auth/signout", { method: "POST" }).catch(() => null);
    window.location.href = "/";
  };

  if (!signedIn) {
    return (
      <nav className="flex items-center gap-2">
        <Button asChild>
          <Link href="/login">
            <LogIn className="h-4 w-4" aria-hidden="true" />
            <span>Login</span>
          </Link>
        </Button>
      </nav>
    );
  }

  return (
    <TooltipProvider>
      <nav className="flex items-center">
        <div className="hidden items-center gap-1 sm:flex">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={
              isLibraryActive
                ? "bg-muted text-foreground shadow-[var(--shadow-sm)]"
                : "text-muted-foreground"
            }
          >
            <Link href="/dashboard">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span>Library</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className={
              isGuideActive
                ? "bg-muted text-foreground shadow-[var(--shadow-sm)]"
                : "text-muted-foreground"
            }
          >
            <Link href="/guide">
              <BookText className="h-4 w-4" aria-hidden="true" />
              <span>Guide</span>
            </Link>
          </Button>

          {isAdmin ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className={
                    isAdminActive
                      ? "bg-muted text-foreground shadow-[var(--shadow-sm)]"
                      : "text-muted-foreground"
                  }
                  aria-label="Admin"
                >
                  <Link href="/admin">
                    <Shield className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Admin</TooltipContent>
            </Tooltip>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Account menu"
                title="Account"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-muted text-xs font-semibold text-foreground">
                  {userInitials ? userInitials : <User className="h-4 w-4" aria-hidden="true" />}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/account">
                  <User className="h-4 w-4" aria-hidden="true" />
                  Account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void onSignOut()}>
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="sm:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-4">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              <div className="mt-4 grid gap-2">
                <SheetClose asChild>
                  <Button
                    asChild
                    variant={isLibraryActive ? "secondary" : "ghost"}
                    className="w-full justify-start"
                  >
                    <Link href="/dashboard">
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                      <span>Library</span>
                    </Link>
                  </Button>
                </SheetClose>

                <SheetClose asChild>
                  <Button
                    asChild
                    variant={isGuideActive ? "secondary" : "ghost"}
                    className="w-full justify-start"
                  >
                    <Link href="/guide">
                      <BookText className="h-4 w-4" aria-hidden="true" />
                      <span>Guide</span>
                    </Link>
                  </Button>
                </SheetClose>

                {isAdmin ? (
                  <SheetClose asChild>
                    <Button
                      asChild
                      variant={isAdminActive ? "secondary" : "ghost"}
                      className="w-full justify-start"
                    >
                      <Link href="/admin">
                        <Shield className="h-4 w-4" aria-hidden="true" />
                        <span>Admin</span>
                      </Link>
                    </Button>
                  </SheetClose>
                ) : null}

                <SheetClose asChild>
                  <Button asChild variant="ghost" className="w-full justify-start">
                    <Link href="/account">
                      <User className="h-4 w-4" aria-hidden="true" />
                      <span>Account</span>
                    </Link>
                  </Button>
                </SheetClose>

                <Button type="button" variant="ghost" className="w-full justify-start" onClick={() => void onSignOut()}>
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>Sign out</span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </TooltipProvider>
  );
}
