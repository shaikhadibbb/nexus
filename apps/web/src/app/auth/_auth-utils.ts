import { ApiError } from '@/lib/api-client';

interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  avatarBlurhash: string | null;
  accountType: string;
  isVerified: boolean;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isPrivate: boolean;
  focusModeEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
}

interface AuthPayload {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export function parseAuthPayload(payload: unknown): AuthPayload {
  const root = asRecord(payload);
  const user = asRecord(root?.['user']);
  const tokens = asRecord(root?.['tokens']);

  const accessToken =
    (root?.['accessToken'] as string | undefined) ??
    (tokens?.['accessToken'] as string | undefined);
  const refreshToken =
    (root?.['refreshToken'] as string | undefined) ??
    (tokens?.['refreshToken'] as string | undefined);

  if (!user || !accessToken || !refreshToken) {
    throw new ApiError(500, 'INVALID_AUTH_PAYLOAD', 'Unexpected auth response shape');
  }

  return {
    user: user as unknown as AuthUser,
    accessToken,
    refreshToken,
  };
}
