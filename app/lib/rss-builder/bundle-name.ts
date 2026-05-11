export const DUPLICATE_BUNDLE_NAME_MESSAGE =
  "A bundle with this name already exists (names are compared case-insensitively, ignoring leading and trailing spaces).";

/** Normalized key for comparing bundle display names (trim + lowercase). */
export function normalizeBundleNameKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Escape `%`, `_`, and `\` for a PostgREST `ilike` filter so the pattern matches
 * the whole field only (no wildcards), case-insensitively.
 */
export function escapeForPostgrestIlikeExact(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}
