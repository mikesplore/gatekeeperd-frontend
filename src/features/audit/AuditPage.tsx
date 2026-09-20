import { useState } from "react";
import { RefreshCw, List, Table2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/components/QueryState";
import { AuditLogTimeline } from "@/features/audit/AuditLogTimeline";
import { useGlobalAuditLog } from "@/hooks/useProjects";
import { DataTable } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import type { AuditLogEntry } from "@/types/audit";

export function AuditPage() {
  const audit = useGlobalAuditLog(100);
  const [view, setView] = useState<"timeline" | "table">("timeline");
  const actionLabel = (action: string) => action.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return <div className="space-y-6">
    <div><p className="text-muted-foreground">A chronological record of administrative and operational changes.</p></div>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Activity history</CardTitle>
        <div className="flex items-center gap-1"><Button variant={view === "timeline" ? "secondary" : "ghost"} size="sm" onClick={() => setView("timeline")}><List className="mr-1 h-4 w-4" />Timeline</Button><Button variant={view === "table" ? "secondary" : "ghost"} size="sm" onClick={() => setView("table")}><Table2 className="mr-1 h-4 w-4" />Table</Button><Button variant="ghost" size="icon" onClick={() => audit.refetch()} aria-label="Refresh audit history"><RefreshCw className="h-4 w-4" /></Button></div>
      </CardHeader>
      <CardContent><QueryState isLoading={audit.isLoading} isError={audit.isError} error={audit.error} data={audit.data}>
        {(entries) => entries.length ? view === "timeline" ? <AuditLogTimeline entries={entries} /> : <AuditTable entries={entries} actionLabel={actionLabel} /> : <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p>}
      </QueryState></CardContent>
    </Card>
  </div>;
}

function AuditTable({ entries, actionLabel }: { entries: AuditLogEntry[]; actionLabel: (action: string) => string }) {
  return <DataTable data={entries} pageSize={15} getRowKey={(entry) => entry.id} searchPlaceholder="Search actor, action, or reason..." filters={[{ label: "Action", options: [...new Set(entries.map((entry) => entry.action))].map((value) => ({ label: actionLabel(value), value })), getValue: (entry) => entry.action }]} columns={[{ key: "action", header: "Action", searchable: true, searchValue: (entry) => `${entry.action} ${actionLabel(entry.action)}`, render: (entry) => <Badge variant="outline">{actionLabel(entry.action)}</Badge> }, { key: "actor", header: "Actor", searchable: true, searchValue: (entry) => entry.actor, render: (entry) => <span className="text-sm">{entry.actor}</span> }, { key: "project", header: "Project", searchable: true, searchValue: (entry) => entry.projectId ?? "", render: (entry) => <span className="font-mono text-xs">{entry.projectId ?? "System"}</span> }, { key: "reason", header: "Details", searchable: true, searchValue: (entry) => entry.reason ?? "", render: (entry) => <span className="block max-w-[28rem] truncate text-sm text-muted-foreground" title={entry.reason}>{entry.reason ?? "No details"}</span> }, { key: "created", header: "When", render: (entry) => <time className="whitespace-nowrap text-xs text-muted-foreground" dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time> }]} />;
}
