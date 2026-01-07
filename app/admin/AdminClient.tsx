"use client";

import { useEffect, useState } from "react";

import { getAccessToken } from "@/services/supabase/auth";
import { titleFromSlug } from "@/lib/display";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

type InviteCodeRow = {
  code: string;
  active: boolean;
  created_at: string;
  revoked_at: string | null;
  expires_at?: string | null;
  max_uses?: number | null;
  uses_count?: number | null;
  last_used_at?: string | null;
};

type ReaderProgressItem = {
  user_id: string;
  email: string | null;
  book_id: string;
  percent_complete: number | null;
  chapter_index: number | null;
  total_chapters: number | null;
  furthest_chapter_id?: string | null;
  last_chapter_id: string;
  last_pid: string | null;
  last_timestamp: number;
  updated_at: string;
};

export default function AdminClient() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [items, setItems] = useState<InviteCodeRow[]>([]);
  const [progressItems, setProgressItems] = useState<ReaderProgressItem[]>([]);
  const [adminUsers, setAdminUsers] = useState<Array<{ id: string; email: string | null }>>([]);
  const [origin, setOrigin] = useState<string>("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteEmailStatus, setInviteEmailStatus] = useState<string | null>(null);

  const [inviteTemplateSubject, setInviteTemplateSubject] = useState("");
  const [inviteTemplateBody, setInviteTemplateBody] = useState("");
  const [inviteTemplateStatus, setInviteTemplateStatus] = useState<string | null>(null);

  const [inviteDeliveries, setInviteDeliveries] = useState<
    Array<{
      id: string;
      code: string;
      email: string;
      status: string;
      created_at: string;
      sent_at: string | null;
      accepted_at: string | null;
      expires_at: string | null;
    }>
  >([]);
  const [inviteDeliveriesQuery, setInviteDeliveriesQuery] = useState("");
  const [inviteDeliveriesStatus, setInviteDeliveriesStatus] = useState<string | null>(null);

  const [inviteAttempts, setInviteAttempts] = useState<
    Array<{
      id: string;
      code: string | null;
      outcome: string;
      email: string | null;
      created_at: string;
    }>
  >([]);
  const [inviteAttemptsQuery, setInviteAttemptsQuery] = useState("");
  const [inviteAttemptsStatus, setInviteAttemptsStatus] = useState<string | null>(null);

  const [feedbackScope, setFeedbackScope] = useState<"all" | "paragraph" | "chapter" | "book">(
    "all"
  );
  const [feedbackBookId, setFeedbackBookId] = useState("");
  const [feedbackChapterId, setFeedbackChapterId] = useState("");
  const [feedbackUser, setFeedbackUser] = useState("");
  const [feedbackQuery, setFeedbackQuery] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);
  const [feedbackItems, setFeedbackItems] = useState<
    Array<{
      scope: "paragraph" | "chapter" | "book";
      id: string;
      user_id: string;
      email: string | null;
      book_id: string;
      chapter_id: string | null;
      pid: string | null;
      comment_text: string;
      created_at: string;
      updated_at: string;
    }>
  >([]);

  const load = async () => {
    setStatus(null);
    const token = await getAccessToken();
    if (!token) {
      setIsAdmin(false);
      return;
    }

    const meRes = await fetch("/api/admin/me", {
      headers: { authorization: `Bearer ${token}` }
    });
    const meJson = (await meRes.json().catch(() => null)) as null | { isAdmin?: boolean };
    const ok = Boolean(meJson?.isAdmin);
    setIsAdmin(ok);

    if (!ok) return;

    const res = await fetch("/api/admin/invite-codes", {
      headers: { authorization: `Bearer ${token}` }
    });
    const json = (await res.json().catch(() => null)) as null | { ok?: boolean; items?: InviteCodeRow[] };
    if (res.ok && json?.ok) {
      setItems(json.items ?? []);
    } else {
      setItems([]);
    }

    const tplRes = await fetch("/api/admin/invite-template", {
      headers: { authorization: `Bearer ${token}` }
    });
    const tplJson = (await tplRes.json().catch(() => null)) as null | {
      ok?: boolean;
      template?: { subject?: string; body_text?: string } | null;
    };
    if (tplRes.ok && tplJson?.ok && tplJson.template) {
      setInviteTemplateSubject(tplJson.template.subject ?? "");
      setInviteTemplateBody(tplJson.template.body_text ?? "");
    }

    const progRes = await fetch("/api/admin/reader-progress", {
      headers: { authorization: `Bearer ${token}` }
    });
    const progJson = (await progRes.json().catch(() => null)) as null | {
      items?: ReaderProgressItem[];
    };
    setProgressItems(progJson?.items ?? []);

    const usersRes = await fetch("/api/admin/users", {
      headers: { authorization: `Bearer ${token}` }
    });
    const usersJson = (await usersRes.json().catch(() => null)) as null | {
      ok?: boolean;
      items?: Array<{ id: string; email: string | null }>;
    };
    if (usersRes.ok && usersJson?.ok) {
      const sorted = [...(usersJson.items ?? [])].sort((a, b) =>
        (a.email ?? a.id).localeCompare(b.email ?? b.id)
      );
      setAdminUsers(sorted);
    } else {
      setAdminUsers([]);
    }
  };

  const loadInviteDeliveries = async () => {
    setInviteDeliveriesStatus(null);
    const token = await getAccessToken();
    if (!token) {
      setInviteDeliveriesStatus("Not logged in");
      return;
    }

    const qs = new URLSearchParams();
    if (inviteDeliveriesQuery.trim()) qs.set("q", inviteDeliveriesQuery.trim());
    qs.set("limit", "50");

    const res = await fetch(`/api/admin/invites?${qs.toString()}`.toString(), {
      headers: { authorization: `Bearer ${token}` }
    });
    const json = (await res.json().catch(() => null)) as null | {
      ok?: boolean;
      items?: any[];
      error?: string;
    };
    if (!res.ok || !json?.ok) {
      setInviteDeliveriesStatus(json?.error ?? "Failed");
      return;
    }
    setInviteDeliveries((json.items ?? []) as any);
  };

  const loadInviteAttempts = async () => {
    setInviteAttemptsStatus(null);
    const token = await getAccessToken();
    if (!token) {
      setInviteAttemptsStatus("Not logged in");
      return;
    }

    const qs = new URLSearchParams();
    if (inviteAttemptsQuery.trim()) qs.set("q", inviteAttemptsQuery.trim());
    qs.set("limit", "50");

    const res = await fetch(`/api/admin/invite-attempts?${qs.toString()}`.toString(), {
      headers: { authorization: `Bearer ${token}` }
    });
    const json = (await res.json().catch(() => null)) as null | {
      ok?: boolean;
      items?: any[];
      error?: string;
    };
    if (!res.ok || !json?.ok) {
      setInviteAttemptsStatus(json?.error ?? "Failed");
      return;
    }
    setInviteAttempts((json.items ?? []) as any);
  };

  const reissueToEmail = async (email: string, oldCode?: string | null) => {
    setInviteAttemptsStatus(null);
    const token = await getAccessToken();
    if (!token) {
      setInviteAttemptsStatus("Not logged in");
      return;
    }

    const res = await fetch("/api/admin/invite-email", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ email, revoke_code: oldCode ?? undefined })
    });

    const json = (await res.json().catch(() => null)) as null | {
      ok?: boolean;
      sent?: boolean;
      inviteLink?: string;
      error?: string;
    };

    if (!res.ok || !json?.ok) {
      setInviteAttemptsStatus(json?.error ?? "Failed");
      return;
    }

    if (json?.sent) setInviteAttemptsStatus("Reissued (email sent).");
    else setInviteAttemptsStatus("Reissued (email not configured; link returned).");

    await loadInviteDeliveries();
  };

  const saveInviteTemplate = async () => {
    setInviteTemplateStatus(null);
    const token = await getAccessToken();
    if (!token) {
      setInviteTemplateStatus("Not logged in");
      return;
    }

    const res = await fetch("/api/admin/invite-template", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ subject: inviteTemplateSubject, body_text: inviteTemplateBody })
    });
    const json = (await res.json().catch(() => null)) as null | { ok?: boolean; error?: string };
    if (!res.ok || !json?.ok) {
      setInviteTemplateStatus(json?.error ?? "Failed");
      return;
    }
    setInviteTemplateStatus("Saved.");
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (feedbackScope !== "book") return;
    setFeedbackChapterId("");
  }, [feedbackScope]);

  const loadFeedback = async () => {
    setFeedbackStatus(null);
    const token = await getAccessToken();
    if (!token) {
      setFeedbackStatus("Not logged in");
      return;
    }

    const qs = new URLSearchParams();
    qs.set("scope", feedbackScope);
    if (feedbackBookId.trim()) qs.set("book_id", feedbackBookId.trim());
    if (feedbackChapterId.trim()) qs.set("chapter_id", feedbackChapterId.trim());
    if (feedbackUser.trim()) qs.set("user", feedbackUser.trim());
    if (feedbackQuery.trim()) qs.set("q", feedbackQuery.trim());
    qs.set("limit", "50");

    const res = await fetch(`/api/admin/feedback?${qs.toString()}`.toString(), {
      headers: { authorization: `Bearer ${token}` }
    });
    const json = (await res.json().catch(() => null)) as null | {
      ok?: boolean;
      items?: any[];
      error?: string;
    };

    if (!res.ok || !json?.ok) {
      setFeedbackStatus(json?.error ?? "Failed");
      return;
    }

    setFeedbackItems((json.items ?? []) as any);
  };

  useEffect(() => {
    if (!isAdmin) return;
    void loadFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadInviteDeliveries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadInviteAttempts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const deleteFeedbackAdmin = async (scope: "paragraph" | "chapter" | "book", id: string) => {
    setFeedbackStatus(null);
    const token = await getAccessToken();
    if (!token) {
      setFeedbackStatus("Not logged in");
      return;
    }

    const res = await fetch("/api/admin/feedback/delete", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ scope, id })
    });

    const json = (await res.json().catch(() => null)) as null | { ok?: boolean; error?: string };
    if (!res.ok || !json?.ok) {
      setFeedbackStatus(json?.error ?? "Failed");
      return;
    }

    setFeedbackStatus("Deleted.");
    await loadFeedback();
  };

  const createCode = async () => {
    setStatus(null);
    const token = await getAccessToken();
    if (!token) return;

    const res = await fetch("/api/admin/invite-codes", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ code })
    });

    const json = (await res.json().catch(() => null)) as null | { ok?: boolean; error?: string };
    if (!res.ok || !json?.ok) {
      setStatus(json?.error ?? "Failed");
      return;
    }

    setCode("");
    setStatus("Saved.");
    await load();
  };

  function genCode(): string {
    // Short, human-friendly (uppercase + digits), avoids ambiguous chars.
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 10; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
  }

  const generateAndSave = async () => {
    const newCode = genCode();
    setCode(newCode);
    setStatus(null);

    const token = await getAccessToken();
    if (!token) return;

    const res = await fetch("/api/admin/invite-codes", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: newCode })
    });

    const json = (await res.json().catch(() => null)) as null | { ok?: boolean; error?: string };
    if (!res.ok || !json?.ok) {
      setStatus(json?.error ?? "Failed");
      return;
    }

    setStatus("Generated.");
    await load();
  };

  const copyInviteLink = async (c: string) => {
    const link = `${origin || ""}/?code=${encodeURIComponent(c)}`;
    try {
      await navigator.clipboard.writeText(link);
      setStatus("Invite link copied.");
    } catch {
      const el = document.createElement("textarea");
      el.value = link;
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setStatus("Invite link copied.");
    }
  };

  const sendInviteEmail = async () => {
    setInviteEmailStatus(null);
    const email = inviteEmail.trim();
    if (!email) return;

    const token = await getAccessToken();
    if (!token) {
      setInviteEmailStatus("Not logged in");
      return;
    }

    const res = await fetch("/api/admin/invite-email", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ email })
    });

    const json = (await res.json().catch(() => null)) as null | {
      ok?: boolean;
      sent?: boolean;
      inviteLink?: string;
      error?: string;
    };

    if (!res.ok || !json?.ok) {
      setInviteEmailStatus(json?.error ?? "Failed");
      return;
    }

    if (json?.sent) {
      setInviteEmail(" ");
      setInviteEmail("");
      setInviteEmailStatus("Invite email sent.");
      await load();
      return;
    }

    const err = (json?.error ?? "Email send failed").toString();

    // Email not sent; still give you the link.
    if (json?.inviteLink) {
      try {
        await navigator.clipboard.writeText(json.inviteLink);
        setInviteEmailStatus(`${err} — invite link copied.`);
      } catch {
        setInviteEmailStatus(`${err} — copy the invite link from a code below.`);
      }
    } else {
      setInviteEmailStatus(err);
    }
  };

  const revokeCode = async (c: string) => {
    setStatus(null);
    const token = await getAccessToken();
    if (!token) return;

    const res = await fetch("/api/admin/invite-codes/revoke", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: c })
    });

    const json = (await res.json().catch(() => null)) as null | { ok?: boolean; error?: string };
    if (!res.ok || !json?.ok) {
      setStatus(json?.error ?? "Failed");
      return;
    }

    setStatus("Revoked.");
    await load();
  };

  if (isAdmin === null) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">You are not an admin.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Create invite code</div>
          <div className="mt-2 flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. MYCODE123"
            />
            <Button type="button" onClick={createCode} disabled={!code.trim()}>
              Save
            </Button>
            <Button type="button" variant="outline" onClick={generateAndSave}>
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Invite by email</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Input
              className="min-w-64 flex-1"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              autoComplete="email"
              inputMode="email"
            />
            <Button type="button" onClick={sendInviteEmail} disabled={!inviteEmail.trim()}>
              Invite
            </Button>
          </div>
          {inviteEmailStatus ? (
            <div className="mt-2 text-sm text-muted-foreground">{inviteEmailStatus}</div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Invite email template</div>
          <div className="mt-2 grid gap-2">
            <Input
              value={inviteTemplateSubject}
              onChange={(e) => setInviteTemplateSubject(e.target.value)}
              placeholder="Subject"
            />
            <textarea
              className="min-h-32 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              value={inviteTemplateBody}
              onChange={(e) => setInviteTemplateBody(e.target.value)}
              placeholder="Body text (use {{invite_link}} where the link should appear)"
            />
            <div className="flex items-center gap-3">
              <Button type="button" onClick={saveInviteTemplate} disabled={!inviteTemplateSubject.trim()}>
                Save template
              </Button>
              {inviteTemplateStatus ? (
                <div className="text-sm text-muted-foreground">{inviteTemplateStatus}</div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {status ? <div className="text-sm text-muted-foreground">{status}</div> : null}

      <Card>
        <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">Invite codes</div>
        {items.length === 0 ? (
          <div className="mt-2 text-sm text-muted-foreground">No codes.</div>
        ) : (
          <ul className="mt-2 space-y-2">
              {items.map((it) => (
                <li key={it.code} className="rounded-lg border bg-card p-3 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <div>{it.code}</div>
                    <div className="text-xs text-muted-foreground">
                      {it.active ? "active" : "revoked"}
                    </div>
                    {it.expires_at ? (
                      <div className="mt-1 text-xs text-muted-foreground">expires: {it.expires_at}</div>
                    ) : null}
                    {typeof it.uses_count === "number" || typeof it.max_uses === "number" ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        uses: {it.uses_count ?? 0}
                        {it.max_uses ? `/${it.max_uses}` : ""}
                      </div>
                    ) : null}
                    {it.active && origin ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {origin}/?code={it.code}
                      </div>
                    ) : null}
                  </div>
                  {it.active ? (
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => void copyInviteLink(it.code)}>
                        Copy link
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => revokeCode(it.code)}>
                        Revoke
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Invites</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Input
              className="min-w-64 flex-1"
              value={inviteDeliveriesQuery}
              onChange={(e) => setInviteDeliveriesQuery(e.target.value)}
              placeholder="Search by email or code"
            />
            <Button type="button" variant="outline" onClick={loadInviteDeliveries}>
              Load
            </Button>
          </div>
          {inviteDeliveriesStatus ? (
            <div className="mt-2 text-sm text-muted-foreground">{inviteDeliveriesStatus}</div>
          ) : null}

          {inviteDeliveries.length === 0 ? (
            <div className="mt-3 text-sm text-muted-foreground">No invites.</div>
          ) : (
            <ul className="mt-3 space-y-2">
              {inviteDeliveries.map((it) => (
                <li key={it.id} className="rounded-lg border bg-card p-3 text-sm">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{it.status}</span>
                    <span className="text-muted-foreground"> · </span>
                    <span className="text-foreground">{it.email}</span>
                    <span className="text-muted-foreground"> · </span>
                    <span className="text-foreground">{it.code}</span>
                    {it.expires_at ? <span className="text-muted-foreground"> · expires {it.expires_at}</span> : null}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">created {it.created_at}</div>
                  {it.sent_at ? <div className="mt-1 text-xs text-muted-foreground">sent {it.sent_at}</div> : null}
                  {it.accepted_at ? (
                    <div className="mt-1 text-xs text-muted-foreground">accepted {it.accepted_at}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Invite attempts</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Input
              className="min-w-64 flex-1"
              value={inviteAttemptsQuery}
              onChange={(e) => setInviteAttemptsQuery(e.target.value)}
              placeholder="Search by email, code, or outcome"
            />
            <Button type="button" variant="outline" onClick={loadInviteAttempts}>
              Load
            </Button>
          </div>
          {inviteAttemptsStatus ? (
            <div className="mt-2 text-sm text-muted-foreground">{inviteAttemptsStatus}</div>
          ) : null}

          {inviteAttempts.length === 0 ? (
            <div className="mt-3 text-sm text-muted-foreground">No attempts.</div>
          ) : (
            <ul className="mt-3 space-y-2">
              {inviteAttempts.map((it) => (
                <li key={it.id} className="rounded-lg border bg-card p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{it.outcome}</span>
                        {it.code ? <span className="text-muted-foreground"> · {it.code}</span> : null}
                        {it.email ? <span className="text-muted-foreground"> · {it.email}</span> : null}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{it.created_at}</div>
                    </div>
                    {it.email ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void reissueToEmail(it.email as string, it.code)}
                      >
                        Reissue
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">Reader progress</div>
        {progressItems.length === 0 ? (
          <div className="mt-2 text-sm text-muted-foreground">No progress yet.</div>
        ) : (
          <div className="mt-3 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Book</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead>Last chapter</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {progressItems.map((p) => (
                  <TableRow key={`${p.user_id}:${p.book_id}`}>
                    <TableCell>
                      <div className="font-medium">{p.email ?? p.user_id}</div>
                      {p.email ? (
                        <div className="text-xs text-muted-foreground">{p.user_id}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{titleFromSlug(p.book_id)}</div>
                      <div className="text-xs text-muted-foreground">{p.book_id}</div>
                    </TableCell>
                    <TableCell>
                      {typeof p.percent_complete === "number" ? (
                        <span>
                          {p.percent_complete}%
                          {typeof p.chapter_index === "number" &&
                          typeof p.total_chapters === "number" &&
                          p.total_chapters > 0 ? (
                            <span className="text-xs text-muted-foreground">
                              {" "}({Math.max(0, p.chapter_index + 1)}/{p.total_chapters})
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{p.last_chapter_id}</TableCell>
                    <TableCell className="text-muted-foreground">{p.updated_at}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">Feedback inbox</div>

        <div className="mt-3 grid gap-2">
          <div className="flex flex-wrap gap-2">
            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              value={feedbackScope}
              onChange={(e) => setFeedbackScope(e.target.value as any)}
            >
              <option value="all">All</option>
              <option value="paragraph">Paragraph</option>
              <option value="chapter">Chapter</option>
              <option value="book">Book</option>
            </select>

            <Input
              className="min-w-48 flex-1"
              value={feedbackBookId}
              onChange={(e) => setFeedbackBookId(e.target.value)}
              placeholder="book_id (optional)"
            />

            <Input
              className="min-w-48 flex-1"
              value={feedbackChapterId}
              onChange={(e) => setFeedbackChapterId(e.target.value)}
              placeholder="chapter_id (optional)"
              disabled={feedbackScope === "book"}
            />

            <select
              className="h-10 min-w-48 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              value={adminUsers.some((u) => u.id === feedbackUser) ? feedbackUser : ""}
              onChange={(e) => {
                setFeedbackUser(e.target.value);
                void loadFeedback();
              }}
            >
              <option value="">All users</option>
              {adminUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email ?? u.id}
                </option>
              ))}
            </select>

            <Input
              className="min-w-48 flex-1"
              value={feedbackUser}
              onChange={(e) => setFeedbackUser(e.target.value)}
              placeholder="user (email or user_id)"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Input
              className="w-full flex-1"
              value={feedbackQuery}
              onChange={(e) => setFeedbackQuery(e.target.value)}
              placeholder="Search comment text (optional)"
            />
            <Button type="button" variant="outline" onClick={loadFeedback}>
              Load
            </Button>
          </div>
        </div>

        {feedbackStatus ? (
          <div className="mt-2 text-sm text-muted-foreground">{feedbackStatus}</div>
        ) : null}

        {feedbackItems.length === 0 ? (
          <div className="mt-3 text-sm text-muted-foreground">No feedback.</div>
        ) : (
          <ul className="mt-3 space-y-2">
            {feedbackItems.map((f) => (
              <li key={`${f.scope}:${f.id}`} className="rounded-lg border bg-card p-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{f.scope}</span>
                      <span className="text-muted-foreground"> · </span>
                      <span className="text-foreground">{titleFromSlug(f.book_id)}</span>
                      <span className="text-muted-foreground"> ({f.book_id})</span>
                      {f.chapter_id ? (
                        <span className="text-muted-foreground"> / {f.chapter_id}</span>
                      ) : null}
                      {f.pid ? <span className="text-muted-foreground"> / {f.pid}</span> : null}
                    </div>
                    <div className="mt-1 whitespace-pre-wrap">{f.comment_text}</div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {f.email ?? f.user_id} · {f.created_at}
                    </div>
                  </div>

                  <Button type="button" variant="outline" onClick={() => deleteFeedbackAdmin(f.scope, f.id)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
