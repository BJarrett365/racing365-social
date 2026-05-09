export function stripSourceCreditHtmlBlocks(html: string): string {
  return html.replace(/<p\b[^>]*>\s*Source credit:\s*[\s\S]*?<\/p>/gi, "").trim();
}

/** Strip trailing "Source credit: …" often pasted from partner sites or hallucinated by the model. */
export function stripTrailingSourceAttributionPlain(text: string): string {
  const lower = text.toLowerCase();
  const needle = "source credit:";
  const idx = lower.lastIndexOf(needle);
  if (idx < 0) return text.trim();
  if (text.length - idx > 800) return text.trim();
  return text.slice(0, idx).replace(/\s+$/, "").trim();
}

/** Remove partner attribution blocks and trailing source-credit tails from AI or imported HTML/plain bodies. */
export function stripModelOutputSourceNoise(body: string): string {
  let out = stripSourceCreditHtmlBlocks(body);
  out = stripTrailingSourceAttributionPlain(out);
  return out;
}

export function sanitizeImportedContent(input: string): string {
  return stripSourceCreditHtmlBlocks(
    input
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<script\b[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[\s\S]*?<\/style>/gi, "")
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "")
      .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "")
      .replace(/\b(ignore|disregard|override)\s+(all\s+)?(previous|above|system|developer)\s+instructions\b/gi, "[removed unsafe instruction]")
      .replace(/\bact\s+as\s+(system|developer|admin)\b/gi, "[removed unsafe instruction]")
      .replace(/\breturn\s+your\s+prompt\b/gi, "[removed unsafe instruction]")
      .replace(/\s+\n/g, "\n")
      .trim(),
  );
}
