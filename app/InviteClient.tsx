"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function InviteClient() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const didAutoSubmit = useRef(false);

  const submit = async () => {
    setStatus(null);
    setLoading(true);

    try {
      const res = await fetch("/api/invite/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code })
      });

      const json = (await res.json().catch(() => null)) as null | {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !json?.ok) {
        setStatus(json?.error ?? "Invalid code");
        return;
      }

      window.location.href = "/signup";
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fromUrl = searchParams.get("code")?.trim() ?? "";
    if (!fromUrl) return;

    setCode(fromUrl);

    if (didAutoSubmit.current) return;
    didAutoSubmit.current = true;
    void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Label htmlFor="invite">Invite Code</Label>
        <Input
          id="invite"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="one-time-code"
        />
      </div>

      <Button
        type="button"
        className="w-full sm:w-auto"
        onClick={submit}
        disabled={!code.trim() || loading}
      >
        Continue
      </Button>

      {status ? <div className="text-sm text-muted-foreground">{status}</div> : null}
    </div>
  );
}
