import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  email: string | null;
  role: string | null;
  isHydrating: boolean;
  setHydrating: (value: boolean) => void;
  login: (token: string, email: string, role: string) => void;
  setUser: (email: string, role: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      role: null,
      isHydrating: false,
      setHydrating: (value) => set({ isHydrating: value }),
      login: (token, email, role) => set({ token, email, role }),
      setUser: (email, role) => set({ email, role }),
      logout: () => set({ token: null, email: null, role: null }),
    }),
    {
      name: "gatekeeper-auth",
      partialize: (state) => ({
        token: state.token,
        email: state.email,
        role: state.role,
      }),
    },
  ),
);
