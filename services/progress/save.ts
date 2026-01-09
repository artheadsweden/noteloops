import { setLocalProgress } from "@/services/progress/local";
import type { UserProgress } from "@/services/progress/types";
import { upsertSupabaseProgress } from "@/services/progress/supabase";
import { getCurrentUserId } from "@/services/supabase/auth";

export async function saveProgress(
  progress: Omit<UserProgress, "updated_at">
): Promise<void> {
  // Always keep a local copy (supports offline and logged-out users).
  // Scope by user when possible so progress doesn't leak across accounts on the same device.
  const userId = await getCurrentUserId().catch(() => null);
  setLocalProgress(progress, userId);

  // Best-effort remote save.
  try {
    await upsertSupabaseProgress(progress);
  } catch {
    // ignore
  }
}
