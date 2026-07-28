import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { api } from "@/lib/api";
import type { AuditLogEntry } from "@/types/audit";
import type { ContainerInfo } from "@/types/container";
import type {
  CreateProjectPayload,
  Project,
  ProjectDetailResponse,
  UpdateProjectPayload,
} from "@/types/project";
import type { PaymentLinkResponse } from "@/types/payment";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.get<Project[]>("/admin/projects")).data,
    refetchInterval: 30_000,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) =>
      api.post<Project>("/admin/projects", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProjectPayload) =>
      api.patch<Project>(`/admin/projects/${slug}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project", slug] });
    },
  });
}

export function useBlockProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, reason }: { slug: string; reason: string }) =>
      api.post(`/admin/projects/${slug}/block`, { reason }),
    onSuccess: (_data, { slug }) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project", slug] });
    },
  });
}

export function useUnblockProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, reason }: { slug: string; reason: string }) =>
      api.post(`/admin/projects/${slug}/unblock`, { reason }),
    onSuccess: (_data, { slug }) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project", slug] });
    },
  });
}

export function useProjectDetail(slug: string) {
  return useQuery({
    queryKey: ["project", slug],
    queryFn: async () =>
      (await api.get<ProjectDetailResponse>(`/admin/projects/${slug}`)).data,
    enabled: !!slug,
  });
}

export function useInitializePayment(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email?: string) =>
      api.post<PaymentLinkResponse>(`/admin/projects/${slug}/payment/initialize`, {
        email: email || undefined,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", slug] }),
  });
}

export function useGlobalAuditLog(limit = 100) {
  return useQuery({
    queryKey: ["audit", limit],
    queryFn: async () =>
      (await api.get<AuditLogEntry[]>("/admin/audit", { params: { limit } })).data,
    refetchInterval: 30_000,
  });
}

export function useContainers() {
  return useQuery({
    queryKey: ["containers"],
    queryFn: async () => (await api.get<ContainerInfo[]>("/admin/containers")).data,
    refetchInterval: 15_000,
    retry: (failureCount, err) =>
      axios.isAxiosError(err) && err.response?.status === 503 ? false : failureCount < 3,
  });
}

export function useContainerAction(action: "start" | "stop" | "restart") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post(`/admin/containers/${name}/${action}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["containers"] }),
  });
}
