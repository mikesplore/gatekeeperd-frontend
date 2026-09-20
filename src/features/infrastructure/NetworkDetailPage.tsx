import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryState } from "@/components/QueryState";
import { useNetworks } from "@/hooks/useDockerResources";

export function NetworkDetailPage() {
  const { name = "" } = useParams();
  const query = useNetworks();
  const network = query.data?.find(item => item.name === decodeURIComponent(name));
  return <div className="space-y-6"><QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={network}>{(item) => <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>{item.name}</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><Info label="Network ID" value={item.id} /><Info label="Driver" value={item.driver} /><Info label="Scope" value={item.scope} /><Info label="IPAM driver" value={item.ipamDriver ?? "Not set"} /><Info label="Subnet" value={item.subnet ?? "Not set"} /><Info label="Gateway" value={item.gateway ?? "Not set"} /><Info label="IP range" value={item.ipRange ?? "Not set"} /></CardContent></Card><Card><CardHeader><CardTitle>Configuration</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><Badge variant="outline">{item.internal ? "Internal" : "External"}</Badge><Badge variant="outline">{item.attachable ? "Attachable" : "Not attachable"}</Badge><Badge variant="outline">IPv6 {item.enableIpv6 ? "enabled" : "disabled"}</Badge>{Object.entries(item.labels ?? {}).map(([key, value]) => <Badge key={key} variant="secondary">{key}={value}</Badge>)}</CardContent></Card><Card className="lg:col-span-2"><CardHeader><CardTitle>Connected endpoints</CardTitle></CardHeader><CardContent>{item.endpoints?.length ? <div className="space-y-2">{item.endpoints.map(endpoint => <div key={endpoint.containerId} className="grid gap-2 rounded-md border p-3 text-sm sm:grid-cols-5 sm:items-center"><span className="font-medium">{endpoint.container}</span><span className="font-mono text-xs">{endpoint.ipv4 || "No IPv4"}</span><span className="font-mono text-xs">{endpoint.ipv6 || "No IPv6"}</span><span className="font-mono text-xs">{endpoint.macAddress || "No MAC"}</span><span className="truncate font-mono text-xs text-muted-foreground" title={endpoint.endpointId}>{endpoint.endpointId || "No endpoint ID"}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No containers attached.</p>}</CardContent></Card></div>}</QueryState></div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><p className="text-xs font-medium text-foreground/70">{label}</p><p className="truncate font-mono text-sm" title={value}>{value}</p></div>; }
