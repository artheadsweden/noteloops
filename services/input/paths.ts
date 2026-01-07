import "server-only";

import path from "node:path";

export function getPublicDirAbsolute(): string {
  return path.join(process.cwd(), "public");
}

export function getInputRootAbsolute(): string {
  return path.join(getPublicDirAbsolute(), "input");
}

export function getBookDirAbsolute(bookId: string): string {
  return path.join(getInputRootAbsolute(), bookId);
}

export function getBookManifestPathAbsolute(bookId: string): string {
  return path.join(getBookDirAbsolute(bookId), "manifest.json");
}
