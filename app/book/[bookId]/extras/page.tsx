import Link from "next/link";
import { notFound } from "next/navigation";

import { getBookManifest } from "@/services/input/books";
import { getChapterContent } from "@/services/input/chapters";
import { findAboutAuthorChapterId, getBookExtraRecordings, getBookTimeline } from "@/services/input/extras";
import AppFrame from "@/app/components/AppFrame";
import { titleFromSlug } from "@/lib/display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function toPublicInputUrl(bookId: string, assetPath: string): string {
  return `/input/${encodeURIComponent(bookId)}/${assetPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

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

  const hasRecordings = Boolean(recordings && recordings.length > 0);
  const hasTimeline = Boolean(timeline && timeline.length > 0);
  const defaultTab = hasRecordings ? "audio" : hasTimeline ? "timeline" : "about";

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

      <Tabs defaultValue={defaultTab} className="mt-6 space-y-4">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          {hasRecordings ? <TabsTrigger value="audio">Audio</TabsTrigger> : null}
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        {hasRecordings ? (
          <TabsContent value="audio">
            <Card>
              <CardHeader>
                <CardTitle>Audio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recordings?.map((rec) => (
                  <div key={rec.id} className="rounded-lg border border-border/60 bg-card p-4">
                    <div className="text-sm font-medium text-foreground">{rec.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {[rec.date, rec.location].filter(Boolean).join(" · ")}
                    </div>
                    {rec.description ? (
                      <p className="mt-2 text-sm text-muted-foreground">{rec.description}</p>
                    ) : null}

                    {rec.image ? (
                      <div className="mt-4 overflow-hidden rounded-lg border border-border/60 bg-muted">
                        <img
                          src={toPublicInputUrl(manifest.book_id, rec.image)}
                          alt={rec.image_alt ?? rec.title}
                          className="h-auto w-full"
                          loading="lazy"
                        />
                      </div>
                    ) : null}

                    {rec.image && rec.photo_credit ? (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Photo: <span className="font-medium text-foreground">{rec.photo_credit}</span>
                      </div>
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
          </TabsContent>
        ) : null}

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <p className="text-sm text-muted-foreground">
                Real-world events that are covered or referenced in the book.
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
                <p className="mt-3 text-sm text-muted-foreground">No timeline entries yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about">
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
        </TabsContent>
      </Tabs>
    </AppFrame>
  );
}
