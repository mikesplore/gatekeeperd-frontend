import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import axios from "axios";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
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
  ProjectHealthResponse,
  ProjectWizardContext,
  UpdateProjectPayload,
} from "@/types/project";
import type { PaymentLinkResponse } from "@/types/payment";
import type { ProjectInvoiceStatus } from "@/types/payment";
import type { DashboardSummary } from "@/types/dashboard";
import type { IntegrationOutboxEvent, NotificationItem } from "@/types/dashboard";

export function useNotifications(limit = 25) {
  return useQuery({
    queryKey: ["notifications", limit],
    queryFn: async () => (await api.get<NotificationItem[]>("/admin/notifications", { params: { limit } })).data,
    refetchInterval: 30_000,
  });
}

export function useNotificationAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, state }: { id: string; state: "read" | "dismissed" | "archived" }) => api.post(`/admin/notifications/${id}/${state}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useNotificationStream() {
  const qc = useQueryClient();
  useEffect(() => {
    const controller = new AbortController();
    const token = useAuthStore.getState().token;
    if (!token) return () => controller.abort();
    void fetch(`${api.defaults.baseURL}/admin/notifications/stream`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }).then(async response => {
      if (!response.ok || !response.body) return;
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (!controller.signal.aborted) {
        const chunk = await reader.read(); if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const events = buffer.split("\n\n"); buffer = events.pop() ?? "";
        if (events.some(event => event.split("\n").some(line => line.startsWith("data:")))) qc.invalidateQueries({ queryKey: ["notifications"] });
      }
    }).catch(() => undefined);
    return () => controller.abort();
  }, [qc]);
}

export function useIntegrationOutbox() {
  return useQuery({
    queryKey: ["integrations", "outbox"],
    queryFn: async () => (await api.get<IntegrationOutboxEvent[]>("/admin/integrations/outbox")).data,
    refetchInterval: 30_000,
  });
}

export function useReplayIntegrationEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/admin/integrations/outbox/${id}/replay`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations", "outbox"] }),
  });
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => (await api.get<DashboardSummary>("/admin/dashboard/summary")).data,
    refetchInterval: 30_000,
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.get<{ projects: Project[]; total: number; limit: number; offset: number }>("/admin/projects")).data.projects,
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

export function useTransferProject(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { deploymentMode: string; serviceMode: string }) =>
      api.post(`/admin/projects/${slug}/transfer`, payload),
    onSuccess: () => {
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

export function useProjectHealth(slug: string) {
  return useQuery({
    queryKey: ["project", slug, "health"],
    queryFn: async () => (await api.get<ProjectHealthResponse>(`/admin/projects/${slug}/health`)).data,
    enabled: !!slug,
    refetchInterval: 30_000,
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

export function useInitiateMpesaPayment() {
  return useMutation({
    mutationFn: ({ slug, phone }: { slug: string; phone: string }) =>
      api.post<{ provider: string; reference: string; status: string }>(`/mpesa/pay?project=${encodeURIComponent(slug)}&phone=${encodeURIComponent(phone)}`),
  });
}

export function useProjectInvoice(slug: string) {
  return useQuery({
    queryKey: ["project", slug, "invoice"],
    queryFn: async () => (await api.get<ProjectInvoiceStatus>(`/admin/projects/${slug}/invoice`)).data,
    enabled: !!slug,
  });
}

export function useReconcilePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/admin/payments/${id}/reconcile`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project"] });
      qc.invalidateQueries({ queryKey: ["payment", id] });
    },
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
    queryFn: async () => (await api.get<{ containers: ContainerInfo[]; total: number; limit: number; offset: number }>("/admin/containers")).data.containers,
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
