/**
 * Normalise a list of tags: trim, drop empties, remove duplicates (case-insensitive).
 * Preserves the first occurrence’s casing.
 */
export function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const trimmed = String(raw).trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/**
 * Append tags parsed from comma-separated input; duplicates (case-insensitive) are skipped.
 */
export function mergeUniqueTagsFromCommaSeparated(existing: string[], commaInput: string): string[] {
  const parts = commaInput.split(",").map((s) => s.trim()).filter(Boolean);
  return uniqueTags([...existing, ...parts]);
}
