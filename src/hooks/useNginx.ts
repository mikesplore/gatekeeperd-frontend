import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { NginxStatus } from "@/types/nginx";

export function useNginxStatus(slug: string) {
  return useQuery({
    queryKey: ["nginx", "status", slug],
    queryFn: async () => (await api.get<NginxStatus>(`/admin/nginx/status/${slug}`)).data,
    enabled: !!slug,
  });
}

export function useEnableNginx() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, payload }: { slug: string; payload?: { port?: number; sslCertificatePath?: string; sslCertificateKeyPath?: string } }) =>
      api.post(`/admin/nginx/enable/${slug}`, payload),
    onSuccess: (_data, { slug }) => {
      qc.invalidateQueries({ queryKey: ["nginx", "status", slug] });
    },
  });
}

export function useDisableNginx() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.post(`/admin/nginx/disable/${slug}`),
    onSuccess: (_data, slug) => {
      qc.invalidateQueries({ queryKey: ["nginx", "status", slug] });
    },
  });
}

export function useRemoveNginx() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.post(`/admin/nginx/remove/${slug}`),
    onSuccess: (_data, slug) => {
      qc.invalidateQueries({ queryKey: ["nginx", "status", slug] });
    },
  });
}

export function useInstallCertificate() {
  return useMutation({
    mutationFn: ({ domain, email }: { domain: string; email: string }) =>
      api.post("/admin/nginx/certificate/install", { domain, email }),
  });
}

export function useRemoveCertificate() {
  return useMutation({
    mutationFn: (domain: string) => api.post(`/admin/nginx/certificate/remove/${domain}`),
  });
}

export function useCertificateStatus(domain: string) {
  return useQuery({
    queryKey: ["nginx", "certificate", domain],
    queryFn: async () => (await api.get(`/admin/nginx/certificate/status/${domain}`)).data,
    enabled: !!domain,
  });
}