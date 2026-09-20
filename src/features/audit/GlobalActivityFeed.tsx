import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryState } from "@/components/QueryState";
import { useGlobalAuditLog } from "@/hooks/useProjects";
import { AuditLogTimeline } from "./AuditLogTimeline";

export function GlobalActivityFeed({ limit = 20 }: { limit?: number }) {
  const { data, isLoading, isError, error } = useGlobalAuditLog(limit);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Recent activity</CardTitle>
          <Link to="/app/audit" className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          data={data}
          loadingFallback={
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          }
        >
          {(entries) => (
            <div className="max-h-[clamp(16rem,32vw,24rem)] overflow-y-auto pr-1">
              <AuditLogTimeline entries={entries} />
            </div>
          )}
        </QueryState>
      </CardContent>
    </Card>
  );
}

export function ProjectsDueSoon({ projects }: { projects: import("@/types/project").Project[] }) {
  const dueSoon = projects.filter((p) => {
    if (p.status !== "active" || !p.dueDate) return false;
    const due = new Date(p.dueDate);
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    return due <= in7 && due >= new Date();
  });

  if (dueSoon.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Projects due soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No projects due within 7 days.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projects due soon</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {dueSoon.map((p) => (
            <li key={p.id} className="flex items-center justify-between text-sm">
              <Link to={`/projects/${p.slug}`} className="font-medium hover:underline">
                {p.name}
              </Link>
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(p.dueDate!), { addSuffix: true })}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
