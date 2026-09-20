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

export function NotificationsPage() {
  const limit = 25;
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const notifications = useNotifications(limit, offset);
  const action = useNotificationAction(); const [severity, setSeverity] = useState("all"); const [search, setSearch] = useState("");
  useEffect(() => {
    if (!notifications.data) return;
    setItems(current => offset === 0 ? notifications.data.data : [...current, ...notifications.data.data]);
  }, [notifications.data, offset]);
  const filtered = useMemo(() => items.filter(item => (severity === "all" || item.severity === severity) && `${item.title} ${item.message} ${item.action}`.toLowerCase().includes(search.toLowerCase())), [items, search, severity]);
  return <div className="space-y-6"><div><p className="text-muted-foreground">Recent system, deployment, payment, and integration events.</p></div><Card><CardHeader className="space-y-3"><div className="flex flex-row items-center justify-between"><CardTitle className="text-sm">Notifications</CardTitle><Button variant="ghost" size="icon" onClick={() => { setOffset(0); setItems([]); void notifications.refetch(); }} aria-label="Refresh notifications"><RefreshCw className="h-4 w-4" /></Button></div><div className="flex flex-wrap gap-2"><Input className="max-w-sm" placeholder="Search notifications" value={search} onChange={e => setSearch(e.target.value)} /><select className="h-9 rounded-md border bg-background px-3 text-sm" value={severity} onChange={e => setSeverity(e.target.value)}><option value="all">All severities</option><option value="error">Errors</option><option value="warning">Warnings</option><option value="info">Info</option></select></div></CardHeader><CardContent><QueryState isLoading={notifications.isLoading && items.length === 0} isError={notifications.isError} error={notifications.error} data={filtered}>{visibleItems => <>{visibleItems.length ? <div className="space-y-2">{visibleItems.map(item => <div key={item.id} className="flex items-start justify-between gap-4 rounded-md border p-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium capitalize">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{humanizeNotification(item.message)}</p><p className="mt-2 text-[11px] text-foreground/70">{new Date(item.createdAt).toLocaleString()}</p></div><div className="flex shrink-0 items-start gap-2"><Badge variant={item.severity === "error" ? "destructive" : item.severity === "warning" ? "secondary" : "outline"}>{item.severity}</Badge><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Notification actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={action.isPending || item.read} onClick={() => action.mutate({ id: item.id, state: "read" })}>{item.read ? "Read" : "Mark read"}</DropdownMenuItem><DropdownMenuItem disabled={action.isPending} onClick={() => action.mutate({ id: item.id, state: "dismissed" })}>Dismiss</DropdownMenuItem><DropdownMenuItem disabled={action.isPending} onClick={() => action.mutate({ id: item.id, state: "archived" })}>Archive</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div>)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">No notifications match the current filters.</p>}{notifications.data?.hasMore && <Button className="mt-4" variant="outline" disabled={notifications.isFetching} onClick={() => setOffset(value => value + limit)}>{notifications.isFetching ? "Loading..." : "Load more"}</Button>}</>}</QueryState></CardContent></Card></div>;
}

function humanizeNotification(message: string) {
  const payment = message.match(/Payment ref=([^\s]+) provider=([^\s]+) amount=([\d.]+) totalPaid=([\d.]+)\/([\d.]+)(?: verified via ([\w_]+))?/i);
  if (payment) return `Received a ${payment[2].toLowerCase()} payment of KES ${payment[3]} (total paid: KES ${payment[4]} of KES ${payment[5]}).`;
  return message.replace(/\b([a-zA-Z][\w]*)=([^\s]+)/g, "$1: $2");
}
