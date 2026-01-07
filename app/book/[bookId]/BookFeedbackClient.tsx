"use client";

import { useEffect, useState } from "react";

import {
  addBookFeedback,
  deleteBookFeedback,
  listBookFeedback,
  type BookFeedbackItem
} from "@/services/feedback";
import { titleFromSlug } from "@/lib/display";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

export default function BookFeedbackClient({ bookId }: { bookId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<BookFeedbackItem[]>([]);
  const [commentText, setCommentText] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setStatus(null);

    const run = async () => {
      const rows = await listBookFeedback({ bookId });
      if (!cancelled) setItems(rows);
      if (!cancelled) setLoading(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, bookId]);

  const submit = async () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;

    setStatus(null);
    const res = await addBookFeedback({ bookId, commentText: trimmed });
    if (!res.ok) {
      setStatus(res.error ?? "Failed to save");
      return;
    }

    setCommentText("");
    setStatus("Saved.");
    const rows = await listBookFeedback({ bookId });
    setItems(rows);
  };

  const del = async (id: string) => {
    setStatus(null);
    const res = await deleteBookFeedback({ id });
    if (!res.ok) {
      setStatus(res.error ?? "Failed to delete");
      return;
    }

    const rows = await listBookFeedback({ bookId });
    setItems(rows);
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Book feedback
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <div>
              <SheetTitle>Feedback</SheetTitle>
              <SheetDescription>
                Book: {titleFromSlug(bookId)}
                <span className="text-xs text-muted-foreground"> ({bookId})</span>
              </SheetDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </SheetHeader>

          <div className="mt-4 grid gap-3">
            <Textarea
              placeholder="Leave book-level feedback..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />

            <div className="flex items-center gap-3">
              <Button type="button" onClick={submit} disabled={!commentText.trim()}>
                Save
              </Button>
              {status ? <div className="text-sm text-muted-foreground">{status}</div> : null}
            </div>

            <Card>
              <CardContent className="p-3">
                <div className="text-sm text-muted-foreground">Previous comments</div>
                {loading ? (
                  <div className="mt-2 text-sm text-muted-foreground">Loading…</div>
                ) : items.length === 0 ? (
                  <div className="mt-2 text-sm text-muted-foreground">No comments yet.</div>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {items.map((it) => (
                      <li key={it.id} className="rounded-lg border bg-card p-2 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>{it.comment_text}</div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => void del(it.id)}
                          >
                            Delete
                          </Button>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{it.created_at}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
