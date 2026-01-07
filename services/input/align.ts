import "server-only";

import { z } from "zod";

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
    segments: z.array(AlignSegmentSchema).default([])
  })
  .passthrough();

export type AlignSegment = z.infer<typeof AlignSegmentSchema>;
export type AlignFile = z.infer<typeof AlignFileSchema>;
