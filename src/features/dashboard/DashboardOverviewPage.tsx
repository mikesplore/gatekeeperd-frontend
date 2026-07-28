import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryState } from "@/components/QueryState";
import { GlobalActivityFeed, ProjectsDueSoon } from "@/features/audit/GlobalActivityFeed";
import { useProjects } from "@/hooks/useProjects";
import type { Project } from "@/types/project";

interface StatCardsProps {
  projects: Project[];
}

export function StatCards({ projects }: StatCardsProps) {
  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === "active").length;
    const blocked = projects.filter((p) => p.status === "blocked").length;
    const manualBlock = projects.filter((p) => p.status === "manual_block").length;
    return { total, active, blocked, manualBlock };
  }, [projects]);

  const items = [
    { label: "Total projects", value: stats.total },
    { label: "Active", value: stats.active, className: "text-emerald-600" },
    { label: "Blocked", value: stats.blocked, className: "text-red-600" },
    { label: "Manual block", value: stats.manualBlock, className: "text-amber-600" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}

export function DashboardOverviewPage() {
  const { data, isLoading, isError, error } = useProjects();

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
            <StatCards projects={projects} />
            <div className="grid gap-6 lg:grid-cols-2">
              <ProjectsDueSoon projects={projects} />
              <GlobalActivityFeed limit={20} />
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}
