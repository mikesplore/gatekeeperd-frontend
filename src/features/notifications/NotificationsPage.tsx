import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryState } from "@/components/QueryState";
import { useNotifications } from "@/hooks/useProjects";

export function NotificationsPage() {
  const notifications = useNotifications(100);
  return <div className="space-y-6"><div><p className="text-muted-foreground">Recent system, deployment, payment, and integration events.</p></div><Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-sm">Notifications</CardTitle><Button variant="ghost" size="icon" onClick={() => notifications.refetch()} aria-label="Refresh notifications"><RefreshCw className="h-4 w-4" /></Button></CardHeader><CardContent><QueryState isLoading={notifications.isLoading} isError={notifications.isError} error={notifications.error} data={notifications.data}>{items => items.length ? <div className="space-y-2">{items.map(item => <div key={item.id} className="flex items-start justify-between gap-4 rounded-md border p-3"><div><p className="text-sm font-medium capitalize">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.message}</p><p className="mt-2 text-[11px] text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p></div><Badge variant={item.severity === "error" ? "destructive" : item.severity === "warning" ? "secondary" : "outline"}>{item.severity}</Badge></div>)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>}</QueryState></CardContent></Card></div>;
}
