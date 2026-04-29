export const lcInputClass =
  "mt-1 w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]";
export const lcInputStyle = { borderColor: "var(--border)" } as const;
export const lcBtnPrimary =
  "inline-flex items-center justify-center rounded-lg border border-transparent bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-foreground)] hover:bg-[color:var(--accent-hover)]";
export const lcBtnGhost =
  "inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]";
export const lcBtnGhostStyle = { borderColor: "var(--border)", background: "var(--surface)" } as const;

export function adminHeaders(token: string): HeadersInit {
  const t = token.trim();
  if (!t) return {};
  return { "x-admin-token": t };
}

const STORAGE_KEY = "plexa_live_admin_token";

export function readStoredAdminToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function writeStoredAdminToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    if (token.trim()) localStorage.setItem(STORAGE_KEY, token.trim());
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
