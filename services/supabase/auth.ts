import { getBrowserSupabaseClient, isSupabaseConfigured } from "@/services/supabase/browser";

export async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getBrowserSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = getBrowserSupabaseClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  const supabase = getBrowserSupabaseClient();
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  const supabase = getBrowserSupabaseClient();
  return supabase.auth.signOut();
}

export async function getAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getBrowserSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
