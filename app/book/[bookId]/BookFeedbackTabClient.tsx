"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";

import SectionCard from "@/components/layout/SectionCard";
import { listBookFeedback } from "@/services/feedback";

export default function BookFeedbackTabClient({ bookId }: { bookId: string }) {
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

  return (
    <SectionCard title="Feedback" description="Book-level feedback and notes." contentClassName="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
        {typeof feedbackCount === "number" ? `${feedbackCount} comments` : "Loading…"}
      </div>
      <div className="text-sm text-muted-foreground">
        Use the “Book feedback” button on the left to add and review comments.
      </div>
    </SectionCard>
  );
}
