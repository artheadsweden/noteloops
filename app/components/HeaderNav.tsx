"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, LogIn, LogOut, Shield, User } from "lucide-react";

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
import { getAccessToken } from "@/services/supabase/auth";
import { signOut } from "@/services/supabase/auth";
import { getBrowserSupabaseClient, isSupabaseConfigured } from "@/services/supabase/browser";

export default function HeaderNav() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSignedIn(false);
      setIsAdmin(false);
      return;
    }

    const supabase = getBrowserSupabaseClient();
    let cancelled = false;

    const refresh = async () => {
      const { data } = await supabase.auth.getSession();
      const hasUser = Boolean(data.session?.user);
      if (cancelled) return;

      setSignedIn(hasUser);
      if (!hasUser) {
        setIsAdmin(false);
        setUserEmail(null);
        return;
      }

      setUserEmail(data.session?.user?.email ?? null);

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
      <nav className="flex items-center gap-1">
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Account menu">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-muted text-xs font-semibold text-foreground">
                  {userEmail ? userEmail.slice(0, 1).toUpperCase() : <User className="h-4 w-4" aria-hidden="true" />}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Account</TooltipContent>
          </Tooltip>
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
      </nav>
    </TooltipProvider>
  );
}
