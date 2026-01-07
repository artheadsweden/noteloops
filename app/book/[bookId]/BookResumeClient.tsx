"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getLocalProgress, getSupabaseProgress, type UserProgress } from "@/services/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const whole = Math.floor(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function BookResumeClient({
  bookId,
  chapters
}: {
  bookId: string;
  chapters: Array<{ chapter_id: string; title: string }>;
}) {
  const [progress, setProgress] = useState<UserProgress | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const remote = await getSupabaseProgress(bookId);
      if (!cancelled && remote) {
        setProgress(remote);
        return;
      }

      if (!cancelled) setProgress(getLocalProgress(bookId));
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  if (!progress) return null;

  const chapterTitle =
    chapters.find((c) => c.chapter_id === progress.last_chapter_id)?.title ??
    progress.last_chapter_id;
  const timeLabel = formatTime(progress.last_timestamp ?? 0);

  const href = `/book/${encodeURIComponent(progress.book_id)}/${encodeURIComponent(
    progress.last_chapter_id
  )}?${new URLSearchParams({
    ...(progress.last_pid ? { pid: progress.last_pid } : {}),
    t: String(progress.last_timestamp ?? 0)
  }).toString()}`;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">Resume reading</div>
        <div className="mt-1 text-sm">
          {chapterTitle}
          {timeLabel ? <span className="text-muted-foreground"> · {timeLabel}</span> : null}
        </div>
        <div className="mt-3">
          <Button asChild variant="outline" size="sm">
            <Link href={href}>Resume</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
