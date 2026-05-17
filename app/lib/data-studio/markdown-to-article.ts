import { sanitizeImportedContent } from "@/app/lib/language-studio/sanitize";

function stripHtmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugifyArticleTitle(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

/** Pull title from first Markdown H1 when present; derive standfirst from first non-heading paragraph. */
export function splitMarkdownForArticle(md: string): { title: string; standfirst: string; body: string } {
  const trimmed = md.trim();
  if (!trimmed) {
    return { title: "Untitled", standfirst: "", body: "" };
  }
  const lines = trimmed.split(/\r?\n/);
  let title = "Match article";
  let start = 0;
  const h1 = lines[0]?.match(/^#\s+(.+)$/);
  if (h1) {
    title = h1[1].trim() || title;
    start = 1;
    while (start < lines.length && !lines[start]?.trim()) start++;
  }
  const rest = lines.slice(start).join("\n").trim();
  const blocks = rest.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const firstPara = blocks.find((p) => !/^#{1,6}\s/m.test(p));
  const standfirst = firstPara
    ? firstPara.replace(/[#*_`[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, 280)
    : "";
  return {
    title: title.slice(0, 300),
    standfirst,
    body: sanitizeImportedContent(trimmed),
  };
}

/**
 * Split AI output for Language Studio import — supports **WordPress-style HTML** (preferred for Data Studio previews/reports)
 * or legacy **Markdown** (first-line `#` title).
 */
export function splitArticleForLanguageStudio(content: string): { title: string; standfirst: string; body: string } {
  const trimmed = content.trim();
  if (!trimmed) {
    return { title: "Untitled", standfirst: "", body: "" };
  }

  const looksHtml = /^\s*</.test(trimmed) || /<h1\b[\s>]/i.test(trimmed.slice(0, 4000));

  if (!looksHtml) {
    return splitMarkdownForArticle(trimmed);
  }

  const sanitized = sanitizeImportedContent(trimmed);
  let title = "Match article";
  const h1 = sanitized.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  let remainder = sanitized;
  if (h1) {
    title = stripHtmlToPlain(h1[1]!).slice(0, 300) || title;
    remainder = sanitized.slice((h1.index ?? 0) + h1[0].length).trim();
  } else {
    const h2 = sanitized.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
    if (h2) title = stripHtmlToPlain(h2[1]!).slice(0, 300) || title;
  }

  const firstP = remainder.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  const standfirst = firstP ? stripHtmlToPlain(firstP[1]!).slice(0, 280) : "";

  return {
    title: title.slice(0, 300),
    standfirst,
    body: sanitized,
  };
}
