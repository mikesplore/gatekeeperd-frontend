import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  GatewayStatus,
  OverdueProject,
  PaymentsListResponse,
  RevenueReport,
} from "@/types/payment";
export interface CaptureCashPaymentPayload {
  amount: number;
  currency?: string;
  paidAt?: string;
  receiptNumber?: string;
  notes?: string;
}

export function useCaptureCashPayment(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CaptureCashPaymentPayload) =>
      (await api.post(`/admin/projects/${projectSlug}/payments/cash`, payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectSlug] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
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

export function useProjectPayments(projectSlug: string, limit = 25, offset = 0) {
  return useQuery({
    queryKey: ["project-payments", projectSlug, limit, offset],
    queryFn: async () => (await api.get<PaymentsListResponse>(`/admin/projects/${encodeURIComponent(projectSlug)}/payments`, { params: { limit, offset } })).data,
    enabled: !!projectSlug,
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
