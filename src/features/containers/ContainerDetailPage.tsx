import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryState } from "@/components/QueryState";
import { useContainer, useContainerLogs } from "@/hooks/useProjects";

export function ContainerDetailPage() {
  const { name = "" } = useParams();
  const query = useContainer(decodeURIComponent(name));
  const logs = useContainerLogs(decodeURIComponent(name));
  return <div className="space-y-6">
    <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={query.data}>
      {(container) => <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2"><CardHeader><CardTitle>Runtime</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Info label="Image" value={container.image} mono /><Info label="Image ID" value={container.imageId ?? "Not available"} mono truncate /><Info label="Status" value={container.status} /><Info label="State" value={container.state} badge /><Info label="Health" value={container.health ?? "No healthcheck"} /><Info label="Restart policy" value={`${container.restartPolicy ?? "Unknown"} (${container.restartCount ?? 0} restarts)`} /><Info label="OOM killed" value={container.oomKilled ? "Yes" : "No"} /><Info label="Ports" value={container.ports || "Not set"} mono /></CardContent></Card>
        <Card className="h-full min-h-56"><CardHeader><CardTitle>Networks</CardTitle></CardHeader><CardContent>{container.networks?.length ? <div className="space-y-2">{container.networks.map(network => <div key={network} className="flex items-center justify-between rounded-md border p-2 text-sm"><Link className="font-medium text-primary hover:underline" to={`/app/networks/${encodeURIComponent(network)}`}>{network}</Link><span className="font-mono text-xs text-muted-foreground">{container.ipAddresses?.[network] ?? "No IP"}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No networks attached.</p>}</CardContent></Card>
        <Card className="h-full min-h-56"><CardHeader><CardTitle>Configuration</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><Info label="Command" value={container.command ?? "Not set"} mono /><Info label="Entrypoint" value={container.entrypoint?.join(" ") || "Not set"} mono /><Info label="Working directory" value={container.workingDirectory || "Not set"} /><Info label="User" value={container.user || "Default"} /><EnvironmentKeys keys={container.environmentKeys ?? []} /></CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader><CardTitle>Volumes and mounts</CardTitle></CardHeader><CardContent>{container.volumes?.length ? <div className="space-y-2">{container.volumes.map((mount) => <div key={`${mount.hostPath}:${mount.containerPath}`} className="grid gap-1 rounded-md border p-3 text-sm sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center"><MountSource name={mount.volumeName} value={mount.hostPath} /><span className="text-muted-foreground">to</span><span className="font-mono break-all">{mount.containerPath}</span><Badge variant="outline">{mount.readOnly ? "Read only" : "Read/write"}</Badge></div>)}</div> : <p className="text-sm text-muted-foreground">No volumes or bind mounts attached.</p>}</CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Recent logs</CardTitle><Button size="sm" variant="outline" onClick={() => logs.refetch()} disabled={logs.isFetching}>Refresh</Button></CardHeader><CardContent><QueryState isLoading={logs.isLoading} isError={logs.isError} error={logs.error} data={logs.data}>{(result) => <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">{result.logs || "No logs available."}</pre>}</QueryState></CardContent></Card>
      </div>}
    </QueryState>
  </div>;
}

function Info({ label, value, mono, badge, truncate }: { label: string; value: string; mono?: boolean; badge?: boolean; truncate?: boolean }) { return <div className="min-w-0"><p className="text-xs font-medium text-foreground/70">{label}</p>{badge ? <Badge variant="outline">{value}</Badge> : <p title={truncate ? value : undefined} className={`${mono ? "font-mono " : ""}text-sm ${truncate ? "truncate" : "break-words"}`}>{value}</p>}</div>; }

function EnvironmentKeys({ keys }: { keys: string[] }) {
  return <div className="min-w-0"><p className="text-xs font-medium text-foreground/70">Environment variables</p>{keys.length === 0 ? <p className="text-sm">None</p> : <details className="group"><summary className="cursor-pointer text-sm text-primary hover:underline">{keys.length} variable{keys.length === 1 ? "" : "s"} configured</summary><div className="mt-2 max-h-40 overflow-y-auto rounded-md border bg-muted/30 p-2"><div className="grid gap-1 sm:grid-cols-2">{keys.map(key => <code key={key} className="truncate text-xs" title={key}>{key}</code>)}</div></div><p className="mt-1 text-xs text-muted-foreground">Values are hidden for security.</p></details>}</div>;
}

function MountSource({ name, value }: { name?: string; value: string }) {
  return name ? <div className="min-w-0"><Link className="font-medium text-primary hover:underline" to={`/app/volumes/${encodeURIComponent(name)}`}>{name}</Link><p className="break-all font-mono text-xs text-muted-foreground">{value}</p></div> : <span className="break-all font-mono">{value}</span>;
}
