import "server-only";

import { z } from "zod";

export const ChapterAssetsSchema = z.object({
  text_html: z.string().min(1),
  text_json: z.string().min(1),
  align_json: z.string().min(1),
  audio_mp3: z.string().min(1).optional()
});

export const ChapterSchema = z.object({
  order_index: z.number(),
  chapter_id: z.string().min(1),
  title: z.string().min(1),
  assets: ChapterAssetsSchema
});

export const BookManifestSchema = z.object({
  schema_version: z.number().int().positive().optional(),
  book_id: z.string().min(1),
  cover_image: z.string().min(1).optional(),
  // Optional book descriptions.
  // - summary_short: shown in the library card
  // - summary_long: shown on the book page
  // - summary_long_html: optional HTML version for rich formatting on the book page
  // - summary: legacy single-field fallback
  summary_short: z.string().min(1).optional(),
  summary_long: z.string().min(1).optional(),
  summary_long_html: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
  downloads: z
    .object({
      pdf: z.string().min(1).optional(),
      epub: z.string().min(1).optional()
    })
    .optional(),
  build_id: z.string().min(1).optional(),
  created_at: z.string().min(1).optional(),
  chapters: z.array(ChapterSchema)
});

export type BookManifest = z.infer<typeof BookManifestSchema>;
