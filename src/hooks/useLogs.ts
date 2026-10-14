import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AdminLogsPage } from "@/types/logs";

export function useAdminLogs(params: { limit: number; offset: number; search?: string; level?: string }) {
  return useQuery({
    queryKey: ["admin-logs", params],
    queryFn: async () => (await api.get<AdminLogsPage>("/admin/logs", { params })).data,
    placeholderData: previous => previous,
    refetchInterval: 30_000,
  });
}
