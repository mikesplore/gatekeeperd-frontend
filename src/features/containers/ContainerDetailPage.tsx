import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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
    <div className="flex items-center gap-3"><Button asChild variant="ghost" size="icon"><Link to="/app/containers"><ArrowLeft className="h-4 w-4" /></Link></Button><div><h1 className="text-lg font-semibold">{query.data?.name ?? "Container details"}</h1><p className="text-sm text-muted-foreground">Docker runtime information</p></div></div>
    <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={query.data}>
      {(container) => <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2"><CardHeader><CardTitle>Runtime</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Info label="Image" value={container.image} mono /><Info label="Image ID" value={container.imageId ?? "Not available"} mono truncate /><Info label="Status" value={container.status} /><Info label="State" value={container.state} badge /><Info label="Health" value={container.health ?? "No healthcheck"} /><Info label="Restart policy" value={`${container.restartPolicy ?? "Unknown"} (${container.restartCount ?? 0} restarts)`} /><Info label="OOM killed" value={container.oomKilled ? "Yes" : "No"} /><Info label="Ports" value={container.ports || "Not set"} mono /></CardContent></Card>
        <Card><CardHeader><CardTitle>Networks</CardTitle></CardHeader><CardContent>{container.networks?.length ? <div className="space-y-2">{container.networks.map(network => <div key={network} className="flex items-center justify-between rounded-md border p-2 text-sm"><Badge variant="outline">{network}</Badge><span className="font-mono text-xs text-muted-foreground">{container.ipAddresses?.[network] ?? "No IP"}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No networks attached.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Configuration</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><Info label="Command" value={container.command ?? "Not set"} mono /><Info label="Entrypoint" value={container.entrypoint?.join(" ") || "Not set"} mono /><Info label="Working directory" value={container.workingDirectory || "Not set"} /><Info label="User" value={container.user || "Default"} /><Info label="Environment keys" value={container.environmentKeys?.join(", ") || "None"} /></CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader><CardTitle>Volumes and mounts</CardTitle></CardHeader><CardContent>{container.volumes?.length ? <div className="space-y-2">{container.volumes.map((mount) => <div key={`${mount.hostPath}:${mount.containerPath}`} className="grid gap-1 rounded-md border p-3 text-sm sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center"><span className="font-mono break-all">{mount.hostPath}</span><span className="text-muted-foreground">to</span><span className="font-mono break-all">{mount.containerPath}</span><Badge variant="outline">{mount.readOnly ? "Read only" : "Read/write"}</Badge></div>)}</div> : <p className="text-sm text-muted-foreground">No volumes or bind mounts attached.</p>}</CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Recent logs</CardTitle><Button size="sm" variant="outline" onClick={() => logs.refetch()} disabled={logs.isFetching}>Refresh</Button></CardHeader><CardContent><QueryState isLoading={logs.isLoading} isError={logs.isError} error={logs.error} data={logs.data}>{(result) => <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">{result.logs || "No logs available."}</pre>}</QueryState></CardContent></Card>
      </div>}
    </QueryState>
  </div>;
}

function Info({ label, value, mono, badge, truncate }: { label: string; value: string; mono?: boolean; badge?: boolean; truncate?: boolean }) { return <div className="min-w-0"><p className="text-xs font-medium text-foreground/70">{label}</p>{badge ? <Badge variant="outline">{value}</Badge> : <p title={truncate ? value : undefined} className={`${mono ? "font-mono " : ""}text-sm ${truncate ? "truncate" : "break-words"}`}>{value}</p>}</div>; }
