import { getBrowserSupabaseClient, isSupabaseConfigured } from "@/services/supabase/browser";
import { getCurrentUserId } from "@/services/supabase/auth";

import type { UserSettings } from "@/services/settings/types";

type SettingsRow = {
  user_id: string;
  settings: unknown;
  updated_at: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeSettings(base: UserSettings, patch: Partial<UserSettings>): UserSettings {
  return {
    ...base,
    ...patch,
    reader: {
      ...(base.reader ?? {}),
      ...(patch.reader ?? {})
    }
  };
}

export async function getSupabaseUserSettings(): Promise<UserSettings | null> {
  if (!isSupabaseConfigured()) return null;

  const userId = await getCurrentUserId();
  if (!userId) return null;

  const supabase = getBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("user_id,settings,updated_at")
    .eq("user_id", userId)
    .maybeSingle<SettingsRow>();

  if (error || !data) return null;

  const raw = data.settings;
  if (!isObject(raw)) return {};
  return raw as UserSettings;
}

export async function updateSupabaseUserSettings(patch: Partial<UserSettings>): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase not configured" };

  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not logged in" };

  const supabase = getBrowserSupabaseClient();

  // Read once, merge client-side, then upsert.
  const { data: existing } = await supabase
    .from("user_settings")
    .select("settings")
    .eq("user_id", userId)
    .maybeSingle<{ settings: unknown }>();

  const base: UserSettings = isObject(existing?.settings) ? (existing?.settings as UserSettings) : {};
  const next = mergeSettings(base, patch);

  const { error } = await supabase
    .from("user_settings")
    .upsert({
      user_id: userId,
      settings: next,
      updated_at: new Date().toISOString()
    });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
