"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getAccessToken,
  signInWithPassword,
  signOut,
  signUp
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
  const [inviteOk, setInviteOk] = useState(false);

  useEffect(() => {
    fetch("/api/gate")
      .then((r) => r.json())
      .then((j: { inviteOk?: boolean; sessionOk?: boolean } | null) => {
        setInviteOk(Boolean(j?.inviteOk));
        setSignedIn(Boolean(j?.sessionOk));
      })
      .catch(() => {
        setInviteOk(false);
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

  const onSignUp = async () => {
    if (!inviteOk) {
      setStatus("You need an invite code before creating an account.");
      window.location.href = "/#invite";
      return;
    }

    setStatus(null);
    const { error } = await signUp(email, password);
    if (error) {
      setStatus(error.message);
      return;
    }

    // If email confirmation is disabled, you may have a session immediately.
    const token = await getAccessToken();
    if (token) {
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` }
      }).catch(() => null);
      window.location.href = "/dashboard";
      return;
    }

    setStatus("Signed up. Check email if confirmation is required.");
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

  return (
    <div className="space-y-4">
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
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onSignIn}>
          Sign in
        </Button>
        <Button type="button" variant="secondary" onClick={onSignUp} disabled={!inviteOk}>
          Sign up
        </Button>
        {signedIn ? (
          <Button type="button" variant="outline" onClick={onSignOut}>
            Sign out
          </Button>
        ) : null}
      </div>

      {!inviteOk ? (
        <div className="text-sm text-muted-foreground">
          New here? Enter an invite code on the landing page to enable sign up.
        </div>
      ) : null}

      {status ? <div className="text-sm text-muted-foreground">{status}</div> : null}
    </div>
  );
}
