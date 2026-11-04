import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  GatewayStatus,
  OverdueProject,
  PaymentsListResponse,
  RevenueReport,
  ServiceInvoiceStatus,
} from "@/types/payment";
export interface CaptureCashPaymentPayload {
  amount: number;
  currency?: string;
  paidAt?: string;
  receiptNumber?: string;
  notes?: string;
  serviceId: string;
}

export function useCaptureCashPayment(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ serviceId, ...payload }: CaptureCashPaymentPayload) =>
      (await api.post(`/admin/services/${serviceId}/payments/cash`, payload)).data,
    onSuccess: (_data, { serviceId }) => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["service-payments", projectId, serviceId] });
      queryClient.invalidateQueries({ queryKey: ["service-invoice", projectId, serviceId] });
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
    },
  });
}

export function useAllPayments(filters: {
  status?: GatewayStatus;
  projectSlug?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["payments", filters],
    queryFn: async () =>
      (await api.get<PaymentsListResponse>("/admin/payments", { params: filters })).data,
    placeholderData: (prev) => prev,
  });
}

export function useProjectPayments(projectId: string, limit = 25, offset = 0) {
  return useQuery({
    queryKey: ["project-payments", projectId, limit, offset],
    queryFn: async () => (await api.get<PaymentsListResponse>(`/admin/projects/${projectId}/payments`, { params: { limit, offset } })).data,
    enabled: !!projectId,
  });
}

export function useServicePayments(projectId: string, serviceId: string, limit = 25, offset = 0, refetchInterval: number | false = false) {
  return useQuery({
    queryKey: ["service-payments", projectId, serviceId, limit, offset],
    queryFn: async () => (await api.get<{ payments: import("@/types/payment").Payment[]; total: number; limit: number; offset: number; hasMore?: boolean }>(`/admin/projects/${projectId}/services/${serviceId}/payments`, { params: { limit, offset } })).data,
    enabled: Boolean(projectId && serviceId),
    refetchInterval,
  });
}

export function useServiceInvoice(projectId: string, serviceId: string) {
  return useQuery({
    queryKey: ["service-invoice", projectId, serviceId],
    queryFn: async () => (await api.get<ServiceInvoiceStatus>(`/admin/projects/${projectId}/services/${serviceId}/invoice`)).data,
    enabled: Boolean(projectId && serviceId),
  });
}

export function useOverdueProjects() {
  return useQuery({
    queryKey: ["projects", "overdue"],
    queryFn: async () => (await api.get<OverdueProject[]>("/admin/projects/overdue")).data,
    refetchInterval: 60_000,
  });
}

export function useRevenueReport(months = 6) {
  return useQuery({
    queryKey: ["revenue", months],
    queryFn: async () =>
      (await api.get<RevenueReport>("/admin/revenue", { params: { period: "month", months } })).data,
  });
}
