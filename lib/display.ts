export function titleFromSlug(slug: string): string {
  const cleaned = slug
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!cleaned) return slug;

  const words = cleaned.split(" ");
  return words
    .map((w) => {
      const lower = w.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
