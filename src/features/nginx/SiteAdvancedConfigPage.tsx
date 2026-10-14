import { useState } from "react";
import { AlertTriangle, Check, Plus, RefreshCw, RotateCcw, Trash2, Wrench } from "lucide-react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryState } from "@/components/QueryState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardSite } from "@/hooks/useSiteDashboard";
import { useNginxConfig, useNginxCustomLocationAdd, useNginxCustomLocationRemove, useNginxDiagnostics, useNginxRollback, useNginxVersions } from "@/hooks/useNginx";
import { getApiErrorMessage } from "@/lib/api";

function StatusTicker({ label, value, tone }: { label: string; value: string; tone: "good" | "warn" | "bad" }) {
  const classes = tone === "good"
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : tone === "bad"
      ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
      : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300";
  return <span className={`inline-flex min-w-[5.5rem] items-center justify-between gap-3 rounded-md border px-3 py-1.5 text-xs font-medium ${classes}`}><span className="text-foreground/60">{label}</span><span className="whitespace-nowrap">{value}</span></span>;
}

function DiffView({ before, after, isUpdating, error }: { before?: string | null; after?: string | null; isUpdating: boolean; error: string | null }) {
  if (isUpdating) return <div className="flex h-full min-h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Updating preview…</div>;
  if (error) return <div className="flex min-h-48 items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>;
  if (!before && !after) return <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Generated and deployed configuration are not available for comparison.</div>;
  if (before === after) return null;
  const left = before?.split("\n") ?? [];
  const right = after?.split("\n") ?? [];
  const lineCount = Math.max(left.length, right.length);
  return <div className="grid min-h-48 grid-cols-2 overflow-auto rounded-lg border bg-background font-mono text-[11px] leading-5"><div className="min-w-0 border-r"><div className="sticky top-0 border-b bg-muted/80 px-3 py-2 font-sans text-xs font-semibold text-muted-foreground">Deployed</div>{Array.from({ length: lineCount }, (_, i) => <div key={i} className={`whitespace-pre px-3 ${left[i] === right[i] ? "" : "bg-red-500/10 text-red-800 dark:text-red-300"}`}><span className="mr-3 select-none text-muted-foreground/60">{i + 1}</span>{left[i] ?? " "}</div>)}</div><div className="min-w-0"><div className="sticky top-0 border-b bg-muted/80 px-3 py-2 font-sans text-xs font-semibold text-muted-foreground">Preview</div>{Array.from({ length: lineCount }, (_, i) => <div key={i} className={`whitespace-pre px-3 ${left[i] === right[i] ? "" : "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"}`}><span className="mr-3 select-none text-muted-foreground/60">{i + 1}</span>{right[i] ?? " "}</div>)}</div></div>;
}

export function SiteAdvancedConfigPage() {
  const slug = useParams().slug ?? "";
  const site = useDashboardSite(slug);
  const config = useNginxConfig(slug);
  const diagnostics = useNginxDiagnostics();
  const versions = useNginxVersions(slug);
  const rollback = useNginxRollback(slug);
  const addLocation = useNginxCustomLocationAdd(slug);
  const removeLocation = useNginxCustomLocationRemove(slug);
  const [locationPath, setLocationPath] = useState("");
  const [locationDirectives, setLocationDirectives] = useState("");

  return <QueryState isLoading={site.isLoading} isError={site.isError} error={site.error} data={site.data}>
    {detail => <div className="w-full space-y-5">
      <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-y bg-background/95 px-4 py-3 shadow-sm backdrop-blur md:-mx-6 md:px-6">
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{detail.site.upstreamMode === "docker_discovery" ? `${detail.site.upstreamHost || "127.0.0.1"}:${detail.site.upstreamExplicitPort ?? "—"} · active deployment` : `${detail.site.upstreamHost || "127.0.0.1"}:${detail.site.upstreamExplicitPort ?? "—"}`}</p></div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusTicker label="TLS" value={detail.site.tlsMode?.replace(/_/g, " ") ?? "unknown"} tone={detail.site.tlsMode ? "good" : "warn"} />
            <StatusTicker label="Gate" value={detail.site.gateEnabled == null ? "unknown" : detail.site.gateEnabled ? "on" : "off"} tone={detail.site.gateEnabled == null ? "warn" : detail.site.gateEnabled ? "good" : "warn"} />
            {config.data && <><StatusTicker label="File" value={config.data.available ? "available" : "missing"} tone={config.data.available ? "good" : "bad"} /><StatusTicker label="Link" value={config.data.enabled ? "enabled" : "disabled"} tone={config.data.enabled ? "good" : "warn"} /><StatusTicker label="Config" value={config.data.managed ? "managed" : "external"} tone={config.data.managed ? "good" : "warn"} />{config.data.drifted && <Badge variant="destructive">Drift detected</Badge>}</>}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 gap-2"><Button variant="outline" size="sm" onClick={() => void Promise.all([config.refetch(), site.refetch()])} disabled={config.isFetching || site.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${config.isFetching ? "animate-spin" : ""}`} />Refresh</Button><Button size="sm" onClick={() => diagnostics.mutate(undefined, { onError: error => toast.error(getApiErrorMessage(error)) })} disabled={diagnostics.isPending}>{diagnostics.data?.valid && !diagnostics.isPending ? <Check className="mr-2 h-4 w-4 text-emerald-300" /> : <Wrench className="mr-2 h-4 w-4" />}{diagnostics.isPending ? "Testing…" : "Run nginx -t"}</Button></div>
      </div>

      {diagnostics.data && !diagnostics.data.valid && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3"><div className="flex items-center justify-between"><p className="text-sm font-medium">Nginx test failed</p><Badge variant="destructive">Failed</Badge></div><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{diagnostics.data.output}</pre></div>}

      <Tabs defaultValue="blocks">
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="blocks" className="flex-1 sm:flex-none">Blocks</TabsTrigger>
            <TabsTrigger value="deployed" className="flex-1 sm:flex-none">Deployed config</TabsTrigger>
            <TabsTrigger value="history" className="flex-1 sm:flex-none">Config history</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="blocks">
      <Card>
        <CardHeader className="border-b bg-muted/20"><CardTitle>Custom Nginx locations</CardTitle><CardDescription>Add app-specific location blocks. Gatekeeper’s auth and paywall checks are automatically retained; generated core blocks stay protected.</CardDescription></CardHeader>
        <CardContent className="grid gap-5 p-4 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)] lg:p-5">
          <section className="min-w-0 space-y-3"><div><h2 className="text-sm font-semibold">Add a location</h2><p className="text-xs text-muted-foreground">Use a path such as /socket.io/ and valid Nginx directives.</p></div>
            <form className="space-y-3 rounded-lg border bg-background p-3" onSubmit={event => { event.preventDefault(); addLocation.mutate({ path: locationPath, directives: locationDirectives }, { onSuccess: () => { setLocationPath(""); setLocationDirectives(""); toast.success("Custom location added and Nginx reloaded"); }, onError: error => toast.error(getApiErrorMessage(error)) }); }}>
              <label className="block space-y-1 text-xs font-medium">Location path<input required value={locationPath} onChange={event => setLocationPath(event.target.value)} placeholder="/socket.io/" className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-mono text-sm" /></label>
              <label className="block space-y-1 text-xs font-medium">Additional directives<textarea required value={locationDirectives} onChange={event => setLocationDirectives(event.target.value)} placeholder={'proxy_http_version 1.1;\nproxy_set_header Upgrade $http_upgrade;\nproxy_set_header Connection "upgrade";'} className="mt-1 min-h-32 w-full rounded-md border bg-background p-3 font-mono text-xs" /><span className="text-muted-foreground">The app upstream, payment gate, and paywall are added automatically. Don’t add a proxy_pass directive.</span></label>
              <Button type="submit" size="sm" disabled={addLocation.isPending}><Plus className="mr-2 h-4 w-4" />{addLocation.isPending ? "Applying…" : "Add location"}</Button>
            </form>
            <div className="space-y-2"><h2 className="text-sm font-semibold">Existing custom locations</h2>
              {config.data?.customLocations?.length ? config.data.customLocations.map(location => <div key={location.id} className="rounded-lg border bg-background p-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><code className="font-medium">location {location.path}</code><pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{location.directives}</pre></div><Button size="sm" variant="outline" disabled={removeLocation.isPending} onClick={() => { if (confirm(`Remove location ${location.path}?`)) removeLocation.mutate(location.id, { onSuccess: () => toast.success("Custom location removed and Nginx reloaded"), onError: error => toast.error(getApiErrorMessage(error)) }); }}><Trash2 className="mr-2 h-4 w-4" />Remove</Button></div></div>) : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No custom location blocks yet.</p>}
            </div>
            <div className="space-y-2"><h2 className="text-sm font-semibold">Gatekeeper blocks</h2><div className="flex flex-wrap gap-2">{config.data?.blocks.filter(block => block.type !== "custom").map((block, index) => <Badge key={`${block.type}-${index}`} variant="secondary">{block.type} · protected</Badge>)}</div><p className="text-xs text-muted-foreground">Authentication, paywall, bypass, and application routing blocks cannot be removed here.</p></div>
          </section>
          <section className="min-w-0 space-y-3"><div><h2 className="text-sm font-semibold">Live diff preview</h2><p className="text-xs text-muted-foreground">Generated configuration compared with the deployed file.</p></div><DiffView before={config.data?.content ?? detail.currentConfig} after={detail.generatedConfig} isUpdating={false} error={null} /></section>
        </CardContent>
      </Card>
        </TabsContent>
        <TabsContent value="deployed" className="min-w-0"><Card className="flex min-w-0 flex-col overflow-hidden" style={{ height: "calc(100dvh - 16rem)" }}><CardHeader className="shrink-0"><CardTitle>Deployed configuration</CardTitle><CardDescription>{config.data?.configPath ?? "Current Nginx site file"}</CardDescription></CardHeader><CardContent className="min-h-0 min-w-0 flex-1 overflow-hidden"><div style={{ height: "100%", width: "100%", overflow: "auto", overscrollBehavior: "contain" }} className="rounded-lg border bg-muted/40">{config.data?.content ? <pre style={{ width: "max-content", minWidth: "100%" }} className="whitespace-pre p-4 text-xs leading-relaxed">{config.data.content}</pre> : <p className="p-6 text-sm text-muted-foreground">{config.isLoading ? "Loading deployed file…" : "No deployed configuration is available."}</p>}</div></CardContent></Card></TabsContent>
        <TabsContent value="history"><Card><CardHeader><CardTitle>Configuration history</CardTitle><CardDescription>{versions.data?.length ?? 0} saved versions available for rollback.</CardDescription></CardHeader><CardContent className="space-y-2">{versions.data?.length ? versions.data.map(version => <div key={version.name} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-mono text-xs">{version.name}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(version.createdAt).toLocaleString()} · {version.sizeBytes.toLocaleString()} bytes</p></div><Button size="sm" variant="outline" disabled={rollback.isPending} onClick={() => { if (confirm(`Roll back to ${version.name}?`)) rollback.mutate(version.name, { onSuccess: () => { void config.refetch(); void site.refetch(); toast.success("Configuration restored"); }, onError: error => toast.error(getApiErrorMessage(error)) }); }}><RotateCcw className="mr-2 h-4 w-4" />Restore</Button></div>) : <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{versions.isLoading ? "Loading saved versions…" : "No saved versions yet."}</p>}</CardContent></Card></TabsContent>
      </Tabs>

    </div>}
  </QueryState>;
}
