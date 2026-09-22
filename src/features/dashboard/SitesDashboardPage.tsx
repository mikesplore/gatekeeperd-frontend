import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpDown, Globe2, Plus, Server, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboardSites, useDashboardSummary } from "@/hooks/useSiteDashboard";
import type { DashboardSite, SiteStatus } from "@/types/sites";
import { useUrlTableState } from "@/hooks/useUrlTableState";
import { AddSitePanel } from "@/features/nginx/AddSitePanel";

const statuses: SiteStatus[] = ["healthy", "docker_down", "dead_config", "drifted", "disabled", "error"];
const colors: Record<SiteStatus, string> = { healthy: "bg-emerald-100 text-emerald-800", docker_down: "bg-orange-100 text-orange-800", dead_config: "bg-red-100 text-red-800", drifted: "bg-yellow-100 text-yellow-800", disabled: "bg-slate-100 text-slate-800", error: "bg-red-200 text-red-900" };
function StatusBadge({ status }: { status: SiteStatus }) { return <Badge className={`capitalize ${colors[status]}`}>{status.replace(/_/g, " ")}</Badge>; }
function SiteTable({ sites }: { sites: DashboardSite[] }) {
  const [sort, setSort] = useState<"status" | "customer">("status");
  const ordered = useMemo(() => [...sites].sort((a, b) => String(a[sort === "status" ? "status" : "customerName"] ?? "").localeCompare(String(b[sort === "status" ? "status" : "customerName"] ?? ""))), [sites, sort]);
  return <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm">
    <thead><tr className="border-b text-xs uppercase tracking-wide text-muted-foreground"><th className="px-4 py-3 font-medium">Site</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Upstream</th><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium"><Button size="sm" variant="ghost" className="-ml-2 h-7 px-2 text-xs uppercase tracking-wide" onClick={() => setSort(sort === "status" ? "customer" : "status")}><ArrowUpDown className="mr-1 h-3 w-3" />Sort</Button></th></tr></thead>
    <tbody>{ordered.map(site => <tr key={site.slug} className="group border-b last:border-0 hover:bg-muted/40">
      <td className="px-4 py-4"><Link className="block font-medium text-foreground hover:text-primary" to={`/app/nginx/sites/${site.slug}`}>{site.domain}</Link><span className="mt-1 block text-xs text-muted-foreground">{site.slug}</span></td>
      <td className="px-4 py-4"><StatusBadge status={site.status}/></td>
      <td className="px-4 py-4"><span className="flex items-center gap-2 text-sm"><Server className="h-4 w-4 text-muted-foreground" />{site.dockerState ?? (site.available ? "Configured" : "Unavailable")}</span></td>
      <td className="px-4 py-4 text-muted-foreground">{site.customerName ?? "Unassigned"}</td>
      <td className="max-w-xs px-4 py-4 text-xs text-muted-foreground"><span className="block truncate" title={site.lastNginxError ?? site.lastDockerError ?? ""}>{site.lastNginxError ?? site.lastDockerError ?? (site.enabled ? "Enabled" : "Not enabled")}</span></td>
    </tr>)}</tbody>
  </table></div>;
}
export function SitesDashboardPage() {
  const [addOpen, setAddOpen] = useState(false);
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
    { label: "Disabled", status: "disabled", className: "text-slate-600" },
  ];
  const changeFilter = (value: string) => {
    const next = new URLSearchParams(params);
    if (value === "all") next.delete("status");
    else next.set("status", value);
    next.delete("page");
    setParams(next);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm text-muted-foreground">Manage your reverse proxy sites, upstream health, and TLS configuration.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link to="/app/nginx/certificates">Certificates</Link></Button><Button variant="outline" asChild><Link to="/app/nginx/dead-configs">Dead configs</Link></Button><Button variant="outline" asChild><Link to="/app/nginx/manage">Advanced config</Link></Button><Button onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" />Add site</Button></div></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        <Card className="sm:col-span-2 lg:col-span-1"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total sites</CardTitle></CardHeader><CardContent className="flex items-center justify-between"><span className="text-3xl font-semibold">{summary.data ? summaryCards.reduce((total, card) => total + (statusCounts[card.status] ?? 0), 0) : "—"}</span><GlobeIcon /></CardContent></Card>
        {summaryCards.map(card => <Card key={card.status}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{card.label}</CardTitle></CardHeader><CardContent className={`text-2xl font-semibold ${card.className}`}>{statusCounts[card.status] ?? "—"}</CardContent></Card>)}
      </div>
      {summary.data?.certificateAlerts?.length ? <Card><CardHeader><CardTitle>Certificate alerts</CardTitle></CardHeader><CardContent><ul className="space-y-1 text-sm text-amber-700">{summary.data.certificateAlerts.map(alert => <li key={alert}>{alert}</li>)}</ul></CardContent></Card> : null}
      <Card>
        <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Sites</CardTitle><p className="mt-1 text-sm text-muted-foreground">Select a site to view its configuration and health.</p></div><select className="h-9 rounded-md border bg-background px-3 text-sm" value={filter} onChange={event => changeFilter(event.target.value)}><option value="all">All statuses</option>{statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></CardHeader>
        <CardContent className="p-0">{sites.isLoading ? <div className="p-8 text-sm text-muted-foreground">Loading sites…</div> : sites.isError ? <div className="p-8 text-sm text-destructive">Could not load sites. Try refreshing the page.</div> : sites.data?.sites.length ? <><SiteTable sites={sites.data.sites} /><div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground"><span>{sites.data.total} site{sites.data.total === 1 ? "" : "s"}</span><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => setTableParam("page", page - 1)}>Previous</Button><span>{page + 1} / {Math.max(1, Math.ceil((sites.data.total) / pageSize))}</span><Button size="sm" variant="outline" disabled={!sites.data.hasMore} onClick={() => setTableParam("page", page + 1)}>Next</Button></div></div></> : <div className="flex flex-col items-center px-6 py-14 text-center"><div className="mb-4 rounded-full bg-primary/10 p-3 text-primary"><ShieldCheck className="h-6 w-6" /></div><h3 className="font-semibold">No sites found</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">Create a site from a project to configure its upstream and publish it through Nginx.</p><Button className="mt-5" onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" />Add your first site</Button></div>}</CardContent>
      </Card>
      <AddSitePanel open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function GlobeIcon() { return <span className="rounded-full bg-primary/10 p-2 text-primary"><Globe2 className="h-4 w-4" /></span>; }
