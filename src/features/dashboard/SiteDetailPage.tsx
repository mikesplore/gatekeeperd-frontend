import { useState } from "react";
import { ArrowLeft, Check, Clock3, ExternalLink, FileCode2, Globe2, LockKeyhole, MoreHorizontal, Server, Settings2, ShieldAlert, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QueryState } from "@/components/QueryState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useDashboardSite, useDeleteDashboardSite, useUpdateDashboardSite } from "@/hooks/useSiteDashboard";
import { getApiErrorMessage } from "@/lib/api";
import type { SiteStatus } from "@/types/sites";

const statusClasses: Record<SiteStatus, string> = {
  healthy: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  docker_down: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  dead_config: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400",
  drifted: "border-yellow-500/20 bg-yellow-500/10 text-yellow-800 dark:text-yellow-400",
  disabled: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  error: "border-red-500/20 bg-red-500/10 text-red-800 dark:text-red-300",
};

function ConfigDiff({ expected, current }: { expected?: string | null; current?: string | null }) {
  if (expected === current && expected) return <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-400"><Check className="h-4 w-4" />The deployed file matches the generated configuration.</div>;
  const expectedLines = expected?.split("\n") ?? [];
  const currentLines = current?.split("\n") ?? [];
  const length = Math.max(expectedLines.length, currentLines.length);
  return <pre className="max-h-[34rem] overflow-auto rounded-lg border bg-muted/50 p-4 text-xs leading-5">{Array.from({ length }, (_, index) => {
    const left = expectedLines[index] ?? "";
    const right = currentLines[index] ?? "";
    return left === right ? `  ${left}\n` : <span key={index}><span className="text-red-600">- {left}{"\n"}</span><span className="text-emerald-700">+ {right}{"\n"}</span></span>;
  })}</pre>;
}

export function SiteDetailPage() {
  const slug = useParams().slug ?? "";
  const query = useDashboardSite(slug);
  const update = useUpdateDashboardSite(slug);
  const remove = useDeleteDashboardSite();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tab, setTab] = useState("overview");

  return <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={query.data}>
    {detail => <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-3">
          <Link to="/app/nginx" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-4 w-4" />All Nginx sites</Link>
          <div className="flex flex-wrap items-center gap-3"><div className="rounded-xl bg-primary/10 p-3 text-primary"><Globe2 className="h-6 w-6" /></div><div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{detail.site.domain}</h1><p className="mt-1 text-sm text-muted-foreground">Project <span className="font-medium text-foreground">{detail.site.slug}</span></p></div><Badge variant="outline" className={`capitalize ${statusClasses[detail.site.status]}`}>{detail.site.status.replace(/_/g, " ")}</Badge></div>
        </div>
        <div className="flex flex-wrap items-center gap-2"><Button variant="outline" asChild><a href={`https://${detail.site.domain}`} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Visit site</a></Button><Button variant="outline" asChild><Link to={`/app/nginx/sites/${encodeURIComponent(detail.site.slug)}/advanced`}><FileCode2 className="mr-2 h-4 w-4" />Advanced config</Link></Button><Button variant="outline" onClick={() => setTab("settings")}><Settings2 className="mr-2 h-4 w-4" />Settings</Button><Button variant="destructive" size="icon" aria-label="Delete site" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" /></Button></div>
      </div>

      {(detail.site.lastNginxError || detail.site.lastDockerError) && <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"><ShieldAlert className="h-5 w-5 shrink-0 text-destructive" /><div><p className="font-medium">Site needs attention</p><p className="mt-1 text-sm text-muted-foreground">{detail.site.lastNginxError ?? detail.site.lastDockerError}</p></div></div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="flex items-start gap-3 p-5"><span className="rounded-lg bg-primary/10 p-2 text-primary"><Server className="h-4 w-4" /></span><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Upstream</p><p className="mt-1 font-semibold">{detail.site.upstreamMode === "docker_discovery" ? detail.site.upstreamContainerName || "Docker discovery" : `${detail.site.upstreamHost || "127.0.0.1"}:${detail.site.upstreamExplicitPort ?? "—"}`}</p><p className="mt-1 text-xs text-muted-foreground">{detail.site.dockerState ?? "Health not reported"} · {detail.site.available ? "Config available" : "Config missing"}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-start gap-3 p-5"><span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-700"><Check className="h-4 w-4" /></span><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nginx</p><p className="mt-1 font-semibold">{detail.site.enabled ? "Enabled" : "Disabled"}</p><p className="mt-1 text-xs text-muted-foreground">{detail.site.enabled ? "Site is linked and active" : "No enabled site link"}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-start gap-3 p-5"><span className="rounded-lg bg-sky-500/10 p-2 text-sky-700"><LockKeyhole className="h-4 w-4" /></span><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Certificate</p><p className="mt-1 font-semibold">{detail.certificateInstalled == null ? "Checking" : detail.certificateInstalled ? "Installed" : "Not installed"}</p><p className="mt-1 text-xs text-muted-foreground">{detail.certificateDaysRemaining != null ? `${detail.certificateDaysRemaining} days remaining` : "TLS status"}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-start gap-3 p-5"><span className="rounded-lg bg-muted p-2 text-muted-foreground"><Clock3 className="h-4 w-4" /></span><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Configuration</p><p className="mt-1 font-semibold">Version {detail.site.configVersion}</p><p className="mt-1 text-xs text-muted-foreground">{detail.site.customerName ?? "No customer assigned"}</p></div></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0 text-muted-foreground"><TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Overview</TabsTrigger><TabsTrigger value="configuration" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Configuration</TabsTrigger><TabsTrigger value="history" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">History</TabsTrigger><TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Settings</TabsTrigger></TabsList>

        <TabsContent value="overview" className="space-y-4 pt-2">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2"><CardHeader><CardTitle>Site health</CardTitle><CardDescription>Current proxy and upstream state.</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Upstream health</p><p className="mt-1 font-medium capitalize">{detail.site.dockerState ?? "Not reported"}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Configuration file</p><p className="mt-1 font-medium">{detail.site.available ? "Available" : "Missing"}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Enabled link</p><p className="mt-1 font-medium">{detail.site.enabled ? "Active" : "Inactive"}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">TLS certificate</p><p className="mt-1 font-medium">{detail.certificateInstalled ? `Installed${detail.certificateDaysRemaining != null ? ` · ${detail.certificateDaysRemaining} days remaining` : ""}` : detail.certificateInstalled == null ? "Unknown" : "Not installed"}</p></div></CardContent></Card>
            <Card><CardHeader><CardTitle>Project</CardTitle><CardDescription>Site ownership and identity.</CardDescription></CardHeader><CardContent className="space-y-4 text-sm"><div><p className="text-xs text-muted-foreground">Slug</p><p className="mt-1 font-mono">{detail.site.slug}</p></div><div><p className="text-xs text-muted-foreground">Customer</p><p className="mt-1">{detail.site.customerName ?? "Unassigned"}</p></div><div><p className="text-xs text-muted-foreground">Project ID</p><p className="mt-1 break-all font-mono text-xs">{detail.site.projectId}</p></div></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4 pt-2">
          <Card><CardHeader><div className="flex items-center gap-3"><FileCode2 className="h-5 w-5 text-primary" /><div><CardTitle>Live configuration</CardTitle><CardDescription>Generated configuration compared with the file currently deployed.</CardDescription></div></div></CardHeader><CardContent className="space-y-5"><div><h3 className="mb-2 text-sm font-medium">Configuration diff</h3><ConfigDiff expected={detail.generatedConfig} current={detail.currentConfig} /></div><div className="grid gap-4 lg:grid-cols-2"><div><h3 className="mb-2 text-sm font-medium">Generated</h3><pre className="max-h-72 overflow-auto rounded-lg border bg-muted/40 p-4 text-xs leading-relaxed">{detail.generatedConfig || "No generated configuration available."}</pre></div><div><h3 className="mb-2 text-sm font-medium">Deployed</h3><pre className="max-h-72 overflow-auto rounded-lg border bg-muted/40 p-4 text-xs leading-relaxed">{detail.currentConfig || "No Nginx file found."}</pre></div></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="history" className="pt-2"><Card><CardHeader><div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-primary" /><div><CardTitle>Configuration backups</CardTitle><CardDescription>Saved versions available for rollback.</CardDescription></div></div></CardHeader><CardContent>{detail.backups.length ? <ol className="space-y-3">{detail.backups.map((backup, index) => <li key={backup} className="flex items-center justify-between gap-4 rounded-lg border p-4"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">{detail.backups.length - index}</span><div><p className="font-mono text-sm">{backup}</p><p className="mt-1 text-xs text-muted-foreground">Saved configuration backup</p></div></div><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></li>)}</ol> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No configuration backups yet.</p>}</CardContent></Card></TabsContent>

        <TabsContent value="settings" className="pt-2"><Card><CardHeader><CardTitle>Site settings</CardTitle><CardDescription>Update the domain, upstream, TLS, and payment gate behavior.</CardDescription></CardHeader><CardContent><form className="grid gap-5 sm:grid-cols-2" onSubmit={async event => { event.preventDefault(); const form = new FormData(event.currentTarget); try { await update.mutateAsync({ domain: String(form.get("domain")), upstreamHost: String(form.get("upstreamHost")), upstreamMode: String(form.get("upstreamMode")), upstreamExplicitPort: Number(form.get("upstreamExplicitPort")), tlsMode: String(form.get("tlsMode")), certMode: String(form.get("certMode")), certExplicitPath: String(form.get("certExplicitPath") || "") || undefined, gateEnabled: form.get("gateEnabled") === "on" }); toast.success("Site updated and activated"); } catch (error) { toast.error(getApiErrorMessage(error)); } }}>
            <label className="space-y-2 text-sm">Domain<Input name="domain" defaultValue={detail.site.domain} required /></label><label className="space-y-2 text-sm">Upstream host<Input name="upstreamHost" defaultValue="127.0.0.1" /></label><label className="space-y-2 text-sm">Upstream mode<select name="upstreamMode" defaultValue="EXPLICIT_PORT" className="h-10 w-full rounded-md border bg-background px-3"><option value="EXPLICIT_PORT">Explicit port</option><option value="DOCKER_DISCOVERY">Docker discovery</option></select></label><label className="space-y-2 text-sm">Explicit port<Input name="upstreamExplicitPort" type="number" min="1" max="65535" defaultValue="80" /></label><label className="space-y-2 text-sm">TLS mode<select name="tlsMode" defaultValue="HTTP_ONLY" className="h-10 w-full rounded-md border bg-background px-3"><option value="HTTP_ONLY">HTTP only</option><option value="HTTPS">HTTPS</option><option value="HTTPS_HTTP2">HTTPS / HTTP2</option></select></label><label className="space-y-2 text-sm">Certificate mode<select name="certMode" defaultValue="AUTO_RESOLVE" className="h-10 w-full rounded-md border bg-background px-3"><option value="AUTO_RESOLVE">Auto resolve</option><option value="EXPLICIT_PATH">Explicit path</option></select></label><label className="space-y-2 text-sm sm:col-span-2">Explicit certificate path<Input name="certExplicitPath" placeholder="/etc/letsencrypt/live/domain/fullchain.pem" /></label><label className="flex items-center gap-3 rounded-lg border p-4 text-sm sm:col-span-2"><input name="gateEnabled" type="checkbox" defaultChecked className="h-4 w-4 accent-primary" /><span><span className="block font-medium">Payment gate enabled</span><span className="text-muted-foreground">Apply Gatekeeper payment checks to this site.</span></span></label><div className="flex justify-end sm:col-span-2"><Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save and activate"}</Button></div>
          </form></CardContent></Card></TabsContent>
      </Tabs>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {detail.site.slug}?</AlertDialogTitle><AlertDialogDescription>This removes the database site and its Nginx artifacts. Existing cleanup behavior will run before deletion.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" disabled={remove.isPending} onClick={event => { event.preventDefault(); void remove.mutateAsync(detail.site.slug).then(() => { toast.success("Site deleted"); navigate("/app/nginx"); }).catch(error => toast.error(getApiErrorMessage(error))); }}>{remove.isPending ? "Deleting…" : "Delete site"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>}
  </QueryState>;
}
