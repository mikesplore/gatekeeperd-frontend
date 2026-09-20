import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryState } from "@/components/QueryState";
import { GlobalActivityFeed } from "@/features/audit/GlobalActivityFeed";
import { ProjectsOverdue, ProjectsUpcoming, RevenueChart } from "@/features/dashboard/DashboardWidgets";
import { useRevenueReport } from "@/hooks/usePayments";
import { useDashboardSummary, useIntegrationOutbox, useProjects, useReplayIntegrationEvent } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function Breakdown({ values }: { values: Record<string, number> }) {
  const entries = Object.entries(values);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No data reported.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4 text-sm">
          <span className="capitalize text-muted-foreground">{label.replace(/_/g, " ")}</span>
          <span className="font-medium">{value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

interface StatCardsProps {
  projects: import("@/types/project").Project[];
  revenueThisMonth?: number;
  revenueLastMonth?: number;
  currency?: string;
}

export function StatCards({ projects, revenueThisMonth, revenueLastMonth, currency }: StatCardsProps) {
  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === "active").length;
    const blocked = projects.filter((p) => p.status === "blocked").length;
    const manualBlock = projects.filter((p) => p.status === "manual_block").length;
    return { total, active, blocked, manualBlock };
  }, [projects]);

  const revenueDelta =
    revenueThisMonth != null && revenueLastMonth != null && revenueLastMonth > 0
      ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
      : null;

  const items = [
    { label: "Total projects", value: stats.total },
    { label: "Active", value: stats.active, className: "text-emerald-600" },
    { label: "Blocked", value: stats.blocked, className: "text-red-600" },
    { label: "Manual block", value: stats.manualBlock, className: "text-amber-600" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{item.label}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <p className={`text-xl sm:text-3xl font-bold ${item.className ?? ""}`}>{item.value}</p>
          </CardContent>
        </Card>
      ))}
      {revenueThisMonth != null && (
        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Revenue this month</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <p className="text-xl sm:text-3xl font-bold">
              {currency} {revenueThisMonth.toLocaleString()}
            </p>
            {revenueDelta != null && (
              <p className={revenueDelta >= 0 ? "text-xs sm:text-sm text-emerald-600" : "text-xs sm:text-sm text-red-600"}>
                {revenueDelta >= 0 ? "+" : ""}
                {revenueDelta}% vs last month
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function DashboardOverviewPage() {
  const { data, isLoading, isError, error } = useProjects();
  const summaryQuery = useDashboardSummary();
  const revenueQuery = useRevenueReport(6);
  const outboxQuery = useIntegrationOutbox();
  const replayEvent = useReplayIntegrationEvent();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Operational overview across all projects.</p>
      </div>

      <QueryState
        isLoading={summaryQuery.isLoading}
        isError={summaryQuery.isError}
        error={summaryQuery.error}
        data={summaryQuery.data}
        loadingFallback={<Skeleton className="h-28 w-full" />}
      >
        {(summary) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Payment events</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{Object.values(summary.payments).reduce((a, b) => a + b, 0)}</p><p className="text-xs text-muted-foreground">Across all providers</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Scribed outbox</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{summary.integrations.outboxPending + summary.integrations.outboxProcessing}</p><p className="text-xs text-muted-foreground">{summary.integrations.outboxDeadLetter} dead-lettered</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Nginx sites</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{summary.nginx.enabledSites}/{summary.nginx.availableSites}</p><p className="text-xs text-muted-foreground">Enabled / available</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">This month</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{summary.revenue.thisMonth}</p><p className="text-xs text-muted-foreground">Revenue reported by backend</p></CardContent></Card>
            </div>
            <div className="grid gap-4 pt-4 lg:grid-cols-3">
              <Card>
                <CardHeader><CardTitle className="text-sm">Project status</CardTitle></CardHeader>
                <CardContent><Breakdown values={summary.projects} /></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Payment status</CardTitle></CardHeader>
                <CardContent><Breakdown values={summary.payments} /></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Integration delivery</CardTitle></CardHeader>
                <CardContent>
                  <Breakdown values={{
                    pending: summary.integrations.outboxPending,
                    processing: summary.integrations.outboxProcessing,
                    delivered: summary.integrations.outboxDelivered,
                    dead_letter: summary.integrations.outboxDeadLetter,
                  }} />
                </CardContent>
              </Card>
            </div>
            {Object.keys(summary.metrics).length > 0 && (
              <Card className="mt-4">
                <CardHeader><CardTitle className="text-sm">Backend metrics</CardTitle></CardHeader>
                <CardContent><Breakdown values={summary.metrics} /></CardContent>
              </Card>
            )}
            <Card className="mt-4">
              <CardHeader><CardTitle className="text-sm">Queued integration events</CardTitle></CardHeader>
              <CardContent>
                {outboxQuery.data?.length ? (
                  <div className="space-y-3">
                    {outboxQuery.data.map((event) => (
                      <div key={event.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{event.eventType}</p>
                          <p className="truncate font-mono text-xs text-muted-foreground">{event.idempotencyKey}</p>
                          <p className="text-xs text-muted-foreground">Attempts: {event.attempts}</p>
                        </div>
                        <Button size="sm" variant="outline" disabled={replayEvent.isPending} onClick={async () => {
                          try { await replayEvent.mutateAsync(event.id); toast.success("Event queued for replay"); }
                          catch { toast.error("Unable to replay event"); }
                        }}>Replay</Button>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No undelivered integration events.</p>}
              </CardContent>
            </Card>
          </>
        )}
      </QueryState>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={data}
        loadingFallback={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        }
      >
        {(projects) => (
          <>
            <StatCards
              projects={projects}
              revenueThisMonth={revenueQuery.data?.totalThisMonth}
              revenueLastMonth={revenueQuery.data?.totalLastMonth}
              currency={revenueQuery.data?.currency}
            />

            <QueryState
              isLoading={revenueQuery.isLoading}
              isError={revenueQuery.isError}
              error={revenueQuery.error}
              data={revenueQuery.data}
              loadingFallback={<Skeleton className="h-48 w-full" />}
            >
              {(revenue) => (
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue (last 6 months)</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <div className="min-w-[300px]">
                      <RevenueChart months={revenue.byMonth} currency={revenue.currency} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </QueryState>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <ProjectsUpcoming projects={projects} />
                <ProjectsOverdue />
              </div>
              <GlobalActivityFeed limit={20} />
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}
