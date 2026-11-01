import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { AuthUser } from "@/types/auth";

export function useCurrentUser() {
  const token = useAuthStore(state => state.token);
  const setUser = useAuthStore(state => state.setUser);
  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => (await api.get<AuthUser>("/auth/me")).data,
    enabled: Boolean(token),
    retry: false,
    staleTime: 0,
  });

  useEffect(() => {
    if (query.data) setUser(query.data.email, query.data.role, query.data.permissions ?? []);
  }, [query.data, setUser]);

  return query;
}

export function useCan(permission: string): boolean {
  const permissions = useAuthStore(state => state.permissions);
  return permissions.includes(permission);
}
