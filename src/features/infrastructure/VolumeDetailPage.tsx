import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryState } from "@/components/QueryState";
import { useVolumes } from "@/hooks/useDockerResources";

export function VolumeDetailPage() {
  const { name = "" } = useParams();
  const query = useVolumes();
  const volume = query.data?.find(item => item.name === decodeURIComponent(name));
  return <div className="space-y-6"><QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={volume}>{item => <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>{item.name}</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><Info label="Driver" value={item.driver} /><Info label="Scope" value={item.scope} /><Info label="Created" value={item.createdAt ?? "Not reported"} /><Info label="Mount point" value={item.mountpoint} /></CardContent></Card><Card><CardHeader><CardTitle>Associations</CardTitle></CardHeader><CardContent>{item.containers?.length ? <div className="flex flex-wrap gap-2">{item.containers.map(container => <Badge key={container} variant="outline">{container}</Badge>)}</div> : <p className="text-sm text-muted-foreground">No containers are using this volume.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Labels</CardTitle></CardHeader><CardContent>{Object.keys(item.labels ?? {}).length ? <div className="flex flex-wrap gap-2">{Object.entries(item.labels ?? {}).map(([key, value]) => <Badge key={key} variant="secondary">{key}={value}</Badge>)}</div> : <p className="text-sm text-muted-foreground">No labels.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Driver options</CardTitle></CardHeader><CardContent>{Object.keys(item.options ?? {}).length ? <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(item.options, null, 2)}</pre> : <p className="text-sm text-muted-foreground">No custom driver options.</p>}</CardContent></Card></div>}</QueryState></div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><p className="text-xs font-medium text-foreground/70">{label}</p><p className="truncate font-mono text-sm" title={value}>{value}</p></div>; }
