import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { Copy, Eye, EyeOff, FileText, Settings2, Network, KeyRound, Box } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryState } from "@/components/QueryState";
import { useContainer, useContainerLogs, useContainerPresetCredentials } from "@/hooks/useProjects";
import { SidePanel, SidePanelContent, SidePanelDescription, SidePanelHeader, SidePanelTitle } from "@/components/ui/side-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ContainerDetailPage() {
  const { name = "" } = useParams();
  const query = useContainer(decodeURIComponent(name));
  const logs = useContainerLogs(decodeURIComponent(name));
  const presetCredentials = useContainerPresetCredentials(decodeURIComponent(name));
  const [environmentOpen, setEnvironmentOpen] = useState(false);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  return <div className="space-y-6">
    <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={query.data}>
      {(container) => <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:flex sm:w-auto sm:flex-wrap">
          <TabsTrigger value="overview"><Box className="mr-2 h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="logs"><FileText className="mr-2 h-4 w-4" />Logs</TabsTrigger>
          <TabsTrigger value="configuration"><Settings2 className="mr-2 h-4 w-4" />Configuration</TabsTrigger>
          <TabsTrigger value="network"><Network className="mr-2 h-4 w-4" />Mounts &amp; networks</TabsTrigger>
          <TabsTrigger value="credentials"><KeyRound className="mr-2 h-4 w-4" />Credentials</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><Card><CardHeader><CardTitle>Runtime</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Info label="Image" value={container.image} mono /><Info label="Image ID" value={container.imageId ?? "Not available"} mono truncate /><Info label="Status" value={container.status} /><Info label="State" value={container.state} badge /><Info label="Health" value={container.health ?? "No healthcheck"} /><Info label="Restart policy" value={`${container.restartPolicy ?? "Unknown"} (${container.restartCount ?? 0} restarts)`} /><Info label="OOM killed" value={container.oomKilled ? "Yes" : "No"} /><Info label="Ports" value={container.ports || "Not set"} mono /></CardContent></Card></TabsContent>
        <TabsContent value="configuration"><Card><CardHeader><CardTitle>Configuration</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><Info label="Command" value={container.command ?? "Not set"} mono /><Info label="Entrypoint" value={container.entrypoint?.join(" ") || "Not set"} mono /><Info label="Working directory" value={container.workingDirectory || "Not set"} /><Info label="User" value={container.user || "Default"} /><EnvironmentKeys keys={container.environmentKeys ?? []} onOpen={() => setEnvironmentOpen(true)} /></CardContent></Card></TabsContent>
        <TabsContent value="network" className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Networks</CardTitle></CardHeader><CardContent>{container.networks?.length ? <div className="space-y-2">{container.networks.map(network => <div key={network} className="flex items-center justify-between rounded-md border p-2 text-sm"><Link className="font-medium text-primary hover:underline" to={`/app/networks/${encodeURIComponent(network)}`}>{network}</Link><span className="font-mono text-xs text-muted-foreground">{container.ipAddresses?.[network] ?? "No IP"}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No networks attached.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Volumes and mounts</CardTitle></CardHeader><CardContent>{container.volumes?.length ? <div className="space-y-2">{container.volumes.map((mount) => <div key={`${mount.hostPath}:${mount.containerPath}`} className="grid gap-1 rounded-md border p-3 text-sm sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center"><MountSource name={mount.volumeName} value={mount.hostPath} /><span className="text-muted-foreground">to</span><span className="font-mono break-all">{mount.containerPath}</span><Badge variant="outline">{mount.readOnly ? "Read only" : "Read/write"}</Badge></div>)}</div> : <p className="text-sm text-muted-foreground">No volumes or bind mounts attached.</p>}</CardContent></Card></TabsContent>
        <TabsContent value="credentials"><Card><CardHeader className="flex flex-row items-center justify-between gap-4"><div><CardTitle>Database and Redis credentials</CardTitle><p className="mt-1 text-xs text-muted-foreground">Retrieve preset credentials again when you need them.</p></div><Button size="sm" variant="outline" disabled={presetCredentials.isPending} onClick={() => { if (credentialsOpen) { setCredentialsOpen(false); setPasswordVisible(false); presetCredentials.reset(); } else { setCredentialsOpen(true); presetCredentials.mutate(); } }}>{credentialsOpen ? <><EyeOff className="mr-2 h-4 w-4" />Hide</> : <><Eye className="mr-2 h-4 w-4" />{presetCredentials.isPending ? "Loading..." : "Show connection details"}</>}</Button></CardHeader>{credentialsOpen && <CardContent>{presetCredentials.isError ? <div className="space-y-2 text-sm"><p className="text-muted-foreground">No supported PostgreSQL or Redis preset credentials were found for this container.</p><Button size="sm" variant="outline" onClick={() => presetCredentials.mutate()}>Retry</Button></div> : presetCredentials.data ? <PresetCredentialsView credentials={presetCredentials.data} passwordVisible={passwordVisible} onTogglePassword={() => setPasswordVisible(value => !value)} /> : <p className="text-sm text-muted-foreground">Reading credentials from Docker...</p>}</CardContent>}</Card></TabsContent>
        <TabsContent value="logs"><Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Container logs</CardTitle><p className="mt-1 text-xs text-muted-foreground">The latest output from this service runtime.</p></div><Button size="sm" variant="outline" onClick={() => logs.refetch()} disabled={logs.isFetching}>Refresh</Button></CardHeader><CardContent><QueryState isLoading={logs.isLoading} isError={logs.isError} error={logs.error} data={logs.data}>{(result) => <pre className="max-h-[32rem] overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">{result.logs || "No logs available."}</pre>}</QueryState></CardContent></Card></TabsContent>
      </Tabs>}
    </QueryState>
    <SidePanel open={environmentOpen} onOpenChange={setEnvironmentOpen}><SidePanelContent><SidePanelHeader className="border-b px-6 py-5 pr-14 text-left"><SidePanelTitle>Environment variables</SidePanelTitle><SidePanelDescription className="text-xs">Names are shown for diagnosis. Values remain hidden for security.</SidePanelDescription></SidePanelHeader><div className="space-y-2 px-6 py-5">{(query.data?.environmentKeys ?? []).map(key => <div key={key} className="rounded-md border bg-muted/20 px-3 py-2"><code className="break-all text-xs">{key}</code><p className="mt-1 text-[11px] text-muted-foreground">Value hidden</p></div>)}</div></SidePanelContent></SidePanel>
  </div>;
}

function PresetCredentialsView({ credentials, passwordVisible, onTogglePassword }: { credentials: import("@/types/container").ContainerPresetCredentials; passwordVisible: boolean; onTogglePassword: () => void }) {
  const encodedUser = encodeURIComponent(credentials.username ?? "default");
  const encodedPassword = encodeURIComponent(credentials.password ?? "");
  const servicePort = credentials.preset === "postgres" ? 5432 : 6379;
  const internalUrl = credentials.preset === "postgres"
    ? `postgresql://${encodedUser}:${encodedPassword}@${credentials.internalAddress}/${encodeURIComponent(credentials.database ?? "postgres")}`
    : credentials.password
      ? `redis://default:${encodedPassword}@${credentials.internalAddress}/0`
      : `redis://${credentials.internalAddress}/0`;
  const hostUrl = credentials.hostAddress
    ? credentials.preset === "postgres"
      ? `postgresql://${encodedUser}:${encodedPassword}@${credentials.hostAddress}/${encodeURIComponent(credentials.database ?? "postgres")}`
      : credentials.password
        ? `redis://default:${encodedPassword}@${credentials.hostAddress}/0`
        : `redis://${credentials.hostAddress}/0`
    : null;
  const copy = async (value: string, label: string) => {
    try { await navigator.clipboard.writeText(value); toast.success(`${label} copied`); }
    catch { toast.error(`Could not copy ${label.toLowerCase()}`); }
  };
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <CredentialValue label="Preset" value={credentials.preset === "postgres" ? "PostgreSQL" : "Redis"} />
      {credentials.database && <CredentialValue label="Database" value={credentials.database} onCopy={copy} />}
      <CredentialValue label="Username" value={credentials.username ?? "default"} onCopy={copy} />
      {credentials.password ? <div><p className="text-xs font-medium text-foreground/70">Password</p><div className="mt-1 flex min-w-0 items-center gap-1"><code className="min-w-0 flex-1 truncate text-xs">{passwordVisible ? credentials.password : "••••••••••••"}</code><Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label={passwordVisible ? "Hide password" : "Show password"} onClick={onTogglePassword}>{passwordVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button><Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Copy password" onClick={() => copy(credentials.password!, "Password")}><Copy className="h-3.5 w-3.5" /></Button></div></div> : <CredentialValue label="Password" value="Authentication disabled" />}
    </div>
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">Docker network connection</p>
      {credentials.internalDnsAvailable ? <CredentialCopy label="Connection URL" value={internalUrl} onCopy={copy} /> : <p className="text-xs text-amber-700">This container uses Docker's default bridge, which does not provide container-name DNS. Attach both containers to the same user-defined network before using {credentials.internalAddress}.</p>}
    </div>
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">Docker host connection</p>
      {hostUrl ? <CredentialCopy label={`Connection URL (${credentials.hostAddress})`} value={hostUrl} onCopy={copy} /> : <p className="text-xs text-muted-foreground">No host port is published for the standard service port {servicePort}.</p>}
    </div>
  </div>;
}

function CredentialValue({ label, value, onCopy }: { label: string; value: string; onCopy?: (value: string, label: string) => void }) { return <div className="min-w-0"><p className="text-xs font-medium text-foreground/70">{label}</p><div className="mt-1 flex items-center gap-1"><p className="min-w-0 flex-1 break-all font-mono text-xs">{value}</p>{onCopy && <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label={`Copy ${label}`} onClick={() => onCopy(value, label)}><Copy className="h-3.5 w-3.5" /></Button>}</div></div>; }
function CredentialCopy({ label, value, onCopy }: { label: string; value: string; onCopy: (value: string, label: string) => void }) { return <div className="flex min-w-0 items-center gap-2"><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{label}</p><code className="block break-all text-xs">{value}</code></div><Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label={`Copy ${label}`} onClick={() => onCopy(value, label)}><Copy className="h-4 w-4" /></Button></div>; }

function Info({ label, value, mono, badge, truncate }: { label: string; value: string; mono?: boolean; badge?: boolean; truncate?: boolean }) { return <div className="min-w-0"><p className="text-xs font-medium text-foreground/70">{label}</p>{badge ? <Badge variant="outline">{value}</Badge> : <p title={truncate ? value : undefined} className={`${mono ? "font-mono " : ""}text-sm ${truncate ? "truncate" : "break-words"}`}>{value}</p>}</div>; }

function EnvironmentKeys({ keys, onOpen }: { keys: string[]; onOpen: () => void }) {
  return <div className="min-w-0"><p className="text-xs font-medium text-foreground/70">Environment variables</p>{keys.length === 0 ? <p className="text-sm">None</p> : <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={onOpen}>{keys.length} variable{keys.length === 1 ? "" : "s"} configured</Button>}</div>;
}

function MountSource({ name, value }: { name?: string; value: string }) {
  return name ? <div className="min-w-0"><Link className="font-medium text-primary hover:underline" to={`/app/volumes/${encodeURIComponent(name)}`}>{name}</Link><p className="break-all font-mono text-xs text-muted-foreground">{value}</p></div> : <span className="break-all font-mono">{value}</span>;
}
