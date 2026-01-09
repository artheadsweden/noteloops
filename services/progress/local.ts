import type { UserProgress } from "@/services/progress/types";

const STORAGE_PREFIX = "betaReader.userProgress.v2";
const LEGACY_STORAGE_PREFIX = "betaReader.userProgress.v1";

function keyForBook(bookId: string, userId?: string | null): string {
  const scope = userId ? `user:${userId}` : "anon";
  return `${STORAGE_PREFIX}:${scope}:${bookId}`;
}

function legacyKeyForBook(bookId: string): string {
  return `${LEGACY_STORAGE_PREFIX}:${bookId}`;
}

export function getLocalProgress(bookId: string, userId?: string | null): UserProgress | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(keyForBook(bookId, userId));
  const legacyRaw = !userId ? window.localStorage.getItem(legacyKeyForBook(bookId)) : null;

  const value = raw ?? legacyRaw;
  if (!value) return null;

  try {
    return JSON.parse(value) as UserProgress;
  } catch {
    return null;
  }
}

export function setLocalProgress(
  progress: Omit<UserProgress, "updated_at">,
  userId?: string | null
): void {
  if (typeof window === "undefined") return;

  const full: UserProgress = {
    ...progress,
    furthest_chapter_id: progress.furthest_chapter_id ?? null,
    furthest_pid: progress.furthest_pid ?? null,
    furthest_timestamp: typeof progress.furthest_timestamp === "number" ? progress.furthest_timestamp : 0,
    updated_at: new Date().toISOString()
  };

  window.localStorage.setItem(keyForBook(progress.book_id, userId), JSON.stringify(full));
}
