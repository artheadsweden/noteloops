import type { UserProgress } from "@/services/progress/types";

const STORAGE_PREFIX = "betaReader.userProgress.v1";

function keyForBook(bookId: string): string {
  return `${STORAGE_PREFIX}:${bookId}`;
}

export function getLocalProgress(bookId: string): UserProgress | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(keyForBook(bookId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as UserProgress;
  } catch {
    return null;
  }
}

export function setLocalProgress(progress: Omit<UserProgress, "updated_at">): void {
  if (typeof window === "undefined") return;

  const full: UserProgress = {
    ...progress,
    furthest_chapter_id: progress.furthest_chapter_id ?? null,
    furthest_pid: progress.furthest_pid ?? null,
    furthest_timestamp: typeof progress.furthest_timestamp === "number" ? progress.furthest_timestamp : 0,
    updated_at: new Date().toISOString()
  };

  window.localStorage.setItem(keyForBook(progress.book_id), JSON.stringify(full));
}
