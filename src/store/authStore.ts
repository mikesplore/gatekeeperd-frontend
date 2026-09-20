import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  email: string | null;
  role: string | null;
  isHydrating: boolean;
  setHydrating: (value: boolean) => void;
  login: (token: string, refreshToken: string, email: string, role: string) => void;
  setUser: (email: string, role: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      email: null,
      role: null,
      isHydrating: false,
      setHydrating: (value) => set({ isHydrating: value }),
      login: (token, refreshToken, email, role) => set({ token, refreshToken, email, role }),
      setUser: (email, role) => set({ email, role }),
      logout: () => set({ token: null, refreshToken: null, email: null, role: null }),
    }),
    {
      name: "gatekeeper-auth",
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        email: state.email,
        role: state.role,
      }),
    },
  ),
);
