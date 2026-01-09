import Link from "next/link";
import { notFound } from "next/navigation";

import { getBookManifest } from "@/services/input/books";
import AppFrame from "@/app/components/AppFrame";
import { titleFromSlug } from "@/lib/display";
import { Button } from "@/components/ui/button";
import ExtrasTabs from "@/app/book/[bookId]/extras/ExtrasTabs";

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

      <div className="mt-6">
        <ExtrasTabs bookId={manifest.book_id} />
      </div>
    </AppFrame>
  );
}
