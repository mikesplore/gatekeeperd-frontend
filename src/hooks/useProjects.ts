import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { api } from "@/lib/api";
import type { AuditLogEntry } from "@/types/audit";
import type {
  ContainerInfo,
  ContainerValidateResponse,
  ContainerWizardContext,
  CreateContainerPayload,
  CreateContainerResponse,
  DeleteImagePayload,
  DeleteImageResponse,
  ImageStatusPayload,
  ImageStatusResponse,
  PortsCheckPayload,
  PortsCheckResponse,
} from "@/types/container";
import type {
  CreateProjectPayload,
  Project,
  ProjectDetailResponse,
  ProjectWizardContext,
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

export function useProjectWizardContext() {
  return useQuery({
    queryKey: ["projects", "wizard", "context"],
    queryFn: async () =>
      (await api.get<ProjectWizardContext>("/admin/projects/wizard/context")).data,
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

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.delete(`/admin/projects/${slug}`),
    onSuccess: (_data, slug) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.removeQueries({ queryKey: ["project", slug] });
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

export function useCreateContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateContainerPayload) =>
      api.post<CreateContainerResponse>("/admin/containers/create", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["containers"] }),
  });
}

export function useImageStatus() {
  return useMutation({
    mutationFn: (payload: ImageStatusPayload) =>
      api.post<ImageStatusResponse>("/admin/images/status", payload),
  });
}

export function usePortsCheck() {
  return useMutation({
    mutationFn: (payload: PortsCheckPayload) =>
      api.post<PortsCheckResponse>("/admin/containers/wizard/ports/check", payload),
  });
}

export function useContainerWizardContext() {
  return useQuery({
    queryKey: ["containers", "wizard", "context"],
    queryFn: async () =>
      (await api.get<ContainerWizardContext>("/admin/containers/wizard/context")).data,
  });
}

export function useValidateCreateContainer() {
  return useMutation({
    mutationFn: (payload: CreateContainerPayload) =>
      api.post<ContainerValidateResponse>("/admin/containers/wizard/validate", payload),
  });
}

export function useDeleteContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post(`/admin/containers/${name}/delete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["containers"] }),
  });
}

export function useDeleteImage() {
  return useMutation({
    mutationFn: (payload: DeleteImagePayload) =>
      api.post<DeleteImageResponse>("/admin/images/delete", payload),
  });
}
