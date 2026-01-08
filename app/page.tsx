import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Headphones, MessageSquare } from "lucide-react";

import InviteClient from "@/app/InviteClient";
import WaitlistClient from "@/app/WaitlistClient";
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
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <div className="order-2 space-y-8 lg:order-1">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground shadow-[var(--shadow-sm)]">
              Reading + audio workspace
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              A polished reading studio for <span className="bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">modern authors</span>
            </h1>
            <p className="max-w-prose text-base leading-relaxed text-muted-foreground sm:text-lg">
              Deliver synchronized text, audio, and paragraph-level feedback in one cohesive reader—built for clarity,
              focus, and professional storytelling.
            </p>
          </div>

          <div className="hidden gap-3 sm:grid sm:grid-cols-3">
            {[
              { label: "Sync fidelity", value: "Paragraph-accurate" },
              { label: "Reader focus", value: "Distraction-free UI" },
              { label: "Feedback", value: "In-context notes" }
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-[var(--shadow-sm)] backdrop-blur"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {item.label}
                </div>
                <div className="mt-2 text-sm font-semibold text-foreground">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="order-1 space-y-6 lg:order-2">
          <div
            id="invite"
            className="rounded-2xl border border-border/60 bg-background/90 p-6 shadow-[var(--shadow-lg)] backdrop-blur"
          >
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Enter your invite code</h2>
              <p className="text-sm text-muted-foreground">
                Invited authors only. Continue to create an account.
              </p>
            </div>
            <div className="mt-5">
              <InviteClient />
              <div className="mt-4 text-sm text-muted-foreground">
                Don’t have a code? Ask the author for an invite link.
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="underline underline-offset-4">
                  Sign in
                </Link>
                .
              </div>
            </div>

            <div className="my-6 h-px bg-border/60" />

            <div className="space-y-2">
              <h3 className="text-base font-semibold">Join the waitlist</h3>
              <p className="text-sm text-muted-foreground">
                No invite yet? Leave your email and we’ll reach out.
              </p>
            </div>
            <div className="mt-5">
              <WaitlistClient />
            </div>
          </div>

          <div className="hidden md:block">
            <SectionCard
              title="How it works"
              description="Read, listen, and leave feedback in context."
              className="border-border/60 bg-background/80 shadow-[var(--shadow-md)] backdrop-blur"
              contentClassName="space-y-4"
            >
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground shadow-[var(--shadow-sm)]">
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Read</div>
                    <div className="text-sm text-muted-foreground">
                      Clean chapters with progress saved automatically.
                    </div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground shadow-[var(--shadow-sm)]">
                    <Headphones className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Listen</div>
                    <div className="text-sm text-muted-foreground">
                      Audio stays aligned to paragraphs as you play.
                    </div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground shadow-[var(--shadow-sm)]">
                    <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Comment</div>
                    <div className="text-sm text-muted-foreground">
                      Leave feedback on the exact paragraph that triggered it.
                    </div>
                  </div>
                </li>
              </ul>
            </SectionCard>
          </div>
        </div>
      </div>

      <div className="mt-12 hidden gap-6 md:grid md:grid-cols-3">
        {[
          { title: "Read", description: "Clean chapters with progress.", src: "/landing/read.png" },
          { title: "Listen", description: "Audio that follows the text.", src: "/landing/listen.png" },
          { title: "Comment", description: "Feedback where it matters.", src: "/landing/comment.png" }
        ].map((item) => (
          <Card
            key={item.title}
            className="group overflow-hidden border-border/60 bg-background/80 shadow-[var(--shadow-lg)] backdrop-blur"
          >
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted">
                <Image
                  src={item.src}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 360px"
                  className="object-cover transition duration-500 group-hover:scale-105"
                  priority={item.title === "Read"}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppFrame>
  );
}
