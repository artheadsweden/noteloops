"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getBrowserSupabaseClient, isSupabaseConfigured } from "@/services/supabase/browser";
import { signOut } from "@/services/supabase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type UserInfo = { id: string; email: string | null };

export default function AccountClient() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = getBrowserSupabaseClient();
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        setUser(null);
        return;
      }
      setUser({ id: data.user.id, email: data.user.email ?? null });
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        return;
      }
      setUser({ id: session.user.id, email: session.user.email ?? null });
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">User</div>
          {user ? (
            <div className="mt-2 space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Email:</span> {user.email ?? "—"}
              </div>
              <div>
                <span className="text-muted-foreground">User ID:</span> {user.id}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">Not logged in.</div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="link" className="px-0">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button asChild variant="link" className="px-0">
          <Link href="/admin">Admin</Link>
        </Button>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          setStatus(null);
          const { error } = await signOut();
          if (error) {
            setStatus(error.message);
            return;
          }

          // Also clear the invite gate cookie so the user can't keep browsing protected pages.
          await fetch("/api/auth/signout", { method: "POST" }).catch(() => null);
          setStatus("Signed out.");
          window.location.href = "/";
        }}
      >
        Sign out
      </Button>

      {status ? <div className="text-sm text-muted-foreground">{status}</div> : null}
    </div>
  );
}
