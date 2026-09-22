import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DashboardCustomer, DashboardSite, SiteDetail, SiteStatus } from "@/types/sites";

export function useDashboardSites(status?: SiteStatus | "all") {
  return useQuery({ queryKey: ["dashboard", "sites", status], queryFn: async () => (await api.get<DashboardSite[]>("/admin/dashboard/sites", { params: status && status !== "all" ? { status } : undefined })).data });
}
export function useDashboardSite(slug: string) { return useQuery({ queryKey: ["dashboard", "site", slug], queryFn: async () => (await api.get<SiteDetail>(`/admin/dashboard/sites/${encodeURIComponent(slug)}`)).data, enabled: !!slug }); }
export function useDeadConfigs() { return useQuery({ queryKey: ["dashboard", "dead-configs"], queryFn: async () => (await api.get<DashboardSite[]>("/admin/dashboard/dead-configs")).data }); }
export function useDashboardCustomers() { return useQuery({ queryKey: ["dashboard", "customers"], queryFn: async () => (await api.get<DashboardCustomer[]>("/admin/dashboard/customers")).data }); }
export function useDashboardCustomer(id: string) { return useQuery({ queryKey: ["dashboard", "customer", id], queryFn: async () => (await api.get<DashboardCustomer>(`/admin/dashboard/customers/${id}`)).data, enabled: !!id }); }
