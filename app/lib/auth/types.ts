export type PlexaUserRole = "admin" | "editor" | "viewer";

export type PlexaUser = {
  id: string;
  name: string;
  email: string;
  role: PlexaUserRole;
  active: boolean;
  passwordHash?: string;
  passwordSalt?: string;
  passwordSetAt?: string;
  emailVerifiedAt?: string;
  verifyTokenHash?: string;
  verifyTokenExpiresAt?: string;
  lastLoginAt?: string;
  invitedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PlexaAuthData = {
  users: Record<string, PlexaUser>;
};

export type PublicPlexaUser = Omit<PlexaUser, "passwordHash" | "passwordSalt" | "verifyTokenHash"> & {
  hasPassword: boolean;
  emailVerified: boolean;
};

export type PlexaSessionPayload = {
  userId: string;
  email: string;
  role: PlexaUserRole;
  exp: number;
};
