import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface GitHubStatus {
  configured: boolean;
  connected: boolean;
  appId?: number | null;
  installationId?: number | null;
  appSlug?: string | null;
  accountLogin?: string | null;
  accountType?: string | null;
}

export interface GitHubRepository { full_name: string; private: boolean }

export function useGitHubRepositories(query: string, enabled: boolean) {
  return useQuery({
    queryKey: ["github", "repositories", query],
    queryFn: async () => (await api.get<GitHubRepository[]>("/admin/github/repositories", { params: { q: query } })).data,
    enabled,
    staleTime: 30_000,
  });
}

export function useGitHubStatus() {
  return useQuery({
    queryKey: ["github", "status"],
    queryFn: async () => (await api.get<GitHubStatus>("/admin/github/status")).data,
  });
}

export function useGitHubInstallUrl() {
  return useMutation({
    mutationFn: async () => (await api.get<{ url: string }>("/admin/github/install-url")).data,
  });
}

export function useUnlinkGitHub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/admin/github/installation"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["github", "status"] }),
  });
}
