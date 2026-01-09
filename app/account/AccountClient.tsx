"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getBrowserSupabaseClient, isSupabaseConfigured } from "@/services/supabase/browser";
import { signOut } from "@/services/supabase/auth";
import { getMyProfile, upsertMyProfile } from "@/services/profile/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UserInfo = { id: string; email: string | null };

export default function AccountClient() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [preferredGenres, setPreferredGenres] = useState("");
  const [wantsReleaseInvites, setWantsReleaseInvites] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

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

    getMyProfile()
      .then((p) => {
        if (!p) {
          setProfileLoaded(true);
          return;
        }
        setFullName(p.full_name ?? "");
        setPreferredGenres((p.preferred_genres ?? []).join(", "));
        setWantsReleaseInvites(Boolean(p.wants_release_invites));
        setProfileLoaded(true);
      })
      .catch(() => setProfileLoaded(true));

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

      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Profile (optional)</div>

          {!profileLoaded ? (
            <div className="mt-2 text-sm text-muted-foreground">Loading…</div>
          ) : (
            <form
              className="mt-3 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void (async () => {
                  setStatus(null);

                  const name = fullName.trim();
                  if (!name) {
                    setStatus("Name cannot be empty.");
                    return;
                  }

                  const genres = preferredGenres
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);

                  const res = await upsertMyProfile({
                    full_name: name,
                    preferred_genres: genres.length ? genres : null,
                    wants_release_invites: wantsReleaseInvites
                  });

                  if (!res.ok) {
                    setStatus(res.error ?? "Failed to save profile.");
                    return;
                  }

                  // Also keep auth metadata in sync so the header can show initials reliably.
                  try {
                    const supabase = getBrowserSupabaseClient();
                    await supabase.auth.updateUser({ data: { full_name: name } });
                  } catch {
                    // Non-fatal.
                  }

                  setStatus("Saved.");
                })();
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="profileName">Name</Label>
                <Input
                  id="profileName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="profileGenres">Preferred book genres</Label>
                <Input
                  id="profileGenres"
                  value={preferredGenres}
                  onChange={(e) => setPreferredGenres(e.target.value)}
                  placeholder="e.g. espionage, historical fiction"
                />
                <div className="text-xs text-muted-foreground">Comma-separated.</div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={wantsReleaseInvites}
                  onChange={(e) => setWantsReleaseInvites(e.target.checked)}
                />
                <span>Interested in invites to new book releases</span>
              </label>

              <Button type="submit" disabled={!user}>
                Save profile
              </Button>
            </form>
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
