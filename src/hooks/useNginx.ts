import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  CertificateListResponse,
  EnableNginxPayload,
  EnableNginxResponse,
  NginxStatus,
  NginxConfigInspection,
  NginxTestResult,
  NginxBackup,
  NginxWizardContext,
} from "@/types/nginx";

export function useNginxStatus(slug: string) {
  return useQuery({
    queryKey: ["nginx", "status", slug],
    queryFn: async () => (await api.get<NginxStatus>(`/admin/nginx/status/${slug}`)).data,
    enabled: !!slug,
  });
}

export function useNginxConfig(slug: string) {
  return useQuery({
    queryKey: ["nginx", "config", slug],
    queryFn: async () => (await api.get<NginxConfigInspection>(`/admin/nginx/config/${slug}`)).data,
    enabled: !!slug,
  });
}

export function useNginxDiagnostics() {
  return useMutation({
    mutationFn: async () => (await api.post<NginxTestResult>("/admin/nginx/test")).data,
  });
}

export function useNginxBlockUpdate(slug: string, action: "preview" | "apply") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ blockIndex, content }: { blockIndex: number; content: string }) =>
      api.post<{ slug: string; blockIndex: number; config: string }>(
        `/admin/nginx/config/${slug}/blocks/${blockIndex}/${action}`,
        { blockIndex, content },
      ),
    onSuccess: () => {
      if (action === "apply") qc.invalidateQueries({ queryKey: ["nginx", "config", slug] });
    },
  });
}

export function useNginxVersions(slug: string) {
  return useQuery({
    queryKey: ["nginx", "versions", slug],
    queryFn: async () => (await api.get<NginxBackup[]>(`/admin/nginx/config/${slug}/versions`)).data,
    enabled: !!slug,
  });
}

export function useNginxRollback(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (backup: string) => api.post(`/admin/nginx/config/${slug}/rollback/${encodeURIComponent(backup)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nginx", "config", slug] });
      qc.invalidateQueries({ queryKey: ["nginx", "versions", slug] });
      qc.invalidateQueries({ queryKey: ["nginx", "status", slug] });
    },
  });
}

export function useNginxWizardContext(slug: string) {
  return useQuery({
    queryKey: ["nginx", "wizard", slug],
    queryFn: async () =>
      (await api.get<NginxWizardContext>(`/admin/nginx/wizard/context/${slug}`)).data,
    enabled: !!slug,
  });
}

export function useValidateNginxEnable(slug: string) {
  return useMutation({
    mutationFn: (payload: EnableNginxPayload) =>
      api.post<EnableNginxResponse>(`/admin/nginx/wizard/validate/${slug}`, payload),
  });
}

export function useEnableNginx() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, payload }: { slug: string; payload?: EnableNginxPayload }) =>
      api.post<EnableNginxResponse>(`/admin/nginx/enable/${slug}`, payload),
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ domain, email }: { domain: string; email: string }) =>
      api.post("/admin/nginx/certificate/install", { domain, email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nginx", "certificates"] });
    },
  });
}

export function useRemoveCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (domain: string) => api.post(`/admin/nginx/certificate/remove/${domain}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nginx", "certificates"] });
    },
  });
}

export function useCertificateStatus(domain: string) {
  return useQuery({
    queryKey: ["nginx", "certificate", domain],
    queryFn: async () => (await api.get(`/admin/nginx/certificate/status/${domain}`)).data,
    enabled: !!domain,
  });
}

export function useCertificateList() {
  return useQuery({
    queryKey: ["nginx", "certificates"],
    queryFn: async () => (await api.get<CertificateListResponse>("/admin/nginx/certificate/list")).data,
  });
}
