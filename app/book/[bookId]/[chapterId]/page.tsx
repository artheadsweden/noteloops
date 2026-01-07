import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Library } from "lucide-react";
import { titleFromSlug } from "@/lib/display";

import ReaderClient from "@/app/book/[bookId]/[chapterId]/ReaderClient";
import AppFrame from "@/app/components/AppFrame";
import { getChapterContent } from "@/services/input/chapters";
import { getBookManifest } from "@/services/input/books";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function ChapterPage({
  params,
  searchParams
}: {
  params: Promise<{ bookId: string; chapterId: string }>;
  searchParams: Promise<{ pid?: string; t?: string }>;
}) {
  const { bookId, chapterId } = await params;
  const { pid, t } = await searchParams;

  const manifest = await getBookManifest(bookId);
  const orderedChapters = manifest.chapters
    .slice()
    .sort((a, b) => a.order_index - b.order_index);
  const idx = orderedChapters.findIndex((c) => c.chapter_id === chapterId);
  const prev = idx > 0 ? orderedChapters[idx - 1] : null;
  const next = idx >= 0 && idx < orderedChapters.length - 1 ? orderedChapters[idx + 1] : null;

  let content: Awaited<ReturnType<typeof getChapterContent>>;
  try {
    content = await getChapterContent(bookId, chapterId);
  } catch {
    notFound();
  }

  return (
    <AppFrame>
      <Card>
        <CardContent className="p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">
              <Button asChild variant="link" className="h-auto px-0 py-0">
                <Link className="inline-flex items-center gap-2" href="/dashboard">
                  <Library className="h-4 w-4" aria-hidden="true" />
                  Library
                </Link>
              </Button>
              <span className="text-muted-foreground"> / </span>
              <Button asChild variant="link" className="h-auto px-0 py-0">
                <Link href={`/book/${encodeURIComponent(bookId)}`}>{titleFromSlug(bookId)}</Link>
              </Button>
            </div>
            <h1 className="mt-2 text-2xl font-semibold">{content.chapter.title}</h1>
          </div>

          <div className="flex items-center gap-3 text-sm">
            {prev ? (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/book/${encodeURIComponent(bookId)}/${encodeURIComponent(
                    prev.chapter_id
                  )}`}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Previous
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </Button>
            )}

            {next ? (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/book/${encodeURIComponent(bookId)}/${encodeURIComponent(
                    next.chapter_id
                  )}`}
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
        </CardContent>
      </Card>

      <ReaderClient
        bookId={bookId}
        chapterId={chapterId}
        html={content.html}
        alignSegments={content.alignSegments}
        alignStatus={content.alignStatus}
        audioUrl={content.audioUrl}
        initialPid={pid}
        initialTime={t ? Number(t) : undefined}
        chapters={orderedChapters.map((c) => ({
          chapter_id: c.chapter_id,
          title: c.title
        }))}
      />
    </AppFrame>
  );
}
