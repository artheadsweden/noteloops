"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getLocalProgress, getSupabaseProgress } from "@/services/progress";
import { getCurrentUserId } from "@/services/supabase/auth";
import { getGateSessionOk } from "@/services/supabase/gate";
import { Button } from "@/components/ui/button";

export default function BookStartClient({
  bookId,
  firstChapterId
}: {
  bookId: string;
  firstChapterId: string;
}) {
  const defaultHref = useMemo(
    () => `/book/${encodeURIComponent(bookId)}/${encodeURIComponent(firstChapterId)}`,
    [bookId, firstChapterId]
  );

  const [href, setHref] = useState<string>(defaultHref);

  useEffect(() => {
    setHref(defaultHref);
  }, [defaultHref]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const remote = await getSupabaseProgress(bookId);
      if (!cancelled && remote?.last_chapter_id) {
        const resumeHref = `/book/${encodeURIComponent(remote.book_id)}/${encodeURIComponent(
          remote.last_chapter_id
        )}?${new URLSearchParams({
          ...(remote.last_pid ? { pid: remote.last_pid } : {}),
          t: String(remote.last_timestamp ?? 0)
        }).toString()}`;
        setHref(resumeHref);
        return;
      }

      const userId = await getCurrentUserId().catch(() => null);
      const sessionOk = userId ? true : await getGateSessionOk().catch(() => false);
      const local = userId ? getLocalProgress(bookId, userId) : sessionOk ? null : getLocalProgress(bookId);

      if (!cancelled && local?.last_chapter_id) {
        const resumeHref = `/book/${encodeURIComponent(local.book_id)}/${encodeURIComponent(
          local.last_chapter_id
        )}?${new URLSearchParams({
          ...(local.last_pid ? { pid: local.last_pid } : {}),
          t: String(local.last_timestamp ?? 0)
        }).toString()}`;
        setHref(resumeHref);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  return (
    <Button asChild className="w-full">
      <Link href={href}>Listen / Read</Link>
    </Button>
  );
}
