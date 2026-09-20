import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/components/QueryState";
import { AuditLogTimeline } from "@/features/audit/AuditLogTimeline";
import { useGlobalAuditLog } from "@/hooks/useProjects";

export function AuditPage() {
  const audit = useGlobalAuditLog(100);
  return <div className="space-y-6">
    <div><p className="text-muted-foreground">A chronological record of administrative and operational changes.</p></div>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Activity history</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => audit.refetch()} aria-label="Refresh audit history"><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent><QueryState isLoading={audit.isLoading} isError={audit.isError} error={audit.error} data={audit.data}>
        {(entries) => entries.length ? <AuditLogTimeline entries={entries} /> : <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p>}
      </QueryState></CardContent>
    </Card>
  </div>;
}
