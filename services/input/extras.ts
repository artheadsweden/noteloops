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

const ExtraRecordingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  date: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  mentioned_in_chapter_id: z.string().min(1).optional(),
  image: z.string().min(1).optional(),
  image_alt: z.string().min(1).optional(),
  photo_credit: z.string().min(1).optional(),
  audio_mp3: z.string().url(),
  description: z.string().min(1).optional()
});

const ExtrasFileSchema = z.object({
  recordings: z.array(ExtraRecordingSchema).optional()
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type ExtraRecording = z.infer<typeof ExtraRecordingSchema>;

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

export async function getBookExtraRecordings(bookId: string): Promise<ExtraRecording[] | null> {
  // Optional metadata file: /public/input/[bookId]/extras.json
  const extrasPath = resolveBookRootFile(bookId, "extras.json");
  if (!(await fileExists(extrasPath))) return null;

  const raw = await fs.readFile(extrasPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  const extras = ExtrasFileSchema.parse(parsed);
  return extras.recordings && extras.recordings.length > 0 ? extras.recordings : null;
}

export async function getBookPeopleHtml(bookId: string): Promise<string | null> {
  // Optional file: /public/input/[bookId]/people.html
  const peoplePath = resolveBookRootFile(bookId, "people.html");
  if (!(await fileExists(peoplePath))) return null;
  return fs.readFile(peoplePath, "utf-8");
}

export async function getBookGlossaryHtml(bookId: string): Promise<string | null> {
  // Optional file: /public/input/[bookId]/glossary.html
  const glossaryPath = resolveBookRootFile(bookId, "glossary.html");
  if (!(await fileExists(glossaryPath))) return null;
  return fs.readFile(glossaryPath, "utf-8");
}
