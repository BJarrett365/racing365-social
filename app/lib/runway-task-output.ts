/** First HTTPS asset URL from a succeeded Runway task (text-to-video, etc.). */
export function firstRunwayTaskOutputUrl(task: Record<string, unknown>): string | null {
  if (task.status !== "SUCCEEDED") return null;
  const out = task.output;
  if (!Array.isArray(out) || out.length === 0) return null;
  const first = out[0];
  if (typeof first === "string" && /^https?:\/\//i.test(first)) return first;
  if (first && typeof first === "object" && "url" in first && typeof (first as { url: string }).url === "string") {
    const u = (first as { url: string }).url;
    if (/^https?:\/\//i.test(u)) return u;
  }
  return null;
}
