import { Link } from "react-router-dom";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryState } from "@/components/QueryState";
import { useOverdueProjects } from "@/hooks/usePayments";
import type { Project } from "@/types/project";

export function ProjectsUpcoming({ projects }: { projects: Project[] }) {
  const upcoming = projects.filter((p) => {
    if (p.status !== "active" || !p.dueDate) return false;
    const due = new Date(p.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7 = new Date(today);
    in7.setDate(in7.getDate() + 7);
    return due >= today && due <= in7;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming</CardTitle>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects due within 7 days.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <Link to={`/projects/${p.slug}`} className="font-medium hover:underline truncate min-w-0">
                  {p.name}
                </Link>
                <span className="text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(p.dueDate!), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ProjectsOverdue() {
  const { data, isLoading, isError, error } = useOverdueProjects();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overdue</CardTitle>
      </CardHeader>
      <CardContent>
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          data={data}
          loadingFallback={
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          }
        >
          {(overdue) =>
            overdue.length === 0 ? (
              <p className="text-sm text-muted-foreground">No overdue active projects.</p>
            ) : (
              <ul className="space-y-3">
                {overdue.map((p) => {
                  const due = parseISO(p.dueDate);
                  const autoBlock = parseISO(p.willAutoBlockOn);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const graceUsed = Math.min(
                    p.gracePeriodDays,
                    Math.max(0, Math.ceil((today.getTime() - due.getTime()) / 86400000)),
                  );
                  const blocksToday = autoBlock <= today;
                  const graceLabel = blocksToday
                    ? `${p.gracePeriodDays} of ${p.gracePeriodDays} grace days used — blocks today`
                    : `${graceUsed} of ${p.gracePeriodDays} grace days used`;

                  return (
                    <li key={p.slug} className="rounded-md border p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/projects/${p.slug}`} className="font-medium hover:underline truncate min-w-0">
                          {p.name}
                        </Link>
                        <span className="shrink-0 font-semibold text-red-600">{p.daysOverdue}d late</span>
                      </div>
                      <p className={blocksToday ? "mt-1 text-red-600" : "mt-1 text-amber-600 break-words"}>
                        {graceLabel}
                      </p>
                      {p.amountDue > 0 && (
                        <p className="mt-1 text-muted-foreground">
                          Amount due: {p.amountDue.toLocaleString()}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )
          }
        </QueryState>
      </CardContent>
    </Card>
  );
}

export function RevenueChart({
  months,
}: {
  months: { month: string; amount: number }[];
  currency?: string;
}) {
  const max = Math.max(...months.map((m) => m.amount), 1);

  return (
    <div className="flex h-40 items-end gap-1 sm:gap-2">
      {months.map((m) => (
        <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-primary/80 transition-all"
            style={{ height: `${Math.max(4, (m.amount / max) * 100)}%`, minHeight: 4 }}
            title={`${m.month}: ${m.amount.toLocaleString()}`}
          />
          <span className="text-[10px] text-muted-foreground">{format(parseISO(`${m.month}-01`), "MMM")}</span>
        </div>
      ))}
    </div>
  );
}