import { useState } from "react";
import { Activity, GitBranch, RefreshCw, RotateCcw, Square, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QueryState } from "@/components/QueryState";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api";
import { useCreateDeployment, useDeploymentAction, useDeployments } from "@/hooks/useDeployments";
import type { CreateDeploymentPayload, DeploymentJob } from "@/types/deployment";

const initialForm: CreateDeploymentPayload = { repository: "", gitRef: "main", registry: "docker.io", imageName: "", imageTag: "latest", network: "bridge", restartPolicy: "unless-stopped", hostPort: undefined, containerPort: undefined, createNetworkIfMissing: false };

function statusVariant(status: DeploymentJob["status"]): "default" | "secondary" | "destructive" | "outline" {
  if (status === "succeeded") return "default";
  if (status === "failed") return "destructive";
  if (status === "running" || status === "queued") return "secondary";
  return "outline";
}

export function DeploymentsPage() {
  const deployments = useDeployments();
  const create = useCreateDeployment();
  const [form, setForm] = useState(initialForm);
  const [envJson, setEnvJson] = useState("{}");
  const [volumesJson, setVolumesJson] = useState("[]");
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const cancel = useDeploymentAction("cancel");
  const retry = useDeploymentAction("retry");
  const rollback = useDeploymentAction("rollback");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (!form.repository || !form.gitRef || !form.registry || !form.imageName || !form.imageTag) throw new Error("Complete the source and image steps before queueing the deployment");
      const env = JSON.parse(envJson) as Record<string, string>;
      const volumes = JSON.parse(volumesJson) as { hostPath: string; containerPath: string; readOnly?: boolean }[];
      if (!env || Array.isArray(env) || typeof env !== "object" || !Array.isArray(volumes)) throw new Error("Runtime environment must be an object and volumes must be an array");
      await create.mutateAsync({ ...form, env, volumes });
      setForm(initialForm); setEnvJson("{}"); setVolumesJson("[]"); setStep(0); toast.success("Deployment queued");
    }
    catch (error) { toast.error(getApiErrorMessage(error)); }
  };

  return <div className="space-y-6">
    <div><p className="text-muted-foreground">Build, publish, and run applications from GitHub repositories.</p></div>
    <Card><CardHeader><CardTitle className="text-sm">Queue deployment</CardTitle></CardHeader><CardContent>
      <form onSubmit={submit}>
        <div className="mb-6 grid grid-cols-5 gap-2">{["Source", "Image", "Runtime", "Storage", "Review"].map((label, index) => <button type="button" key={label} onClick={() => setStep(index)} className={`rounded-md px-2 py-2 text-xs ${step === index ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{index + 1}. {label}</button>)}</div>
        <div className="grid gap-4 sm:grid-cols-2">
          {step === 0 && <><div className="space-y-1"><Label>Repository</Label><Input required placeholder="owner/repository" value={form.repository} onChange={e => setForm({...form, repository: e.target.value})} /></div><div className="space-y-1"><Label>Branch or ref</Label><Input required value={form.gitRef} onChange={e => setForm({...form, gitRef: e.target.value})} /></div><p className="sm:col-span-2 text-xs text-muted-foreground">The backend GitHub App will clone this repository using its installation credentials.</p></>}
          {step === 1 && <><div className="space-y-1"><Label>Registry</Label><Input required value={form.registry} onChange={e => setForm({...form, registry: e.target.value})} /></div><div className="space-y-1"><Label>Image name</Label><Input required placeholder="owner/app" value={form.imageName} onChange={e => setForm({...form, imageName: e.target.value})} /></div><div className="space-y-1"><Label>Tag</Label><Input required value={form.imageTag} onChange={e => setForm({...form, imageTag: e.target.value})} /></div></>}
          {step === 2 && <><div className="space-y-1"><Label>Network</Label><Input value={form.network ?? "bridge"} onChange={e => setForm({...form, network: e.target.value})} /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.createNetworkIfMissing ?? false} onChange={e => setForm({...form, createNetworkIfMissing: e.target.checked})} />Create network if missing</label><div className="space-y-1"><Label>Restart policy</Label><Input value={form.restartPolicy ?? "unless-stopped"} onChange={e => setForm({...form, restartPolicy: e.target.value})} /></div><div className="space-y-1"><Label>Host port</Label><Input type="number" placeholder="Optional" value={form.hostPort ?? ""} onChange={e => setForm({...form, hostPort: e.target.value ? Number(e.target.value) : undefined})} /></div><div className="space-y-1"><Label>Container port</Label><Input type="number" placeholder="Optional" value={form.containerPort ?? ""} onChange={e => setForm({...form, containerPort: e.target.value ? Number(e.target.value) : undefined})} /></div></>}
          {step === 3 && <><div className="space-y-1 sm:col-span-2"><Label>Runtime environment JSON</Label><Textarea className="font-mono text-xs" value={envJson} onChange={e => setEnvJson(e.target.value)} placeholder={'{"PORT":"8080"}'} /></div><div className="space-y-1 sm:col-span-2"><Label>Volume mounts JSON</Label><Textarea className="font-mono text-xs" value={volumesJson} onChange={e => setVolumesJson(e.target.value)} placeholder={'[{"hostPath":"app-data","containerPath":"/app/data"}]'} /></div><p className="sm:col-span-2 text-xs text-muted-foreground">Use approved host paths or Docker volume names. Secret values are accepted as runtime variables but are not written to deployment logs.</p></>}
          {step === 4 && <div className="space-y-2 text-sm sm:col-span-2"><p><span className="text-muted-foreground">Source:</span> {form.repository || "Not set"} @ {form.gitRef}</p><p><span className="text-muted-foreground">Image:</span> {form.registry}/{form.imageName}:{form.imageTag}</p><p><span className="text-muted-foreground">Runtime:</span> {form.network} · {form.restartPolicy} · {form.hostPort && form.containerPort ? `${form.hostPort}:${form.containerPort}` : "No published port"}</p><p><span className="text-muted-foreground">Storage:</span> environment and volume configuration ready to submit</p></div>}
        </div>
        <div className="mt-6 flex justify-between"><Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>Back</Button>{step < 4 ? <Button type="button" onClick={() => setStep(Math.min(4, step + 1))}>Continue</Button> : <Button type="submit" disabled={create.isPending}>{create.isPending ? "Queueing…" : "Queue deployment"}</Button>}</div>
      </form>
    </CardContent></Card>
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Deployment history</CardTitle><Button variant="ghost" size="icon" onClick={() => deployments.refetch()}><RefreshCw className="h-4 w-4" /></Button></CardHeader><CardContent>
      <QueryState isLoading={deployments.isLoading} isError={deployments.isError} error={deployments.error} data={deployments.data}>
        {(items) => items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No deployments yet.</p> : <div className="space-y-3">{items.map(job => <div key={job.id} className="rounded-lg border p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><GitBranch className="h-4 w-4" /><span className="font-medium">{job.repository}</span><Badge variant={statusVariant(job.status)}>{job.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{job.gitRef} · {job.registry}/{job.imageName}:{job.imageTag} · {new Date(job.createdAt).toLocaleString()}</p>{job.currentStep && <p className="mt-2 flex items-center gap-1 text-xs"><Activity className="h-3 w-3" />{job.currentStep}</p>}</div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setSelected(selected === job.id ? null : job.id)}><Terminal className="h-3.5 w-3.5" />{selected === job.id ? "Hide logs" : "View logs"}</Button>{(job.status === "queued" || job.status === "running") && <Button size="sm" variant="outline" disabled={cancel.isPending} onClick={async () => { try { await cancel.mutateAsync(job.id); toast.success("Deployment cancelled"); } catch (e) { toast.error(getApiErrorMessage(e)); } }}><Square className="h-3.5 w-3.5" />Cancel</Button>}{job.status === "failed" && <Button size="sm" variant="outline" disabled={retry.isPending} onClick={async () => { try { await retry.mutateAsync(job.id); toast.success("Deployment retry queued"); } catch (e) { toast.error(getApiErrorMessage(e)); } }}>Retry</Button>}{(job.status === "succeeded" || job.status === "failed") && <Button size="sm" variant="outline" disabled={rollback.isPending} onClick={async () => { try { await rollback.mutateAsync(job.id); toast.success("Rollback queued"); } catch (e) { toast.error(getApiErrorMessage(e)); } }}><RotateCcw className="h-3.5 w-3.5" />Rollback</Button>}</div></div>
          {selected === job.id && <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">{job.logs || "No logs reported yet."}</pre>}
        </div>)}</div>}
      </QueryState>
    </CardContent></Card>
  </div>;
}
