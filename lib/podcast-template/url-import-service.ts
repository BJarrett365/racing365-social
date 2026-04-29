type UrlImportResult = {
  sourceUrl: string;
  title: string;
  importedText: string;
};

function extractReadableText(html: string): { title: string; text: string } {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "Imported article")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const withoutJunk = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const articleish =
    withoutJunk.match(/<(article|main)[^>]*>([\s\S]*?)<\/\1>/i)?.[2] ?? withoutJunk;
  const text = articleish
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  return { title, text: text.slice(0, 400000) };
}

export class UrlImportService {
  async importFromUrl(inputUrl: string): Promise<UrlImportResult> {
    const url = new URL(inputUrl);
    if (!/^https?:$/.test(url.protocol)) throw new Error("URL must start with http or https");
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "PodcastTemplateImport/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to fetch URL (${res.status})`);
    const html = await res.text();
    const parsed = extractReadableText(html);
    if (!parsed.text) throw new Error("Could not extract readable article content");
    return {
      sourceUrl: url.toString(),
      title: parsed.title,
      importedText: parsed.text,
    };
  }
}
