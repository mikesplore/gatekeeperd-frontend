import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QueryState } from "@/components/QueryState";
import { useAllPayments } from "@/hooks/usePayments";
import { useProjects } from "@/hooks/useProjects";
import type { GatewayStatus } from "@/types/payment";
import { PaymentsTable } from "./PaymentsTable";

const PAGE_SIZE = 50;

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

  const { data, isLoading, isError, error } = useAllPayments(filters);
  const { data: projects } = useProjects();
  const total = data?.total ?? 0;
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
        <p className="text-muted-foreground">All payment activity across projects.</p>
        <Button variant="outline" asChild className="w-full sm:w-auto"><Link to="/app/payments/events">Paystack webhook events</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>All payments</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <QueryState isLoading={isLoading} isError={isError} error={error} data={data}>
            {result => (
              <>
                <PaymentsTable payments={result.payments} toolbarContent={filterControls} />
                {total > 0 && <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-center text-muted-foreground sm:text-left">{rangeStart}–{rangeEnd} of {total}</p>
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => update("offset", String(Math.max(0, offset - PAGE_SIZE)), false)}>Prev</Button>
                    <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => update("offset", String(offset + PAGE_SIZE), false)}>Next</Button>
                  </div>
                </div>}
              </>
            )}
          </QueryState>
        </CardContent>
      </Card>
    </div>
  );
}
