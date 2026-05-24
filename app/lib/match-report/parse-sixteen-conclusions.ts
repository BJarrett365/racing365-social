export type SixteenConclusionItem = {
  number: number;
  title: string;
  bodyHtml: string;
};

export type ParsedSixteenConclusions = {
  headline?: string;
  introParagraphs: string[];
  items: SixteenConclusionItem[];
};

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseConclusionHeading(rawHtml: string): { number: number; title: string } | null {
  const text = stripHtml(rawHtml);
  const match = /^(\d{1,2})\s*[.)–-]\s*(.+)$/i.exec(text);
  if (!match?.[1] || !match[2]?.trim()) return null;
  return {
    number: Number.parseInt(match[1], 10),
    title: match[2].trim(),
  };
}

function extractParagraphInnerHtml(blockHtml: string): string[] {
  const parts: string[] = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(blockHtml)) !== null) {
    const inner = match[1]?.trim() ?? "";
    if (inner) parts.push(inner);
  }
  return parts;
}

export function parseSixteenConclusionsHtml(html: string): ParsedSixteenConclusions {
  const trimmed = html.trim();
  if (!trimmed) return { introParagraphs: [], items: [] };

  const headlineMatch = trimmed.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const headline = headlineMatch ? stripHtml(headlineMatch[1] ?? "") : undefined;

  const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  const headings: Array<{ index: number; endIndex: number; content: string }> = [];
  let headingMatch: RegExpExecArray | null;
  while ((headingMatch = h3Regex.exec(trimmed)) !== null) {
    headings.push({
      index: headingMatch.index,
      endIndex: headingMatch.index + headingMatch[0].length,
      content: headingMatch[1] ?? "",
    });
  }

  const introParagraphs: string[] = [];
  if (headings.length > 0) {
    const introStart = headlineMatch ? headlineMatch.index! + headlineMatch[0].length : 0;
    const introHtml = trimmed.slice(introStart, headings[0]!.index);
    for (const paragraph of extractParagraphInnerHtml(introHtml)) {
      const text = stripHtml(paragraph);
      if (text) introParagraphs.push(text);
    }
  }

  const items: SixteenConclusionItem[] = [];
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index]!;
    const parsedHeading = parseConclusionHeading(heading.content);
    if (!parsedHeading) continue;

    const bodyStart = heading.endIndex;
    const bodyEnd = index + 1 < headings.length ? headings[index + 1]!.index : trimmed.length;
    const bodyHtml = trimmed.slice(bodyStart, bodyEnd).trim();
    const paragraphParts = extractParagraphInnerHtml(bodyHtml);
    const body =
      paragraphParts.length > 0 ? paragraphParts.join(" ") : stripHtml(bodyHtml);
    if (!body) continue;

    items.push({
      number: parsedHeading.number,
      title: parsedHeading.title,
      bodyHtml: body,
    });
  }

  items.sort((a, b) => a.number - b.number);
  return { headline, introParagraphs, items };
}
