import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryState } from "@/components/QueryState";
import { useContainer } from "@/hooks/useProjects";

export function ContainerDetailPage() {
  const { name = "" } = useParams();
  const query = useContainer(decodeURIComponent(name));
  return <div className="space-y-6">
    <div className="flex items-center gap-3"><Button asChild variant="ghost" size="icon"><Link to="/app/containers"><ArrowLeft className="h-4 w-4" /></Link></Button><div><h1 className="text-lg font-semibold">{query.data?.name ?? "Container details"}</h1><p className="text-sm text-muted-foreground">Docker runtime information</p></div></div>
    <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={query.data}>
      {(container) => <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Runtime</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><Info label="Image" value={container.image} mono /><Info label="Image ID" value={container.imageId ?? "Not available"} mono /><Info label="Status" value={container.status} /><Info label="State" value={container.state} badge /><Info label="Health" value={container.health ?? "No healthcheck"} /><Info label="Restart policy" value={`${container.restartPolicy ?? "Unknown"} (${container.restartCount ?? 0} restarts)`} /><Info label="OOM killed" value={container.oomKilled ? "Yes" : "No"} /><Info label="Ports" value={container.ports || "Not set"} mono /></CardContent></Card>
        <Card><CardHeader><CardTitle>Networks</CardTitle></CardHeader><CardContent>{container.networks?.length ? <div className="space-y-2">{container.networks.map(network => <div key={network} className="flex items-center justify-between rounded-md border p-2 text-sm"><Badge variant="outline">{network}</Badge><span className="font-mono text-xs text-muted-foreground">{container.ipAddresses?.[network] ?? "No IP"}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No networks attached.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Configuration</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><Info label="Command" value={container.command ?? "Not set"} mono /><Info label="Entrypoint" value={container.entrypoint?.join(" ") || "Not set"} mono /><Info label="Working directory" value={container.workingDirectory || "Not set"} /><Info label="User" value={container.user || "Default"} /><Info label="Environment keys" value={container.environmentKeys?.join(", ") || "None"} /></CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader><CardTitle>Volumes and mounts</CardTitle></CardHeader><CardContent>{container.volumes?.length ? <div className="space-y-2">{container.volumes.map((mount) => <div key={`${mount.hostPath}:${mount.containerPath}`} className="grid gap-1 rounded-md border p-3 text-sm sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center"><span className="font-mono break-all">{mount.hostPath}</span><span className="text-muted-foreground">to</span><span className="font-mono break-all">{mount.containerPath}</span><Badge variant="outline">{mount.readOnly ? "Read only" : "Read/write"}</Badge></div>)}</div> : <p className="text-sm text-muted-foreground">No volumes or bind mounts attached.</p>}</CardContent></Card>
      </div>}
    </QueryState>
  </div>;
}

function Info({ label, value, mono, badge }: { label: string; value: string; mono?: boolean; badge?: boolean }) { return <div><p className="text-xs text-muted-foreground">{label}</p>{badge ? <Badge variant="outline">{value}</Badge> : <p className={mono ? "break-all font-mono text-sm" : "text-sm"}>{value}</p>}</div>; }
