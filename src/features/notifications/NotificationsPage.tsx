import { MoreHorizontal, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryState } from "@/components/QueryState";
import { useNotificationAction, useNotifications } from "@/hooks/useProjects";
import type { NotificationItem } from "@/types/dashboard";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSearchParams } from "react-router-dom";
import { DataTable } from "@/components/common/DataTable";

export function NotificationsPage() {
  const limit = 25;
  const [params, setParams] = useSearchParams();
  const offset = Math.max(0, Number(params.get("offset") ?? 0) || 0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const notifications = useNotifications(limit, offset);
  const canLoadMore = notifications.data?.hasMore === true;
  const loadingMore = notifications.isFetching;
  const action = useNotificationAction(); const severity = params.get("severity") ?? "all"; const search = params.get("q") ?? "";
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value && value !== "all") next.set(key, value); else next.delete(key); if (key !== "offset") next.delete("offset"); setParams(next); };
  useEffect(() => {
    if (!notifications.data) return;
    setItems(current => offset === 0 ? notifications.data.data : [...current, ...notifications.data.data]);
  }, [notifications.data, offset]);
  const filtered = useMemo(() => items.filter(item => (severity === "all" || item.severity === severity) && `${item.title} ${item.message} ${item.action}`.toLowerCase().includes(search.toLowerCase())), [items, search, severity]);
  if (notifications.data) return <DataTable data={filtered} getRowKey={item => item.id} searchPlaceholder="Search notifications..." filters={[{ label: "Severity", options: [{ label: "Errors", value: "error" }, { label: "Warnings", value: "warning" }, { label: "Info", value: "info" }], getValue: item => item.severity }]} columns={[{ key: "title", header: "Notification", searchable: true, searchValue: item => `${item.title} ${item.message}`, render: item => <div><p className="font-medium capitalize">{item.title}</p><p className="text-xs text-muted-foreground">{humanizeNotification(item.message)}</p></div> }, { key: "severity", header: "Severity", render: item => <Badge variant={item.severity === "error" ? "destructive" : item.severity === "warning" ? "secondary" : "outline"}>{item.severity}</Badge> }, { key: "created", header: "Created", render: item => new Date(item.createdAt).toLocaleString() }]} />;
  return <div className="space-y-6"><div><p className="text-muted-foreground">Recent system, deployment, payment, and integration events.</p></div><Card><CardHeader className="space-y-3"><div className="flex flex-row items-center justify-between"><CardTitle className="text-sm">Notifications</CardTitle><Button variant="ghost" size="icon" onClick={() => { update("offset", ""); setItems([]); void notifications.refetch(); }} aria-label="Refresh notifications"><RefreshCw className="h-4 w-4" /></Button></div><div className="flex flex-wrap gap-2"><Input className="max-w-sm" placeholder="Search notifications" value={search} onChange={e => update("q", e.target.value)} /><select className="h-9 rounded-md border bg-background px-3 text-sm" value={severity} onChange={e => update("severity", e.target.value)}><option value="all">All severities</option><option value="error">Errors</option><option value="warning">Warnings</option><option value="info">Info</option></select></div></CardHeader><CardContent><QueryState isLoading={notifications.isLoading && items.length === 0} isError={notifications.isError} error={notifications.error} data={filtered}>{visibleItems => <>{visibleItems.length ? <div className="space-y-2">{visibleItems.map(item => <div key={item.id} className="flex items-start justify-between gap-4 rounded-md border p-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium capitalize">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{humanizeNotification(item.message)}</p><p className="mt-2 text-[11px] text-foreground/70">{new Date(item.createdAt).toLocaleString()}</p></div><div className="flex shrink-0 items-start gap-2"><Badge variant={item.severity === "error" ? "destructive" : item.severity === "warning" ? "secondary" : "outline"}>{item.severity}</Badge><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Notification actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={action.isPending || item.read} onClick={() => action.mutate({ id: item.id, state: "read" })}>{item.read ? "Read" : "Mark read"}</DropdownMenuItem><DropdownMenuItem disabled={action.isPending} onClick={() => action.mutate({ id: item.id, state: "dismissed" })}>Dismiss</DropdownMenuItem><DropdownMenuItem disabled={action.isPending} onClick={() => action.mutate({ id: item.id, state: "archived" })}>Archive</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div>)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">No notifications match the current filters.</p>}{canLoadMore && <Button className="mt-4" variant="outline" disabled={loadingMore} onClick={() => update("offset", String(offset + limit))}>{loadingMore ? "Loading..." : "Load more"}</Button>}</>}</QueryState></CardContent></Card></div>;
}

function humanizeNotification(message: string) {
  const payment = message.match(/Payment ref=([^\s]+) provider=([^\s]+) amount=([\d.]+) totalPaid=([\d.]+)\/([\d.]+)(?: verified via ([\w_]+))?/i);
  if (payment) return `Received a ${payment[2].toLowerCase()} payment of KES ${payment[3]} (total paid: KES ${payment[4]} of KES ${payment[5]}).`;
  return message.replace(/\b([a-zA-Z][\w]*)=([^\s]+)/g, "$1: $2");
}
