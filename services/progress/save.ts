import { setLocalProgress } from "@/services/progress/local";
import type { UserProgress } from "@/services/progress/types";
import { upsertSupabaseProgress } from "@/services/progress/supabase";

export async function saveProgress(
  progress: Omit<UserProgress, "updated_at">
): Promise<void> {
  // Always keep a local copy (supports offline and logged-out users).
  setLocalProgress(progress);

  // Best-effort remote save.
  try {
    await upsertSupabaseProgress(progress);
  } catch {
    // ignore
  }
}
