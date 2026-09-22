import { useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/components/QueryState";
import { useGlobalAuditLog } from "@/hooks/useProjects";
import { DataTable } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  const direction = (params.get("direction") as "asc" | "desc" | null) ?? "desc";
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); if (key !== "page") next.delete("page"); setParams(next); };
  const audit = useGlobalAuditLog(pageSize, page * pageSize, search, action, sort, direction);
  const actionLabel = (action: string) => action.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return <div className="space-y-6">
    <div><p className="text-muted-foreground">A chronological record of administrative and operational changes.</p></div>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Activity history</CardTitle>
        <div className="flex gap-1"><Button variant="outline" size="sm" onClick={async () => { try { const response = await api.get<Blob>("/admin/audit/export", { params: { limit: 5000, action: action || undefined }, responseType: "blob" }); const url = URL.createObjectURL(response.data); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "gatekeeper-audit.csv"; anchor.click(); URL.revokeObjectURL(url); } catch (error) { toast.error(getApiErrorMessage(error)); } }}><Download className="mr-2 h-4 w-4"/>Export CSV</Button><Button variant="ghost" size="icon" onClick={() => audit.refetch()} aria-label="Refresh audit history"><RefreshCw className="h-4 w-4" /></Button></div>
      </CardHeader>
      <div className="flex items-center gap-2 px-6 pt-4"><span className="text-xs text-muted-foreground">Sort by</span><select value={sort} onChange={(event) => update("sort", event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="createdAt">Date</option><option value="action">Action</option><option value="actor">Actor</option></select><Button variant="outline" size="sm" onClick={() => update("direction", direction === "asc" ? "desc" : "asc")}>{direction === "asc" ? "Ascending ↑" : "Descending ↓"}</Button></div>
      <CardContent><div className="mb-4 flex flex-col gap-2 sm:flex-row"><Input value={search} onChange={(event) => update("q", event.target.value)} placeholder="Search actor, action, or reason..." /><select value={action} onChange={(event) => update("action", event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">All actions</option>{["blocked", "unblocked", "payment_received", "manual_override", "project_created", "project_updated"].map(value => <option key={value} value={value}>{actionLabel(value)}</option>)}</select></div><QueryState isLoading={audit.isLoading} isError={audit.isError} error={audit.error} data={audit.data}>
        {(result) => result.entries.length ? <><AuditTable entries={result.entries} actionLabel={actionLabel} /><div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground"><span>{result.offset + 1}-{result.offset + result.entries.length} of {result.total}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 0 || audit.isFetching} onClick={() => update("page", String(page - 1))}>Previous</Button><Button size="sm" variant="outline" disabled={!result.hasMore || audit.isFetching} onClick={() => update("page", String(page + 1))}>Next</Button></div></div></> : <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p>}
      </QueryState></CardContent>
    </Card>
  </div>;
}

function AuditTable({ entries, actionLabel }: { entries: AuditLogEntry[]; actionLabel: (action: string) => string }) {
  return <DataTable data={entries} hideToolbar hidePagination getRowKey={(entry) => entry.id} columns={[{ key: "action", header: "Action", render: (entry) => <Badge variant="outline">{actionLabel(entry.action)}</Badge> }, { key: "actor", header: "Actor", render: (entry) => <span className="text-sm">{entry.actor}</span> }, { key: "project", header: "Project", render: (entry) => <span className="font-mono text-xs">{entry.projectId ?? "System"}</span> }, { key: "reason", header: "Details", render: (entry) => <span className="block max-w-[28rem] truncate text-sm text-muted-foreground" title={entry.reason}>{entry.reason ?? "No details"}</span> }, { key: "created", header: "When", render: (entry) => <time className="whitespace-nowrap text-xs text-muted-foreground" dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time> }]} />;
}
