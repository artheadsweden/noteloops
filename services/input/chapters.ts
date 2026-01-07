import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import { notFound } from "next/navigation";

import { AlignFileSchema, type AlignSegment } from "@/services/input/align";
import { getBookManifest } from "@/services/input/books";
import { getBookDirAbsolute } from "@/services/input/paths";

function resolveBookAssetPath(bookId: string, assetRelativePath: string): string {
  const bookDir = getBookDirAbsolute(bookId);
  const resolved = path.resolve(bookDir, assetRelativePath);

  // Prevent path traversal; resolved must stay within the book directory.
  const prefix = bookDir.endsWith(path.sep) ? bookDir : `${bookDir}${path.sep}`;
  if (!resolved.startsWith(prefix)) {
    throw new Error(`Invalid asset path outside book directory: ${assetRelativePath}`);
  }

  return resolved;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export type ChapterDescriptor = {
  book_id: string;
  chapter_id: string;
  title: string;
  order_index: number;
  assets: {
    text_html: string;
    align_json: string;
    audio_mp3?: string;
  };
};

export async function getChapterDescriptor(
  bookId: string,
  chapterId: string
): Promise<ChapterDescriptor> {
  const manifest = await getBookManifest(bookId);
  const chapter = manifest.chapters.find((c) => c.chapter_id === chapterId);
  if (!chapter) notFound();

  return {
    book_id: manifest.book_id,
    chapter_id: chapter.chapter_id,
    title: chapter.title,
    order_index: chapter.order_index,
    assets: {
      text_html: chapter.assets.text_html,
      align_json: chapter.assets.align_json,
      audio_mp3: chapter.assets.audio_mp3
    }
  };
}

export type ChapterContent = {
  chapter: ChapterDescriptor;
  html: string;
  alignSegments: AlignSegment[];
  alignStatus?: string;
  audioUrl?: string;
};

export async function getChapterContent(
  bookId: string,
  chapterId: string
): Promise<ChapterContent> {
  const chapter = await getChapterDescriptor(bookId, chapterId);

  const htmlPath = resolveBookAssetPath(bookId, chapter.assets.text_html);
  const alignPath = resolveBookAssetPath(bookId, chapter.assets.align_json);

  const html = await fs.readFile(htmlPath, "utf-8");

  let alignSegments: AlignSegment[] = [];
  let alignStatus: string | undefined;
  if (await fileExists(alignPath)) {
    const rawAlign = await fs.readFile(alignPath, "utf-8");
    const parsedAlign = JSON.parse(rawAlign) as unknown;
    const alignFile = AlignFileSchema.parse(parsedAlign);
    alignStatus = alignFile.status;
    alignSegments = (alignFile.segments ?? []).slice().sort((a, b) => a.begin - b.begin);
  }

  let audioUrl: string | undefined;
  if (chapter.assets.audio_mp3) {
    const asset = chapter.assets.audio_mp3;

    // Support external audio hosting (CDN / object storage) by allowing absolute URLs.
    if (/^https?:\/\//i.test(asset)) {
      audioUrl = asset;
    } else {
      const audioPath = resolveBookAssetPath(bookId, asset);
      if (await fileExists(audioPath)) {
        audioUrl = `/input/${encodeURIComponent(bookId)}/${asset
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`;
      }
    }
  }

  return { chapter, html, alignSegments, alignStatus, audioUrl };
}
