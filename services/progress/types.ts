export type UserProgress = {
  book_id: string;
  last_chapter_id: string;
  last_pid: string | null;
  last_timestamp: number;
  furthest_chapter_id: string | null;
  furthest_pid: string | null;
  furthest_timestamp: number;
  updated_at: string; // ISO
};
