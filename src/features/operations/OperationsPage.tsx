import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryState } from "@/components/QueryState";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useDashboardSummary, useIntegrationOutbox, useReplayIntegrationEvent } from "@/hooks/useProjects";

function Breakdown({ values }: { values: Record<string, number> }) {
  const entries = Object.entries(values);
  return entries.length ? <div className="space-y-2">{entries.map(([key, value]) => <div key={key} className="flex justify-between text-sm"><span className="capitalize text-muted-foreground">{key.replace(/_/g, " ")}</span><span className="font-medium">{value.toLocaleString()}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No data reported.</p>;
}

export function OperationsPage() {
  const summary = useDashboardSummary();
  const outbox = useIntegrationOutbox();
  const replay = useReplayIntegrationEvent();

  return <div className="space-y-6">
    <p className="text-muted-foreground">Infrastructure, payment, and integration health.</p>
    <QueryState isLoading={summary.isLoading} isError={summary.isError} error={summary.error} data={summary.data} loadingFallback={<Skeleton className="h-64 w-full" />}>
      {(data) => <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Payment events</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{Object.values(data.payments).reduce((a, b) => a + b, 0)}</p><p className="text-xs text-muted-foreground">Across all providers</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Nginx sites</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{data.nginx.enabledSites}/{data.nginx.availableSites}</p><p className="text-xs text-muted-foreground">Enabled / available</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Outbox pending</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{data.integrations.outboxPending + data.integrations.outboxProcessing}</p><p className="text-xs text-muted-foreground">{data.integrations.outboxDeadLetter} dead-lettered</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Revenue this month</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{data.revenue.thisMonth}</p><p className="text-xs text-muted-foreground">Backend-reported</p></CardContent></Card>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card><CardHeader><CardTitle className="text-sm">Project status</CardTitle></CardHeader><CardContent><Breakdown values={data.projects} /></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Payment status</CardTitle></CardHeader><CardContent><Breakdown values={data.payments} /></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Integration delivery</CardTitle></CardHeader><CardContent><Breakdown values={{ pending: data.integrations.outboxPending, processing: data.integrations.outboxProcessing, delivered: data.integrations.outboxDelivered, dead_letter: data.integrations.outboxDeadLetter }} /></CardContent></Card>
        </div>
        {Object.keys(data.metrics).length > 0 && <Card><CardHeader><CardTitle className="text-sm">Backend metrics</CardTitle></CardHeader><CardContent><Breakdown values={data.metrics} /></CardContent></Card>}
      </>}
    </QueryState>
    <Card><CardHeader><CardTitle>Queued integration events</CardTitle></CardHeader><CardContent>{outbox.data?.length ? <div className="space-y-3">{outbox.data.map((event) => { const replaying = replay.isPending && replay.variables === event.id; return <div key={event.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm font-medium">{event.eventType}</p><p className="truncate font-mono text-xs text-muted-foreground">{event.idempotencyKey}</p><p className="text-xs text-muted-foreground">Attempts: {event.attempts}</p></div><Button size="sm" variant="outline" disabled={replay.isPending} onClick={async () => { try { await replay.mutateAsync(event.id); toast.success("Event replay completed"); } catch { toast.error("Unable to replay event"); } }}>{replaying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {replaying ? "Replaying…" : "Replay"}</Button></div>; })}</div> : <p className="text-sm text-muted-foreground">No undelivered integration events.</p>}</CardContent></Card>
  </div>;
}
