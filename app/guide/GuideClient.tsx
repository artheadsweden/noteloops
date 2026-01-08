"use client";

import Link from "next/link";

import SectionCard from "@/components/layout/SectionCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GuideClient() {
  return (
    <Tabs defaultValue="quick" className="space-y-6">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="quick">Quick Start</TabsTrigger>
        <TabsTrigger value="full">Full Guide</TabsTrigger>
      </TabsList>

      <TabsContent value="quick" className="space-y-6">
        <SectionCard
          title="Quick Start"
          description="The fastest path to reading, listening, and leaving feedback."
          contentClassName="space-y-3"
        >
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Go to the <Link href="/dashboard" className="underline underline-offset-4">Library</Link> and pick a book.
            </li>
            <li>Open a chapter. You’ll start in Listen Mode by default.</li>
            <li>Use the bottom bar to play/pause and scrub through audio.</li>
            <li>
              Tap any paragraph in the text to leave a comment (paragraph feedback).
            </li>
            <li>
              For general notes about the whole chapter, open Settings and choose “Chapter feedback”.
            </li>
          </ol>
        </SectionCard>

        <SectionCard
          title="What gets saved"
          description="So you can leave and come back later."
          contentClassName="space-y-2"
        >
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Reading position and audio timestamp are saved automatically.</li>
            <li>Your player preferences (speed, sleep timer preset, highlighting) are saved.</li>
          </ul>
        </SectionCard>
      </TabsContent>

      <TabsContent value="full" className="space-y-6">
        <SectionCard title="Feedback" description="Two kinds of feedback, depending on what you’re reacting to." contentClassName="space-y-3">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Paragraph feedback</span>: Tap/click a paragraph in the chapter text.
            </div>
            <div>
              <span className="font-medium text-foreground">Chapter feedback</span>: Use the “Chapter feedback” button (in the Audio sidebar on desktop, or in Settings while in Listen Mode).
            </div>
            <div>
              Comments open in a drawer where you can save new notes and delete older ones.
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Listen Mode" description="Designed for mobile: text first, controls always reachable." contentClassName="space-y-2">
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Bottom bar: play/pause, timeline scrubber, Chapters, Settings.</li>
            <li>Chapters button opens a list to jump between chapters.</li>
            <li>Settings button contains playback, highlighting, and sync/resume tools.</li>
          </ul>
        </SectionCard>

        <SectionCard title="Player controls" description="What the controls do." contentClassName="space-y-3">
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li><span className="font-medium text-foreground">Speed</span>: Changes playback speed (saved).</li>
            <li><span className="font-medium text-foreground">Sleep timer</span>: Fades audio out and pauses after the selected time.</li>
            <li><span className="font-medium text-foreground">Sync to Audio</span>: Seeks audio to the top visible paragraph.</li>
            <li><span className="font-medium text-foreground">Resume</span>: Jumps back to your last saved position.</li>
            <li><span className="font-medium text-foreground">Auto-advance</span>: Continues into the next chapter when audio ends.</li>
            <li><span className="font-medium text-foreground">Auto-scroll to top</span>: When you change chapters, scrolls the text back to the top.</li>
          </ul>
        </SectionCard>

        <SectionCard title="Highlighting" description="Optional, but helps you follow along." contentClassName="space-y-2">
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Paragraph highlight follows the current paragraph during playback.</li>
            <li>Word highlight follows the currently spoken word (when available).</li>
          </ul>
        </SectionCard>

        <SectionCard title="Next" description="Where to go now." contentClassName="space-y-2">
          <div className="text-sm text-muted-foreground">
            Head to the <Link href="/dashboard" className="underline underline-offset-4">Library</Link> to start reading.
          </div>
        </SectionCard>
      </TabsContent>
    </Tabs>
  );
}
