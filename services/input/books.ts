import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import { BookManifestSchema, type BookManifest } from "@/services/input/manifest";
import { getBookManifestPathAbsolute, getInputRootAbsolute } from "@/services/input/paths";

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function getBookManifest(bookId: string): Promise<BookManifest> {
  const manifestPath = getBookManifestPathAbsolute(bookId);
  const raw = await fs.readFile(manifestPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  return BookManifestSchema.parse(parsed);
}

export async function listBookIds(): Promise<string[]> {
  const root = getInputRootAbsolute();
  const entries = await fs.readdir(root, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  const withManifest: string[] = [];
  for (const dirName of dirs) {
    const manifestPath = path.join(root, dirName, "manifest.json");
    if (await fileExists(manifestPath)) withManifest.push(dirName);
  }

  return withManifest.sort();
}

export async function listBookManifests(): Promise<BookManifest[]> {
  const ids = await listBookIds();
  const manifests = await Promise.all(ids.map((id) => getBookManifest(id)));

  // Keep chapter order stable for consumers.
  return manifests.map((m) => ({
    ...m,
    chapters: [...m.chapters].sort((a, b) => a.order_index - b.order_index)
  }));
}
