import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  GatewayStatus,
  OverdueProject,
  PaymentsListResponse,
  RevenueReport,
} from "@/types/payment";

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
