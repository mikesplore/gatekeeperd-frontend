import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeState {
  dark: boolean;
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      dark: false,
      toggleTheme: () => {
        const next = !get().dark;
        document.documentElement.classList.toggle("dark", next);
        set({ dark: next });
      },
      setTheme: (dark) => {
        document.documentElement.classList.toggle("dark", dark);
        set({ dark });
      },
    }),
    {
      name: "gatekeeper-theme",
    },
  ),
);