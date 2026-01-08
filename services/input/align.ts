import "server-only";

import { z } from "zod";

// Word-level alignment emitted as a top-level list.
// Each word points at a paragraph pid and provides char offsets within that paragraph.
export const AlignWordSchema = z
  .object({
    pid: z.string().min(1),
    widx: z.number().int().nonnegative(),
    text: z.string(),
    start_char: z.number().int().nonnegative(),
    end_char: z.number().int().nonnegative(),
    begin: z.number().optional(),
    start: z.number().optional(),
    end: z.number()
  })
  .transform((w) => {
    const begin = typeof w.begin === "number" ? w.begin : w.start;
    if (typeof begin !== "number") {
      throw new Error("Alignment word is missing begin/start");
    }

    return {
      pid: w.pid,
      widx: w.widx,
      text: w.text,
      start_char: w.start_char,
      end_char: w.end_char,
      begin,
      end: w.end
    };
  });

// Alignment generators may emit `begin`/`end` or `start`/`end`.
// Normalize into `{ pid, begin, end }` so the reader logic can be consistent.
export const AlignSegmentSchema = z
  .object({
    pid: z.string().min(1),
    begin: z.number().optional(),
    start: z.number().optional(),
    end: z.number()
  })
  .transform((seg) => {
    const begin = typeof seg.begin === "number" ? seg.begin : seg.start;
    if (typeof begin !== "number") {
      throw new Error("Alignment segment is missing begin/start");
    }

    return {
      pid: seg.pid,
      begin,
      end: seg.end
    };
  });

export const AlignFileSchema = z
  .object({
    chapter_id: z.string().min(1).optional(),
    status: z.string().optional(),
    segments: z.array(AlignSegmentSchema).default([]),
    words: z.array(AlignWordSchema).default([])
  })
  .passthrough();

export type AlignSegment = z.infer<typeof AlignSegmentSchema>;
export type AlignWord = z.infer<typeof AlignWordSchema>;
export type AlignFile = z.infer<typeof AlignFileSchema>;
