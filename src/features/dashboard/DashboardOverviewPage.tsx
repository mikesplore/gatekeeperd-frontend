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
    <div className="grid grid-cols-2 gap-[clamp(0.5rem,1.5vw,1rem)] sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="p-[clamp(0.75rem,1.5vw,1rem)] pb-1">
            <CardTitle className="truncate text-sm font-medium text-foreground/75">{item.label}</CardTitle>
          </CardHeader>
          <CardContent className="p-[clamp(0.75rem,1.5vw,1rem)] pt-0">
            <p className={`text-[clamp(1rem,2.5vw,1.5rem)] font-bold ${item.className ?? ""}`}>{item.value}</p>
          </CardContent>
        </Card>
      ))}
      {revenueThisMonth != null && (
        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="p-[clamp(0.75rem,1.5vw,1rem)] pb-1">
            <CardTitle className="truncate text-sm font-medium text-foreground/75">Revenue this month</CardTitle>
          </CardHeader>
          <CardContent className="p-[clamp(0.75rem,1.5vw,1rem)] pt-0">
            <p className="text-[clamp(1rem,2.5vw,1.5rem)] font-bold">
              {currency} {revenueThisMonth.toLocaleString()}
            </p>
            {revenueDelta != null && (
              <p className={revenueDelta >= 0 ? "text-xs text-emerald-600" : "text-xs text-red-600"}>
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
    <div className="space-y-[clamp(1rem,2vw,1.5rem)]">
      <p className="text-muted-foreground">Operational overview across all projects.</p>


      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={data}
        loadingFallback={
          <div className="grid grid-cols-2 gap-[clamp(0.5rem,1.5vw,1rem)] sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2.2/1] w-full" />
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
              loadingFallback={<Skeleton className="aspect-[3/1] w-full" />}
            >
              {(revenue) => (
                <Card>
                  <CardHeader className="p-[clamp(0.75rem,1.5vw,1rem)] pb-2">
                    <CardTitle className="text-base">Revenue (last 6 months)</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto p-[clamp(0.75rem,1.5vw,1rem)] pt-0">
                    {revenue.byMonth.every((month) => month.amount === 0) ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        Revenue data will appear once transactions are processed.
                      </p>
                    ) : (
                      <div className="min-w-full max-h-40">
                        <RevenueChart months={revenue.byMonth} currency={revenue.currency} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </QueryState>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <ProjectsUpcoming projects={projects} />
                <ProjectsOverdue />
              </div>
              <GlobalActivityFeed limit={5} />
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}
