/** Avoid dumping huge keyword blobs in grids — summarize on tiles, full text in drawer. */
export function digestKeywords(keywords: string[] | undefined): {
  count: number;
  joined: string;
  tileCaption: string | null;
  isHeavy: boolean;
} {
  const normalized = (keywords ?? []).map((k) => k.trim()).filter(Boolean);
  if (normalized.length === 0) {
    return { count: 0, joined: "", tileCaption: null, isHeavy: false };
  }
  const joined = normalized.join(", ");
  const isHeavy =
    joined.length > 220 ||
    normalized.some((k) => k.length > 160) ||
    normalized.length > 10;
  const tileCaption = isHeavy
    ? `${normalized.length} metadata field${normalized.length === 1 ? "" : "s"} · open Details for full text`
    : joined.length <= 96
      ? joined
      : `${joined.slice(0, 96)}…`;
  return { count: normalized.length, joined, tileCaption, isHeavy };
}
