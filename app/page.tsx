import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import { BookOpen, Headphones, MessageSquare } from "lucide-react";

import InviteClient from "@/app/InviteClient";
import AppFrame from "@/app/components/AppFrame";
import SectionCard from "@/components/layout/SectionCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HomePage() {
  const jar = await cookies();
  const inviteOk = jar.get("invite_ok")?.value === "1";
  const sessionOk = jar.get("sb_ok")?.value === "1";
  if (inviteOk && sessionOk) redirect("/dashboard");
  if (inviteOk && !sessionOk) redirect("/login");

  return (
    <AppFrame>
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Note Loops</h1>
            <p className="max-w-prose text-base leading-relaxed text-muted-foreground sm:text-lg">
              Synchronized text + audio reading, with paragraph-level feedback.
            </p>
          </div>

          <div id="invite" className="rounded-xl border border-border/60 bg-card p-6 shadow-[var(--shadow-lg)]">
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Enter your invite code</h2>
              <p className="text-sm text-muted-foreground">Continue to create an account or sign in.</p>
            </div>
            <div className="mt-4">
              <InviteClient />
              <div className="mt-3 text-sm text-muted-foreground">
                Don’t have a code? Ask the author for an invite link.
              </div>
            </div>
          </div>
        </div>

        <SectionCard
          title="How it works"
          description="Read, listen, and leave feedback in context."
          contentClassName="space-y-4"
        >
          <ul className="space-y-3">
            <li className="flex gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground shadow-[var(--shadow-sm)]">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <div className="text-sm font-medium">Read</div>
                <div className="text-sm text-muted-foreground">Clean chapters with progress saved automatically.</div>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground shadow-[var(--shadow-sm)]">
                <Headphones className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <div className="text-sm font-medium">Listen</div>
                <div className="text-sm text-muted-foreground">Audio stays aligned to paragraphs as you play.</div>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground shadow-[var(--shadow-sm)]">
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <div className="text-sm font-medium">Comment</div>
                <div className="text-sm text-muted-foreground">Leave feedback on the exact paragraph that triggered it.</div>
              </div>
            </li>
          </ul>
        </SectionCard>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <Card className="border-transparent shadow-[var(--shadow)]">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Read</CardTitle>
            <CardDescription>Clean chapters with progress.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-muted">
              <Image
                src="/landing/read.png"
                alt="Read"
                fill
                sizes="(max-width: 768px) 100vw, 360px"
                className="object-cover"
                priority
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-transparent shadow-[var(--shadow)]">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Listen</CardTitle>
            <CardDescription>Audio that follows the text.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-muted">
              <Image
                src="/landing/listen.png"
                alt="Listen"
                fill
                sizes="(max-width: 768px) 100vw, 360px"
                className="object-cover"
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-transparent shadow-[var(--shadow)]">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Comment</CardTitle>
            <CardDescription>Feedback where it matters.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-muted">
              <Image
                src="/landing/comment.png"
                alt="Comment"
                fill
                sizes="(max-width: 768px) 100vw, 360px"
                className="object-cover"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppFrame>
  );
}
