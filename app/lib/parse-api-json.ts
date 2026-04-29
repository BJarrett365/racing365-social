/**
 * Parse JSON from fetch Response. Avoids SyntaxError when the server returns HTML or plain text
 * (common with Next.js 500 pages or a corrupted .next build).
 */
export async function parseApiJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    if (!res.ok) {
      throw new Error(
        `Request failed (${res.status}). Empty response — run npm run clean, then npm run dev again.`,
      );
    }
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    const fix =
      res.status >= 500
        ? "Server error — run npm run clean, then npm run dev again."
        : `Invalid response (${res.status}).`;
    throw new Error(fix);
  }
}
