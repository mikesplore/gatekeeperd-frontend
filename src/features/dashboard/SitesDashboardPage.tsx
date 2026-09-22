import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboardCustomers, useDashboardSites, useDeadConfigs } from "@/hooks/useSiteDashboard";
import type { DashboardSite, SiteStatus } from "@/types/sites";

const statuses: SiteStatus[] = ["healthy", "docker_down", "dead_config", "drifted", "disabled", "error"];
const colors: Record<SiteStatus, string> = { healthy: "bg-emerald-100 text-emerald-800", docker_down: "bg-orange-100 text-orange-800", dead_config: "bg-red-100 text-red-800", drifted: "bg-yellow-100 text-yellow-800", disabled: "bg-slate-100 text-slate-800", error: "bg-red-200 text-red-900" };
function StatusBadge({ status }: { status: SiteStatus }) { return <Badge className={colors[status]}>{status.replace(/_/g, " ")}</Badge>; }
function SiteTable({ sites }: { sites: DashboardSite[] }) { const [sort, setSort] = useState<"status" | "customer">("status"); const ordered = useMemo(() => [...sites].sort((a, b) => String(a[sort === "status" ? "status" : "customerName"] ?? "").localeCompare(String(b[sort === "status" ? "status" : "customerName"] ?? ""))), [sites, sort]); return <div className="overflow-x-auto"><div className="mb-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => setSort("status")}>Sort status</Button><Button size="sm" variant="outline" onClick={() => setSort("customer")}>Sort customer</Button></div><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Status</th><th className="p-2">Domain</th><th className="p-2">Customer</th><th className="p-2">Project</th><th className="p-2">Last error</th></tr></thead><tbody>{ordered.map(site => <tr key={site.slug} className="border-b"><td className="p-2"><StatusBadge status={site.status}/></td><td className="p-2"><Link className="underline" to={`/app/nginx/sites/${site.slug}`}>{site.domain}</Link></td><td className="p-2">{site.customerName ?? "Unassigned"}</td><td className="p-2">{site.slug}</td><td className="max-w-xs truncate p-2" title={site.lastNginxError ?? site.lastDockerError ?? ""}>{site.lastNginxError ?? site.lastDockerError ?? "—"}</td></tr>)}</tbody></table></div>; }
export function SitesDashboardPage() {
  const [filter, setFilter] = useState<SiteStatus | "all">("all");
  const sites = useDashboardSites(filter);
  const dead = useDeadConfigs();
  const customers = useDashboardCustomers();
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Site health</h1><p className="text-muted-foreground">Nginx, Docker, and payment-gating visibility.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm">Sites</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{sites.data?.length ?? "—"}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Dead configs</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{dead.data?.length ?? "—"}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Customers</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{customers.data?.length ?? "—"}</CardContent></Card>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Sites</CardTitle><select className="rounded-md border bg-background px-3 py-2 text-sm" value={filter} onChange={e => setFilter(e.target.value as SiteStatus | "all")}><option value="all">All statuses</option>{statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></CardHeader>
        <CardContent>{sites.isLoading ? <p>Loading…</p> : <SiteTable sites={sites.data ?? []} />}</CardContent>
      </Card>
    </div>
  );
}
