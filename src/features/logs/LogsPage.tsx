import { useMemo } from "react";
import { Activity, AlertCircle, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryState } from "@/components/QueryState";
import { useAdminLogs } from "@/hooks/useLogs";
import type { AdminLogEntry } from "@/types/logs";

const LEVELS = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"];

function rate(value: number | null | undefined) {
  return value == null ? "—" : `${value.toFixed(1)}%`;
}

function levelVariant(level: string): "default" | "secondary" | "destructive" | "outline" {
  if (level === "ERROR" || level === "FATAL") return "destructive";
  if (level === "WARN" || level === "WARNING") return "secondary";
  return "outline";
}

function MetricCard({ title, value, detail, icon: Icon }: { title: string; value: string | number; detail: string; icon: typeof Activity }) {
  return <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle><Icon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>;
}

export function LogsPage() {
  const [params, setParams] = useSearchParams();
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") || 25)));
  const offset = Math.max(0, Number(params.get("offset") || 0));
  const search = params.get("search") ?? "";
  const level = params.get("level") ?? "";
  const query = useAdminLogs({ limit, offset, search: search || undefined, level: level || undefined });
  const data = query.data;

  const columns = useMemo<DataTableColumn<AdminLogEntry>[]>(() => [
    {
      key: "timestamp",
      header: "Time",
      searchable: true,
      searchValue: row => row.timestamp,
      sortable: false,
      render: row => <time className="whitespace-nowrap text-xs text-muted-foreground" dateTime={row.timestamp}>{new Date(row.timestamp).toLocaleString()}</time>,
    },
    {
      key: "level",
      header: "Level",
      searchable: true,
      searchValue: row => row.level,
      render: row => <Badge variant={levelVariant(row.level)}>{row.level}</Badge>,
    },
    {
      key: "logger",
      header: "Source",
      searchable: true,
      searchValue: row => row.logger ?? "",
      render: row => <span className="block max-w-56 truncate font-mono text-xs" title={row.logger ?? "unknown"}>{row.logger ?? "unknown"}</span>,
    },
    {
      key: "message",
      header: "Message",
      searchable: true,
      searchValue: row => `${row.message} ${row.stackTrace ?? ""}`,
      render: row => <div className="min-w-72 max-w-3xl whitespace-pre-wrap break-words text-sm"><p>{row.message}</p>{row.stackTrace && <details className="mt-1 text-xs text-muted-foreground"><summary className="cursor-pointer">Stack trace</summary><pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-2 whitespace-pre-wrap">{row.stackTrace}</pre></details>}</div>,
    },
    {
      key: "requestId",
      header: "Request ID",
      searchable: true,
      searchValue: row => row.requestId ?? "",
      render: row => row.requestId ? <span className="font-mono text-xs" title={row.requestId}>{row.requestId}</span> : <span className="text-muted-foreground">—</span>,
    },
  ], []);

  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!Object.prototype.hasOwnProperty.call(values, "offset")) next.delete("offset");
    setParams(next);
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-semibold tracking-tight">Application logs</h1><p className="mt-1 text-sm text-muted-foreground">Recent Gatekeeperd service logs, searchable by message, source, request ID, and level.</p></div>
      <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />Refresh</Button>
    </div>

    <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={data} loadingFallback={<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Card key={index}><CardContent className="h-28" /></Card>)}</div>}>
      {page => <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Scanned logs" value={page.summary.scanned.toLocaleString()} detail="Latest journal window" icon={Activity} />
          <MetricCard title="Error logs" value={page.summary.errorLogs.toLocaleString()} detail={`${page.summary.warningLogs.toLocaleString()} warnings in scanned entries`} icon={AlertCircle} />
          <MetricCard title="Request success" value={rate(page.summary.successRate)} detail={`${page.summary.successfulRequests.toLocaleString()} of ${page.summary.requestCount.toLocaleString()} HTTP responses`} icon={CheckCircle2} />
          <MetricCard title="Request error rate" value={rate(page.summary.errorRate)} detail={`${page.summary.failedRequests.toLocaleString()} HTTP responses with status 4xx or 5xx`} icon={AlertTriangle} />
        </div>

        {page.truncated && <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-800">Showing the latest 10,000 journal entries. Narrow your search by phrase or level to find relevant events.</div>}
        <Card>
          <CardHeader><CardTitle className="text-base">Log entries</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={search} onChange={event => update({ search: event.target.value })} placeholder="Search message, source, request ID…" aria-label="Search logs" className="sm:max-w-lg" />
              <select value={level} onChange={event => update({ level: event.target.value })} aria-label="Filter by level" className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:w-40"><option value="">All levels</option>{LEVELS.map(item => <option key={item} value={item}>{item}</option>)}</select>
              <select value={limit} onChange={event => update({ limit: event.target.value })} aria-label="Rows per page" className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:w-36"><option value={25}>25 rows</option><option value={50}>50 rows</option><option value={100}>100 rows</option></select>
            </div>
            <DataTable
              mode="server"
              data={page.logs}
              columns={columns}
              getRowKey={row => row.id}
              page={Math.floor(page.offset / page.limit)}
              pageSize={page.limit}
              total={page.total}
              onPageChange={nextPage => update({ offset: String(nextPage * page.limit) })}
              isLoading={query.isFetching}
              loadingRows={page.limit}
              emptyMessage="No log entries match this search."
              hideToolbar
            />
          </CardContent>
        </Card>
      </>}
    </QueryState>
  </div>;
}
