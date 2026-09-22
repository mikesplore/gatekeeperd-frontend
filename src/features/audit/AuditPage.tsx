import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCw, List, Table2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/components/QueryState";
import { AuditLogTimeline } from "@/features/audit/AuditLogTimeline";
import { useGlobalAuditLog } from "@/hooks/useProjects";
import { DataTable } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { AuditLogEntry } from "@/types/audit";

export function AuditPage() {
  const pageSize = 15;
  const [params, setParams] = useSearchParams();
  const page = Math.max(0, Number(params.get("page") ?? 0) || 0);
  const [view, setView] = useState<"timeline" | "table">("timeline");
  const search = params.get("q") ?? "";
  const action = params.get("action") ?? "";
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); value ? next.set(key, value) : next.delete(key); if (key !== "page") next.delete("page"); setParams(next); };
  const audit = useGlobalAuditLog(pageSize, page * pageSize, search, action);
  const actionLabel = (action: string) => action.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return <div className="space-y-6">
    <div><p className="text-muted-foreground">A chronological record of administrative and operational changes.</p></div>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Activity history</CardTitle>
        <div className="flex items-center gap-1"><Button variant={view === "timeline" ? "secondary" : "ghost"} size="sm" onClick={() => setView("timeline")}><List className="mr-1 h-4 w-4" />Timeline</Button><Button variant={view === "table" ? "secondary" : "ghost"} size="sm" onClick={() => setView("table")}><Table2 className="mr-1 h-4 w-4" />Table</Button><Button variant="ghost" size="icon" onClick={() => audit.refetch()} aria-label="Refresh audit history"><RefreshCw className="h-4 w-4" /></Button></div>
      </CardHeader>
      <CardContent><div className="mb-4 flex flex-col gap-2 sm:flex-row"><Input value={search} onChange={(event) => update("q", event.target.value)} placeholder="Search actor, action, or reason..." /><select value={action} onChange={(event) => update("action", event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">All actions</option>{["blocked", "unblocked", "payment_received", "manual_override", "project_created", "project_updated"].map(value => <option key={value} value={value}>{actionLabel(value)}</option>)}</select></div><QueryState isLoading={audit.isLoading} isError={audit.isError} error={audit.error} data={audit.data}>
        {(result) => result.entries.length ? view === "timeline" ? <AuditLogTimeline entries={result.entries} /> : <><AuditTable entries={result.entries} actionLabel={actionLabel} /><div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground"><span>{result.offset + 1}-{result.offset + result.entries.length} of {result.total}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 0 || audit.isFetching} onClick={() => update("page", String(page - 1))}>Previous</Button><Button size="sm" variant="outline" disabled={!result.hasMore || audit.isFetching} onClick={() => update("page", String(page + 1))}>Next</Button></div></div></> : <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p>}
      </QueryState></CardContent>
    </Card>
  </div>;
}

function AuditTable({ entries, actionLabel }: { entries: AuditLogEntry[]; actionLabel: (action: string) => string }) {
  return <DataTable data={entries} pageSize={15} getRowKey={(entry) => entry.id} searchPlaceholder="Search actor, action, or reason..." filters={[{ label: "Action", options: [...new Set(entries.map((entry) => entry.action))].map((value) => ({ label: actionLabel(value), value })), getValue: (entry) => entry.action }]} columns={[{ key: "action", header: "Action", searchable: true, searchValue: (entry) => `${entry.action} ${actionLabel(entry.action)}`, render: (entry) => <Badge variant="outline">{actionLabel(entry.action)}</Badge> }, { key: "actor", header: "Actor", searchable: true, searchValue: (entry) => entry.actor, render: (entry) => <span className="text-sm">{entry.actor}</span> }, { key: "project", header: "Project", searchable: true, searchValue: (entry) => entry.projectId ?? "", render: (entry) => <span className="font-mono text-xs">{entry.projectId ?? "System"}</span> }, { key: "reason", header: "Details", searchable: true, searchValue: (entry) => entry.reason ?? "", render: (entry) => <span className="block max-w-[28rem] truncate text-sm text-muted-foreground" title={entry.reason}>{entry.reason ?? "No details"}</span> }, { key: "created", header: "When", render: (entry) => <time className="whitespace-nowrap text-xs text-muted-foreground" dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time> }]} />;
}
