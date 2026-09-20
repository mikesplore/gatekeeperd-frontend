import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/common/DataTable";
import { QueryState } from "@/components/QueryState";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api";
import { useCreateDockerResource, useDeleteDockerResource, useNetworks, useVolumes, type DockerNetwork } from "@/hooks/useDockerResources";

export function DockerResourcesPage({ kind }: { kind: "networks" | "volumes" }) {
  const query = kind === "networks" ? useNetworks() : useVolumes();
  const create = useCreateDockerResource(kind);
  const remove = useDeleteDockerResource(kind);
  const [name, setName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const createResource = async (event: React.FormEvent) => {
    event.preventDefault();
    try { await create.mutateAsync({ name, driver: "bridge" }); setName(""); toast.success(`${kind === "networks" ? "Network" : "Volume"} created`); }
    catch (error) { toast.error(getApiErrorMessage(error)); }
  };
  const builtIn = (value: string) => ["bridge", "host", "none"].includes(value);

  return <div className="space-y-6">
    <p className="text-muted-foreground">Manage Docker {kind} used by containers and deployments.</p>
    <Card><CardContent className="pt-4"><form onSubmit={createResource} className="flex max-w-xl items-end gap-2"><div className="flex-1 space-y-1"><Label>Name</Label><Input required value={name} onChange={event => setName(event.target.value)} placeholder={kind === "networks" ? "app-network" : "app-data"} /></div><Button type="submit"><Plus className="h-4 w-4" />Create</Button></form></CardContent></Card>
    <Card><CardHeader><CardTitle>Available {kind}</CardTitle></CardHeader><CardContent><QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={query.data}>{items => kind === "networks" ? <DataTable data={items} getRowKey={item => item.name} searchPlaceholder="Search networks..." columns={[{ key: "name", header: "Name", searchable: true, searchValue: item => item.name, render: item => <Link className="font-medium text-primary hover:underline" to={`/app/networks/${encodeURIComponent(item.name)}`}>{item.name}</Link> }, { key: "driver", header: "Driver", render: item => <Badge variant="secondary">{item.driver}</Badge> }, { key: "scope", header: "Scope", render: item => item.scope }, { key: "ipam", header: "IPAM", render: item => <span className="text-xs">{item.gateway ?? "No gateway"}{item.subnet ? ` · ${item.subnet}` : ""}</span> }, { key: "containers", header: "Containers", render: item => item.containers.length ? <div className="flex flex-wrap gap-1">{item.containers.slice(0, 3).map(container => <Badge key={container} variant="outline" className="font-normal">{container}</Badge>)}{item.containers.length > 3 && <Badge variant="secondary">+{item.containers.length - 3}</Badge>}</div> : <span className="text-muted-foreground">0</span> }, { key: "actions", header: "", render: item => !builtIn(item.name) ? <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" title={`Delete ${item.name}`} onClick={() => setDeleteTarget(item.name)}><Trash2 className="h-4 w-4" /></Button> : <span /> }]} /> : <DataTable data={items} getRowKey={item => item.name} searchPlaceholder="Search volumes..." columns={[{ key: "name", header: "Name", searchable: true, searchValue: item => item.name, render: item => item.name }, { key: "driver", header: "Driver", render: item => item.driver }, { key: "scope", header: "Scope", render: item => item.scope }, { key: "mountpoint", header: "Mount point", render: item => <span className="font-mono text-xs">{item.mountpoint}</span> }, { key: "actions", header: "", render: item => <Button size="icon" variant="ghost" className="text-destructive" title={`Delete ${item.name}`} onClick={() => setDeleteTarget(item.name)}><Trash2 className="h-4 w-4" /></Button> }]} />}</QueryState></CardContent></Card>
    <AlertDialog open={deleteTarget !== null} onOpenChange={open => !open && setDeleteTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deleteTarget}?</AlertDialogTitle><AlertDialogDescription>This permanently removes the Docker {kind === "networks" ? "network" : "volume"}. Containers using it may stop working.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={remove.isPending} onClick={async () => { if (!deleteTarget) return; try { await remove.mutateAsync(deleteTarget); toast.success("Resource deleted"); setDeleteTarget(null); } catch (error) { toast.error(getApiErrorMessage(error)); } }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
