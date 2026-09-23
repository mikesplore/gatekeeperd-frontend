import { useState } from "react";
import { ArrowLeft, FileCode2, RefreshCw, RotateCcw, Wrench } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryState } from "@/components/QueryState";
import { useDashboardSite } from "@/hooks/useSiteDashboard";
import { useNginxBlockUpdate, useNginxConfig, useNginxDiagnostics, useNginxRollback, useNginxVersions } from "@/hooks/useNginx";
import { getApiErrorMessage } from "@/lib/api";

export function SiteAdvancedConfigPage() {
  const slug = useParams().slug ?? "";
  const site = useDashboardSite(slug);
  const config = useNginxConfig(slug);
  const diagnostics = useNginxDiagnostics();
  const versions = useNginxVersions(slug);
  const rollback = useNginxRollback(slug);
  const preview = useNginxBlockUpdate(slug, "preview");
  const apply = useNginxBlockUpdate(slug, "apply");
  const [editing, setEditing] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  return <QueryState isLoading={site.isLoading} isError={site.isError} error={site.error} data={site.data}>
    {detail => <div className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2"><Link to={`/app/nginx/sites/${encodeURIComponent(detail.site.slug)}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to {detail.site.domain}</Link><div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Advanced configuration</h1><p className="mt-1 text-sm text-muted-foreground">Inspect and manage the Nginx configuration for {detail.site.domain}.</p></div></div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm"><span className="text-muted-foreground">Upstream</span><span className="font-medium">{detail.site.upstreamMode === "docker_discovery" ? detail.site.upstreamContainerName || "Docker discovery" : `${detail.site.upstreamHost || "127.0.0.1"}:${detail.site.upstreamExplicitPort ?? "—"}`}</span></div>
      </div>

      <Card>
        <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><FileCode2 className="h-5 w-5 text-primary" /><div><CardTitle>Configuration inspection</CardTitle><CardDescription>Inspect the available and enabled file, run Nginx validation, and manage this site’s config.</CardDescription></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => void config.refetch()} disabled={config.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${config.isFetching ? "animate-spin" : ""}`} />Refresh</Button><Button variant="outline" size="sm" onClick={() => diagnostics.mutate(undefined, { onError: error => toast.error(getApiErrorMessage(error)) })} disabled={diagnostics.isPending}><Wrench className="mr-2 h-4 w-4" />{diagnostics.isPending ? "Testing…" : "Run nginx -t"}</Button></div></div></CardHeader>
        <CardContent className="space-y-5">
          {config.data ? <><div className="flex flex-wrap gap-2"><Badge variant={config.data.available ? "default" : "secondary"}>Available {config.data.available ? "· yes" : "· no"}</Badge><Badge variant={config.data.enabled ? "default" : "secondary"}>Enabled {config.data.enabled ? "· yes" : "· no"}</Badge><Badge variant={config.data.managed ? "default" : "outline"}>Managed {config.data.managed ? "· yes" : "· no"}</Badge>{config.data.drifted && <Badge variant="destructive">Drift detected</Badge>}</div><pre className="max-h-[34rem] overflow-auto rounded-lg border bg-muted/40 p-4 text-xs leading-relaxed">{config.data.content || "No configuration content available."}</pre></> : <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{config.isLoading ? "Loading configuration…" : "No configuration inspection available."}</p>}
          {diagnostics.data && <div className="rounded-lg border p-4"><div className="flex items-center justify-between"><p className="text-sm font-medium">Latest nginx -t result</p><Badge variant={diagnostics.data.valid ? "default" : "destructive"}>{diagnostics.data.valid ? "Valid" : "Invalid"}</Badge></div><pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{diagnostics.data.output}</pre></div>}
          {config.data?.blocks?.length ? <div className="space-y-3"><h2 className="text-sm font-medium">Managed blocks</h2>{config.data.blocks.map((block, index) => <div key={`${block.header}-${index}`} className="rounded-lg border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{block.type}</p><p className="font-mono text-xs text-muted-foreground">{block.header}</p></div><Button size="sm" variant="outline" onClick={() => { setEditing(index); setContent(block.content); setPreviewContent(null); }}>Edit block</Button></div>{editing === index && <div className="mt-4 space-y-3"><textarea value={content} onChange={event => setContent(event.target.value)} className="min-h-40 w-full rounded-md border bg-background p-3 font-mono text-xs"/><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={preview.isPending} onClick={async () => { try { setPreviewContent((await preview.mutateAsync({ blockIndex: index, content })).data.config); } catch (error) { toast.error(getApiErrorMessage(error)); } }}>Preview</Button><Button size="sm" disabled={apply.isPending} onClick={() => apply.mutate({ blockIndex: index, content }, { onSuccess: () => { setEditing(null); setPreviewContent(null); toast.success("Nginx block updated"); }, onError: error => toast.error(getApiErrorMessage(error)) })}>Apply block</Button><Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>{previewContent && <pre className="max-h-60 overflow-auto rounded-md bg-muted p-3 text-xs">{previewContent}</pre>}</div>}</div>)}</div> : null}
        </CardContent>
      </Card>

      {versions.data?.length ? <Card><CardHeader><CardTitle>Configuration history</CardTitle><CardDescription>Restore a saved version of this site’s Nginx configuration.</CardDescription></CardHeader><CardContent className="space-y-3">{versions.data.map(version => <div key={version.name} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-mono text-xs">{version.name}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(version.createdAt).toLocaleString()} · {version.sizeBytes.toLocaleString()} bytes</p></div><Button size="sm" variant="outline" disabled={rollback.isPending} onClick={() => { if (confirm(`Roll back to ${version.name}?`)) rollback.mutate(version.name, { onSuccess: () => toast.success("Configuration restored"), onError: error => toast.error(getApiErrorMessage(error)) }); }}><RotateCcw className="mr-2 h-4 w-4"/>Restore</Button></div>)}</CardContent></Card> : null}
    </div>}
  </QueryState>;
}
