import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DashboardCustomer, DashboardCustomerTransaction, DashboardSite, SiteDetail, SiteStatus } from "@/types/sites";
import type { DashboardSummary } from "@/types/dashboard";

export type PaginatedDashboardSites = { sites: DashboardSite[]; total: number; limit: number; offset: number; hasMore: boolean };
export function useDashboardSites(status?: SiteStatus | "all", limit = 25, offset = 0) {
  return useQuery({ queryKey: ["dashboard", "sites", status, limit, offset], queryFn: async () => (await api.get<PaginatedDashboardSites>("/admin/dashboard/sites", { params: { status: status && status !== "all" ? status : undefined, limit, offset } })).data });
}
export function useDashboardSite(slug: string) { return useQuery({ queryKey: ["dashboard", "site", slug], queryFn: async () => (await api.get<SiteDetail>(`/admin/dashboard/sites/${encodeURIComponent(slug)}`)).data, enabled: !!slug }); }
export interface DashboardSiteUpdate { domain?: string; upstreamHost?: string; upstreamMode?: string; upstreamExplicitPort?: number; tlsMode?: string; certMode?: string; certExplicitPath?: string; gateEnabled?: boolean; bypassPaths?: string[]; }
export function useUpdateDashboardSite(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (payload: DashboardSiteUpdate) => api.patch(`/admin/dashboard/sites/${encodeURIComponent(slug)}`, payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dashboard", "site", slug] }); queryClient.invalidateQueries({ queryKey: ["dashboard", "sites"] }); queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] }); } });
}
export function useDeleteDashboardSite() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (slug: string) => api.delete(`/admin/dashboard/sites/${encodeURIComponent(slug)}`), onSuccess: (_data, slug) => { queryClient.invalidateQueries({ queryKey: ["dashboard"] }); queryClient.invalidateQueries({ queryKey: ["projects"] }); queryClient.removeQueries({ queryKey: ["dashboard", "site", slug] }); } });
}
export interface NginxConfigArtifact { filename: string; domains: string[]; listenPorts: number[]; classification: "self" | "gatekeeper_managed" | "manual"; available: boolean; enabled: boolean; managed: boolean; tracked: boolean; orphaned: boolean; projectId?: string | null; serviceId?: string | null; siteId?: string | null; }
export interface NginxManualConfigDetail { filename: string; domains: string[]; listenPorts: number[]; available: boolean; enabled: boolean; content: string; }
export interface NginxManualConfigAction { filename: string; backup: string; disabled: boolean; deleted: boolean; nginxTestPassed: boolean; reloaded: boolean; resolvedManagedConfigs: string[]; }
export function useDeadConfigs() { return useQuery({ queryKey: ["nginx", "config-artifacts"], queryFn: async () => (await api.get<NginxConfigArtifact[]>("/admin/nginx/configs")).data }); }
export function useManualConfigDetail(filename: string | null) { return useQuery({ queryKey: ["nginx", "manual-config", filename], queryFn: async () => (await api.get<NginxManualConfigDetail>(`/admin/nginx/manual-configs/${encodeURIComponent(filename!)}`)).data, enabled: !!filename }); }
export function useDisableManualConfig() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (filename: string) => api.post<NginxManualConfigAction>(`/admin/nginx/manual-configs/${encodeURIComponent(filename)}/disable`, { confirm: true }), onSuccess: (_data, filename) => { queryClient.invalidateQueries({ queryKey: ["nginx", "config-artifacts"] }); queryClient.invalidateQueries({ queryKey: ["nginx", "manual-config", filename] }); } });
}
export function useDeleteManualConfig() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (filename: string) => api.delete<NginxManualConfigAction>(`/admin/nginx/manual-configs/${encodeURIComponent(filename)}`, { data: { confirm: true } }), onSuccess: (_data, filename) => { queryClient.invalidateQueries({ queryKey: ["nginx", "config-artifacts"] }); queryClient.invalidateQueries({ queryKey: ["nginx", "manual-config", filename] }); } });
}
export function useDeleteDeadConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (filename: string) => api.delete(`/admin/dashboard/dead-configs/${encodeURIComponent(filename)}`, { data: { confirm: true } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", "dead-configs"] });
      queryClient.invalidateQueries({ queryKey: ["nginx", "config-artifacts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "sites"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    },
  });
}
export type PaginatedDashboardCustomers = { customers: DashboardCustomer[]; total: number; limit: number; offset: number; hasMore: boolean };
export function useDashboardCustomers(limit = 25, offset = 0, q = "") { return useQuery({ queryKey: ["dashboard", "customers", limit, offset, q], queryFn: async () => (await api.get<PaginatedDashboardCustomers>("/admin/dashboard/customers", { params: { limit, offset, q: q || undefined } })).data }); }
export function useDashboardCustomer(id: string) { return useQuery({ queryKey: ["dashboard", "customer", id], queryFn: async () => (await api.get<DashboardCustomer>(`/admin/dashboard/customers/${id}`)).data, enabled: !!id }); }
export function useDashboardCustomerTransactions(id: string) { return useQuery({ queryKey: ["dashboard", "customer", id, "transactions"], queryFn: async () => (await api.get<DashboardCustomerTransaction[]>(`/admin/dashboard/customers/${id}/transactions`)).data, enabled: !!id }); }
export function useCreateDashboardCustomer() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (payload: { name: string; contactEmail?: string; contactPhone?: string; billingStatus?: string }) => api.post("/admin/dashboard/customers", payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard", "customers"] }) }); }
export function useAssignProjectCustomer() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ projectId, customerId }: { projectId: string; customerId: string | null }) => api.patch(`/admin/dashboard/projects/${encodeURIComponent(projectId)}`, { customerId }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard"] }) }); }
export function useDashboardSummary() { return useQuery({ queryKey: ["dashboard", "summary"], queryFn: async () => (await api.get<DashboardSummary>("/admin/dashboard/summary")).data, staleTime: 30_000 }); }
