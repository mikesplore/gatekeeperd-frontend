import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryState } from "@/components/QueryState";
import { useDashboardSite, useDeleteDashboardSite, useUpdateDashboardSite } from "@/hooks/useSiteDashboard";
import { getApiErrorMessage } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  const update = useUpdateDashboardSite(slug);
  const remove = useDeleteDashboardSite();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  return <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={query.data}>
    {detail => <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><Link to="/app/nginx/sites" className="text-sm text-primary hover:underline">← All sites</Link><h1 className="mt-2 text-2xl font-semibold">{detail.site.domain}</h1><p className="text-muted-foreground">Project {detail.site.slug}</p></div><Badge className={statusClasses[detail.site.status]}>{detail.site.status.replace(/_/g, " ")}</Badge></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Runtime</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p><span className="font-medium">Docker:</span> {detail.site.dockerState ?? "Unknown"}</p><p><span className="font-medium">Available:</span> {detail.site.available ? "Yes" : "No"}</p><p><span className="font-medium">Enabled:</span> {detail.site.enabled ? "Yes" : "No"}</p><p><span className="font-medium">Certificate:</span> {detail.certificateInstalled == null ? "Unknown" : detail.certificateInstalled ? `Installed${detail.certificateDaysRemaining != null ? ` (${detail.certificateDaysRemaining} days remaining)` : ""}` : "Not installed"}</p>{detail.site.lastNginxError && <p className="text-red-600"><span className="font-medium">Nginx error:</span> {detail.site.lastNginxError}</p>}{detail.site.lastDockerError && <p className="text-red-600"><span className="font-medium">Docker error:</span> {detail.site.lastDockerError}</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Backups</CardTitle></CardHeader><CardContent>{detail.backups.length ? <ul className="space-y-1 text-sm">{detail.backups.map(backup => <li key={backup} className="font-mono">{backup}</li>)}</ul> : <p className="text-sm text-muted-foreground">No backups found.</p>}</CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Site settings</CardTitle></CardHeader><CardContent><form className="grid gap-4 sm:grid-cols-2" onSubmit={async event => { event.preventDefault(); const form = new FormData(event.currentTarget); try { await update.mutateAsync({ domain: String(form.get("domain")), upstreamHost: String(form.get("upstreamHost")), upstreamMode: String(form.get("upstreamMode")), upstreamExplicitPort: Number(form.get("upstreamExplicitPort")), tlsMode: String(form.get("tlsMode")), certMode: String(form.get("certMode")), certExplicitPath: String(form.get("certExplicitPath") || "") || undefined, gateEnabled: form.get("gateEnabled") === "on" }); toast.success("Site updated and activated"); } catch (error) { toast.error(getApiErrorMessage(error)); } }}><label className="text-sm">Domain<Input name="domain" defaultValue={detail.site.domain} required /></label><label className="text-sm">Upstream host<Input name="upstreamHost" defaultValue="127.0.0.1" /></label><label className="text-sm">Upstream mode<select name="upstreamMode" defaultValue="EXPLICIT_PORT" className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="EXPLICIT_PORT">Explicit port</option><option value="DOCKER_DISCOVERY">Docker discovery</option></select></label><label className="text-sm">Explicit port<Input name="upstreamExplicitPort" type="number" min="1" max="65535" defaultValue="80" /></label><label className="text-sm">TLS mode<select name="tlsMode" defaultValue="HTTP_ONLY" className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="HTTP_ONLY">HTTP only</option><option value="HTTPS">HTTPS</option><option value="HTTPS_HTTP2">HTTPS / HTTP2</option></select></label><label className="text-sm">Certificate mode<select name="certMode" defaultValue="AUTO_RESOLVE" className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="AUTO_RESOLVE">Auto resolve</option><option value="EXPLICIT_PATH">Explicit path</option></select></label><label className="flex items-center gap-2 text-sm sm:col-span-2"><input name="gateEnabled" type="checkbox" defaultChecked /> Payment gate enabled</label><div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save and activate"}</Button><Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>Delete site</Button></div></form></CardContent></Card>
      <Card><CardHeader><CardTitle>Configuration diff</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-xs text-muted-foreground">Expected generated configuration versus the current file on disk.</p><ConfigDiff expected={detail.generatedConfig} current={detail.currentConfig} /></CardContent></Card>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {detail.site.slug}?</AlertDialogTitle><AlertDialogDescription>This removes the database site and its Nginx artifacts. Existing cleanup behavior will run before deletion.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" disabled={remove.isPending} onClick={event => { event.preventDefault(); void remove.mutateAsync(detail.site.slug).then(() => { toast.success("Site deleted"); navigate("/app/nginx/sites"); }).catch(error => toast.error(getApiErrorMessage(error))); }}>{remove.isPending ? "Deleting…" : "Delete site"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>}
  </QueryState>;
}
