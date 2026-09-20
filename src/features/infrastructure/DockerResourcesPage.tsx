import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QueryState } from "@/components/QueryState";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api";
import { useCreateDockerResource, useDeleteDockerResource, useNetworks, useVolumes } from "@/hooks/useDockerResources";

export function DockerResourcesPage({ kind }: { kind: "networks" | "volumes" }) {
  const query = kind === "networks" ? useNetworks() : useVolumes();
  const create = useCreateDockerResource(kind); const remove = useDeleteDockerResource(kind); const [name, setName] = useState("");
  const createResource = async (e: React.FormEvent) => { e.preventDefault(); try { await create.mutateAsync({ name, driver: "bridge" }); setName(""); toast.success(`${kind === "networks" ? "Network" : "Volume"} created`); } catch (error) { toast.error(getApiErrorMessage(error)); } };
  return <div className="space-y-6"><div><p className="text-muted-foreground">Manage Docker {kind} used by containers and deployments.</p></div><Card><CardHeader><CardTitle className="text-sm">Create {kind === "networks" ? "network" : "volume"}</CardTitle></CardHeader><CardContent><form onSubmit={createResource} className="flex max-w-xl gap-2"><div className="flex-1 space-y-1"><Label>Name</Label><Input required value={name} onChange={e => setName(e.target.value)} placeholder={kind === "networks" ? "app-network" : "app-data"} /></div><Button type="submit" className="mt-6"><Plus className="h-4 w-4" />Create</Button></form></CardContent></Card><Card><CardHeader><CardTitle>Available {kind}</CardTitle></CardHeader><CardContent><QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={query.data}>{items => <div className="space-y-2">{items.map(item => <div key={item.name} className="flex items-center justify-between rounded-md border p-3"><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.driver} · {"scope" in item ? item.scope : ""}{["bridge", "host", "none"].includes(item.name) && " · Docker built-in"}</p></div>{!["bridge", "host", "none"].includes(item.name) && <Button size="icon" variant="ghost" className="text-destructive" onClick={async () => { try { await remove.mutateAsync(item.name); toast.success("Resource deleted"); } catch (error) { toast.error(getApiErrorMessage(error)); } }}><Trash2 className="h-4 w-4" /></Button>}</div>)}{items.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No {kind} found. Create one before selecting it in a deployment.</p>}</div>}</QueryState></CardContent></Card></div>;
}
