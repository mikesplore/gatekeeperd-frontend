import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  email: string | null;
  role: string | null;
  permissions: string[];
  login: (token: string, refreshToken: string, email: string, role: string, permissions?: string[]) => void;
  setUser: (email: string, role: string, permissions: string[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      email: null,
      role: null,
      permissions: [],
      login: (token, refreshToken, email, role, permissions = []) => set({ token, refreshToken, email, role, permissions }),
      setUser: (email, role, permissions) => set({ email, role, permissions }),
      logout: () => set({ token: null, refreshToken: null, email: null, role: null, permissions: [] }),
    }),
    {
      name: "gatekeeper-auth",
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        email: state.email,
        role: state.role,
        permissions: state.permissions,
      }),
    },
  ),
);
