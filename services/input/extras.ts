import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { getBookManifest } from "@/services/input/books";
import { getBookDirAbsolute } from "@/services/input/paths";

const TimelineEventSchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1).optional(),
  description: z.string().min(1).optional()
});

const TimelineFileSchema = z.array(TimelineEventSchema);

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function resolveBookRootFile(bookId: string, relativePath: string): string {
  const bookDir = getBookDirAbsolute(bookId);
  const resolved = path.resolve(bookDir, relativePath);

  const prefix = bookDir.endsWith(path.sep) ? bookDir : `${bookDir}${path.sep}`;
  if (!resolved.startsWith(prefix)) {
    throw new Error(`Invalid path outside book directory: ${relativePath}`);
  }

  return resolved;
}

export async function findAboutAuthorChapterId(bookId: string): Promise<string | null> {
  const manifest = await getBookManifest(bookId);

  const byId = manifest.chapters.find(
    (c) => c.chapter_id.trim().toLowerCase() === "about-the-author"
  );
  if (byId) return byId.chapter_id;

  const byTitle = manifest.chapters.find(
    (c) => c.title.trim().toLowerCase() === "about the author"
  );
  return byTitle?.chapter_id ?? null;
}

export async function getBookTimeline(bookId: string): Promise<TimelineEvent[] | null> {
  // Optional metadata file: /public/input/[bookId]/timeline.json
  const timelinePath = resolveBookRootFile(bookId, "timeline.json");
  if (!(await fileExists(timelinePath))) return null;

  const raw = await fs.readFile(timelinePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  return TimelineFileSchema.parse(parsed);
}
