import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, Boxes, CreditCard, Loader2, RefreshCw, RotateCw, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryState } from "@/components/QueryState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useDashboardSummary, useIntegrationOutbox, useReplayIntegrationEvent } from "@/hooks/useProjects";
import { api, getApiErrorMessage } from "@/lib/api";
import type { PaymentEvent } from "@/types/payment";

function Breakdown({ values }: { values: Record<string, number> }) {
  const entries = Object.entries(values);
  return entries.length ? <div className="divide-y">{entries.map(([key, value]) => <div key={key} className="flex justify-between gap-4 py-2 text-sm first:pt-0 last:pb-0"><span className="capitalize text-muted-foreground">{key.replace(/_/g, " ")}</span><span className="font-medium tabular-nums">{value.toLocaleString()}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No data reported.</p>;
}

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>;
}

export function OperationsPage() {
  const qc = useQueryClient();
  const [imagePrefix, setImagePrefix] = useState("");
  const [prunePreview, setPrunePreview] = useState<{ removed: { reference: string; sizeBytes: number; reason: string }[]; reclaimedBytes: number } | null>(null);
  const summary = useDashboardSummary();
  const outbox = useIntegrationOutbox();
  const replay = useReplayIntegrationEvent();
  const paymentEvents = useQuery({ queryKey: ["payment-events", "failed"], queryFn: async () => (await api.get<{ data: PaymentEvent[]; total: number; limit: number; offset: number; hasMore: boolean }>("/admin/payment-events", { params: { status: "failed", limit: 25 } })).data });
  const replayPayment = useMutation({ mutationFn: (id: string) => api.post(`/admin/payment-events/${id}/replay`), onSuccess: () => { void qc.invalidateQueries({ queryKey: ["payment-events"] }); void qc.invalidateQueries({ queryKey: ["payments"] }); } });
  const prune = useMutation({ mutationFn: async (dryRun: boolean) => (await api.post<{ dryRun: boolean; inspected: number; removed: { reference: string; sizeBytes: number; reason: string }[]; reclaimedBytes: number }>("/admin/system/prune", null, { params: { dryRun, imagePrefix: imagePrefix || undefined } })).data });

  return <div className="space-y-6">
    <p className="text-muted-foreground">Infrastructure, payment, and integration health.</p>
    <Tabs defaultValue="overview" className="space-y-4">
      <div className="-mx-1 overflow-x-auto px-1">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview" className="flex-1 sm:flex-none">Overview</TabsTrigger>
          <TabsTrigger value="payments" className="flex-1 sm:flex-none">Payments</TabsTrigger>
          <TabsTrigger value="integrations" className="flex-1 sm:flex-none">Integrations</TabsTrigger>
          <TabsTrigger value="infrastructure" className="flex-1 sm:flex-none">Infrastructure</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview">
        <QueryState isLoading={summary.isLoading} isError={summary.isError} error={summary.error} data={summary.data} loadingFallback={<Skeleton className="h-64 w-full" />}>
          {data => <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Payment events" value={Object.values(data.payments).reduce((a, b) => a + b, 0)} detail="Across all providers" />
              <MetricCard label="Revenue this month" value={data.revenue.thisMonth} detail="Backend-reported" />
              <MetricCard label="Integration queue" value={data.integrations.outboxPending + data.integrations.outboxProcessing} detail={`${data.integrations.outboxDeadLetter} dead-lettered`} />
              <MetricCard label="Nginx sites" value={`${data.nginx.enabledSites}/${data.nginx.availableSites}`} detail="Enabled / available" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card><CardHeader><CardTitle className="text-base">Project status</CardTitle><CardDescription>Current project lifecycle counts.</CardDescription></CardHeader><CardContent><Breakdown values={data.projects} /></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Payment status</CardTitle><CardDescription>Payment state across all providers.</CardDescription></CardHeader><CardContent><Breakdown values={data.payments} /></CardContent></Card>
            </div>
            {Object.keys(data.metrics).length > 0 && <Card><CardHeader><CardTitle className="text-base">Backend worker metrics</CardTitle><CardDescription>Recent background job runs reported by the service.</CardDescription></CardHeader><CardContent><Breakdown values={data.metrics} /></CardContent></Card>}
          </div>}
        </QueryState>
      </TabsContent>

      <TabsContent value="payments">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Failed Paystack webhook events</CardTitle><CardDescription className="mt-1">Inspect and replay payment events that failed processing.</CardDescription></div><Button size="sm" variant="outline" asChild><Link to="/app/payments/events">View all events</Link></Button></CardHeader>
          <CardContent>
            {paymentEvents.isLoading ? <p className="text-sm text-muted-foreground">Loading failed events…</p> : paymentEvents.isError ? <p className="text-sm text-destructive">Unable to load payment events.</p> : (paymentEvents.data?.data?.length ?? 0) > 0 ? <div className="divide-y">{paymentEvents.data?.data?.map(event => <div key={event.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 space-y-1"><p className="font-medium text-sm">{event.eventType} <span className="text-muted-foreground">·</span> {event.paystackReference}</p><p className="text-xs text-muted-foreground">{event.processingError || "Processing failed"}</p><p className="text-xs text-muted-foreground">Received {new Date(event.receivedAt).toLocaleString()}</p></div><Button size="sm" variant="outline" className="shrink-0 self-start sm:self-auto" disabled={replayPayment.isPending} onClick={async () => { try { await replayPayment.mutateAsync(event.id); toast.success("Webhook event replayed"); } catch (error) { toast.error(getApiErrorMessage(error)); } }}><RotateCw className="h-4 w-4" />Replay</Button></div>)}</div> : <div className="flex min-h-44 flex-col items-center justify-center text-center"><p className="font-medium">No failed webhook events</p><p className="mt-1 text-sm text-muted-foreground">Failed Paystack events will appear here.</p></div>}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="integrations">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
          <Card><CardHeader><CardTitle>Delivery status</CardTitle><CardDescription>Current integration outbox counts.</CardDescription></CardHeader><CardContent>{outbox.isLoading ? <p className="text-sm text-muted-foreground">Loading delivery status…</p> : outbox.isError ? <p className="text-sm text-destructive">Unable to load integration events.</p> : <Breakdown values={{ pending: summary.data?.integrations.outboxPending ?? 0, processing: summary.data?.integrations.outboxProcessing ?? 0, delivered: summary.data?.integrations.outboxDelivered ?? 0, dead_letter: summary.data?.integrations.outboxDeadLetter ?? 0 }} />}</CardContent></Card>
          <Card><CardHeader><CardTitle>Queued integration events</CardTitle><CardDescription>Events waiting for delivery or retry.</CardDescription></CardHeader><CardContent>{outbox.isLoading ? <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> : outbox.isError ? <p className="text-sm text-destructive">Unable to load queued integration events.</p> : outbox.data?.length ? <div className="divide-y">{outbox.data.map(event => { const replaying = replay.isPending && replay.variables === event.id; return <div key={event.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 space-y-1"><p className="text-sm font-medium">{event.eventType}</p><p className="break-all font-mono text-xs text-muted-foreground">{event.idempotencyKey}</p><p className="text-xs text-muted-foreground">Attempts: {event.attempts}</p></div><Button size="sm" variant="outline" className="shrink-0 self-start sm:self-auto" disabled={replay.isPending} onClick={async () => { try { await replay.mutateAsync(event.id); toast.success("Event replay completed"); } catch { toast.error("Unable to replay event"); } }}>{replaying && <Loader2 className="h-4 w-4 animate-spin" />}{replaying ? "Replaying…" : "Replay"}</Button></div>; })}</div> : <div className="flex min-h-44 flex-col items-center justify-center text-center"><p className="font-medium">No queued integration events</p><p className="mt-1 text-sm text-muted-foreground">Pending or retryable events will appear here.</p></div>}</CardContent></Card>
        </div>
      </TabsContent>

      <TabsContent value="infrastructure">
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <QueryState isLoading={summary.isLoading} isError={summary.isError} error={summary.error} data={summary.data} loadingFallback={<Skeleton className="h-48 w-full" />}>
            {data => <div className="space-y-4"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Boxes className="h-5 w-5" />Nginx sites</CardTitle><CardDescription>Enabled sites compared with available configurations.</CardDescription></CardHeader><CardContent className="flex items-end justify-between gap-4"><div><p className="text-3xl font-semibold tabular-nums">{data.nginx.enabledSites}<span className="text-muted-foreground">/{data.nginx.availableSites}</span></p><p className="mt-1 text-xs text-muted-foreground">Enabled / available</p></div><Button variant="outline" size="sm" asChild><Link to="/app/nginx">Manage sites</Link></Button></CardContent></Card>{data.certificateAlerts?.length ? <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-600" />Certificate alerts</CardTitle></CardHeader><CardContent><div className="space-y-2 text-sm">{data.certificateAlerts.map(alert => <p key={alert} className="text-orange-700 dark:text-orange-400">{alert}</p>)}</div></CardContent></Card> : null}</div>}
          </QueryState>

          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5" />Docker image cleanup</CardTitle><CardDescription>Review unreferenced project images and reclaim disk space.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-1.5"><label htmlFor="image-prefix" className="text-sm font-medium">Optional image name prefix</label><Input id="image-prefix" value={imagePrefix} onChange={event => setImagePrefix(event.target.value)} placeholder="e.g. registry.example.com/team/" /></div><Button variant="outline" disabled={prune.isPending} onClick={async () => { try { const result = await prune.mutateAsync(true); setPrunePreview(result); toast.success(`Found ${result.removed.length} removable images`); } catch (error) { toast.error(getApiErrorMessage(error)); } }}><RefreshCw className="h-4 w-4" />Preview cleanup</Button>{prunePreview && <div className="space-y-3 rounded-lg border p-4"><p className="text-sm font-medium">{prunePreview.removed.length} candidates <span className="text-muted-foreground">· {(prunePreview.reclaimedBytes / 1024 / 1024).toFixed(1)} MB reclaimable</span></p>{prunePreview.removed.length > 0 && <ul className="max-h-40 space-y-1 overflow-auto text-xs text-muted-foreground">{prunePreview.removed.map(item => <li key={item.reference} className="truncate" title={item.reference}>{item.reference}</li>)}</ul>}<Button variant="destructive" disabled={prune.isPending || prunePreview.removed.length === 0} onClick={async () => { if (!window.confirm(`Remove ${prunePreview.removed.length} unreferenced images?`)) return; try { const result = await prune.mutateAsync(false); setPrunePreview(null); toast.success(`Removed ${result.removed.length} images`); } catch (error) { toast.error(getApiErrorMessage(error)); } }}>{prune.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Remove previewed images</Button></div>}</CardContent></Card>
        </div>
      </TabsContent>
    </Tabs>
  </div>;
}
