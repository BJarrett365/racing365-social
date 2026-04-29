/** Simulate platform truncation for preview (approximate). */
export function ellipsize(s: string, maxChars: number): { text: string; truncated: boolean } {
  const t = s.trim();
  if (t.length <= maxChars) return { text: t, truncated: false };
  const cut = t.slice(0, Math.max(0, maxChars - 1)).trimEnd();
  return { text: `${cut}…`, truncated: true };
}

export const PREVIEW_TRUNCATE_HINTS: Record<string, number> = {
  x: 280,
  facebook: 63206,
  instagram: 2200,
  instagram_story: 2200,
  linkedin: 3000,
  tiktok: 2200,
  youtube_shorts: 5000,
  whatsapp: 4096,
  telegram: 4096,
};

export function truncateHintForPlatform(platform: string): number {
  return PREVIEW_TRUNCATE_HINTS[platform] ?? 2000;
}
