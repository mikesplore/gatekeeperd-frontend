import { useMutation } from "@tanstack/react-query";
import { api, getApiErrorCode } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { AuthUser, LoginResponse } from "@/types/auth";

export function useLogin() {
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data: loginData } = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });
      if (loginData.requiresTwoFactor) return loginData;
      const { data: me } = await api.get<AuthUser>("/auth/me", {
        headers: { Authorization: `Bearer ${loginData.token}` },
      });
      return { token: loginData.token, refreshToken: loginData.refreshToken, ...me };
    },
    onSuccess: (result) => {
      if (result.requiresTwoFactor) return;
      const authenticated = result as LoginResponse & AuthUser;
      login(authenticated.token!, authenticated.refreshToken!, authenticated.email, authenticated.role, authenticated.permissions ?? []);
    },
  });
}

export function isInvalidCredentials(err: unknown): boolean {
  return getApiErrorCode(err) === "invalid_credentials";
}
