import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { QueryState } from "@/components/QueryState";
import { api, getApiErrorMessage } from "@/lib/api";

type DeploymentHistoryItem = {
  id: string; projectId: string; projectSlug: string; environment: string; sourceCommit?: string | null;
  imageName: string; imageTag: string; imageDigest?: string | null; trigger: string; status: string;
  createdAt: string; activeAt?: string | null; healthCheckResult: string; failureReason?: string | null;
  credentialSetId?: string | null; credentialSetVersion?: number | null; secretSetId?: string | null; secretSetVersion?: number | null;
};
type DeploymentHistoryPage = { items: DeploymentHistoryItem[]; total: number; limit: number; offset: number };

function statusClass(status: string) {
  switch (status.toLowerCase()) {
    case "failed": return "bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-400/30";
    case "active": return "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30";
    case "superseded": return "bg-slate-400/15 text-slate-300 ring-1 ring-inset ring-slate-300/25";
    default: return "bg-amber-500/15 text-amber-200 ring-1 ring-inset ring-amber-300/30";
  }
}

function DeploymentDetails({ item }: { item: DeploymentHistoryItem }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return <div ref={container} className="relative inline-block">
    <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(value => !value)} className="cursor-pointer text-xs font-medium text-primary hover:underline">Details</button>
    {open && <div role="dialog" aria-label="Deployment details" className="absolute right-0 z-20 mt-1 grid min-w-64 gap-1 rounded-md border bg-popover p-3 text-xs text-popover-foreground shadow-md">
      <p>Commit: {item.sourceCommit ?? "not recorded"}</p>
      <p>Digest: {item.imageDigest ?? "not recorded"}</p>
      <p>Readiness: {item.healthCheckResult}{item.failureReason ? ` · ${item.failureReason}` : ""}</p>
      <p>Credential: {item.credentialSetId ? `v${item.credentialSetVersion}` : "not recorded"}</p>
      <p>Secrets: {item.secretSetId ? `v${item.secretSetVersion}` : "not recorded"}</p>
    </div>}
  </div>;
}

export function DeploymentsPage() {
  const history = useQuery({
    queryKey: ["deployment-history"],
    queryFn: async () => (await api.get<DeploymentHistoryPage>("/admin/deployment-history", { params: { limit: 100, offset: 0 } })).data,
    refetchInterval: 10_000,
  });
  const columns: DataTableColumn<DeploymentHistoryItem>[] = [
    {
      key: "project",
      header: "Project",
      searchable: true,
      searchValue: item => `${item.projectSlug} ${item.imageName} ${item.imageTag}`,
      sortable: true,
      sortValue: item => item.projectSlug,
      render: item => <Link className="font-medium text-foreground hover:text-primary hover:underline" to={`/app/projects/${item.projectSlug}?tab=deployment`}>{item.projectSlug}</Link>,
    },
    {
      key: "image",
      header: "Image",
      searchable: true,
      searchValue: item => `${item.imageName}:${item.imageTag}`,
      sortable: true,
      sortValue: item => `${item.imageName}:${item.imageTag}`,
      render: item => <code className="block max-w-64 truncate text-xs text-foreground/90" title={`${item.imageName}:${item.imageTag}`}>{item.imageName}:{item.imageTag}</code>,
    },
    {
      key: "status",
      header: "Status",
      searchable: true,
      searchValue: item => item.status,
      sortable: true,
      sortValue: item => item.status,
      render: item => <span className={`inline-flex whitespace-nowrap rounded px-2 py-1 text-xs font-semibold capitalize ${statusClass(item.status)}`}>{item.status.replace(/_/g, " ")}</span>,
    },
    {
      key: "environment",
      header: "Environment",
      searchable: true,
      searchValue: item => `${item.environment} ${item.trigger}`,
      render: item => <div className="whitespace-nowrap text-foreground/90"><span>{item.environment}</span><span className="text-foreground/65"> · {item.trigger.replace(/_/g, " ")}</span></div>,
    },
    {
      key: "createdAt",
      header: "Timestamp",
      sortable: true,
      sortValue: item => new Date(item.createdAt).getTime(),
      render: item => <time className="whitespace-nowrap text-foreground/80" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>,
    },
    {
      key: "actions",
      header: "Actions",
      render: item => <DeploymentDetails item={item} />,
    },
  ];
  const statusOptions = [...new Set((history.data?.items ?? []).map(item => item.status))]
    .sort()
    .map(status => ({ label: status.replace(/_/g, " "), value: status }));

  return <div className="space-y-6">
    <Card>
      <CardHeader>
        <p className="text-sm text-foreground/70">Canonical deployment history across projects.</p>
      </CardHeader>
      <CardContent>
        <QueryState isLoading={history.isLoading} isError={history.isError} error={history.error} data={history.data}>
          {page => <DataTable
            data={page.items}
            columns={columns}
            getRowKey={item => item.id}
            filters={[{ label: "Status", options: statusOptions, getValue: item => item.status }]}
            searchPlaceholder="Search projects or images…"
            emptyMessage="No deployments match your search."
          />}
        </QueryState>
      </CardContent>
    </Card>
    {history.isError && <p className="text-sm text-destructive">{getApiErrorMessage(history.error)}</p>}
  </div>;
}
