import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateDeploymentPayload, DeploymentAuditEntry, DeploymentJob } from "@/types/deployment";

export function useDeployments() {
  return useQuery({
    queryKey: ["deployments"],
    queryFn: async () => (await api.get<DeploymentJob[]>("/admin/deployments", { params: { limit: 100, offset: 0 } })).data,
    refetchInterval: 10_000,
  });
}

export function useDeployment(id: string) {
  return useQuery({
    queryKey: ["deployment", id],
    queryFn: async () => (await api.get<DeploymentJob>(`/admin/deployments/${id}`)).data,
    enabled: Boolean(id),
    refetchInterval: 5_000,
  });
}

export function useDeploymentAudit(id: string) {
  return useQuery({
    queryKey: ["deployment", id, "audit"],
    queryFn: async () => (await api.get<DeploymentAuditEntry[]>(`/admin/deployments/${id}/audit`)).data,
    enabled: Boolean(id),
  });
}

export function useCreateDeployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDeploymentPayload) => api.post<DeploymentJob>("/admin/deployments", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deployments"] }),
  });
}

export function useDeploymentAction(action: "cancel" | "retry" | "rollback") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/admin/deployments/${id}/${action}`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["deployments"] });
      qc.invalidateQueries({ queryKey: ["deployment", id] });
      qc.invalidateQueries({ queryKey: ["deployment", id, "audit"] });
    },
  });
}

