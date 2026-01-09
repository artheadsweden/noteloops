"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import SectionCard from "@/components/layout/SectionCard";

type ChapterItem = { chapter_id: string; title: string; order_index: number };

export default function BookChaptersTabClient({
  bookId,
  chapters
}: {
  bookId: string;
  chapters: ChapterItem[];
}) {
  const [chapterQuery, setChapterQuery] = useState("");

  const filteredChapters = useMemo(() => {
    const q = chapterQuery.trim().toLowerCase();
    const items = chapters.slice().sort((a, b) => a.order_index - b.order_index);
    if (!q) return items;
    return items.filter(
      (c) => c.title.toLowerCase().includes(q) || c.chapter_id.toLowerCase().includes(q)
    );
  }, [chapters, chapterQuery]);

  return (
    <SectionCard title="Chapters" description="Search and jump to any section." contentClassName="space-y-4">
      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
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
  );
}
