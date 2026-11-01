export interface AuthUser {
  email: string;
  role: string;
  permissions: string[];
  createdAt: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  totpEnabled?: boolean;
}

export interface LoginResponse {
  token?: string;
  refreshToken?: string;
  requiresTwoFactor?: boolean;
  challengeToken?: string;
}
