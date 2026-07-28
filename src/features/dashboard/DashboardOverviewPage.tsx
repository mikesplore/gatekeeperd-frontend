import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryState } from "@/components/QueryState";
import { GlobalActivityFeed } from "@/features/audit/GlobalActivityFeed";
import { ProjectsOverdue, ProjectsUpcoming, RevenueChart } from "@/features/dashboard/DashboardWidgets";
import { useRevenueReport } from "@/hooks/usePayments";
import { useProjects } from "@/hooks/useProjects";

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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${item.className ?? ""}`}>{item.value}</p>
          </CardContent>
        </Card>
      ))}
      {revenueThisMonth != null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue this month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {currency} {revenueThisMonth.toLocaleString()}
            </p>
            {revenueDelta != null && (
              <p className={revenueDelta >= 0 ? "text-sm text-emerald-600" : "text-sm text-red-600"}>
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
  const revenueQuery = useRevenueReport(6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Operational overview across all projects.</p>
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={data}
        loadingFallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  <CardContent>
                    <RevenueChart months={revenue.byMonth} currency={revenue.currency} />
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
