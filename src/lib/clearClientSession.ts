import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";

const APP_STORAGE_PREFIX = "gatekeeper-";

function clearAppStorage(storage: Storage) {
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key?.startsWith(APP_STORAGE_PREFIX)) storage.removeItem(key);
  }
}

export function clearClientSession() {
  queryClient.clear();
  useAuthStore.getState().logout();
  useThemeStore.getState().setTheme(false);

  try {
    clearAppStorage(localStorage);
    clearAppStorage(sessionStorage);
  } catch {
    // Keep logout effective even when browser storage is unavailable.
  }
}
