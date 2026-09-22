import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryState } from "@/components/QueryState";
import { toast } from "sonner";
import { Loader2, RotateCw, Trash2 } from "lucide-react";
import { useDashboardSummary, useIntegrationOutbox, useReplayIntegrationEvent } from "@/hooks/useProjects";
import { api, getApiErrorMessage } from "@/lib/api";
import type { PaymentEvent } from "@/types/payment";

function Breakdown({ values }: { values: Record<string, number> }) {
  const entries = Object.entries(values);
  return entries.length ? <div className="space-y-2">{entries.map(([key, value]) => <div key={key} className="flex justify-between text-sm"><span className="capitalize text-muted-foreground">{key.replace(/_/g, " ")}</span><span className="font-medium">{value.toLocaleString()}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No data reported.</p>;
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
        {data.certificateAlerts?.length ? <Card><CardHeader><CardTitle className="text-sm">Certificate alerts</CardTitle></CardHeader><CardContent><div className="space-y-2 text-sm">{data.certificateAlerts.map(alert => <p key={alert} className="text-orange-700">{alert}</p>)}</div></CardContent></Card> : null}
      </>}
    </QueryState>
    <Card><CardHeader><CardTitle className="flex items-center justify-between">Failed Paystack webhook events <Button size="sm" variant="outline" asChild><Link to="/app/payments/events">View payment events</Link></Button></CardTitle></CardHeader><CardContent>{paymentEvents.isLoading ? <p className="text-sm text-muted-foreground">Loading failed events…</p> : paymentEvents.isError ? <p className="text-sm text-destructive">Unable to load payment events.</p> : (paymentEvents.data?.data?.length ?? 0) > 0 ? <div className="space-y-3">{paymentEvents.data?.data?.map(event => <div key={event.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-medium text-sm">{event.eventType} · {event.paystackReference}</p><p className="text-xs text-muted-foreground">{event.processingError || "Processing failed"} · {new Date(event.receivedAt).toLocaleString()}</p></div><Button size="sm" variant="outline" disabled={replayPayment.isPending} onClick={async () => { try { await replayPayment.mutateAsync(event.id); toast.success("Webhook event replayed"); } catch (error) { toast.error(getApiErrorMessage(error)); } }}><RotateCw className="mr-2 h-4 w-4" />Replay</Button></div>)}</div> : <p className="text-sm text-muted-foreground">No failed webhook events.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Docker image cleanup</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Review unreferenced project images, then remove the candidates to reclaim disk space.</p><div className="flex flex-col gap-2 sm:flex-row"><input value={imagePrefix} onChange={event => setImagePrefix(event.target.value)} placeholder="Optional image name prefix" className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"/><Button variant="outline" disabled={prune.isPending} onClick={async () => { try { const result = await prune.mutateAsync(true); setPrunePreview(result); toast.success(`Found ${result.removed.length} removable images`); } catch (error) { toast.error(getApiErrorMessage(error)); } }}><Trash2 className="mr-2 h-4 w-4"/>Preview cleanup</Button></div>{prunePreview && <div className="space-y-3 rounded-md border p-3"><p className="text-sm font-medium">{prunePreview.removed.length} candidates · {(prunePreview.reclaimedBytes / 1024 / 1024).toFixed(1)} MB</p>{prunePreview.removed.length > 0 && <ul className="max-h-32 space-y-1 overflow-auto text-xs text-muted-foreground">{prunePreview.removed.map(item => <li key={item.reference} className="truncate">{item.reference}</li>)}</ul>}<Button variant="destructive" disabled={prune.isPending || prunePreview.removed.length === 0} onClick={async () => { if (!window.confirm(`Remove ${prunePreview.removed.length} unreferenced images?`)) return; try { const result = await prune.mutateAsync(false); setPrunePreview(null); toast.success(`Removed ${result.removed.length} images`); } catch (error) { toast.error(getApiErrorMessage(error)); } }}>{prune.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}Remove previewed images</Button></div>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Queued integration events</CardTitle></CardHeader><CardContent>{outbox.data?.length ? <div className="space-y-3">{outbox.data.map((event) => { const replaying = replay.isPending && replay.variables === event.id; return <div key={event.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm font-medium">{event.eventType}</p><p className="truncate font-mono text-xs text-muted-foreground">{event.idempotencyKey}</p><p className="text-xs text-muted-foreground">Attempts: {event.attempts}</p></div><Button size="sm" variant="outline" disabled={replay.isPending} onClick={async () => { try { await replay.mutateAsync(event.id); toast.success("Event replay completed"); } catch { toast.error("Unable to replay event"); } }}>{replaying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {replaying ? "Replaying…" : "Replay"}</Button></div>; })}</div> : <p className="text-sm text-muted-foreground">No undelivered integration events.</p>}</CardContent></Card>
  </div>;
}
