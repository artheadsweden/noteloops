"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Gauge,
  List,
  LocateFixed,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  Send,
  Timer,
  Trash2,
  X
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

import type { AlignSegment, AlignWord } from "@/services/input/align";
import { getLocalProgress, getSupabaseProgress, saveProgress } from "@/services/progress";
import {
  addChapterFeedback,
  addFeedback,
  deleteChapterFeedback,
  deleteFeedback,
  listChapterFeedback,
  listFeedbackForPid,
  type ChapterFeedbackItem,
  type FeedbackItem
} from "@/services/feedback";

type DrawerState =
  | { mode: "paragraph"; pid: string }
  | { mode: "chapter" };

type ProgressDraft = {
  book_id: string;
  last_chapter_id: string;
  last_pid: string | null;
  last_timestamp: number;
  furthest_chapter_id: string | null;
  furthest_pid: string | null;
  furthest_timestamp: number;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function findSegmentForTime(segments: AlignSegment[], t: number): AlignSegment | null {
  if (segments.length === 0) return null;

  let lo = 0;
  let hi = segments.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const s = segments[mid]!;

    if (t < s.begin) {
      hi = mid - 1;
      continue;
    }

    if (t >= s.end) {
      lo = mid + 1;
      continue;
    }

    return s;
  }

  return null;
}

function findWordForTime(words: AlignWord[], t: number): AlignWord | null {
  if (words.length === 0) return null;

  let lo = 0;
  let hi = words.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const w = words[mid]!;

    if (t < w.begin) {
      hi = mid - 1;
      continue;
    }
    if (t >= w.end) {
      lo = mid + 1;
      continue;
    }
    return w;
  }

  return null;
}

function getTextNodesInOrder(root: Node): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let cur = walker.nextNode();
  while (cur) {
    if (cur.nodeType === Node.TEXT_NODE) out.push(cur as Text);
    cur = walker.nextNode();
  }
  return out;
}

function resolveTextNodeAtChar(nodes: Text[], charIndex: number): { node: Text; offset: number } | null {
  let acc = 0;
  for (const node of nodes) {
    const len = node.nodeValue?.length ?? 0;
    if (charIndex <= acc + len) {
      return { node, offset: Math.max(0, Math.min(len, charIndex - acc)) };
    }
    acc += len;
  }
  if (nodes.length > 0) {
    const last = nodes[nodes.length - 1]!;
    const len = last.nodeValue?.length ?? 0;
    return { node: last, offset: len };
  }
  return null;
}

function canSafelyWrapWords(p: HTMLElement): boolean {
  // Char offsets are computed from plain paragraph text. If the paragraph contains
  // inline markup, offsets may not map 1:1 and wrapping can break the DOM.
  return p.querySelector("*") === null;
}

function wrapWordsInParagraph(p: HTMLElement, pid: string, words: AlignWord[]): void {
  if (!canSafelyWrapWords(p)) return;
  if (p.querySelector("span[data-widx]")) return;

  const textNodes = getTextNodesInOrder(p);
  if (textNodes.length === 0) return;

  const totalLen = p.textContent?.length ?? 0;
  if (totalLen === 0) return;

  // Wrap from the end so earlier offsets stay stable.
  const sorted = [...words].sort((a, b) => b.start_char - a.start_char);
  for (const w of sorted) {
    const startChar = Math.max(0, Math.min(totalLen, w.start_char));
    const endChar = Math.max(startChar, Math.min(totalLen, w.end_char));
    if (endChar <= startChar) continue;

    const start = resolveTextNodeAtChar(textNodes, startChar);
    const end = resolveTextNodeAtChar(textNodes, endChar);
    if (!start || !end) continue;

    try {
      const range = document.createRange();
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);

      const span = document.createElement("span");
      span.setAttribute("data-pid", pid);
      span.setAttribute("data-widx", String(w.widx));
      span.style.borderRadius = "0.25rem";

      range.surroundContents(span);
    } catch {
      // If we can't wrap cleanly, skip word wrapping for this paragraph.
      return;
    }
  }
}

function cssEscape(value: string): string {
  // Safari/older browsers: CSS.escape may not exist.
  // This is sufficient for our pid values like "p001".
  const escapeFn = (globalThis as unknown as { CSS?: { escape?: (v: string) => string } })
    .CSS?.escape;
  if (typeof escapeFn === "function") return escapeFn(value);
  return value.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
}

function getTopVisiblePidFromContainer(root: HTMLElement): string | null {
  const rect = root.getBoundingClientRect();
  if (!Number.isFinite(rect.top) || !Number.isFinite(rect.left)) return null;

  const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + 24));
  // Sample near the top of the viewport, but keep the sample point within the root
  // when the root starts below the viewport.
  const baseY = rect.top > 0 ? rect.top + 24 : 24;
  const candidateYs = [baseY, baseY + 40, baseY + 96]
    .map((y) => Math.min(window.innerHeight - 1, Math.max(1, y)));

  for (const y of candidateYs) {
    const el = document.elementFromPoint(x, y);
    const p = (el?.closest?.("p[data-pid]") as HTMLElement | null) ?? null;
    if (p && root.contains(p)) {
      const pid = p.getAttribute("data-pid");
      if (pid) return pid;
    }
  }

  // Fallback: scan forward until we find the first paragraph crossing the top.
  const paragraphs = Array.from(root.querySelectorAll("p[data-pid]")) as HTMLElement[];
  // When the root is scrolled above the viewport, rect.top is negative. Using rect.top
  // would bias toward the very first paragraph forever, so we anchor to viewport top.
  const yTop = (rect.top > 0 ? rect.top : 0) + 16;
  for (const p of paragraphs) {
    const r = p.getBoundingClientRect();
    if (r.bottom >= yTop && r.top <= window.innerHeight) {
      const pid = p.getAttribute("data-pid");
      if (pid) return pid;
    }
  }

  return null;
}

export default function ReaderClient({
  bookId,
  chapterId,
  html,
  alignSegments,
  alignWordsByPid,
  alignStatus,
  audioUrl,
  initialPid,
  initialTime,
  chapters
}: {
  bookId: string;
  chapterId: string;
  html: string;
  alignSegments: AlignSegment[];
  alignWordsByPid?: Record<string, AlignWord[]>;
  alignStatus?: string;
  audioUrl?: string;
  initialPid?: string;
  initialTime?: number;
  chapters: Array<{ chapter_id: string; title: string }>;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const highlightedPidRef = useRef<string | null>(null);
  const highlightedWordKeyRef = useRef<string | null>(null);
  const baseProgressRef = useRef<ProgressDraft | null>(null);
  const lastAutoScrollPidRef = useRef<string | null>(null);

  const [htmlNonce, setHtmlNonce] = useState(0);

  const [topVisiblePid, setTopVisiblePid] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const [sleepPresetSeconds, setSleepPresetSeconds] = useState(0);
  const [sleepRemainingSeconds, setSleepRemainingSeconds] = useState<number | null>(null);
  const sleepFadingRef = useRef(false);

  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerItems, setDrawerItems] = useState<Array<FeedbackItem | ChapterFeedbackItem>>(
    []
  );
  const [commentText, setCommentText] = useState("");
  const [commentStatus, setCommentStatus] = useState<string | null>(null);

  const [resumeProgress, setResumeProgress] = useState<
    { pid: string | null; timestamp: number } | null
  >(null);

  const fadeDownAndPause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    const startVolume = Number.isFinite(audio.volume) ? audio.volume : 1;
    const durationMs = 2500;
    const start = performance.now();

    await new Promise<void>((resolve) => {
      const tick = () => {
        const t = Math.min(1, (performance.now() - start) / durationMs);
        const next = Math.max(0, startVolume * (1 - t));
        try {
          audio.volume = next;
        } catch {
          // ignore
        }

        if (t >= 1) {
          try {
            audio.pause();
          } catch {
            // ignore
          }
          try {
            audio.volume = startVolume;
          } catch {
            // ignore
          }
          resolve();
          return;
        }

        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    });
  }, []);

  const sleepActive = sleepRemainingSeconds !== null && sleepRemainingSeconds > 0;

  useEffect(() => {
    // Reset sleep timer when the chapter/audio changes.
    setSleepPresetSeconds(0);
    setSleepRemainingSeconds(null);
    sleepFadingRef.current = false;
  }, [chapterId, audioUrl]);

  useEffect(() => {
    if (!isPlaying) return;
    if (!sleepActive) return;

    const id = window.setInterval(() => {
      setSleepRemainingSeconds((prev) => {
        if (prev === null) return prev;
        return Math.max(0, prev - 1);
      });
    }, 1000);

    return () => {
      window.clearInterval(id);
    };
  }, [isPlaying, sleepActive]);

  useEffect(() => {
    if (sleepRemainingSeconds !== 0) return;
    if (sleepFadingRef.current) return;
    sleepFadingRef.current = true;

    void (async () => {
      await fadeDownAndPause();
      setSleepPresetSeconds(0);
      setSleepRemainingSeconds(null);
      sleepFadingRef.current = false;
    })();
  }, [fadeDownAndPause, sleepRemainingSeconds]);

  const segments = useMemo(
    () => alignSegments.slice().sort((a, b) => a.begin - b.begin),
    [alignSegments]
  );

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    // Important: avoid React continuously re-applying dangerouslySetInnerHTML on every
    // state update, which can replace the paragraph DOM nodes and "blink" styles.
    root.innerHTML = html;

    // Word-level highlighting: wrap words with <span data-widx="..."> when possible.
    // This is best-effort and skips paragraphs with existing inline markup.
    if (alignWordsByPid) {
      for (const [pid, words] of Object.entries(alignWordsByPid)) {
        if (!words || words.length === 0) continue;
        const p = root.querySelector(`p[data-pid="${cssEscape(pid)}"]`);
        if (!(p instanceof HTMLElement)) continue;
        wrapWordsInParagraph(p, pid, words);
      }
    }
    setHtmlNonce((n) => n + 1);
  }, [alignWordsByPid, html]);

  const orderedChapterIds = useMemo(
    () => chapters.map((c) => c.chapter_id),
    [chapters]
  );

  const chapterIdsKey = useMemo(() => orderedChapterIds.join("|"), [orderedChapterIds]);

  const getChapterIndex = useCallback(
    (id: string | null | undefined): number => {
    if (!id) return -1;
    return orderedChapterIds.findIndex((x) => x === id);
    },
    [orderedChapterIds]
  );

  const resolveFurthest = useCallback(
    (params: {
      previous: ProgressDraft | null;
      currentChapterId: string;
      currentPid: string | null;
      currentTime: number;
    }): Pick<ProgressDraft, "furthest_chapter_id" | "furthest_pid" | "furthest_timestamp"> => {
      const prev = params.previous;
      if (!prev) {
        return {
          furthest_chapter_id: params.currentChapterId,
          furthest_pid: params.currentPid,
          furthest_timestamp: Math.max(0, params.currentTime)
        };
      }

      const prevFurthestChapter = prev.furthest_chapter_id ?? prev.last_chapter_id;
      const prevIdx = getChapterIndex(prevFurthestChapter);
      const curIdx = getChapterIndex(params.currentChapterId);

      // If we cannot resolve indices, fall back to a monotonic timestamp only.
      if (prevIdx < 0 || curIdx < 0) {
        return {
          furthest_chapter_id: prevFurthestChapter,
          furthest_pid: prev.furthest_pid ?? prev.last_pid,
          furthest_timestamp: Math.max(prev.furthest_timestamp ?? 0, params.currentTime)
        };
      }

      if (curIdx > prevIdx) {
        return {
          furthest_chapter_id: params.currentChapterId,
          furthest_pid: params.currentPid,
          furthest_timestamp: Math.max(prev.furthest_timestamp ?? 0, params.currentTime)
        };
      }

      if (curIdx === prevIdx) {
        return {
          furthest_chapter_id: prevFurthestChapter,
          furthest_pid: prev.furthest_pid ?? prev.last_pid ?? params.currentPid,
          furthest_timestamp: Math.max(prev.furthest_timestamp ?? 0, params.currentTime)
        };
      }

      // Current chapter is behind furthest.
      return {
        furthest_chapter_id: prevFurthestChapter,
        furthest_pid: prev.furthest_pid ?? prev.last_pid,
        furthest_timestamp: Math.max(prev.furthest_timestamp ?? 0, params.currentTime)
      };
    },
    [getChapterIndex]
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const local = getLocalProgress(bookId);
      const remote = await getSupabaseProgress(bookId);

      const localDraft: ProgressDraft | null = local
        ? {
            book_id: local.book_id,
            last_chapter_id: local.last_chapter_id,
            last_pid: local.last_pid,
            last_timestamp: local.last_timestamp,
            furthest_chapter_id: local.furthest_chapter_id ?? null,
            furthest_pid: local.furthest_pid ?? null,
            furthest_timestamp: local.furthest_timestamp ?? 0
          }
        : null;

      const remoteDraft: ProgressDraft | null = remote
        ? {
            book_id: remote.book_id,
            last_chapter_id: remote.last_chapter_id,
            last_pid: remote.last_pid,
            last_timestamp: remote.last_timestamp,
            furthest_chapter_id: remote.furthest_chapter_id ?? null,
            furthest_pid: remote.furthest_pid ?? null,
            furthest_timestamp: remote.furthest_timestamp ?? 0
          }
        : null;

      // Prefer the draft with the higher furthest chapter index.
      const pick = (a: ProgressDraft | null, b: ProgressDraft | null): ProgressDraft | null => {
        if (!a) return b;
        if (!b) return a;

        const aIdx = getChapterIndex(a.furthest_chapter_id ?? a.last_chapter_id);
        const bIdx = getChapterIndex(b.furthest_chapter_id ?? b.last_chapter_id);
        if (aIdx !== bIdx) return aIdx > bIdx ? a : b;

        if ((a.furthest_timestamp ?? 0) !== (b.furthest_timestamp ?? 0)) {
          return (a.furthest_timestamp ?? 0) > (b.furthest_timestamp ?? 0) ? a : b;
        }

        return a;
      };

      const base = pick(localDraft, remoteDraft);
      if (cancelled) return;

      baseProgressRef.current = base;

      if (base && base.last_chapter_id === chapterId) {
        const ts = Number.isFinite(base.last_timestamp) ? base.last_timestamp : 0;
        const pid = base.last_pid ?? null;
        if (pid || ts > 0) setResumeProgress({ pid, timestamp: ts });
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [bookId, chapterId, chapterIdsKey, getChapterIndex]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    let rafId: number | null = null;
    const update = () => {
      rafId = null;
      const pid = getTopVisiblePidFromContainer(root);
      setTopVisiblePid(pid);
    };

    const schedule = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(update);
    };

    // Initial value after first paint.
    schedule();

    // Cover both window scroll and any internal scroll container behavior.
    window.addEventListener("scroll", schedule, { passive: true });
    root.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      window.removeEventListener("scroll", schedule);
      root.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (rafId != null) window.cancelAnimationFrame(rafId);
    };
  }, [htmlNonce]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const p = target?.closest?.("p[data-pid]") as HTMLElement | null;
      const pid = p?.getAttribute?.("data-pid");
      if (!pid) return;

      setDrawer({ mode: "paragraph", pid });
    };

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [htmlNonce]);

  useEffect(() => {
    if (!drawer) return;

    let cancelled = false;
    setDrawerLoading(true);
    setCommentStatus(null);
    setCommentText("");

    const run = async () => {
      const items =
        drawer.mode === "paragraph"
          ? await listFeedbackForPid({ bookId, chapterId, pid: drawer.pid })
          : await listChapterFeedback({ bookId, chapterId });

      if (!cancelled) setDrawerItems(items);
      if (!cancelled) setDrawerLoading(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [bookId, chapterId, drawer]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    if (!initialPid) return;

    const el = root.querySelector(`p[data-pid="${CSS.escape(initialPid)}"]`);
    if (!el) return;

    // Wait one tick so layout is stable.
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: "start" });
    });
  }, [initialPid, htmlNonce]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audioUrl || !audio) return;
    if (typeof initialTime !== "number" || Number.isNaN(initialTime)) return;

    const applyTime = () => {
      try {
        audio.currentTime = Math.max(0, initialTime);
      } catch {
        // ignore
      }
    };

    if (audio.readyState >= 1) {
      applyTime();
      return;
    }

    audio.addEventListener("loadedmetadata", applyTime, { once: true });
    return () => audio.removeEventListener("loadedmetadata", applyTime);
  }, [audioUrl, initialTime]);

  const clearHighlight = useCallback((el: HTMLElement) => {
    el.removeAttribute("data-playing");
    el.style.removeProperty("background-color");
    el.style.removeProperty("box-shadow");
    el.style.removeProperty("border-left");
    el.style.removeProperty("padding-left");
    el.style.removeProperty("outline");
    el.style.removeProperty("outline-offset");
  }, []);

  const applyPlayingHighlight = useCallback((el: HTMLElement) => {
    el.setAttribute("data-playing", "true");
    // Subtle highlight (theme-aware). Keep !important to avoid being overridden.
    el.style.setProperty("background-color", "hsl(var(--accent))", "important");
    el.style.setProperty("border-left", "4px solid hsl(var(--primary))", "important");
    el.style.setProperty("padding-left", "0.6rem", "important");
    el.style.setProperty("outline", "", "important");
    el.style.setProperty("outline-offset", "", "important");
  }, []);

  const clearWordHighlight = useCallback((el: HTMLElement) => {
    el.removeAttribute("data-word-playing");
    el.style.removeProperty("background-color");
    el.style.removeProperty("box-shadow");
  }, []);

  const applyWordHighlight = useCallback((el: HTMLElement) => {
    el.setAttribute("data-word-playing", "true");
    // Very gentle word highlight; should not compete with paragraph highlight.
    el.style.setProperty("background-color", "hsl(var(--primary) / 0.12)", "important");
    el.style.setProperty("box-shadow", "0 0 0 2px hsl(var(--background)) inset", "important");
  }, []);

  const maybeAutoScrollTo = useCallback((root: HTMLElement, el: HTMLElement) => {
    // Keep the currently playing paragraph within the visible reader "page".
    // Only scroll if it's near/outside the container viewport.
    const rootRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    const margin = 56; // px
    const above = elRect.top < rootRect.top + margin;
    const below = elRect.bottom > rootRect.bottom - margin;
    if (!above && !below) return;

    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const rootForCleanup = containerRef.current;

    const onLoaded = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setCurrentTime(audio.currentTime);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      if (segments.length === 0) return;

      const root = containerRef.current;
      if (!root) return;

      const seg = findSegmentForTime(segments, audio.currentTime);
      const pid = seg?.pid ?? null;

      if (pid === highlightedPidRef.current) return;

      const prevPid = highlightedPidRef.current;
      if (prevPid) {
        const prevEl = root.querySelector(`p[data-pid="${cssEscape(prevPid)}"]`);
        if (prevEl instanceof HTMLElement) clearHighlight(prevEl);
      }

      if (pid) {
        const el = root.querySelector(`p[data-pid="${cssEscape(pid)}"]`);
        if (el instanceof HTMLElement) {
          applyPlayingHighlight(el);

          // Auto-scroll while playing so the highlight stays in view.
          // Only run on pid changes (we're inside that guard already).
          if (!audio.paused && lastAutoScrollPidRef.current !== pid) {
            lastAutoScrollPidRef.current = pid;
            maybeAutoScrollTo(root, el);
          }
        }
      }

      // Paragraph changed → clear word highlight so we don't leave stale spans highlighted.
      const prevWordKey = highlightedWordKeyRef.current;
      if (prevWordKey) {
        const [prevWordPid, prevWidx] = prevWordKey.split(":");
        const prevWordEl = root.querySelector(
          `p[data-pid="${cssEscape(prevWordPid ?? "")}"] span[data-widx="${cssEscape(prevWidx ?? "")}"]`
        );
        if (prevWordEl instanceof HTMLElement) clearWordHighlight(prevWordEl);
        highlightedWordKeyRef.current = null;
      }

      highlightedPidRef.current = pid;
    };

    const onWordUpdate = () => {
      if (!alignWordsByPid) return;
      if (segments.length === 0) return;

      const root = containerRef.current;
      if (!root) return;

      const seg = findSegmentForTime(segments, audio.currentTime);
      const pid = seg?.pid;
      if (!pid) return;

      const words = alignWordsByPid[pid];
      if (!words || words.length === 0) return;

      const w = findWordForTime(words, audio.currentTime);
      if (!w) return;

      const key = `${pid}:${w.widx}`;
      if (key === highlightedWordKeyRef.current) return;

      const prevKey = highlightedWordKeyRef.current;
      if (prevKey) {
        const [prevPid, prevWidx] = prevKey.split(":");
        const prevEl = root.querySelector(
          `p[data-pid="${cssEscape(prevPid ?? "")}"] span[data-widx="${cssEscape(prevWidx ?? "")}"]`
        );
        if (prevEl instanceof HTMLElement) clearWordHighlight(prevEl);
      }

      const nextEl = root.querySelector(
        `p[data-pid="${cssEscape(pid)}"] span[data-widx="${String(w.widx)}"]`
      );
      if (nextEl instanceof HTMLElement) {
        applyWordHighlight(nextEl);
        highlightedWordKeyRef.current = key;
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("timeupdate", onWordUpdate);
    audio.addEventListener("seeked", onTimeUpdate);
    audio.addEventListener("seeked", onWordUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    // Initialize state if metadata is already available.
    if (audio.readyState >= 1) onLoaded();
    setIsPlaying(!audio.paused);
    setCurrentTime(audio.currentTime);
    setPlaybackRate(audio.playbackRate || 1);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("timeupdate", onWordUpdate);
      audio.removeEventListener("seeked", onTimeUpdate);
      audio.removeEventListener("seeked", onWordUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);

      // Clear any active highlight when leaving.
      const prevPid = highlightedPidRef.current;
      if (rootForCleanup && prevPid) {
        const prevEl = rootForCleanup.querySelector(`p[data-pid="${cssEscape(prevPid)}"]`);
        if (prevEl instanceof HTMLElement) clearHighlight(prevEl);
      }

      const prevWordKey = highlightedWordKeyRef.current;
      if (rootForCleanup && prevWordKey) {
        const [prevWordPid, prevWidx] = prevWordKey.split(":");
        const prevWordEl = rootForCleanup.querySelector(
          `p[data-pid="${cssEscape(prevWordPid ?? "")}"] span[data-widx="${cssEscape(prevWidx ?? "")}"]`
        );
        if (prevWordEl instanceof HTMLElement) clearWordHighlight(prevWordEl);
      }
    };
  }, [
    alignWordsByPid,
    applyPlayingHighlight,
    applyWordHighlight,
    audioUrl,
    clearHighlight,
    clearWordHighlight,
    maybeAutoScrollTo,
    segments
  ]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const audio = audioRef.current;

    const save = () => {
      const nowPid = topVisiblePid;
      const nowTime = audio ? audio.currentTime : 0;

      const furthest = resolveFurthest({
        previous: baseProgressRef.current,
        currentChapterId: chapterId,
        currentPid: nowPid,
        currentTime: nowTime
      });

      const draft: ProgressDraft = {
        book_id: bookId,
        last_chapter_id: chapterId,
        last_pid: nowPid,
        last_timestamp: nowTime,
        furthest_chapter_id: furthest.furthest_chapter_id,
        furthest_pid: furthest.furthest_pid,
        furthest_timestamp: furthest.furthest_timestamp
      };

      baseProgressRef.current = draft;

      void saveProgress({
        ...draft
      });
    };

    audio?.addEventListener("pause", save);

    return () => {
      audio?.removeEventListener("pause", save);
      save();
    };
  }, [bookId, chapterId, resolveFurthest, topVisiblePid]);

  const resume = () => {
    const info = resumeProgress;
    if (!info) return;

    const root = containerRef.current;
    if (root && info.pid) {
      const el = root.querySelector(`p[data-pid="${cssEscape(info.pid)}"]`);
      (el as HTMLElement | null)?.scrollIntoView({ block: "start" });
    }

    const audio = audioRef.current;
    if (audio && Number.isFinite(info.timestamp) && info.timestamp > 0) {
      try {
        audio.currentTime = Math.max(0, info.timestamp);
        setCurrentTime(audio.currentTime);
      } catch {
        // ignore
      }
    }
  };

  const syncToAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const pid = topVisiblePid;
    if (!pid) return;

    const seg = segments.find((s) => s.pid === pid);
    if (!seg) return;

    audio.currentTime = seg.begin;
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch {
      // ignore
    }
  };

  const seekTo = (t: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Math.max(0, Math.min(duration || 0, t));
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const submitFeedback = async () => {
    if (!drawer) return;
    const trimmed = commentText.trim();
    if (!trimmed) return;

    setCommentStatus(null);

    const res =
      drawer.mode === "paragraph"
        ? await addFeedback({
            bookId,
            chapterId,
            pid: drawer.pid,
            commentText: trimmed
          })
        : await addChapterFeedback({
            bookId,
            chapterId,
            commentText: trimmed
          });

    if (!res.ok) {
      setCommentStatus(res.error ?? "Failed to save");
      return;
    }

    setCommentText("");
    setCommentStatus("Saved.");

    // Refresh list
    const items =
      drawer.mode === "paragraph"
        ? await listFeedbackForPid({ bookId, chapterId, pid: drawer.pid })
        : await listChapterFeedback({ bookId, chapterId });
    setDrawerItems(items);
  };

  const deleteItem = async (id: string) => {
    if (!drawer) return;
    setCommentStatus(null);

    const res =
      drawer.mode === "paragraph"
        ? await deleteFeedback({ id })
        : await deleteChapterFeedback({ id });

    if (!res.ok) {
      setCommentStatus(res.error ?? "Failed to delete");
      return;
    }

    const items =
      drawer.mode === "paragraph"
        ? await listFeedbackForPid({ bookId, chapterId, pid: drawer.pid })
        : await listChapterFeedback({ bookId, chapterId });
    setDrawerItems(items);
  };

  return (
    <>
      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Audio</div>
              <div className="text-xs text-muted-foreground">{audioUrl ? "Ready" : "No audio"}</div>
            </div>
            <div className="text-xs text-muted-foreground">
              Alignment: {segments.length} segments
              {alignStatus ? <span className="text-muted-foreground"> · {alignStatus}</span> : null}
            </div>

          <div className="h-px bg-border/60" />
          {audioUrl ? (
            <>
              <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />

              <div className="grid gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-4 w-4" aria-hidden="true" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" aria-hidden="true" />
                      Play
                    </>
                  )}
                </Button>

                <div className="grid gap-2">
                  <label className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Gauge className="h-4 w-4" aria-hidden="true" />
                      Speed
                    </span>
                    <select
                      className="h-9 rounded-lg border border-input bg-background px-2 py-1 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      value={playbackRate}
                      onChange={(e) => setPlaybackRate(Number(e.target.value))}
                    >
                      {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                        <option key={r} value={r}>
                          {r}x
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Timer className="h-4 w-4" aria-hidden="true" />
                      Sleep
                    </span>
                    <select
                      className="h-9 rounded-lg border border-input bg-background px-2 py-1 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      value={sleepPresetSeconds}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        if (!Number.isFinite(next) || next <= 0) {
                          setSleepPresetSeconds(0);
                          setSleepRemainingSeconds(null);
                          sleepFadingRef.current = false;
                          return;
                        }
                        setSleepPresetSeconds(next);
                        setSleepRemainingSeconds(next);
                        sleepFadingRef.current = false;
                      }}
                    >
                      <option value={0}>Off</option>
                      <option value={10 * 60}>10m</option>
                      <option value={15 * 60}>15m</option>
                      <option value={30 * 60}>30m</option>
                      <option value={60 * 60}>60m</option>
                    </select>
                  </label>
                </div>

                {sleepRemainingSeconds !== null ? (
                  <div className="text-xs text-muted-foreground">Sleep in {formatTime(sleepRemainingSeconds)}</div>
                ) : null}

                <div className="grid gap-1">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, duration)}
                    step={0.1}
                    value={Math.min(currentTime, duration || 0)}
                    onChange={(e) => seekTo(Number(e.target.value))}
                    disabled={!Number.isFinite(duration) || duration <= 0}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No audio file found.</div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={syncToAudio}
            disabled={!audioUrl || segments.length === 0 || !topVisiblePid}
          >
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
            Sync to Audio
          </Button>

          {resumeProgress ? (
            <Button type="button" variant="outline" className="w-full" onClick={resume}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Resume
            </Button>
          ) : null}

          <Button type="button" variant="outline" className="w-full" onClick={() => setDrawer({ mode: "chapter" })}>
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Chapter feedback
          </Button>

          <div className="text-sm text-muted-foreground">
            Click any paragraph in the text to leave feedback.
          </div>

          {segments.length === 0 ? (
            <div className="text-sm text-muted-foreground">No alignment segments available.</div>
          ) : null}

          <div className="pt-2">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <List className="h-4 w-4" aria-hidden="true" />
              Chapters
            </div>
            <div className="mt-2 max-h-72 overflow-auto rounded-xl bg-muted p-2">
              <ol className="space-y-1 text-sm">
                {chapters.map((c) => {
                  const isCurrent = c.chapter_id === chapterId;
                  return (
                    <li key={c.chapter_id}>
                      <Link
                        className={
                          isCurrent
                            ? "block rounded-lg bg-accent px-2 py-1 font-medium text-accent-foreground"
                            : "block rounded-lg px-2 py-1 text-muted-foreground underline underline-offset-4 hover:bg-accent hover:text-accent-foreground"
                        }
                        href={`/book/${encodeURIComponent(bookId)}/${encodeURIComponent(
                          c.chapter_id
                        )}`}
                        aria-current={isCurrent ? "page" : undefined}
                      >
                        {c.title}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
          </CardContent>
        </Card>

        <section>
          <div
            ref={containerRef}
            className="reader-prose prose prose-neutral dark:prose-invert mx-auto w-full max-w-[78ch] rounded-xl border bg-card p-4 leading-relaxed sm:p-6 lg:min-h-[calc(100vh-3rem)]"
          />
        </section>
      </div>

    <Sheet
      open={Boolean(drawer)}
      onOpenChange={(open) => {
        if (!open) setDrawer(null);
      }}
    >
      <SheetContent side="right" className="w-[min(420px,calc(100%-2rem))]">
        <SheetHeader>
          <div>
            <SheetTitle>Feedback</SheetTitle>
            {drawer?.mode === "paragraph" ? (
              <div className="text-sm text-muted-foreground">Paragraph: {drawer.pid}</div>
            ) : drawer?.mode === "chapter" ? (
              <div className="text-sm text-muted-foreground">Chapter: {chapterId}</div>
            ) : null}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setDrawer(null)}>
            <X className="h-4 w-4" aria-hidden="true" />
            Close
          </Button>
        </SheetHeader>

        {drawer ? (
          <div className="mt-4 grid gap-3">
            <Textarea
              placeholder="Leave a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <Button type="button" onClick={submitFeedback} disabled={!commentText.trim()}>
                <Send className="h-4 w-4" aria-hidden="true" />
                Save
              </Button>
              {commentStatus ? (
                <div className="text-sm text-muted-foreground">{commentStatus}</div>
              ) : null}
            </div>

            <Card>
              <CardContent className="p-3">
                <div className="text-sm text-muted-foreground">Previous comments</div>
                {drawerLoading ? (
                  <div className="mt-2 text-sm text-muted-foreground">Loading…</div>
                ) : drawerItems.length === 0 ? (
                  <div className="mt-2 text-sm text-muted-foreground">No comments yet.</div>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {drawerItems.map((it) => (
                      <li key={it.id} className="rounded-lg border bg-card p-2 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="whitespace-pre-wrap">{it.comment_text}</div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 shrink-0 gap-2 px-2 text-xs"
                            onClick={() => void deleteItem(it.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
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
        ) : null}
      </SheetContent>
    </Sheet>
    </>
  );
}
