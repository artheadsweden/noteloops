import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SectionCard from "@/components/layout/SectionCard";

import BookChaptersTabClient from "@/app/book/[bookId]/BookChaptersTabClient";
import BookFeedbackTabClient from "@/app/book/[bookId]/BookFeedbackTabClient";
import ExtrasTabs from "@/app/book/[bookId]/extras/ExtrasTabs";

type ChapterItem = { chapter_id: string; title: string; order_index: number };

export default function BookDetailTabsClient({
  bookId,
  overviewHtml,
  overviewText,
  chapters
}: {
  bookId: string;
  overviewHtml?: string | null;
  overviewText?: string | null;
  chapters: ChapterItem[];
}) {
  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="chapters">Chapters</TabsTrigger>
        <TabsTrigger value="extras">Extras</TabsTrigger>
        <TabsTrigger value="feedback">Feedback</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <SectionCard title="Overview" description="About and quick context." contentClassName="space-y-4">
          {overviewHtml ? (
            <div
              className="prose prose-sm max-w-prose text-foreground dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: overviewHtml }}
            />
          ) : overviewText ? (
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{overviewText}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No summary available.</p>
          )}

          <div className="text-sm text-muted-foreground">{chapters.length} chapters</div>
        </SectionCard>
      </TabsContent>

      <TabsContent value="chapters">
        <BookChaptersTabClient bookId={bookId} chapters={chapters} />
      </TabsContent>

      <TabsContent value="extras">
        <SectionCard title="Extras" description="Additional material for this book." contentClassName="space-y-4">
          <ExtrasTabs bookId={bookId} />
        </SectionCard>
      </TabsContent>

      <TabsContent value="feedback">
        <BookFeedbackTabClient bookId={bookId} />
      </TabsContent>
    </Tabs>
  );
}
