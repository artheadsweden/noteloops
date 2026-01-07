"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Search } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import SectionCard from "@/components/layout/SectionCard";

import { listBookFeedback } from "@/services/feedback";

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
  const [chapterQuery, setChapterQuery] = useState("");
  const [feedbackCount, setFeedbackCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const rows = await listBookFeedback({ bookId });
      if (!cancelled) setFeedbackCount(rows.length);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  const filteredChapters = useMemo(() => {
    const q = chapterQuery.trim().toLowerCase();
    const items = chapters.slice().sort((a, b) => a.order_index - b.order_index);
    if (!q) return items;
    return items.filter((c) => c.title.toLowerCase().includes(q) || c.chapter_id.toLowerCase().includes(q));
  }, [chapters, chapterQuery]);

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="chapters">Chapters</TabsTrigger>
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
        <SectionCard
          title="Chapters"
          description="Search and jump to any section."
          contentClassName="space-y-4"
        >
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={chapterQuery}
              onChange={(e) => setChapterQuery(e.target.value)}
              placeholder="Search chapters"
              className="pl-9"
            />
          </div>

          <ul className="divide-y rounded-xl border border-border/60 bg-card shadow-[var(--shadow)]">
            {filteredChapters.map((c) => (
              <li key={c.chapter_id}>
                <Link
                  href={`/book/${encodeURIComponent(bookId)}/${encodeURIComponent(c.chapter_id)}`}
                  className="block px-4 py-3 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium">{c.title}</div>
                      <div className="text-xs text-muted-foreground">{c.chapter_id}</div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      </TabsContent>

      <TabsContent value="feedback">
        <SectionCard
          title="Feedback"
          description="Book-level feedback and notes."
          contentClassName="space-y-3"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            {typeof feedbackCount === "number" ? `${feedbackCount} comments` : "Loading…"}
          </div>
          <div className="text-sm text-muted-foreground">
            Use the “Book feedback” button on the left to add and review comments.
          </div>
        </SectionCard>
      </TabsContent>
    </Tabs>
  );
}
