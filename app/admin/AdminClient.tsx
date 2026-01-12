"use client";

import { useEffect, useState } from "react";

import { getAccessToken } from "@/services/supabase/auth";
import { titleFromSlug } from "@/lib/display";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  allowed_book_ids?: string[] | null;
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

type WaitlistEntry = {
  id: string;
  email: string;
  created_at: string;
};

function formatAdminDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return String(value);
  // UTC, stable across clients.
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export default function AdminClient() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [items, setItems] = useState<InviteCodeRow[]>([]);
  const [progressItems, setProgressItems] = useState<ReaderProgressItem[]>([]);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [waitlistItems, setWaitlistItems] = useState<WaitlistEntry[]>([]);
  const [waitlistStatus, setWaitlistStatus] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<
    Array<{
      id: string;
      email: string | null;
      full_name?: string | null;
      blocked?: boolean;
      access_mode?: "all" | "restricted";
      created_at?: string | null;
      last_sign_in_at?: string | null;
    }>
  >([]);
  const [origin, setOrigin] = useState<string>("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const [books, setBooks] = useState<Array<{ book_id: string; title: string }>>([]);
  const [allowedBookIds, setAllowedBookIds] = useState<string[]>([]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteEmailStatus, setInviteEmailStatus] = useState<string | null>(null);
  const [inviteEmailAllowedBookIds, setInviteEmailAllowedBookIds] = useState<string[]>([]);

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
      allowed_book_ids?: string[] | null;
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

  const [userSearch, setUserSearch] = useState("");
  const [usersSortKey, setUsersSortKey] = useState<
    "name" | "email" | "created" | "last_sign_in" | "status" | "access"
  >("email");
  const [usersSortDir, setUsersSortDir] = useState<"asc" | "desc">("asc");
  const [usersPage, setUsersPage] = useState<number>(1);
  const [usersPerPage, setUsersPerPage] = useState<number>(25);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedUserStatus, setSelectedUserStatus] = useState<string | null>(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [selectedUserGenres, setSelectedUserGenres] = useState<string>("");
  const [selectedUserWantsInvites, setSelectedUserWantsInvites] = useState<boolean>(false);
  const [selectedUserAccessMode, setSelectedUserAccessMode] = useState<"all" | "restricted">("all");
  const [selectedUserBookIds, setSelectedUserBookIds] = useState<string[]>([]);
  const [selectedUserBlocked, setSelectedUserBlocked] = useState<boolean>(false);

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

    const booksRes = await fetch("/api/admin/books", {
      headers: { authorization: `Bearer ${token}` }
    });
    const booksJson = (await booksRes.json().catch(() => null)) as null | {
      ok?: boolean;
      items?: Array<{ book_id: string; title: string }>;
    };
    if (booksRes.ok && booksJson?.ok) {
      const sorted = [...(booksJson.items ?? [])].sort((a, b) =>
        (a.title ?? a.book_id).localeCompare(b.title ?? b.book_id)
      );
      setBooks(sorted);
    } else {
      setBooks([]);
    }

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
      items?: Array<{
        id: string;
        email: string | null;
        full_name?: string | null;
        blocked?: boolean;
        access_mode?: "all" | "restricted";
        created_at?: string | null;
        last_sign_in_at?: string | null;
      }>;
    };
    if (usersRes.ok && usersJson?.ok) {
      const sorted = [...(usersJson.items ?? [])].sort((a, b) =>
        (a.email ?? a.full_name ?? a.id).localeCompare(b.email ?? b.full_name ?? b.id)
      );
      setAdminUsers(sorted);
    } else {
      setAdminUsers([]);
    }

    setUsersPage(1);

    setWaitlistStatus(null);
    const waitlistRes = await fetch("/api/admin/waitlist?limit=200", {
      headers: { authorization: `Bearer ${token}` }
    });
    const waitlistJson = (await waitlistRes.json().catch(() => null)) as null | {
      ok?: boolean;
      count?: number;
      items?: WaitlistEntry[];
      error?: string;
    };
    if (waitlistRes.ok && waitlistJson?.ok) {
      setWaitlistCount(waitlistJson.count ?? 0);
      setWaitlistItems(waitlistJson.items ?? []);
    } else {
      setWaitlistCount(0);
      setWaitlistItems([]);
      if (waitlistJson?.error) setWaitlistStatus(waitlistJson.error);
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
      body: JSON.stringify({ code, allowedBookIds })
    });

    const json = (await res.json().catch(() => null)) as null | { ok?: boolean; error?: string };
    if (!res.ok || !json?.ok) {
      setStatus(json?.error ?? "Failed");
      return;
    }

    setCode("");
    setAllowedBookIds([]);
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
      body: JSON.stringify({ code: newCode, allowedBookIds })
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
      body: JSON.stringify({
        email,
        allowedBookIds: inviteEmailAllowedBookIds.length ? inviteEmailAllowedBookIds : undefined
      })
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
      setInviteEmailAllowedBookIds([]);
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

  const cleanupInviteCodes = async () => {
    setStatus(null);
    if (!window.confirm("Delete unused invite codes that are revoked/expired/inactive?")) return;

    const token = await getAccessToken();
    if (!token) return;

    const res = await fetch("/api/admin/invite-codes/cleanup", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` }
    });

    const json = (await res.json().catch(() => null)) as null | { ok?: boolean; deleted?: number; error?: string };
    if (!res.ok || !json?.ok) {
      setStatus(json?.error ?? "Failed");
      return;
    }

    setStatus(`Cleaned up ${json.deleted ?? 0} codes.`);
    await load();
  };

  const loadUserDetails = async (userId: string) => {
    setSelectedUserStatus(null);
    const token = await getAccessToken();
    if (!token) {
      setSelectedUserStatus("Not logged in");
      return;
    }

    const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`.toString(), {
      headers: { authorization: `Bearer ${token}` }
    });

    const json = (await res.json().catch(() => null)) as any;
    if (!res.ok || !json?.ok) {
      setSelectedUserStatus(json?.error ?? "Failed");
      return;
    }

    const user = json.user as { id: string; email: string | null; user_metadata?: any };
    const profile = (json.profile ?? null) as
      | null
      | {
          full_name?: string | null;
          preferred_genres?: string[] | null;
          wants_release_invites?: boolean;
          access_mode?: "all" | "restricted";
          blocked_at?: string | null;
        };

    const metaName = (user.user_metadata?.full_name as string | undefined) ?? "";
    const name = (profile?.full_name ?? metaName) ?? "";

    setSelectedUserEmail(user.email ?? null);
    setSelectedUserName(name);
    setSelectedUserGenres((profile?.preferred_genres ?? []).join(", "));
    setSelectedUserWantsInvites(Boolean(profile?.wants_release_invites));
    setSelectedUserAccessMode((profile?.access_mode as any) === "restricted" ? "restricted" : "all");
    setSelectedUserBookIds((json.accessBookIds ?? []) as string[]);
    setSelectedUserBlocked(Boolean(profile?.blocked_at));
  };

  const saveSelectedUserProfile = async () => {
    setSelectedUserStatus(null);
    const token = await getAccessToken();
    if (!token) {
      setSelectedUserStatus("Not logged in");
      return;
    }

    const genres = selectedUserGenres
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetch(`/api/admin/users/${encodeURIComponent(selectedUserId)}`.toString(), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        action: "updateProfile",
        full_name: selectedUserName.trim(),
        preferred_genres: genres,
        wants_release_invites: selectedUserWantsInvites
      })
    });

    const json = (await res.json().catch(() => null)) as null | { ok?: boolean; error?: string };
    if (!res.ok || !json?.ok) {
      setSelectedUserStatus(json?.error ?? "Failed");
      return;
    }
    setSelectedUserStatus("Saved.");
    await load();
    await loadUserDetails(selectedUserId);
  };

  const saveSelectedUserAccess = async () => {
    setSelectedUserStatus(null);
    const token = await getAccessToken();
    if (!token) {
      setSelectedUserStatus("Not logged in");
      return;
    }

    const res = await fetch(`/api/admin/users/${encodeURIComponent(selectedUserId)}`.toString(), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        action: "setAccess",
        access_mode: selectedUserAccessMode,
        book_ids: selectedUserAccessMode === "restricted" ? selectedUserBookIds : []
      })
    });

    const json = (await res.json().catch(() => null)) as null | { ok?: boolean; error?: string };
    if (!res.ok || !json?.ok) {
      setSelectedUserStatus(json?.error ?? "Failed");
      return;
    }
    setSelectedUserStatus("Saved.");
    await load();
    await loadUserDetails(selectedUserId);
  };

  const toggleSelectedUserBlocked = async () => {
    setSelectedUserStatus(null);
    const token = await getAccessToken();
    if (!token) {
      setSelectedUserStatus("Not logged in");
      return;
    }

    const next = !selectedUserBlocked;
    const res = await fetch(`/api/admin/users/${encodeURIComponent(selectedUserId)}`.toString(), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "setBlocked", blocked: next })
    });

    const json = (await res.json().catch(() => null)) as null | { ok?: boolean; error?: string };
    if (!res.ok || !json?.ok) {
      setSelectedUserStatus(json?.error ?? "Failed");
      return;
    }

    setSelectedUserBlocked(next);
    setSelectedUserStatus(next ? "Blocked." : "Unblocked.");
    await load();
  };

  const deleteSelectedUser = async () => {
    setSelectedUserStatus(null);
    if (!window.confirm("Delete this user and all related data? This cannot be undone.")) return;

    const token = await getAccessToken();
    if (!token) {
      setSelectedUserStatus("Not logged in");
      return;
    }

    const res = await fetch(`/api/admin/users/${encodeURIComponent(selectedUserId)}`.toString(), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "deleteUser" })
    });

    const json = (await res.json().catch(() => null)) as null | { ok?: boolean; error?: string };
    if (!res.ok || !json?.ok) {
      setSelectedUserStatus(json?.error ?? "Failed");
      return;
    }

    setSelectedUserStatus("Deleted.");
    setSelectedUserId("");
    setSelectedUserEmail(null);
    setSelectedUserName("");
    setSelectedUserGenres("");
    setSelectedUserWantsInvites(false);
    setSelectedUserAccessMode("all");
    setSelectedUserBookIds([]);
    setSelectedUserBlocked(false);
    await load();
  };

  const filteredSortedUsers = (() => {
    const q = userSearch.trim().toLowerCase();
    const filtered = adminUsers.filter((u) => {
      if (!q) return true;
      const name = String((u as any).full_name ?? "").toLowerCase();
      const email = String(u.email ?? "").toLowerCase();
      const id = String(u.id ?? "").toLowerCase();
      return name.includes(q) || email.includes(q) || id.includes(q);
    });

    const dir = usersSortDir === "desc" ? -1 : 1;
    const key = usersSortKey;

    return filtered.slice().sort((a, b) => {
      const aName = String((a as any).full_name ?? "");
      const bName = String((b as any).full_name ?? "");
      const aEmail = String(a.email ?? "");
      const bEmail = String(b.email ?? "");

      if (key === "name") return dir * aName.localeCompare(bName);
      if (key === "email") return dir * aEmail.localeCompare(bEmail);
      if (key === "access") {
        return (
          dir *
          String((a as any).access_mode ?? "").localeCompare(String((b as any).access_mode ?? ""))
        );
      }
      if (key === "status") {
        return dir * (Number(Boolean((a as any).blocked)) - Number(Boolean((b as any).blocked)));
      }
      if (key === "created") {
        return (
          dir *
          String((a as any).created_at ?? "").localeCompare(String((b as any).created_at ?? ""))
        );
      }
      if (key === "last_sign_in") {
        return (
          dir *
          String((a as any).last_sign_in_at ?? "").localeCompare(
            String((b as any).last_sign_in_at ?? "")
          )
        );
      }

      const byEmail = aEmail.localeCompare(bEmail);
      if (byEmail) return byEmail;
      return aName.localeCompare(bName);
    });
  })();

  const usersTotal = filteredSortedUsers.length;
  const usersTotalPages = Math.max(1, Math.ceil(usersTotal / Math.max(1, usersPerPage)));
  const usersPageSafe = Math.min(Math.max(1, usersPage), usersTotalPages);
  const usersStart = (usersPageSafe - 1) * usersPerPage;
  const usersPageItems = filteredSortedUsers.slice(usersStart, usersStart + usersPerPage);

  const toggleUsersSort = (
    nextKey: "name" | "email" | "created" | "last_sign_in" | "status" | "access"
  ) => {
    if (usersSortKey !== nextKey) {
      setUsersSortKey(nextKey);
      setUsersSortDir("asc");
      return;
    }
    setUsersSortDir((d) => (d === "asc" ? "desc" : "asc"));
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
    <Tabs defaultValue="invites" className="space-y-4">
      <TabsList className="h-auto w-full flex-wrap justify-start">
        <TabsTrigger value="invites">Invites</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
        <TabsTrigger value="progress">Progress</TabsTrigger>
        <TabsTrigger value="feedback">Feedback</TabsTrigger>
      </TabsList>

      <TabsContent value="invites" className="space-y-4">
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

            <div className="mt-3">
              <div className="text-xs text-muted-foreground">
                Books this code unlocks (leave empty for all books)
              </div>
              {books.length === 0 ? (
                <div className="mt-2 text-sm text-muted-foreground">No books found.</div>
              ) : (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {books.map((b) => {
                    const checked = allowedBookIds.includes(b.book_id);
                    return (
                      <label key={b.book_id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          onChange={(e) => {
                            setAllowedBookIds((prev) => {
                              if (e.target.checked) return [...prev, b.book_id];
                              return prev.filter((x) => x !== b.book_id);
                            });
                          }}
                        />
                        <span className="min-w-0 truncate">
                          {b.title} <span className="text-xs text-muted-foreground">({b.book_id})</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {status ? <div className="text-sm text-muted-foreground">{status}</div> : null}

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">Invite codes</div>
              <Button type="button" variant="outline" size="sm" onClick={cleanupInviteCodes}>
                Cleanup unused
              </Button>
            </div>
            {items.length === 0 ? (
              <div className="mt-2 text-sm text-muted-foreground">No codes.</div>
            ) : (
              <ul className="mt-2 space-y-2">
                {items.map((it) => (
                  <li key={it.code} className="rounded-lg border bg-card p-3 text-sm">
                    <div className="flex items-baseline justify-between gap-4">
                      <div>
                        <div>{it.code}</div>
                        <div className="text-xs text-muted-foreground">{it.active ? "active" : "revoked"}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          books:{" "}
                          {it.allowed_book_ids && it.allowed_book_ids.length > 0
                            ? it.allowed_book_ids.join(", ")
                            : "all"}
                        </div>
                        {it.expires_at ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            expires: {formatAdminDate(it.expires_at)}
                          </div>
                        ) : null}
                        {typeof it.uses_count === "number" || typeof it.max_uses === "number" ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            uses: {it.uses_count ?? 0}
                            {it.max_uses ? `/${it.max_uses}` : ""}
                          </div>
                        ) : null}
                        {it.active && origin ? (
                          <div className="mt-1 text-xs text-muted-foreground">{origin}/signup?code={it.code}</div>
                        ) : null}
                      </div>
                      {it.active ? (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCode(it.code);
                              setAllowedBookIds(it.allowed_book_ids ?? []);
                              setStatus(null);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void copyInviteLink(it.code)}
                          >
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
      </TabsContent>

      <TabsContent value="users" className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Users</div>

            <div className="mt-2 flex flex-wrap gap-2">
              <Input
                className="min-w-64 flex-1"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUsersPage(1);
                }}
                placeholder="Filter by name, email, or user id"
              />

              <select
                className="h-10 w-32 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                value={String(usersPerPage)}
                onChange={(e) => {
                  const n = Number(e.target.value) || 25;
                  setUsersPerPage(n);
                  setUsersPage(1);
                }}
              >
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
                <option value="100">100 / page</option>
              </select>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-border/60 bg-card shadow-[var(--shadow)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button type="button" className="hover:underline" onClick={() => toggleUsersSort("name")}>
                        Name
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" className="hover:underline" onClick={() => toggleUsersSort("email")}>
                        Email
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" className="hover:underline" onClick={() => toggleUsersSort("status")}>
                        Status
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" className="hover:underline" onClick={() => toggleUsersSort("access")}>
                        Access
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" className="hover:underline" onClick={() => toggleUsersSort("created")}>
                        Created
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" className="hover:underline" onClick={() => toggleUsersSort("last_sign_in")}>
                        Last sign-in
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersPageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-sm text-muted-foreground">
                        No users.
                      </TableCell>
                    </TableRow>
                  ) : (
                    usersPageItems.map((u) => {
                      const name = String((u as any).full_name ?? "");
                      const blocked = Boolean((u as any).blocked);
                      const access = String((u as any).access_mode ?? "all");

                      return (
                        <TableRow
                          key={u.id}
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedUserId(u.id);
                            void loadUserDetails(u.id);
                          }}
                        >
                          <TableCell className="font-medium">{name || "—"}</TableCell>
                          <TableCell className="max-w-[280px] truncate">{u.email ?? u.id}</TableCell>
                          <TableCell>{blocked ? "blocked" : "active"}</TableCell>
                          <TableCell>{access}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatAdminDate((u as any).created_at)}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatAdminDate((u as any).last_sign_in_at)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <div>
                Showing {usersTotal === 0 ? 0 : usersStart + 1}–{Math.min(usersStart + usersPerPage, usersTotal)} of {usersTotal}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                  disabled={usersPageSafe <= 1}
                >
                  Prev
                </Button>
                <div className="text-xs">Page {usersPageSafe} / {usersTotalPages}</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))}
                  disabled={usersPageSafe >= usersTotalPages}
                >
                  Next
                </Button>
              </div>
            </div>

            {selectedUserStatus ? (
              <div className="mt-2 text-sm text-muted-foreground">{selectedUserStatus}</div>
            ) : null}
          </CardContent>
        </Card>

        {selectedUserId ? (
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">User details</div>

              <div className="mt-2 space-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">Email:</span> {selectedUserEmail ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">User ID:</span> {selectedUserId}
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  {selectedUserBlocked ? "blocked" : "active"}
                </div>
              </div>

              <div className="mt-4 grid gap-4">
                <div className="grid gap-2">
                  <div className="text-sm text-muted-foreground">Profile</div>

                  <Input
                    value={selectedUserName}
                    onChange={(e) => setSelectedUserName(e.target.value)}
                    placeholder="Full name"
                  />

                  <Input
                    value={selectedUserGenres}
                    onChange={(e) => setSelectedUserGenres(e.target.value)}
                    placeholder="Preferred genres (comma-separated)"
                  />

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectedUserWantsInvites}
                      onChange={(e) => setSelectedUserWantsInvites(e.target.checked)}
                    />
                    <span>Interested in invites to new book releases</span>
                  </label>

                  <Button type="button" onClick={saveSelectedUserProfile}>
                    Save profile
                  </Button>
                </div>

                <div className="grid gap-2">
                  <div className="text-sm text-muted-foreground">Book access</div>

                  <select
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    value={selectedUserAccessMode}
                    onChange={(e) => setSelectedUserAccessMode(e.target.value as any)}
                  >
                    <option value="all">All books</option>
                    <option value="restricted">Restricted</option>
                  </select>

                  {selectedUserAccessMode === "restricted" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {books.map((b) => {
                        const checked = selectedUserBookIds.includes(b.book_id);
                        return (
                          <label key={b.book_id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={checked}
                              onChange={(e) => {
                                setSelectedUserBookIds((prev) => {
                                  if (e.target.checked) return [...prev, b.book_id];
                                  return prev.filter((x) => x !== b.book_id);
                                });
                              }}
                            />
                            <span className="min-w-0 truncate">
                              {b.title} <span className="text-xs text-muted-foreground">({b.book_id})</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}

                  <Button type="button" onClick={saveSelectedUserAccess}>
                    Save access
                  </Button>
                </div>

                <div className="grid gap-2">
                  <div className="text-sm text-muted-foreground">Danger zone</div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={toggleSelectedUserBlocked}>
                      {selectedUserBlocked ? "Unblock" : "Block"}
                    </Button>
                    <Button type="button" variant="outline" onClick={deleteSelectedUser}>
                      Delete user
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Blocking prevents the app from granting access (sb_ok) on login.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </TabsContent>

      <TabsContent value="email" className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Invite by email</div>

            <div className="mt-2 text-xs text-muted-foreground">
              Choose which books this invite unlocks. Leave empty for all books.
            </div>

            {books.length ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {books.map((b) => {
                  const checked = inviteEmailAllowedBookIds.includes(b.book_id);
                  return (
                    <label key={b.book_id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={(e) => {
                          setInviteEmailAllowedBookIds((prev) => {
                            if (e.target.checked) return [...prev, b.book_id];
                            return prev.filter((x) => x !== b.book_id);
                          });
                        }}
                      />
                      <span className="min-w-0 truncate">
                        {b.title} <span className="text-xs text-muted-foreground">({b.book_id})</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : null}

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
            {inviteEmailStatus ? <div className="mt-2 text-sm text-muted-foreground">{inviteEmailStatus}</div> : null}
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
                {inviteTemplateStatus ? <div className="text-sm text-muted-foreground">{inviteTemplateStatus}</div> : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="activity" className="space-y-4">
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
            {inviteDeliveriesStatus ? <div className="mt-2 text-sm text-muted-foreground">{inviteDeliveriesStatus}</div> : null}

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
                      <span className="text-muted-foreground"> · </span>
                      <span className="text-muted-foreground">
                        books:{" "}
                        {Array.isArray(it.allowed_book_ids) && it.allowed_book_ids.length
                          ? it.allowed_book_ids
                              .map((id) => books.find((b) => b.book_id === id)?.title ?? id)
                              .join(", ")
                          : "all"}
                      </span>
                      {it.expires_at ? (
                        <span className="text-muted-foreground"> · expires {formatAdminDate(it.expires_at)}</span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">created {formatAdminDate(it.created_at)}</div>
                    {it.sent_at ? <div className="mt-1 text-xs text-muted-foreground">sent {formatAdminDate(it.sent_at)}</div> : null}
                    {it.accepted_at ? (
                      <div className="mt-1 text-xs text-muted-foreground">accepted {formatAdminDate(it.accepted_at)}</div>
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
            {inviteAttemptsStatus ? <div className="mt-2 text-sm text-muted-foreground">{inviteAttemptsStatus}</div> : null}

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
                        <div className="mt-1 text-xs text-muted-foreground">{formatAdminDate(it.created_at)}</div>
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
      </TabsContent>

      <TabsContent value="waitlist" className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-sm text-muted-foreground">Waitlist</div>
              <div className="text-xs text-muted-foreground">{waitlistCount} total</div>
            </div>

            {waitlistStatus ? <div className="mt-2 text-sm text-muted-foreground">{waitlistStatus}</div> : null}

            {waitlistItems.length === 0 ? (
              <div className="mt-2 text-sm text-muted-foreground">No waitlist entries yet.</div>
            ) : (
              <div className="mt-3 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitlistItems.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">{it.email}</TableCell>
                        <TableCell className="text-muted-foreground">{formatAdminDate(it.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="progress" className="space-y-4">
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
                          {p.email ? <div className="text-xs text-muted-foreground">{p.user_id}</div> : null}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{titleFromSlug(p.book_id)}</div>
                          <div className="text-xs text-muted-foreground">{p.book_id}</div>
                        </TableCell>
                        <TableCell>
                          {typeof p.percent_complete === "number" ? (
                            <span>
                              {p.percent_complete}%
                              {typeof p.chapter_index === "number" && typeof p.total_chapters === "number" && p.total_chapters > 0 ? (
                                <span className="text-xs text-muted-foreground"> ({Math.max(0, p.chapter_index + 1)}/{p.total_chapters})</span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{p.last_chapter_id}</TableCell>
                        <TableCell className="text-muted-foreground">{formatAdminDate(p.updated_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="feedback" className="space-y-4">
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

            {feedbackStatus ? <div className="mt-2 text-sm text-muted-foreground">{feedbackStatus}</div> : null}

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
                          {f.chapter_id ? <span className="text-muted-foreground"> / {f.chapter_id}</span> : null}
                          {f.pid ? <span className="text-muted-foreground"> / {f.pid}</span> : null}
                        </div>
                        <div className="mt-1 whitespace-pre-wrap">{f.comment_text}</div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {f.email ?? f.user_id} · {formatAdminDate(f.created_at)}
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
      </TabsContent>
    </Tabs>
  );
}
