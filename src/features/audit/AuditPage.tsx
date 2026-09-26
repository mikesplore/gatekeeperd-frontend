import { useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/components/QueryState";
import { useGlobalAuditLog } from "@/hooks/useProjects";
import { DataTable, type DataTableColumn, type DataTableFilter, type DataTableSortDirection } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import type { AuditLogEntry } from "@/types/audit";
import { Download } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import { toast } from "sonner";

export function AuditPage() {
  const pageSize = 15;
  const [params, setParams] = useSearchParams();
  const page = Math.max(0, Number(params.get("page") ?? 0) || 0);
  const search = params.get("q") ?? "";
  const action = params.get("action") ?? "";
  const sort = params.get("sort") ?? "createdAt";
  const direction: DataTableSortDirection = params.get("direction") === "asc" ? "asc" : "desc";
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); if (key !== "page") next.delete("page"); setParams(next); };
  const audit = useGlobalAuditLog(pageSize, page * pageSize, search, action, sort, direction);
  const actionLabel = (action: string) => action.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const columns: DataTableColumn<AuditLogEntry>[] = [
    { key: "action", header: "Action", searchable: true, searchValue: entry => actionLabel(entry.action), sortable: true, sortValue: entry => entry.action, render: entry => <Badge variant="outline">{actionLabel(entry.action)}</Badge> },
    { key: "actor", header: "Actor", searchable: true, searchValue: entry => entry.actor, sortable: true, sortValue: entry => entry.actor, render: entry => <span className="text-sm">{entry.actor}</span> },
    { key: "project", header: "Project", searchable: true, searchValue: entry => entry.projectId ?? "System", render: entry => <span className="font-mono text-xs">{entry.projectId ?? "System"}</span> },
    { key: "reason", header: "Details", searchable: true, searchValue: entry => entry.reason ?? "", render: entry => <span className="block max-w-[28rem] truncate text-sm text-muted-foreground" title={entry.reason}>{entry.reason ?? "No details"}</span> },
    { key: "createdAt", header: "When", sortable: true, sortValue: entry => new Date(entry.createdAt).getTime(), render: entry => <time className="whitespace-nowrap text-xs text-muted-foreground" dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time> },
  ];
  const filters: DataTableFilter<AuditLogEntry>[] = [{ label: "Action", options: ["blocked", "unblocked", "payment_received", "manual_override", "project_created", "project_updated"].map(value => ({ label: actionLabel(value), value })), getValue: entry => entry.action }];
  const updateSort = (sortBy: string | undefined, sortDirection: DataTableSortDirection | undefined) => {
    const next = new URLSearchParams(params);
    next.set("sort", sortBy ?? "createdAt");
    next.set("direction", sortDirection ?? "desc");
    next.delete("page");
    setParams(next);
  };
  return <div className="space-y-6">
    <div><p className="text-muted-foreground">A chronological record of administrative and operational changes.</p></div>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Activity history</CardTitle>
        <div className="flex gap-1"><Button variant="outline" size="sm" onClick={async () => { try { const response = await api.get<Blob>("/admin/audit/export", { params: { limit: 5000, action: action || undefined }, responseType: "blob" }); const url = URL.createObjectURL(response.data); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "gatekeeper-audit.csv"; anchor.click(); URL.revokeObjectURL(url); } catch (error) { toast.error(getApiErrorMessage(error)); } }}><Download className="mr-2 h-4 w-4"/>Export CSV</Button><Button variant="ghost" size="icon" onClick={() => audit.refetch()} aria-label="Refresh audit history"><RefreshCw className="h-4 w-4" /></Button></div>
      </CardHeader>
      <CardContent><QueryState isLoading={audit.isLoading} isError={audit.isError} error={audit.error} data={audit.data}>
        {(result) => <DataTable data={result.entries} columns={columns} filters={filters} getRowKey={entry => entry.id} mode="server" total={result.total} page={page} pageSize={pageSize} onPageChange={nextPage => update("page", String(nextPage))} search={{ value: search, onChange: value => update("q", value) }} searchPlaceholder="Search actor, action, or reason…" filterValues={{ Action: action }} onFilterChange={values => update("action", values.Action ?? "")} sortBy={sort} sortDirection={direction} onSortChange={updateSort} isLoading={audit.isFetching} />}
      </QueryState></CardContent>
    </Card>
  </div>;
}
