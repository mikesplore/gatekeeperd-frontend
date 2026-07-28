import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [status, setStatus] = useState<string>("all");
  const [projectSlug, setProjectSlug] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [offset, setOffset] = useState(0);

  const filters = useMemo(
    () => ({
      status: status === "all" ? undefined : (status as GatewayStatus),
      projectSlug: projectSlug === "all" ? undefined : projectSlug,
      from: from || undefined,
      to: to || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [status, projectSlug, from, to, offset],
  );

  const { data, isLoading, isError, error } = useAllPayments(filters);
  const { data: projects } = useProjects();

  const total = data?.total ?? 0;
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground">All payment activity across projects.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="w-full sm:w-auto">
              <label className="text-xs font-medium text-muted-foreground mb-1 block sm:hidden">Status</label>
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v);
                  setOffset(0);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-auto">
              <label className="text-xs font-medium text-muted-foreground mb-1 block sm:hidden">Project</label>
              <Select
                value={projectSlug}
                onValueChange={(v) => {
                  setProjectSlug(v);
                  setOffset(0);
                }}
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={p.slug}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-auto">
              <label className="text-xs font-medium text-muted-foreground mb-1 block sm:hidden">From date</label>
              <Input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setOffset(0);
                }}
                className="w-full sm:w-[160px]"
                aria-label="From date"
              />
            </div>

            <div className="w-full sm:w-auto">
              <label className="text-xs font-medium text-muted-foreground mb-1 block sm:hidden">To date</label>
              <Input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setOffset(0);
                }}
                className="w-full sm:w-[160px]"
                aria-label="To date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <QueryState isLoading={isLoading} isError={isError} error={error} data={data}>
            {(result) => (
              <>
                <PaymentsTable payments={result.payments} />
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground text-center sm:text-left">
                    {rangeStart}–{rangeEnd} of {total}
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={offset === 0}
                      onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={offset + PAGE_SIZE >= total}
                      onClick={() => setOffset((o) => o + PAGE_SIZE)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </QueryState>
        </CardContent>
      </Card>
    </div>
  );
}