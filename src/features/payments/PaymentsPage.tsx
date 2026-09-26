import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryState } from "@/components/QueryState";
import { useAllPayments, useRevenueReport } from "@/hooks/usePayments";
import { useProjects } from "@/hooks/useProjects";
import type { GatewayStatus, RevenueReport } from "@/types/payment";
import { PaymentsTable } from "./PaymentsTable";
import { PaymentWebhookEventsTab } from "./PaymentWebhookEventsTab";

const PAGE_SIZE = 50;
const CHART_WIDTH = 800;
const CHART_HEIGHT = 260;
const CHART_PADDING = 36;

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "abandoned", label: "Abandoned" },
  { value: "reversed", label: "Reversed" },
];

export function PaymentsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "all";
  const projectSlug = params.get("project") ?? "all";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const offset = Math.max(0, Number(params.get("offset") ?? 0) || 0);
  const update = (key: string, value: string, resetOffset = true) => {
    const next = new URLSearchParams(params);
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    if (resetOffset) next.delete("offset");
    setParams(next);
  };
  const filters = useMemo(() => ({
    status: status === "all" ? undefined : status as GatewayStatus,
    projectSlug: projectSlug === "all" ? undefined : projectSlug,
    from: from || undefined,
    to: to || undefined,
    limit: PAGE_SIZE,
    offset,
  }), [status, projectSlug, from, to, offset]);
  const payments = useAllPayments(filters);
  const revenue = useRevenueReport(6);
  const { data: projects } = useProjects();
  const total = payments.data?.total ?? 0;
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + PAGE_SIZE, total);

  const filterControls = (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
      <Select value={status} onValueChange={value => update("status", value)}>
        <SelectTrigger className="h-9 w-full sm:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>{STATUS_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={projectSlug} onValueChange={value => update("project", value)}>
        <SelectTrigger className="h-9 w-full sm:w-[220px]"><SelectValue placeholder="Project" /></SelectTrigger>
        <SelectContent><SelectItem value="all">All projects</SelectItem>{projects?.map(project => <SelectItem key={project.id} value={project.slug}>{project.name}</SelectItem>)}</SelectContent>
      </Select>
      <Input type="date" value={from} onChange={event => update("from", event.target.value)} className="h-9 w-full sm:w-[160px]" aria-label="From date" />
      <Input type="date" value={to} onChange={event => update("to", event.target.value)} className="h-9 w-full sm:w-[160px]" aria-label="To date" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">Payment performance, transaction history, and provider callbacks.</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="overview" className="flex-1 sm:flex-none">Overview</TabsTrigger>
            <TabsTrigger value="payments" className="flex-1 sm:flex-none">Payments</TabsTrigger>
            <TabsTrigger value="events" className="flex-1 sm:flex-none">Webhook events</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <QueryState isLoading={revenue.isLoading} isError={revenue.isError} error={revenue.error} data={revenue.data}>
            {report => <PaymentsOverview report={report} />}
          </QueryState>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader><CardTitle>All payments</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <QueryState isLoading={payments.isLoading} isError={payments.isError} error={payments.error} data={payments.data}>
                {result => <>
                  <PaymentsTable payments={result.payments} toolbarContent={filterControls} />
                  {total > 0 && <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-center text-muted-foreground sm:text-left">{rangeStart}–{rangeEnd} of {total}</p>
                    <div className="flex justify-center gap-2">
                      <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => update("offset", String(Math.max(0, offset - PAGE_SIZE)), false)}>Prev</Button>
                      <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => update("offset", String(offset + PAGE_SIZE), false)}>Next</Button>
                    </div>
                  </div>}
                </>}
              </QueryState>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events"><PaymentWebhookEventsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function PaymentsOverview({ report }: { report: RevenueReport }) {
  const stats = [
    { label: "Total payments", value: report.totalPayments.toLocaleString() },
    { label: "Successful payments", value: report.successfulPayments.toLocaleString() },
    { label: "Pending payments", value: report.pendingPayments.toLocaleString() },
    { label: "Failed payments", value: report.failedPayments.toLocaleString() },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(stat => <Card key={stat.label}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stat.value}</CardContent></Card>)}
      </div>
      <Card>
        <CardHeader><CardTitle>Revenue over time</CardTitle><p className="text-sm text-muted-foreground">Successful payment totals by month · {report.currency}</p></CardHeader>
        <CardContent><RevenueLineGraph data={report} /></CardContent>
      </Card>
    </div>
  );
}

function RevenueLineGraph({ data }: { data: RevenueReport }) {
  const values = data.byMonth;
  if (values.length === 0) return <div className="flex min-h-[260px] items-center justify-center text-sm text-muted-foreground">No successful payment data for this period yet.</div>;
  const max = Math.max(...values.map(item => item.amount), 1);
  const drawableWidth = CHART_WIDTH - CHART_PADDING * 2;
  const drawableHeight = CHART_HEIGHT - CHART_PADDING * 2;
  const points = values.map((item, index) => ({
    x: CHART_PADDING + (values.length === 1 ? drawableWidth / 2 : index * drawableWidth / (values.length - 1)),
    y: CHART_HEIGHT - CHART_PADDING - item.amount / max * drawableHeight,
    month: item.month,
  }));
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  return (
    <div className="w-full overflow-hidden">
      <svg className="h-[260px] w-full overflow-visible" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label="Monthly successful payment revenue line chart" preserveAspectRatio="none">
        <line x1={CHART_PADDING} y1={CHART_HEIGHT - CHART_PADDING} x2={CHART_WIDTH - CHART_PADDING} y2={CHART_HEIGHT - CHART_PADDING} className="stroke-border" />
        <line x1={CHART_PADDING} y1={CHART_PADDING} x2={CHART_PADDING} y2={CHART_HEIGHT - CHART_PADDING} className="stroke-border" />
        <path d={path} fill="none" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => <circle key={point.month} cx={point.x} cy={point.y} r="4" className="fill-primary"><title>{`${point.month}: ${data.currency} ${values[index].amount.toLocaleString()}`}</title></circle>)}
      </svg>
      <div className="mt-2 flex justify-between gap-2 text-xs text-muted-foreground">{points.map(point => <span key={point.month}>{new Date(`${point.month}-01T00:00:00`).toLocaleDateString(undefined, { month: "short", year: "2-digit" })}</span>)}</div>
    </div>
  );
}
