import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import { toast } from "sonner";
import { api, getApiErrorMessage } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentEvent } from "@/types/payment";

const PAGE_SIZE = 50;

export function PaymentEventsPage() {
  const [status, setStatus] = useState("all");
  const [offset, setOffset] = useState(0);
  const queryClient = useQueryClient();
  const events = useQuery({ queryKey: ["payment-events", status, offset], queryFn: async () => (await api.get<{ data: PaymentEvent[]; total: number; limit: number; offset: number; hasMore: boolean }>("/admin/payment-events", { params: { status: status === "all" ? undefined : status, limit: PAGE_SIZE, offset } })).data });
  const replay = useMutation({ mutationFn: (id: string) => api.post(`/admin/payment-events/${id}/replay`), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["payment-events"] }); await queryClient.invalidateQueries({ queryKey: ["payments"] }); } });
  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><p className="text-sm text-muted-foreground">Paystack webhook delivery and processing history. Failed events can be replayed after the underlying issue is resolved.</p><select className="h-9 rounded-md border bg-background px-3 text-sm" value={status} onChange={event => { setStatus(event.target.value); setOffset(0); }}><option value="all">All statuses</option><option value="failed">Failed</option><option value="processed">Processed</option><option value="pending">Pending</option></select></div>
    <Card><CardHeader><CardTitle>Webhook events</CardTitle></CardHeader><CardContent>{events.isLoading ? <p className="text-sm text-muted-foreground">Loading events…</p> : events.isError ? <p className="text-sm text-destructive">Could not load payment events.</p> : events.data?.data?.length ? <><div className="space-y-3">{events.data.data.map(event => <div key={event.id} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium text-sm">{event.eventType}</p><Badge variant={event.processingStatus === "failed" ? "destructive" : "outline"}>{event.processingStatus}</Badge></div><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{event.paystackReference}</p><p className="mt-1 text-xs text-muted-foreground">Received {new Date(event.receivedAt).toLocaleString()} · {event.processingAttempts} attempts{event.processedAt ? ` · processed ${new Date(event.processedAt).toLocaleString()}` : ""}</p>{event.processingError && <p className="mt-1 text-xs text-destructive">{event.processingError}</p>}</div>{event.processingStatus === "failed" && <Button size="sm" variant="outline" disabled={replay.isPending} onClick={async () => { try { await replay.mutateAsync(event.id); toast.success("Webhook event replayed"); } catch (error) { toast.error(getApiErrorMessage(error)); } }}><RotateCw className="mr-2 h-4 w-4"/>Replay</Button>}</div>)}</div><div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground"><span>{events.data.offset + 1}–{events.data.offset + events.data.data.length} of {events.data.total}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</Button><Button size="sm" variant="outline" disabled={!events.data.hasMore} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</Button></div></div></> : <p className="py-8 text-center text-sm text-muted-foreground">No payment events found.</p>}</CardContent></Card>
  </div>;
}
