import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-xl font-semibold">Chapter not found</h1>
      <p className="mt-2 text-muted-foreground">No assets were found for this chapter.</p>
      <div className="mt-6">
        <Button asChild variant="link" className="px-0">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
