import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { QueryState } from "@/components/QueryState";
import { api, getApiErrorMessage } from "@/lib/api";

type DeploymentHistoryItem = {
  id: string; projectId: string; projectSlug: string; environment: string; sourceCommit?: string | null;
  imageName: string; imageTag: string; imageDigest?: string | null; trigger: string; status: string;
  createdAt: string; activeAt?: string | null; healthCheckResult: string; failureReason?: string | null;
  credentialSetId?: string | null; credentialSetVersion?: number | null; secretSetId?: string | null; secretSetVersion?: number | null; canRedeploy: boolean;
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
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 288;
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
      const roomBelow = window.innerHeight - rect.bottom;
      const top = roomBelow > 200 ? rect.bottom + 4 : Math.max(8, rect.top - 180);
      setPosition({ top, left });
    };
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!trigger.current?.contains(target) && !panel.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return <>
    <button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(value => !value)} className="cursor-pointer text-xs font-medium text-primary hover:underline">Details</button>
    {open && position && createPortal(
      <div ref={panel} role="dialog" aria-label="Deployment details" tabIndex={-1} style={{ top: position.top, left: position.left }} className="fixed z-[100] grid w-72 gap-1 rounded-md border bg-popover p-3 text-xs text-popover-foreground shadow-lg">
        <p>Commit: {item.sourceCommit ?? "not recorded"}</p>
        <p>Digest: {item.imageDigest ?? "not recorded"}</p>
        <p>Readiness: {item.healthCheckResult}{item.failureReason ? ` · ${item.failureReason}` : ""}</p>
        <p>Credential: {item.credentialSetId ? `v${item.credentialSetVersion}` : "not recorded"}</p>
        <p>Secrets: {item.secretSetId ? `v${item.secretSetVersion}` : "not recorded"}</p>
      </div>,
      document.body,
    )}
  </>;
}

export function DeploymentsPage() {
  const queryClient = useQueryClient();
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
      render: item => <div className="flex items-center gap-3">{item.canRedeploy && <Button size="sm" variant={item.status.toLowerCase() === "failed" ? "default" : "outline"} onClick={async () => { try { await api.post(`/admin/projects/${encodeURIComponent(item.projectSlug)}/deployments/${item.id}/redeploy`); toast.success(item.status.toLowerCase() === "failed" ? "Retry queued" : "Redeployment queued"); await queryClient.invalidateQueries({ queryKey: ["deployment-history"] }); } catch (error) { toast.error(getApiErrorMessage(error)); } }}><Rocket className="h-4 w-4" />{item.status.toLowerCase() === "failed" ? "Retry" : "Redeploy"}</Button>}<DeploymentDetails item={item} /></div>,
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
