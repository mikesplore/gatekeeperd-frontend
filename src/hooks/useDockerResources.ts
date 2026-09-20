import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface DockerNetwork { id: string; name: string; driver: string; scope: string; containers: string[]; subnet?: string; gateway?: string; ipRange?: string; ipamDriver?: string; internal?: boolean; attachable?: boolean; enableIpv6?: boolean; options?: Record<string, string>; labels?: Record<string, string>; endpoints?: { container: string; containerId: string; ipv4?: string; ipv6?: string; macAddress?: string; endpointId?: string }[] }
export interface DockerVolume { name: string; driver: string; mountpoint: string; scope: string; createdAt?: string; labels?: Record<string, string>; options?: Record<string, string>; containers?: string[] }
export function useNetworks() { return useQuery({ queryKey: ["networks"], queryFn: async () => (await api.get<DockerNetwork[]>("/admin/networks")).data }); }
export function useVolumes() { return useQuery({ queryKey: ["volumes"], queryFn: async () => (await api.get<DockerVolume[]>("/admin/volumes")).data }); }
export function useCreateDockerResource(kind: "networks" | "volumes") { const qc = useQueryClient(); return useMutation({ mutationFn: (payload: { name: string; driver?: string }) => api.post(`/admin/${kind}`, payload), onSuccess: () => qc.invalidateQueries({ queryKey: [kind] }) }); }
export function useDeleteDockerResource(kind: "networks" | "volumes") { const qc = useQueryClient(); return useMutation({ mutationFn: (name: string) => api.delete(`/admin/${kind}/${encodeURIComponent(name)}`), onSuccess: () => qc.invalidateQueries({ queryKey: [kind] }) }); }
