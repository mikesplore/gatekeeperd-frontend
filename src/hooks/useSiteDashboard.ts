import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DashboardCustomer, DashboardCustomerTransaction, DashboardSite, SiteDetail, SiteStatus } from "@/types/sites";
import type { DashboardSummary } from "@/types/dashboard";

export function useDashboardSites(status?: SiteStatus | "all") {
  return useQuery({ queryKey: ["dashboard", "sites", status], queryFn: async () => (await api.get<DashboardSite[]>("/admin/dashboard/sites", { params: status && status !== "all" ? { status } : undefined })).data });
}
export function useDashboardSite(slug: string) { return useQuery({ queryKey: ["dashboard", "site", slug], queryFn: async () => (await api.get<SiteDetail>(`/admin/dashboard/sites/${encodeURIComponent(slug)}`)).data, enabled: !!slug }); }
export interface DashboardSiteUpdate { domain?: string; upstreamHost?: string; upstreamMode?: string; upstreamContainerName?: string; upstreamExplicitPort?: number; tlsMode?: string; certMode?: string; certExplicitPath?: string; gateEnabled?: boolean; bypassPaths?: string[]; }
export function useUpdateDashboardSite(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (payload: DashboardSiteUpdate) => api.patch(`/admin/dashboard/sites/${encodeURIComponent(slug)}`, payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dashboard", "site", slug] }); queryClient.invalidateQueries({ queryKey: ["dashboard", "sites"] }); queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] }); } });
}
export function useDeleteDashboardSite() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (slug: string) => api.delete(`/admin/dashboard/sites/${encodeURIComponent(slug)}`), onSuccess: (_data, slug) => { queryClient.invalidateQueries({ queryKey: ["dashboard"] }); queryClient.invalidateQueries({ queryKey: ["projects"] }); queryClient.removeQueries({ queryKey: ["dashboard", "site", slug] }); } });
}
export function useDeadConfigs() { return useQuery({ queryKey: ["dashboard", "dead-configs"], queryFn: async () => (await api.get<DashboardSite[]>("/admin/dashboard/dead-configs")).data }); }
export function useDeleteDeadConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (filename: string) => api.delete(`/admin/dashboard/dead-configs/${encodeURIComponent(filename)}`, { data: { confirm: true } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", "dead-configs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "sites"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    },
  });
}
export function useDashboardCustomers() { return useQuery({ queryKey: ["dashboard", "customers"], queryFn: async () => (await api.get<DashboardCustomer[]>("/admin/dashboard/customers")).data }); }
export function useDashboardCustomer(id: string) { return useQuery({ queryKey: ["dashboard", "customer", id], queryFn: async () => (await api.get<DashboardCustomer>(`/admin/dashboard/customers/${id}`)).data, enabled: !!id }); }
export function useDashboardCustomerTransactions(id: string) { return useQuery({ queryKey: ["dashboard", "customer", id, "transactions"], queryFn: async () => (await api.get<DashboardCustomerTransaction[]>(`/admin/dashboard/customers/${id}/transactions`)).data, enabled: !!id }); }
export function useCreateDashboardCustomer() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (payload: { name: string; contactEmail?: string; contactPhone?: string; billingStatus?: string }) => api.post("/admin/dashboard/customers", payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard", "customers"] }) }); }
export function useAssignProjectCustomer() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ projectId, customerId }: { projectId: string; customerId: string | null }) => api.patch(`/admin/dashboard/projects/${encodeURIComponent(projectId)}`, { customerId }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard"] }) }); }
export function useDashboardSummary() { return useQuery({ queryKey: ["dashboard", "summary"], queryFn: async () => (await api.get<DashboardSummary>("/admin/dashboard/summary")).data, staleTime: 30_000 }); }
