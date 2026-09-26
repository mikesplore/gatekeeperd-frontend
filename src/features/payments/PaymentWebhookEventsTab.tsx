import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, getApiErrorMessage } from "@/lib/api";
import type { PaymentEvent } from "@/types/payment";

const PAGE_SIZE = 25;
type PaymentEventsResponse = { data: PaymentEvent[]; total: number; limit: number; offset: number; hasMore: boolean };

export function PaymentWebhookEventsTab() {
  const [status, setStatus] = useState("all");
  const [provider, setProvider] = useState("all");
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();
  const events = useQuery({
    queryKey: ["payment-events", provider, status, page],
    queryFn: async () => (await api.get<PaymentEventsResponse>("/admin/payment-events", { params: { provider: provider === "all" ? undefined : provider, status: status === "all" ? undefined : status, limit: PAGE_SIZE, offset: page * PAGE_SIZE } })).data,
  });
  const replay = useMutation({
    mutationFn: (id: string) => api.post(`/admin/payment-events/${id}/replay`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["payment-events"] });
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Webhook event replayed");
    },
    onError: error => toast.error(getApiErrorMessage(error)),
  });
  const toolbarContent = (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
      <Select value={provider} onValueChange={value => { setProvider(value); setPage(0); }}>
        <SelectTrigger className="h-9 w-full sm:w-[180px]"><SelectValue placeholder="Provider" /></SelectTrigger>
        <SelectContent><SelectItem value="all">All providers</SelectItem><SelectItem value="paystack">Paystack</SelectItem><SelectItem value="mpesa">M-Pesa</SelectItem></SelectContent>
      </Select>
      <Select value={status} onValueChange={value => { setStatus(value); setPage(0); }}>
        <SelectTrigger className="h-9 w-full sm:w-[180px]"><SelectValue placeholder="Event status" /></SelectTrigger>
        <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="received">Received</SelectItem><SelectItem value="processed">Processed</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent>
      </Select>
    </div>
  );

  return (
    <Card>
      <CardHeader><CardTitle>Webhook events</CardTitle></CardHeader>
      <CardContent className="pt-0">
        <DataTable
          data={events.data?.data ?? []}
          mode="server"
          total={events.data?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          isLoading={events.isLoading}
          loadingRows={5}
          getRowKey={event => event.id}
          emptyMessage="No webhook events found."
          toolbarContent={toolbarContent}
          columns={[
            { key: "provider", header: "Provider", render: event => <Badge variant="outline" className="capitalize">{event.provider === "mpesa" ? "M-Pesa" : event.provider}</Badge> },
            { key: "event", header: "Event", render: event => <span className="font-medium">{event.eventType}</span> },
            { key: "reference", header: "Reference", render: event => <span className="break-all font-mono text-xs">{event.paystackReference ?? "Not matched"}</span> },
            { key: "status", header: "Status", render: event => <Badge variant={event.processingStatus === "failed" ? "destructive" : event.processingStatus === "processed" ? "default" : "secondary"}>{event.processingStatus}</Badge> },
            { key: "attempts", header: "Attempts", render: event => event.processingAttempts },
            { key: "received", header: "Received", render: event => new Date(event.receivedAt).toLocaleString() },
            { key: "error", header: "Processing error", render: event => event.processingError ? <span className="text-xs text-destructive">{event.processingError}</span> : "—" },
            { key: "actions", header: "", render: event => event.provider === "paystack" && event.processingStatus === "failed" ? <Button size="sm" variant="outline" disabled={replay.isPending} onClick={() => replay.mutate(event.id)}><RotateCw className="mr-2 h-4 w-4" />Replay</Button> : null },
          ]}
        />
      </CardContent>
    </Card>
  );
}
