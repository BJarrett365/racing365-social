/**
 * Lightweight project ID validation for URL segments.
 * Adjust when persistence layer is added.
 */
export function isValidEditingStudioProjectId(id: string): boolean {
  const trimmed = id.trim();
  if (!trimmed) return false;
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(trimmed);
}
