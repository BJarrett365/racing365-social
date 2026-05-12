import { withAppPathPrefix } from "@/app/lib/app-base-path";
import { hashToken, randomToken } from "@/app/lib/auth/passwords";
import type { PlexaUser } from "@/app/lib/auth/types";

const VERIFY_TTL_MS = 1000 * 60 * 60 * 24;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60 * 2;

export function createVerificationForUser(user: PlexaUser): { user: PlexaUser; rawToken: string } {
  const rawToken = randomToken();
  const now = new Date().toISOString();
  return {
    rawToken,
    user: {
      ...user,
      verifyTokenHash: hashToken(rawToken),
      verifyTokenExpiresAt: new Date(Date.now() + VERIFY_TTL_MS).toISOString(),
      invitedAt: user.invitedAt ?? now,
      updatedAt: now,
    },
  };
}

export function verificationUrl(token: string): string {
  const base = process.env.PLEXA_PUBLIC_URL?.trim()?.replace(/\/$/, "") || "";
  return `${base}${withAppPathPrefix(`/verify-email?token=${encodeURIComponent(token)}`)}`;
}

export function createPasswordResetForUser(user: PlexaUser): { user: PlexaUser; rawToken: string } {
  const rawToken = randomToken();
  const now = new Date().toISOString();
  return {
    rawToken,
    user: {
      ...user,
      passwordResetTokenHash: hashToken(rawToken),
      passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString(),
      updatedAt: now,
    },
  };
}

export function passwordResetUrl(token: string): string {
  const base = process.env.PLEXA_PUBLIC_URL?.trim()?.replace(/\/$/, "") || "";
  return `${base}${withAppPathPrefix(`/reset-password?token=${encodeURIComponent(token)}`)}`;
}
