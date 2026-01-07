"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Download, Search } from "lucide-react";

import PageShell from "@/components/layout/PageShell";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { titleFromSlug } from "@/lib/display";
import type { BookManifest } from "@/services/input/manifest";
import { getLocalProgress, type UserProgress } from "@/services/progress";
import { listSupabaseProgressForBooks } from "@/services/progress/supabase";

function toPublicInputUrl(bookId: string, assetPath: string): string {
  return `/input/${encodeURIComponent(bookId)}/${assetPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

type SortMode = "recent" | "title";

type ContinueItem = {
  progress: UserProgress;
  bookTitle: string;
  chapterTitle: string;
};

export default function DashboardClient({ manifests }: { manifests: BookManifest[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [progressByBook, setProgressByBook] = useState<Record<string, UserProgress>>({});

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const ids = manifests.map((m) => m.book_id);
      const local: Record<string, UserProgress> = {};
      for (const m of manifests) {
        const p = getLocalProgress(m.book_id);
        if (p) local[m.book_id] = p;
      }

      // Remote is best-effort; keep local as fallback.
      const remote = await listSupabaseProgressForBooks(ids).catch(() => []);
      const merged: Record<string, UserProgress> = { ...local };
      for (const p of remote) merged[p.book_id] = p;

      if (!cancelled) setProgressByBook(merged);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [manifests]);

  const continueItem: ContinueItem | null = useMemo(() => {
    let best: UserProgress | null = null;
    for (const p of Object.values(progressByBook)) {
      if (!best) {
        best = p;
        continue;
      }
      if (new Date(p.updated_at).getTime() > new Date(best.updated_at).getTime()) best = p;
    }
    if (!best) return null;

    const manifest = manifests.find((m) => m.book_id === best.book_id);
    if (!manifest) return null;

    const chapterTitle =
      manifest.chapters.find((c) => c.chapter_id === best.last_chapter_id)?.title ?? best.last_chapter_id;

    return {
      progress: best,
      bookTitle: titleFromSlug(best.book_id),
      chapterTitle
    };
  }, [manifests, progressByBook]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = q
      ? manifests.filter((m) => {
          const t = titleFromSlug(m.book_id).toLowerCase();
          const s = (m.summary_short ?? m.summary ?? "").toLowerCase();
          return t.includes(q) || s.includes(q) || m.book_id.toLowerCase().includes(q);
        })
      : manifests.slice();

    if (sort === "title") {
      items.sort((a, b) => titleFromSlug(a.book_id).localeCompare(titleFromSlug(b.book_id)));
      return items;
    }

    // Recently opened (best-effort): order by progress updated_at (remote/local) descending.
    items.sort((a, b) => {
      const ap = progressByBook[a.book_id];
      const bp = progressByBook[b.book_id];
      const at = ap ? new Date(ap.updated_at).getTime() : 0;
      const bt = bp ? new Date(bp.updated_at).getTime() : 0;
      return bt - at;
    });
    return items;
  }, [manifests, progressByBook, query, sort]);

  const actions = (
    <>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search books"
          className="pl-9"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline">
            Sort: {sort === "recent" ? "Recently opened" : "Title"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setSort("recent")}>Recently opened</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSort("title")}>Title</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return (
    <PageShell
      title="Library"
      description="Choose a book to start reading and leave feedback."
      actions={actions}
    >
      {continueItem ? (
        <Card className="shadow-[var(--shadow-lg)]">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Continue reading</CardTitle>
            <CardDescription>
              {continueItem.bookTitle} · {continueItem.chapterTitle}
              <span className="text-muted-foreground"> · {formatTime(continueItem.progress.last_timestamp ?? 0)}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button asChild>
              <Link
                href={`/book/${encodeURIComponent(continueItem.progress.book_id)}/${encodeURIComponent(
                  continueItem.progress.last_chapter_id
                )}?${new URLSearchParams({
                  ...(continueItem.progress.last_pid ? { pid: continueItem.progress.last_pid } : {}),
                  t: String(continueItem.progress.last_timestamp ?? 0)
                }).toString()}`}
              >
                Resume
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title={manifests.length === 0 ? "No books found" : "No matches"}
          description={
            manifests.length === 0
              ? "Add a book under /public/input and include a manifest.json."
              : "Try a different search."
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => (
            <li key={m.book_id}>
              <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-md)]">
                {m.cover_image ? (
                  <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border/60 bg-muted">
                    <Image
                      src={toPublicInputUrl(m.book_id, m.cover_image)}
                      alt={`${titleFromSlug(m.book_id)} cover`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 360px"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      priority={false}
                    />
                  </div>
                ) : null}

                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base leading-tight">{titleFromSlug(m.book_id)}</CardTitle>
                      <CardDescription>{m.chapters.length} chapters</CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm" className="shrink-0">
                      <Link href={`/book/${encodeURIComponent(m.book_id)}`}>
                        Open
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col pt-0">
                  <p className="text-sm text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden">
                    {m.summary_short ?? m.summary ?? "No description available."}
                  </p>

                  {m.downloads?.pdf || m.downloads?.epub ? (
                    <div className="mt-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="outline" size="sm">
                            <Download className="h-4 w-4" aria-hidden="true" />
                            Downloads
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {m.downloads?.pdf ? (
                            <DropdownMenuItem asChild>
                              <a href={toPublicInputUrl(m.book_id, m.downloads.pdf)} download>
                                PDF
                              </a>
                            </DropdownMenuItem>
                          ) : null}
                          {m.downloads?.pdf && m.downloads?.epub ? <DropdownMenuSeparator /> : null}
                          {m.downloads?.epub ? (
                            <DropdownMenuItem asChild>
                              <a href={toPublicInputUrl(m.book_id, m.downloads.epub)} download>
                                EPUB
                              </a>
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
