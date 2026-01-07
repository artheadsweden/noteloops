import "server-only";

import sanitizeHtml from "sanitize-html";

export function sanitizeSummaryHtml(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "a"
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href ?? "";
        const isSafe = /^(https?:|mailto:)/i.test(href);
        return {
          tagName,
          attribs: {
            ...attribs,
            href: isSafe ? href : "",
            target: "_blank",
            rel: "noopener noreferrer"
          }
        };
      }
    }
  });
}
