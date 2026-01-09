"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { getAccessToken, signUpWithName } from "@/services/supabase/auth";
import { getBrowserSupabaseClient, isSupabaseConfigured } from "@/services/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function SignupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const configured = useMemo(() => isSupabaseConfigured(), []);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [inviteOk, setInviteOk] = useState<boolean | null>(null);
  const [verifyingInvite, setVerifyingInvite] = useState(false);

  const didAttemptInviteVerify = useRef(false);

  const refreshGate = async () => {
    const res = await fetch("/api/gate").catch(() => null);
    const json = (await res?.json().catch(() => null)) as null | {
      inviteOk?: boolean;
      sessionOk?: boolean;
    };
    setInviteOk(Boolean(json?.inviteOk));
    setSignedIn(Boolean(json?.sessionOk));
  };

  useEffect(() => {
    void refreshGate();

    if (!configured) return;
    const supabase = getBrowserSupabaseClient();

    // Repair gate cookie if there's already a Supabase session.
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
          window.location.href = "/guide";
        })
        .catch(() => null);
    });

    return () => subscription.unsubscribe();
  }, [configured]);

  useEffect(() => {
    if (signedIn) {
      window.location.href = "/dashboard";
    }
  }, [signedIn]);

  useEffect(() => {
    const code = searchParams.get("code")?.trim() ?? "";
    if (!code) return;
    if (inviteOk !== false) return;
    if (didAttemptInviteVerify.current) return;

    didAttemptInviteVerify.current = true;
    setVerifyingInvite(true);
    setStatus(null);

    fetch("/api/invite/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code })
    })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as null | {
          ok?: boolean;
          error?: string;
        };

        if (!res.ok || !json?.ok) {
          setStatus(json?.error ?? "Invalid invite code");
          return;
        }

        // Remove the code from the URL to avoid accidental double-verification.
        router.replace("/signup");
        await refreshGate();
      })
      .catch(() => {
        setStatus("Could not verify invite code");
      })
      .finally(() => {
        setVerifyingInvite(false);
      });
  }, [inviteOk, router, searchParams]);

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

  const onSignUp = async () => {
    if (!inviteOk) {
      setStatus("You need an invite code before creating an account.");
      return;
    }

    if (!fullName.trim()) {
      setStatus("Please enter your name.");
      return;
    }

    setStatus(null);
    const { error } = await signUpWithName(email, password, fullName.trim());
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
      window.location.href = "/guide";
      return;
    }

    setStatus("Signed up. Check email if confirmation is required.");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSignUp();
  };

  const inviteRequired = inviteOk === false;

  return (
    <div className="space-y-4">
      {inviteRequired ? (
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          This is an invite-only signup. If you don’t have an invite link, go back to{" "}
          <Link href="/#invite" className="underline underline-offset-4">
            enter a code
          </Link>
          .
        </div>
      ) : null}

      {verifyingInvite ? (
        <div className="text-sm text-muted-foreground">Validating invite…</div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="fullName">Name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
        </div>

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
            autoComplete="new-password"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!inviteOk || verifyingInvite}>
            Create account
          </Button>
          <Button asChild type="button" variant="secondary">
            <Link href="/login">Sign in instead</Link>
          </Button>
        </div>

        {status ? <div className="text-sm text-muted-foreground">{status}</div> : null}
      </form>
    </div>
  );
}
