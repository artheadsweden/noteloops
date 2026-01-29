"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  getAccessToken,
  signInWithPassword,
  signOut,
} from "@/services/supabase/auth";
import { isSupabaseConfigured } from "@/services/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getBrowserSupabaseClient } from "@/services/supabase/browser";

export default function LoginClient() {
  const configured = useMemo(() => isSupabaseConfigured(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    fetch("/api/gate")
      .then((r) => r.json())
      .then((j: { inviteOk?: boolean; sessionOk?: boolean } | null) => {
        setSignedIn(Boolean(j?.sessionOk));
      })
      .catch(() => {
        setSignedIn(false);
      });

    if (!configured) return;
    const supabase = getBrowserSupabaseClient();

    // If the user already has a Supabase session (stored client-side) but the
    // server-side gate cookie is missing (e.g. new browser session), repair it.
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        const token = data.session?.access_token;
        if (!token) return;
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { authorization: `Bearer ${token}` }
        }).catch(() => null);
        window.location.href = "/dashboard";
      })
      .catch(() => null);

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));

      const token = session?.access_token;
      if (!token) return;
      fetch("/api/auth/session", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` }
      })
        .then(() => {
          window.location.href = "/dashboard";
        })
        .catch(() => null);
    });
    return () => subscription.unsubscribe();
  }, [configured]);

  if (!configured) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
        Supabase is not configured. Set `NEXT_PUBLIC_SUPABASE_URL` and
        `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
        </CardContent>
      </Card>
    );
  }

  const onSignIn = async () => {
    setStatus(null);
    const { error } = await signInWithPassword(email, password);
    if (error) {
      setStatus(error.message);
      return;
    }

    const token = await getAccessToken();
    if (token) {
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` }
      }).catch(() => null);
    }

    setStatus("Signed in.");
    // After login, either go straight to the app or nudge for invite (required for sign-up only).
    window.location.href = "/dashboard";
  };

  const onSignOut = async () => {
    setStatus(null);
    const { error } = await signOut();
    if (error) {
      setStatus(error.message);
      return;
    }
    await fetch("/api/auth/signout", { method: "POST" }).catch(() => null);
    setStatus("Signed out.");
    window.location.href = "/";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSignIn();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit">
          Sign in
        </Button>
        <Button asChild type="button" variant="secondary">
          <Link href="/signup">Create account</Link>
        </Button>
        {signedIn ? (
          <Button type="button" variant="outline" onClick={onSignOut}>
            Sign out
          </Button>
        ) : null}
      </div>

      {status ? <div className="text-sm text-muted-foreground">{status}</div> : null}
    </form>
  );
}
