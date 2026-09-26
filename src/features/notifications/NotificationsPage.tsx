import { MoreHorizontal, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { QueryState } from "@/components/QueryState";
import { DataTable, type DataTableColumn, type DataTableFilter } from "@/components/common/DataTable";
import { useNotificationAction, useNotifications } from "@/hooks/useProjects";
import type { NotificationItem } from "@/types/dashboard";

const PAGE_SIZE = 25;

export function NotificationsPage() {
  const [params, setParams] = useSearchParams();
  const offset = Math.max(0, Number(params.get("offset") ?? 0) || 0);
  const severity = params.get("severity") ?? "";
  const search = params.get("q") ?? "";
  const [items, setItems] = useState<NotificationItem[]>([]);
  const notifications = useNotifications(PAGE_SIZE, offset);
  const action = useNotificationAction();

  useEffect(() => {
    if (!notifications.data) return;
    setItems(current => offset === 0 ? notifications.data.data : [...current, ...notifications.data.data]);
  }, [notifications.data, offset]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    if (key !== "offset") next.delete("offset");
    setParams(next);
  };

  const filtered = useMemo(() => items.filter(item =>
    (!severity || item.severity === severity) &&
    `${item.title} ${item.message} ${item.action}`.toLowerCase().includes(search.toLowerCase())
  ), [items, search, severity]);

  const columns: DataTableColumn<NotificationItem>[] = [
    {
      key: "notification",
      header: "Notification",
      searchable: true,
      searchValue: item => `${item.title} ${item.message} ${item.action}`,
      render: item => <div className="min-w-0"><p className="font-medium capitalize">{item.title}</p><p className="max-w-3xl text-xs text-muted-foreground">{humanizeNotification(item.message)}</p></div>,
    },
    {
      key: "severity",
      header: "Severity",
      render: item => <Badge variant={item.severity === "error" ? "destructive" : item.severity === "warning" ? "secondary" : "outline"}>{item.severity}</Badge>,
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      sortValue: item => new Date(item.createdAt).getTime(),
      render: item => <time className="whitespace-nowrap text-xs text-muted-foreground" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>,
    },
    {
      key: "actions",
      header: "",
      render: item => <div className="flex justify-end"><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label={`Actions for ${item.title}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={action.isPending || item.read} onClick={() => action.mutate({ id: item.id, state: "read" })}>{item.read ? "Read" : "Mark read"}</DropdownMenuItem><DropdownMenuItem disabled={action.isPending} onClick={() => action.mutate({ id: item.id, state: "dismissed" })}>Dismiss</DropdownMenuItem><DropdownMenuItem disabled={action.isPending} onClick={() => action.mutate({ id: item.id, state: "archived" })}>Archive</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>,
    },
  ];

  const filters: DataTableFilter<NotificationItem>[] = [{
    label: "Severity",
    options: [{ label: "Errors", value: "error" }, { label: "Warnings", value: "warning" }, { label: "Info", value: "info" }],
    getValue: item => item.severity,
  }];

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground">Recent system, deployment, payment, and integration events.</p>
      <Button variant="outline" size="sm" onClick={() => { setItems([]); if (offset !== 0) update("offset", ""); void notifications.refetch(); }} disabled={notifications.isFetching}>
        <RefreshCw className={`mr-2 h-4 w-4 ${notifications.isFetching ? "animate-spin" : ""}`} />Refresh
      </Button>
    </div>
    <Card>
      <CardHeader><CardTitle className="text-sm">Notifications</CardTitle></CardHeader>
      <CardContent className="pt-0">
        <QueryState isLoading={notifications.isLoading && items.length === 0} isError={notifications.isError} error={notifications.error} data={notifications.data}>
          {result => <>
            <DataTable
              data={filtered}
              getRowKey={item => item.id}
              columns={columns}
              filters={filters}
              search={{ value: search, onChange: value => update("q", value) }}
              searchPlaceholder="Search notifications…"
              filterValues={{ Severity: severity }}
              onFilterChange={values => update("severity", values.Severity ?? "")}
              emptyMessage={items.length > 0 ? "No notifications match the current filters." : "No notifications found."}
            />
            {result.hasMore && <div className="mt-4 flex justify-center border-t pt-4"><Button variant="outline" disabled={notifications.isFetching} onClick={() => update("offset", String(offset + PAGE_SIZE))}>{notifications.isFetching ? "Loading…" : "Load more"}</Button></div>}
          </>}
        </QueryState>
      </CardContent>
    </Card>
  </div>;
}

function humanizeNotification(message: string) {
  const payment = message.match(/Payment ref=([^\s]+) provider=([^\s]+) amount=([\d.]+) totalPaid=([\d.]+)\/([\d.]+)(?: verified via ([\w_]+))?/i);
  if (payment) return `Received a ${payment[2].toLowerCase()} payment of KES ${payment[3]} (total paid: KES ${payment[4]} of KES ${payment[5]}).`;
  return message.replace(/\b([a-zA-Z][\w]*)=([^\s]+)/g, "$1: $2");
}
