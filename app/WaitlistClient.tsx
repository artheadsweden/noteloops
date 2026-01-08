"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function WaitlistClient() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const submit = async () => {
    const value = email.trim();
    if (!value) return;

    setStatus(null);
    setLoading(true);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value })
      });

      const json = (await res.json().catch(() => null)) as null | { ok?: boolean; error?: string };
      if (!res.ok || !json?.ok) {
        setStatus(json?.error ?? "Failed to join waitlist");
        return;
      }

      setStatus("You’re on the waitlist.");
      setEmail("");
    } catch {
      setStatus("Failed to join waitlist");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Label htmlFor="waitlist-email">Email</Label>
        <Input
          id="waitlist-email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <Button type="button" className="w-full sm:w-auto" onClick={submit} disabled={!email.trim() || loading}>
        Join waitlist
      </Button>

      {status ? <div className="text-sm text-muted-foreground">{status}</div> : null}
    </div>
  );
}
