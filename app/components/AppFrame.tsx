import Link from "next/link";
import { BookOpen } from "lucide-react";

import HeaderNav from "@/app/components/HeaderNav";
import Container from "@/components/layout/Container";

export default function AppFrame({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Container>
          <div className="flex h-14 items-center justify-between gap-4">
            <Link className="flex items-center gap-2 text-sm font-semibold" href="/">
              <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Note Loops</span>
            </Link>

            <HeaderNav />
          </div>
        </Container>
      </header>

      <main className="py-8 sm:py-10">
        <Container>{children}</Container>
      </main>
    </div>
  );
}
