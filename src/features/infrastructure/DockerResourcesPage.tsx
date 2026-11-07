import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eraser, Plus, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidePanel, SidePanelContent, SidePanelDescription, SidePanelFooter, SidePanelHeader, SidePanelTitle } from "@/components/ui/side-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/common/DataTable";
import { QueryState } from "@/components/QueryState";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api";
import { useCreateDockerResource, useDeleteDockerResource, useNetworksPage, usePruneDockerResources, useVolumesPage, type DockerNetwork, type DockerVolume } from "@/hooks/useDockerResources";

export function DockerResourcesPage({ kind }: { kind: "networks" | "volumes" }) {
  const [params, setParams] = useSearchParams();
  const pageSize = 25;
  const page = Math.max(0, Number(params.get("page") ?? 0) || 0);
  const search = params.get("q") ?? "";
  const updateTable = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); if (key !== "page") next.delete("page"); setParams(next); };
  const networks = useNetworksPage(pageSize, page * pageSize, search);
  const volumes = useVolumesPage(pageSize, page * pageSize, search);
  const query = kind === "networks" ? networks : volumes;
  const create = useCreateDockerResource(kind);
  const remove = useDeleteDockerResource(kind);
  const cleanup = usePruneDockerResources(kind);
  const [name, setName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const createResource = async (event: React.FormEvent) => {
    event.preventDefault();
    try { await create.mutateAsync({ name, driver: "bridge" }); setName(""); toast.success(`${kind === "networks" ? "Network" : "Volume"} created`); }
    catch (error) { toast.error(getApiErrorMessage(error)); }
  };
  const builtIn = (value: string) => ["bridge", "host", "none"].includes(value);
  const clearUnused = async () => {
    try {
      const result = await cleanup.mutateAsync();
      setCleanupOpen(false);
      const resourceLabel = kind === "networks" ? "network" : "volume";
      if (result.failed.length) {
        toast.error(`Some unused ${kind} could not be cleared`, { description: `Removed ${result.removed.length}; ${result.failed.length} could not be removed and may still be in use.` });
      } else if (result.removed.length) {
        toast.success(`Cleared ${result.removed.length} unused ${resourceLabel}${result.removed.length === 1 ? "" : "s"}`, { description: `${result.skippedInUse} in-use ${kind} were kept${kind === "networks" && result.protectedCount ? `; ${result.protectedCount} protected network${result.protectedCount === 1 ? "" : "s"} were kept` : ""}.` });
      } else {
        toast.success(`No unused ${kind} to clear`, { description: `${result.skippedInUse} in-use ${kind} were kept${kind === "networks" && result.protectedCount ? `; ${result.protectedCount} protected network${result.protectedCount === 1 ? "" : "s"} were kept` : ""}.` });
      }
    } catch (error) { toast.error(getApiErrorMessage(error)); }
  };

  return <div className="space-y-6">
    <div className="flex items-start justify-between gap-4">
      <p className="text-muted-foreground">Manage Docker {kind} used by containers and deployments.</p>
      <div className="flex shrink-0 gap-2"><Button variant="outline" onClick={() => setCleanupOpen(true)}><Eraser className="h-4 w-4" />Clear unused</Button><Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />New {kind === "networks" ? "network" : "volume"}</Button></div>
    </div>
    <Card><CardHeader><CardTitle>Available {kind}</CardTitle></CardHeader><CardContent><QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={query.data}>{result => { const items = result.items; return <>{kind === "networks" ? <DataTable data={items as DockerNetwork[]} mode="server" total={result.total} page={page} pageSize={pageSize} onPageChange={next => updateTable("page", String(next))} search={{ value: search, onChange: value => updateTable("q", value) }} searchPlaceholder={`Search ${kind}…`} getRowKey={item => item.name} columns={[{ key: "name", header: "Name", render: item => <Link className="font-medium text-primary hover:underline" to={`/app/networks/${encodeURIComponent(item.name)}`}>{item.name}</Link> }, { key: "driver", header: "Driver", render: item => <Badge variant="secondary">{item.driver}</Badge> }, { key: "scope", header: "Scope", render: item => item.scope }, { key: "ipam", header: "IPAM", render: item => <span className="text-xs">{item.gateway ?? "No gateway"}{item.subnet ? ` · ${item.subnet}` : ""}</span> }, { key: "containers", header: "Containers", render: item => item.containers.length ? <div className="flex flex-wrap gap-1">{item.containers.slice(0, 3).map(container => <Badge key={container} variant="outline" className="font-normal">{container}</Badge>)}{item.containers.length > 3 && <Badge variant="secondary">+{item.containers.length - 3}</Badge>}</div> : <span className="text-muted-foreground">0</span> }, { key: "actions", header: "", render: item => !builtIn(item.name) ? <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" title={`Delete ${item.name}`} onClick={() => setDeleteTarget(item.name)}><Trash2 className="h-4 w-4" /></Button> : <span /> }]} /> : <DataTable data={items as DockerVolume[]} mode="server" total={result.total} page={page} pageSize={pageSize} onPageChange={next => updateTable("page", String(next))} search={{ value: search, onChange: value => updateTable("q", value) }} searchPlaceholder={`Search ${kind}…`} getRowKey={item => item.name} columns={[{ key: "name", header: "Name", render: item => <Link className="font-medium text-primary hover:underline" to={`/app/volumes/${encodeURIComponent(item.name)}`}>{item.name}</Link> }, { key: "driver", header: "Driver", render: item => item.driver }, { key: "scope", header: "Scope", render: item => item.scope }, { key: "mountpoint", header: "Mount point", render: item => <span className="font-mono text-xs">{item.mountpoint}</span> }, { key: "containers", header: "Mounted by", render: item => item.containers?.length ? item.containers.join(", ") : <span className="text-muted-foreground">0</span> }, { key: "actions", header: "", render: item => <Button size="icon" variant="ghost" className="text-destructive" title={`Delete ${item.name}`} onClick={() => setDeleteTarget(item.name)}><Trash2 className="h-4 w-4" /></Button> }]} />}</>; }}</QueryState></CardContent></Card>
    <SidePanel open={createOpen} onOpenChange={setCreateOpen}><SidePanelContent><SidePanelHeader className="border-b px-6 py-4 text-left"><SidePanelTitle>New {kind === "networks" ? "network" : "volume"}</SidePanelTitle><SidePanelDescription>Use readable lowercase names: <code>project-network</code> for shared networks and <code>project-service-data</code> for persistent data volumes.</SidePanelDescription></SidePanelHeader><form onSubmit={async event => { await createResource(event); setCreateOpen(false); }} className="space-y-4 px-6 py-5"><div className="space-y-1"><Label>Name</Label><Input required value={name} onChange={event => setName(event.target.value)} placeholder={kind === "networks" ? "project-network" : "project-service-data"} /></div><SidePanelFooter className="sticky bottom-0 -mx-6 border-t bg-background px-6 py-4"><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" loading={create.isPending} disabled={create.isPending}>{create.isPending ? "Creating..." : "Create"}</Button></SidePanelFooter></form></SidePanelContent></SidePanel>
    <AlertDialog open={deleteTarget !== null} onOpenChange={open => !open && setDeleteTarget(null)}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this Docker {kind === "networks" ? "network" : "volume"}?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">This permanently removes the resource. Containers using it may stop working.</span>
            <span className="block text-foreground">Resource name</span>
            <code className="block max-h-24 overflow-y-auto break-all rounded-md bg-muted p-2 font-mono text-xs">{deleteTarget}</code>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" loading={remove.isPending} disabled={remove.isPending} onClick={async () => { if (!deleteTarget) return; try { await remove.mutateAsync(deleteTarget); toast.success("Resource deleted"); setDeleteTarget(null); } catch (error) { toast.error(getApiErrorMessage(error)); } }}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={cleanupOpen} onOpenChange={setCleanupOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear unused Docker {kind}?</AlertDialogTitle>
          <AlertDialogDescription>{kind === "volumes" ? "This permanently deletes data in volumes that are not attached to any container. Volumes used by stopped containers will be kept." : "This removes custom networks with no attached containers. Built-in and Gatekeeper internal networks will be kept."}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cleanup.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" loading={cleanup.isPending} disabled={cleanup.isPending} onClick={event => { event.preventDefault(); void clearUnused(); }}>{cleanup.isPending ? "Clearing…" : "Clear unused"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
