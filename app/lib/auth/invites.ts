import { hashToken, randomToken } from "@/app/lib/auth/passwords";
import type { PlexaUser } from "@/app/lib/auth/types";

const VERIFY_TTL_MS = 1000 * 60 * 60 * 24;

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
  return `${base}/verify-email?token=${encodeURIComponent(token)}`;
}
