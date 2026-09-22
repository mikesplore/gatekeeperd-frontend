import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
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
import { useCreateDockerResource, useDeleteDockerResource, useNetworksPage, useVolumesPage, type DockerNetwork, type DockerVolume } from "@/hooks/useDockerResources";

export function DockerResourcesPage({ kind }: { kind: "networks" | "volumes" }) {
  const [params, setParams] = useSearchParams();
  const pageSize = 25;
  const page = Math.max(0, Number(params.get("page") ?? 0) || 0);
  const search = params.get("q") ?? "";
  const updateTable = (key: string, value: string) => { const next = new URLSearchParams(params); value ? next.set(key, value) : next.delete(key); if (key !== "page") next.delete("page"); setParams(next); };
  const networks = useNetworksPage(pageSize, page * pageSize, search);
  const volumes = useVolumesPage(pageSize, page * pageSize, search);
  const query = kind === "networks" ? networks : volumes;
  const create = useCreateDockerResource(kind);
  const remove = useDeleteDockerResource(kind);
  const [name, setName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const createResource = async (event: React.FormEvent) => {
    event.preventDefault();
    try { await create.mutateAsync({ name, driver: "bridge" }); setName(""); toast.success(`${kind === "networks" ? "Network" : "Volume"} created`); }
    catch (error) { toast.error(getApiErrorMessage(error)); }
  };
  const builtIn = (value: string) => ["bridge", "host", "none"].includes(value);

  return <div className="space-y-6">
    <div className="flex items-start justify-between gap-4">
      <p className="text-muted-foreground">Manage Docker {kind} used by containers and deployments.</p>
      <Button className="shrink-0" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />New {kind === "networks" ? "network" : "volume"}</Button>
    </div>
    <Card><CardHeader><CardTitle>Available {kind}</CardTitle><Input className="mt-3 max-w-sm" value={search} onChange={event => updateTable("q", event.target.value)} placeholder={`Search ${kind}...`} /></CardHeader><CardContent><QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={query.data}>{result => { const items = result.items; return <>{kind === "networks" ? <DataTable data={items as DockerNetwork[]} mode="server" total={result.total} page={page} pageSize={pageSize} onPageChange={next => updateTable("page", String(next))} getRowKey={item => item.name} columns={[{ key: "name", header: "Name", render: item => <Link className="font-medium text-primary hover:underline" to={`/app/networks/${encodeURIComponent(item.name)}`}>{item.name}</Link> }, { key: "driver", header: "Driver", render: item => <Badge variant="secondary">{item.driver}</Badge> }, { key: "scope", header: "Scope", render: item => item.scope }, { key: "ipam", header: "IPAM", render: item => <span className="text-xs">{item.gateway ?? "No gateway"}{item.subnet ? ` · ${item.subnet}` : ""}</span> }, { key: "containers", header: "Containers", render: item => item.containers.length ? <div className="flex flex-wrap gap-1">{item.containers.slice(0, 3).map(container => <Badge key={container} variant="outline" className="font-normal">{container}</Badge>)}{item.containers.length > 3 && <Badge variant="secondary">+{item.containers.length - 3}</Badge>}</div> : <span className="text-muted-foreground">0</span> }, { key: "actions", header: "", render: item => !builtIn(item.name) ? <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" title={`Delete ${item.name}`} onClick={() => setDeleteTarget(item.name)}><Trash2 className="h-4 w-4" /></Button> : <span /> }]} /> : <DataTable data={items as DockerVolume[]} mode="server" total={result.total} page={page} pageSize={pageSize} onPageChange={next => updateTable("page", String(next))} getRowKey={item => item.name} columns={[{ key: "name", header: "Name", render: item => <Link className="font-medium text-primary hover:underline" to={`/app/volumes/${encodeURIComponent(item.name)}`}>{item.name}</Link> }, { key: "driver", header: "Driver", render: item => item.driver }, { key: "scope", header: "Scope", render: item => item.scope }, { key: "mountpoint", header: "Mount point", render: item => <span className="font-mono text-xs">{item.mountpoint}</span> }, { key: "containers", header: "Mounted by", render: item => item.containers?.length ? item.containers.join(", ") : <span className="text-muted-foreground">0</span> }, { key: "actions", header: "", render: item => <Button size="icon" variant="ghost" className="text-destructive" title={`Delete ${item.name}`} onClick={() => setDeleteTarget(item.name)}><Trash2 className="h-4 w-4" /></Button> }]} />}</>; }}</QueryState></CardContent></Card>
    <SidePanel open={createOpen} onOpenChange={setCreateOpen}><SidePanelContent><SidePanelHeader className="border-b px-6 py-4 text-left"><SidePanelTitle>New {kind === "networks" ? "network" : "volume"}</SidePanelTitle><SidePanelDescription>Create a Docker resource for containers and deployments.</SidePanelDescription></SidePanelHeader><form onSubmit={async event => { await createResource(event); setCreateOpen(false); }} className="space-y-4 px-6 py-5"><div className="space-y-1"><Label>Name</Label><Input required value={name} onChange={event => setName(event.target.value)} placeholder={kind === "networks" ? "app-network" : "app-data"} /></div><SidePanelFooter className="sticky bottom-0 -mx-6 border-t bg-background px-6 py-4"><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating..." : "Create"}</Button></SidePanelFooter></form></SidePanelContent></SidePanel><AlertDialog open={deleteTarget !== null} onOpenChange={open => !open && setDeleteTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deleteTarget}?</AlertDialogTitle><AlertDialogDescription>This permanently removes the Docker {kind === "networks" ? "network" : "volume"}. Containers using it may stop working.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={remove.isPending} onClick={async () => { if (!deleteTarget) return; try { await remove.mutateAsync(deleteTarget); toast.success("Resource deleted"); setDeleteTarget(null); } catch (error) { toast.error(getApiErrorMessage(error)); } }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
