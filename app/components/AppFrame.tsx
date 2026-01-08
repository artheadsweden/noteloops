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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background to-muted/40 text-foreground">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-indigo-500/10 blur-[140px]" />
      </div>

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

      <main className="relative z-10 py-10 sm:py-12">
        <Container>{children}</Container>
      </main>
    </div>
  );
}
