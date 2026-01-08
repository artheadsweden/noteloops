import Link from "next/link";
import { notFound } from "next/navigation";

import { getBookManifest } from "@/services/input/books";
import { getChapterContent } from "@/services/input/chapters";
import { findAboutAuthorChapterId, getBookExtraRecordings, getBookTimeline } from "@/services/input/extras";
import AppFrame from "@/app/components/AppFrame";
import { titleFromSlug } from "@/lib/display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ExtrasPage({
  params
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;

  let manifest: Awaited<ReturnType<typeof getBookManifest>>;
  try {
    manifest = await getBookManifest(bookId);
  } catch {
    notFound();
  }

  const timeline = await getBookTimeline(bookId).catch(() => null);
  const recordings = await getBookExtraRecordings(bookId).catch(() => null);

  const aboutId = await findAboutAuthorChapterId(bookId);
  const about = aboutId
    ? await getChapterContent(bookId, aboutId).catch(() => null)
    : null;

  return (
    <AppFrame>
      <div className="text-sm text-muted-foreground">
        <Button asChild variant="link" className="px-0">
          <Link href="/dashboard">Library</Link>
        </Button>
        <span className="text-muted-foreground"> / </span>
        <Button asChild variant="link" className="px-0">
          <Link href={`/book/${encodeURIComponent(manifest.book_id)}`}>
            {titleFromSlug(manifest.book_id)}
          </Link>
        </Button>
        <span className="text-muted-foreground"> / </span>
        <span className="text-foreground">Extras</span>
      </div>

      <h1 className="mt-2 text-2xl font-semibold">Extras</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Additional material for <span className="text-foreground">{titleFromSlug(manifest.book_id)}</span>
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          {recordings && recordings.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Audio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recordings.map((rec) => (
                  <div key={rec.id} className="rounded-lg border border-border/60 bg-card p-4">
                    <div className="text-sm font-medium text-foreground">{rec.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {[rec.date, rec.location].filter(Boolean).join(" · ")}
                    </div>
                    {rec.description ? (
                      <p className="mt-2 text-sm text-muted-foreground">{rec.description}</p>
                    ) : null}

                    {rec.mentioned_in_chapter_id ? (
                      <div className="mt-3">
                        <Button asChild variant="outline" size="sm">
                          <Link
                            href={`/book/${encodeURIComponent(manifest.book_id)}/${encodeURIComponent(rec.mentioned_in_chapter_id)}`}
                          >
                            Open {rec.mentioned_in_chapter_id}
                          </Link>
                        </Button>
                      </div>
                    ) : null}

                    <div className="mt-4">
                      <audio className="w-full" controls preload="none" src={rec.audio_mp3} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>About the Author</CardTitle>
            </CardHeader>
            <CardContent>
              {about ? (
                <div
                  className="prose mt-0 max-w-none"
                  dangerouslySetInnerHTML={{ __html: about.html }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No “About the Author” chapter found in this book.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <p className="text-sm text-muted-foreground">
              Reads from <span className="font-medium">/public/input/{manifest.book_id}/timeline.json</span>.
            </p>
          </CardHeader>
          <CardContent>

          {timeline && timeline.length > 0 ? (
            <ol className="mt-4 space-y-3 border-l pl-4">
              {timeline.map((ev, idx) => (
                <li key={`${idx}-${ev.title}`} className="relative">
                  <span className="absolute -left-[9px] top-1 h-3 w-3 rounded-full border bg-background" />
                  <div className="text-sm font-medium">{ev.title}</div>
                  {ev.date ? <div className="text-xs text-muted-foreground">{ev.date}</div> : null}
                  {ev.description ? (
                    <div className="mt-1 text-sm text-muted-foreground">{ev.description}</div>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No timeline metadata found.</p>
          )}
          </CardContent>
        </Card>
      </div>
    </AppFrame>
  );
}
