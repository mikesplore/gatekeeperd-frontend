import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboardSites, useDashboardSummary } from "@/hooks/useSiteDashboard";
import type { DashboardSite, SiteStatus } from "@/types/sites";
import { useUrlTableState } from "@/hooks/useUrlTableState";

const statuses: SiteStatus[] = ["healthy", "docker_down", "dead_config", "drifted", "disabled", "error"];
const colors: Record<SiteStatus, string> = { healthy: "bg-emerald-100 text-emerald-800", docker_down: "bg-orange-100 text-orange-800", dead_config: "bg-red-100 text-red-800", drifted: "bg-yellow-100 text-yellow-800", disabled: "bg-slate-100 text-slate-800", error: "bg-red-200 text-red-900" };
function StatusBadge({ status }: { status: SiteStatus }) { return <Badge className={colors[status]}>{status.replace(/_/g, " ")}</Badge>; }
function SiteTable({ sites }: { sites: DashboardSite[] }) { const [sort, setSort] = useState<"status" | "customer">("status"); const ordered = useMemo(() => [...sites].sort((a, b) => String(a[sort === "status" ? "status" : "customerName"] ?? "").localeCompare(String(b[sort === "status" ? "status" : "customerName"] ?? ""))), [sites, sort]); return <div className="overflow-x-auto"><div className="mb-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => setSort("status")}>Sort status</Button><Button size="sm" variant="outline" onClick={() => setSort("customer")}>Sort customer</Button></div><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Status</th><th className="p-2">Domain</th><th className="p-2">Customer</th><th className="p-2">Project</th><th className="p-2">Last error</th></tr></thead><tbody>{ordered.map(site => <tr key={site.slug} className="border-b"><td className="p-2"><StatusBadge status={site.status}/></td><td className="p-2"><Link className="underline" to={`/app/nginx/sites/${site.slug}`}>{site.domain}</Link></td><td className="p-2">{site.customerName ?? "Unassigned"}</td><td className="p-2">{site.slug}</td><td className="max-w-xs truncate p-2" title={site.lastNginxError ?? site.lastDockerError ?? ""}>{site.lastNginxError ?? site.lastDockerError ?? "—"}</td></tr>)}</tbody></table></div>; }
export function SitesDashboardPage() {
  const [params, setParams] = useSearchParams();
  const filter = (params.get("status") as SiteStatus | "all" | null) ?? "all";
  const { page, pageSize, offset, setTableParam } = useUrlTableState(25);
  const sites = useDashboardSites(filter, pageSize, offset);
  const summary = useDashboardSummary();
  const statusCounts = summary.data?.nginx ?? {};
  const summaryCards: { label: string; status: SiteStatus; className: string }[] = [
    { label: "Healthy", status: "healthy", className: "text-emerald-600" },
    { label: "Docker down", status: "docker_down", className: "text-orange-600" },
    { label: "Dead config", status: "dead_config", className: "text-red-600" },
    { label: "Drifted", status: "drifted", className: "text-yellow-600" },
    { label: "Error", status: "error", className: "text-red-700" },
  ];
  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2"><Button variant="outline" asChild><Link to="/app/nginx/dead-configs">Dead configs</Link></Button><Button asChild><Link to="/app/nginx/manage">Add new site</Link></Button></div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card><CardHeader><CardTitle className="text-sm">Total sites</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary.data ? summaryCards.reduce((total, card) => total + (statusCounts[card.status] ?? 0), 0) : "—"}</CardContent></Card>
        {summaryCards.map(card => <Card key={card.status}><CardHeader><CardTitle className="text-sm">{card.label}</CardTitle></CardHeader><CardContent className={`text-2xl font-semibold ${card.className}`}>{statusCounts[card.status] ?? "—"}</CardContent></Card>)}
      </div>
      {summary.data?.certificateAlerts?.length ? <Card><CardHeader><CardTitle>Certificate alerts</CardTitle></CardHeader><CardContent><ul className="space-y-1 text-sm text-amber-700">{summary.data.certificateAlerts.map(alert => <li key={alert}>{alert}</li>)}</ul></CardContent></Card> : null}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Sites</CardTitle><select className="rounded-md border bg-background px-3 py-2 text-sm" value={filter} onChange={e => { const next = new URLSearchParams(params); const value = e.target.value; value === "all" ? next.delete("status") : next.set("status", value); next.delete("page"); setParams(next); }}><option value="all">All statuses</option>{statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></CardHeader>
        <CardContent>{sites.isLoading ? <p>Loading…</p> : <><SiteTable sites={sites.data?.sites ?? []} /><div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>{sites.data?.total ?? 0} result{sites.data?.total === 1 ? "" : "s"}</span><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => setTableParam("page", page - 1)}>Previous</Button><span>{page + 1} / {Math.max(1, Math.ceil((sites.data?.total ?? 0) / pageSize))}</span><Button size="sm" variant="outline" disabled={!sites.data?.hasMore} onClick={() => setTableParam("page", page + 1)}>Next</Button></div></div></>}</CardContent>
      </Card>
    </div>
  );
}
