import { getBrowserSupabaseClient, isSupabaseConfigured } from "@/services/supabase/browser";
import { getCurrentUserId } from "@/services/supabase/auth";

import type { UserProfile } from "@/services/profile/types";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  preferred_genres: string[] | null;
  wants_release_invites: boolean;
  access_mode: "all" | "restricted";
  blocked_at: string | null;
  updated_at: string;
};

type AccessRow = { user_id: string; book_id: string };

export async function getMyProfile(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured()) return null;

  const userId = await getCurrentUserId();
  if (!userId) return null;

  const supabase = getBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id,full_name,preferred_genres,wants_release_invites,access_mode,blocked_at,updated_at")
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function upsertMyProfile(patch: {
  full_name?: string | null;
  preferred_genres?: string[] | null;
  wants_release_invites?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase not configured" };

  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not logged in" };

  const supabase = getBrowserSupabaseClient();
  const row: Record<string, unknown> = { user_id: userId };
  if ("full_name" in patch) row.full_name = patch.full_name ?? null;
  if ("preferred_genres" in patch) row.preferred_genres = patch.preferred_genres ?? null;
  if (typeof patch.wants_release_invites === "boolean") row.wants_release_invites = patch.wants_release_invites;

  const { error } = await supabase.from("user_profiles").upsert(row);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getMyBookAccess(): Promise<string[] | null> {
  if (!isSupabaseConfigured()) return null;

  const userId = await getCurrentUserId();
  if (!userId) return null;

  const supabase = getBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("user_book_access")
    .select("user_id,book_id")
    .eq("user_id", userId)
    .returns<AccessRow[]>();

  if (error) return null;
  return (data ?? []).map((r) => r.book_id);
}
