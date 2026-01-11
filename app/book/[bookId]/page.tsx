import { getBookManifest } from "@/services/input/books";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, X } from "lucide-react";
import BookResumeClient from "@/app/book/[bookId]/BookResumeClient";
import BookStartClient from "@/app/book/[bookId]/BookStartClient";
import BookFeedbackClient from "@/app/book/[bookId]/BookFeedbackClient";
import BookDetailTabsClient from "@/app/book/[bookId]/BookDetailTabsClient";
import AppFrame from "@/app/components/AppFrame";
import { titleFromSlug } from "@/lib/display";
import { sanitizeSummaryHtml } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import SectionCard from "@/components/layout/SectionCard";
import { CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

function looksLikeHtml(value: string): boolean {
  // Basic heuristic: if it contains any HTML-ish tag, treat as HTML.
  // This keeps backward-compatibility with summary_long used as plain text.
  return /<\s*\/?\s*[a-z][\s\S]*>/i.test(value);
}

function toPublicInputUrl(bookId: string, assetPath: string): string {
  return `/input/${encodeURIComponent(bookId)}/${assetPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export default async function BookPage({
  params
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const manifest = await getBookManifest(bookId);

  const overviewHtml = manifest.summary_long_html
    ? sanitizeSummaryHtml(manifest.summary_long_html)
    : manifest.summary_long && looksLikeHtml(manifest.summary_long)
      ? sanitizeSummaryHtml(manifest.summary_long)
      : null;

  const overviewText = !overviewHtml
    ? (manifest.summary_long && !looksLikeHtml(manifest.summary_long)
        ? manifest.summary_long
        : manifest.summary ?? null)
    : null;

  const firstChapterId = manifest.chapters
    .slice()
    .sort((a, b) => a.order_index - b.order_index)[0]?.chapter_id;

  return (
    <AppFrame>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <SectionCard className="overflow-hidden" contentClassName="space-y-4">
            <div className="flex items-start gap-4">
              {manifest.cover_image ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="relative h-48 w-32 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      aria-label="Open cover image"
                    >
                      <Image
                        src={toPublicInputUrl(manifest.book_id, manifest.cover_image)}
                        alt={`${titleFromSlug(manifest.book_id)} cover`}
                        fill
                        sizes="128px"
                        className="object-cover"
                      />
                    </button>
                  </DialogTrigger>

                  <DialogContent className="max-w-3xl p-0">
                    <DialogClose asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute right-3 top-3 h-8 w-8 p-0"
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DialogClose>

                    <DialogHeader className="p-6 pb-0">
                      <DialogTitle>{titleFromSlug(manifest.book_id)}</DialogTitle>
                      <DialogDescription>Cover</DialogDescription>
                    </DialogHeader>

                    <div className="p-6 pt-4">
                      <div className="relative mx-auto aspect-[2/3] w-full max-w-xl overflow-hidden rounded-lg border border-border/60 bg-muted">
                        <Image
                          src={toPublicInputUrl(manifest.book_id, manifest.cover_image)}
                          alt={`${titleFromSlug(manifest.book_id)} cover`}
                          fill
                          sizes="(max-width: 768px) 90vw, 560px"
                          className="object-contain"
                          priority
                        />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : null}

              <div className="min-w-0 space-y-2">
                <div className="text-xs text-muted-foreground">Book</div>
                <h1 className="text-2xl font-semibold tracking-tight">{titleFromSlug(manifest.book_id)}</h1>
                <div className="text-sm text-muted-foreground">{manifest.chapters.length} chapters</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {firstChapterId ? (
                <div className="w-full">
                  <BookStartClient bookId={manifest.book_id} firstChapterId={firstChapterId} />
                </div>
              ) : null}

              <Button asChild variant="outline" size="sm">
                <Link href={`/book/${encodeURIComponent(manifest.book_id)}/extras`}>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Extras
                </Link>
              </Button>

              {manifest.downloads?.pdf ? (
                <Button asChild variant="outline" size="sm">
                  <a href={toPublicInputUrl(manifest.book_id, manifest.downloads.pdf)} download>
                    PDF
                  </a>
                </Button>
              ) : null}

              {manifest.downloads?.epub ? (
                <Button asChild variant="outline" size="sm">
                  <a href={toPublicInputUrl(manifest.book_id, manifest.downloads.epub)} download>
                    EPUB
                  </a>
                </Button>
              ) : null}
            </div>

            <div>
              <BookFeedbackClient bookId={manifest.book_id} />
            </div>
          </SectionCard>

          <BookResumeClient
            bookId={manifest.book_id}
            chapters={manifest.chapters.map((c) => ({ chapter_id: c.chapter_id, title: c.title }))}
          />
        </div>

        <div className="space-y-6">
          <BookDetailTabsClient
            bookId={manifest.book_id}
            overviewHtml={overviewHtml}
            overviewText={overviewText}
            chapters={manifest.chapters.map((c) => ({
              chapter_id: c.chapter_id,
              title: c.title,
              order_index: c.order_index
            }))}
          />
        </div>
      </div>
    </AppFrame>
  );
}
