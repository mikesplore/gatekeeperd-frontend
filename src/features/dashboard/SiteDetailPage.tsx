import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryState } from "@/components/QueryState";
import { useDashboardSite } from "@/hooks/useSiteDashboard";
import type { SiteStatus } from "@/types/sites";

const statusClasses: Record<SiteStatus, string> = {
  healthy: "bg-emerald-100 text-emerald-800", docker_down: "bg-orange-100 text-orange-800",
  dead_config: "bg-red-100 text-red-800", drifted: "bg-yellow-100 text-yellow-800",
  disabled: "bg-slate-100 text-slate-800", error: "bg-red-200 text-red-900",
};

function ConfigDiff({ expected, current }: { expected?: string | null; current?: string | null }) {
  if (expected === current) return <p className="text-sm text-emerald-700">The deployed file matches the generated configuration.</p>;
  const expectedLines = expected?.split("\n") ?? [];
  const currentLines = current?.split("\n") ?? [];
  const length = Math.max(expectedLines.length, currentLines.length);
  return <pre className="max-h-[32rem] overflow-auto rounded-md bg-muted p-4 text-xs leading-5">{Array.from({ length }, (_, index) => {
    const left = expectedLines[index] ?? "";
    const right = currentLines[index] ?? "";
    return left === right ? `  ${left}\n` : `- ${left}\n+ ${right}\n`;
  })}</pre>;
}

export function SiteDetailPage() {
  const slug = useParams().slug ?? "";
  const query = useDashboardSite(slug);
  return <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={query.data}>
    {detail => <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><Link to="/app/nginx/sites" className="text-sm text-primary hover:underline">← All sites</Link><h1 className="mt-2 text-2xl font-semibold">{detail.site.domain}</h1><p className="text-muted-foreground">Project {detail.site.slug}</p></div><Badge className={statusClasses[detail.site.status]}>{detail.site.status.replace(/_/g, " ")}</Badge></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Runtime</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p><span className="font-medium">Docker:</span> {detail.site.dockerState ?? "Unknown"}</p><p><span className="font-medium">Available:</span> {detail.site.available ? "Yes" : "No"}</p><p><span className="font-medium">Enabled:</span> {detail.site.enabled ? "Yes" : "No"}</p><p><span className="font-medium">Certificate:</span> {detail.certificateInstalled == null ? "Unknown" : detail.certificateInstalled ? `Installed${detail.certificateDaysRemaining != null ? ` (${detail.certificateDaysRemaining} days remaining)` : ""}` : "Not installed"}</p>{detail.site.lastNginxError && <p className="text-red-600"><span className="font-medium">Nginx error:</span> {detail.site.lastNginxError}</p>}{detail.site.lastDockerError && <p className="text-red-600"><span className="font-medium">Docker error:</span> {detail.site.lastDockerError}</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Backups</CardTitle></CardHeader><CardContent>{detail.backups.length ? <ul className="space-y-1 text-sm">{detail.backups.map(backup => <li key={backup} className="font-mono">{backup}</li>)}</ul> : <p className="text-sm text-muted-foreground">No backups found.</p>}</CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Configuration diff</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-xs text-muted-foreground">Expected generated configuration versus the current file on disk.</p><ConfigDiff expected={detail.generatedConfig} current={detail.currentConfig} /></CardContent></Card>
    </div>}
  </QueryState>;
}
