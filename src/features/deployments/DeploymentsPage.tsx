import { useState } from "react";
import { Activity, GitBranch, RefreshCw, RotateCcw, Settings2, Square, Terminal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SidePanel, SidePanelContent, SidePanelDescription, SidePanelHeader, SidePanelTitle } from "@/components/ui/side-panel";
import { QueryState } from "@/components/QueryState";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api";
import { useCreateDeployment, useDeploymentAction, useDeployments, useGitHubRepositories, useGitHubStatus, useRedeployConfiguration, useUpdateDeploymentConfiguration } from "@/hooks/useDeployments";
import { useNetworks, useVolumes } from "@/hooks/useDockerResources";
import type { CreateDeploymentPayload, DeploymentJob } from "@/types/deployment";

const initialForm: CreateDeploymentPayload = { repository: "", gitRef: "main", registry: "docker.io", imageName: "", imageTag: "latest", network: "bridge", restartPolicy: "unless-stopped", hostPort: undefined, containerPort: undefined, createNetworkIfMissing: false };
type EnvRow = { key: string; value: string; secret: boolean };
type VolumeRow = { volumeName: string; containerPath: string; readOnly: boolean };

function parseEnvFile(contents: string): EnvRow[] {
  const rows: EnvRow[] = [];
  for (const raw of contents.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice(7).trim();
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    const secret = /(PASSWORD|PASSWD|SECRET|TOKEN|PRIVATE|API_KEY|DATABASE_URL)/i.test(key);
    const existing = rows.findIndex(row => row.key === key);
    if (existing >= 0) rows[existing] = { key, value, secret }; else rows.push({ key, value, secret });
  }
  return rows;
}

function parseEnvValues(contents: string): Record<string, string> {
  return Object.fromEntries(parseEnvFile(contents).map(({ key, value }) => [key, value]));
}

function statusVariant(status: DeploymentJob["status"]): "default" | "secondary" | "destructive" | "outline" {
  if (status === "succeeded") return "default";
  if (status === "failed") return "destructive";
  if (status === "running" || status === "queued") return "secondary";
  return "outline";
}

function statusClass(status: DeploymentJob["status"]): string {
  if (status === "succeeded") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600";
  if (status === "failed") return "border-red-500/40 bg-red-500/10 text-red-600";
  if (status === "running") return "border-blue-500/40 bg-blue-500/10 text-blue-600";
  if (status === "queued") return "border-amber-500/40 bg-amber-500/10 text-amber-600";
  return "";
}

export function DeploymentsPage() {
  const deployments = useDeployments();
  const github = useGitHubStatus();
  const [repositoryQuery, setRepositoryQuery] = useState("");
  const repositories = useGitHubRepositories(repositoryQuery, github.data?.connected === true);
  const create = useCreateDeployment();
  const [form, setForm] = useState(initialForm);
  const [envRows, setEnvRows] = useState<EnvRow[]>([{ key: "", value: "", secret: false }]);
  const [volumeRows, setVolumeRows] = useState<VolumeRow[]>([]);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const cancel = useDeploymentAction("cancel");
  const retry = useDeploymentAction("retry");
  const rollback = useDeploymentAction("rollback");
  const updateConfiguration = useUpdateDeploymentConfiguration();
  const redeploy = useRedeployConfiguration();
  const [editing, setEditing] = useState<DeploymentJob | null>(null);
  const [editRuntime, setEditRuntime] = useState({ network: "bridge", restartPolicy: "unless-stopped", hostPort: "", containerPort: "" });
  const [editEnv, setEditEnv] = useState("");
  const [editSecrets, setEditSecrets] = useState("");
  const networks = useNetworks();
  const volumes = useVolumes();
  const stepComplete = (index: number) => {
    if (index === 0) return Boolean(form.repository.trim() && form.gitRef.trim());
    if (index === 1) return Boolean(form.registry.trim() && form.imageName.trim() && form.imageTag.trim());
    if (index === 2) return Boolean(form.network?.trim() && form.restartPolicy?.trim());
    return true;
  };
  const canVisitStep = (index: number) => index <= step || Array.from({ length: index }, (_, previous) => previous).every(stepComplete);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (!form.repository || !form.gitRef || !form.registry || !form.imageName || !form.imageTag) throw new Error("Complete the source and image steps before queueing the deployment");
      const validRows = envRows.filter(row => row.key.trim());
      const env = Object.fromEntries(validRows.filter(row => !row.secret).map(row => [row.key.trim(), row.value]));
      const secretEnv = Object.fromEntries(validRows.filter(row => row.secret).map(row => [row.key.trim(), row.value]));
      const mountVolumes = volumeRows.filter(row => row.volumeName && row.containerPath).map(row => ({ hostPath: row.volumeName, containerPath: row.containerPath, readOnly: row.readOnly }));
      await create.mutateAsync({ ...form, env, secretEnv, volumes: mountVolumes });
      setForm(initialForm); setEnvRows([{ key: "", value: "", secret: false }]); setVolumeRows([]); setStep(0); toast.success("Deployment queued");
    }
    catch (error) { toast.error(getApiErrorMessage(error)); }
  };

  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-3"><p className="text-muted-foreground">Build, publish, and run applications from GitHub repositories.</p><Button onClick={() => setCreateOpen(true)}>New deployment</Button></div>
    <SidePanel open={createOpen} onOpenChange={setCreateOpen}><SidePanelContent><SidePanelHeader className="border-b px-6 py-5 text-left"><SidePanelTitle>New deployment</SidePanelTitle><SidePanelDescription>Build, publish, and run an application.</SidePanelDescription></SidePanelHeader>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-6 py-5"><div className="mb-6 grid grid-cols-5 gap-2">{["Source", "Image", "Runtime", "Storage", "Review"].map((label, index) => <button type="button" key={label} disabled={!canVisitStep(index)} onClick={() => setStep(index)} className={`rounded-md px-2 py-2 text-xs transition-colors ${step === index ? "bg-primary text-primary-foreground" : canVisitStep(index) ? "bg-muted text-muted-foreground hover:bg-muted/80" : "cursor-not-allowed bg-muted/50 text-muted-foreground/50"}`}>{index + 1}. {label}</button>)}</div>
        <div className="grid gap-4 sm:grid-cols-2">
          {step === 0 && <><p className="sm:col-span-2 text-xs text-muted-foreground">{github.isLoading ? "Checking GitHub connection…" : github.data?.connected ? `GitHub connected${github.data.accountLogin ? ` as ${github.data.accountLogin}` : ""}.` : "GitHub not connected — enter a public repository below."}</p><div className="space-y-1"><Label>Repository</Label>{github.data?.connected ? <><Input required placeholder="Search repositories" value={repositoryQuery || form.repository} onChange={e => setRepositoryQuery(e.target.value)} />{repositoryQuery && <div className="max-h-40 overflow-auto rounded-md border">{repositories.isLoading ? <p className="p-2 text-xs text-muted-foreground">Searching…</p> : repositories.data?.length ? repositories.data.map(repo => <button type="button" key={repo.full_name} className="block w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setForm({...form, repository: repo.full_name}); setRepositoryQuery(""); }}>{repo.full_name}{repo.private && <span className="ml-2 text-xs text-muted-foreground">private</span>}</button>) : <p className="p-2 text-xs text-muted-foreground">No repositories found.</p>}</div>}<p className="text-xs text-muted-foreground">Selected: {form.repository || "None"}</p></> : <Input required placeholder="owner/repository" value={form.repository} onChange={e => setForm({...form, repository: e.target.value})} />}</div><div className="space-y-1"><Label>Branch or ref</Label><Input required value={form.gitRef} onChange={e => setForm({...form, gitRef: e.target.value})} /></div><p className="sm:col-span-2 text-xs text-muted-foreground">{github.data?.connected ? "Select a repository above, then choose its branch or ref." : "Public repositories only. Connect GitHub in Profile settings for private repositories."}</p></>}
          {step === 1 && <><div className="space-y-1"><Label>Registry</Label><Input required value={form.registry} onChange={e => setForm({...form, registry: e.target.value})} /></div><div className="space-y-1"><Label>Image name</Label><Input required placeholder="owner/app" value={form.imageName} onChange={e => setForm({...form, imageName: e.target.value})} /></div><div className="space-y-1"><Label>Tag</Label><Input required value={form.imageTag} onChange={e => setForm({...form, imageTag: e.target.value})} /></div></>}
          {step === 2 && <><div className="space-y-1"><Label>Network</Label><select className="flex h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.network ?? "bridge"} onChange={e => setForm({...form, network: e.target.value})}><option value="bridge">bridge (default)</option>{networks.data?.filter(n => n.name !== "bridge").map(n => <option key={n.name} value={n.name}>{n.name} · {n.driver}</option>)}</select>{networks.data?.length === 0 && <p className="text-xs text-muted-foreground">No custom networks exist. Create one in the Networks tab or enable creation.</p>}</div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.createNetworkIfMissing ?? false} onChange={e => setForm({...form, createNetworkIfMissing: e.target.checked})} />Create network if missing</label><div className="space-y-1"><Label>Restart policy</Label><select className="flex h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.restartPolicy ?? "unless-stopped"} onChange={e => setForm({...form, restartPolicy: e.target.value})}><option>no</option><option>always</option><option>unless-stopped</option><option>on-failure</option></select></div><div className="space-y-1"><Label>Host port</Label><Input type="number" placeholder="Optional" value={form.hostPort ?? ""} onChange={e => setForm({...form, hostPort: e.target.value ? Number(e.target.value) : undefined})} /></div><div className="space-y-1"><Label>Container port</Label><Input type="number" placeholder="Optional" value={form.containerPort ?? ""} onChange={e => setForm({...form, containerPort: e.target.value ? Number(e.target.value) : undefined})} /></div></>}
          {step === 3 && <><div className="space-y-2 sm:col-span-2"><div className="flex items-center justify-between"><Label>Environment variables</Label><label className="cursor-pointer text-xs text-primary">Import .env file<input className="hidden" type="file" accept=".env,text/plain" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { const rows = parseEnvFile(await file.text()); if (!rows.length) throw new Error("No valid variables found in the file"); setEnvRows(rows); toast.success(`${rows.length} variables imported`); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to read .env file"); } finally { e.target.value = ""; } }} /></label></div>{envRows.map((row, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]"><Input placeholder="KEY" value={row.key} onChange={e => setEnvRows(rows => rows.map((item, i) => i === index ? {...item, key: e.target.value} : item))} /><Input placeholder="Value" type={row.secret ? "password" : "text"} value={row.value} onChange={e => setEnvRows(rows => rows.map((item, i) => i === index ? {...item, value: e.target.value} : item))} /><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={row.secret} onChange={e => setEnvRows(rows => rows.map((item, i) => i === index ? {...item, secret: e.target.checked} : item))} />Secret</label><Button type="button" variant="ghost" size="sm" onClick={() => setEnvRows(rows => rows.filter((_, i) => i !== index))}>Remove</Button></div>)}<Button type="button" variant="outline" size="sm" onClick={() => setEnvRows(rows => [...rows, { key: "", value: "", secret: false }])}>Add variable</Button><p className="text-xs text-muted-foreground">Imported values stay in this form and secret values are encrypted by the backend.</p></div><div className="space-y-2 sm:col-span-2"><div className="flex items-center justify-between"><Label>Named volume mounts</Label><Button type="button" variant="outline" size="sm" onClick={() => setVolumeRows(rows => [...rows, { volumeName: volumes.data?.[0]?.name ?? "", containerPath: "/app/data", readOnly: false }])}>Add mount</Button></div>{volumeRows.map((row, index) => <div key={index} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_auto_auto]"><select className="flex h-9 w-full rounded-md border bg-background px-3 text-sm" value={row.volumeName} onChange={e => setVolumeRows(rows => rows.map((item, i) => i === index ? {...item, volumeName: e.target.value} : item))}><option value="">Select a named volume</option>{volumes.data?.map(v => <option key={v.name} value={v.name}>{v.name} · {v.driver}</option>)}</select><Input placeholder="Container path e.g. /var/lib/app" value={row.containerPath} onChange={e => setVolumeRows(rows => rows.map((item, i) => i === index ? {...item, containerPath: e.target.value} : item))} /><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={row.readOnly} onChange={e => setVolumeRows(rows => rows.map((item, i) => i === index ? {...item, readOnly: e.target.checked} : item))} />Read-only</label><Button type="button" variant="ghost" size="sm" onClick={() => setVolumeRows(rows => rows.filter((_, i) => i !== index))}>Remove</Button></div>)}{!volumes.data?.length && <p className="text-xs text-muted-foreground">No named volumes are available. Create one in the Volumes tab before adding a mount.</p>}</div></>}
          {step === 4 && <div className="space-y-2 text-sm sm:col-span-2"><p><span className="text-muted-foreground">Source:</span> {form.repository || "Not set"} @ {form.gitRef}</p><p><span className="text-muted-foreground">Image:</span> {form.registry}/{form.imageName}:{form.imageTag}</p><p><span className="text-muted-foreground">Runtime:</span> {form.network} · {form.restartPolicy} · {form.hostPort && form.containerPort ? `${form.hostPort}:${form.containerPort}` : "No published port"}</p><p><span className="text-muted-foreground">Storage:</span> environment and volume configuration ready to submit</p></div>}
        </div></div>
        <div className="flex shrink-0 justify-between gap-3 border-t bg-background px-6 py-4"><Button className="min-w-24" type="button" variant="outline" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>Back</Button>{step < 4 ? <Button className="min-w-24" type="button" onClick={() => setStep(Math.min(4, step + 1))}>Continue</Button> : <Button className="min-w-32" type="submit" disabled={create.isPending}>{create.isPending ? "Queueing…" : "Queue deployment"}</Button>}</div>
      </form>
    </SidePanelContent></SidePanel>
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Deployment history</CardTitle><Button variant="ghost" size="icon" onClick={() => deployments.refetch()}><RefreshCw className="h-4 w-4" /></Button></CardHeader><CardContent>
      <QueryState isLoading={deployments.isLoading} isError={deployments.isError} error={deployments.error} data={deployments.data}>
        {(items) => items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No deployments yet.</p> : <div className="space-y-3">{[...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(job => <div key={job.id} className="rounded-lg border p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><GitBranch className="h-4 w-4" /><span className="font-medium">{job.repository}</span><Badge variant={statusVariant(job.status)} className={statusClass(job.status)}>{job.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{job.gitRef} · {job.registry}/{job.imageName}:{job.imageTag} · {new Date(job.createdAt).toLocaleString()}</p>{job.currentStep && <p className="mt-2 flex items-center gap-1 text-xs"><Activity className="h-3 w-3" />{job.currentStep}</p>}</div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => { setEditing(job); setEditRuntime({ network: job.network ?? "bridge", restartPolicy: job.restartPolicy ?? "unless-stopped", hostPort: job.hostPort?.toString() ?? "", containerPort: job.containerPort?.toString() ?? "" }); setEditEnv(Object.entries(job.env ?? {}).map(([k,v]) => `${k}=${v}`).join("\n")); setEditSecrets(""); }}><Settings2 className="h-3.5 w-3.5" />Settings</Button><Button size="sm" variant="outline" disabled={redeploy.isPending} onClick={async () => { try { await redeploy.mutateAsync(job.id); toast.success("Redeployment queued"); } catch (e) { toast.error(getApiErrorMessage(e)); } }}>Apply & Redeploy</Button><Button size="sm" variant="outline" onClick={() => setSelected(selected === job.id ? null : job.id)}><Terminal className="h-3.5 w-3.5" />{selected === job.id ? "Hide logs" : "View logs"}</Button>{(job.status === "queued" || job.status === "running") && <Button size="sm" variant="outline" disabled={cancel.isPending} onClick={async () => { try { await cancel.mutateAsync(job.id); toast.success("Deployment cancelled"); } catch (e) { toast.error(getApiErrorMessage(e)); } }}><Square className="h-3.5 w-3.5" />Cancel</Button>}{job.status === "failed" && <Button size="sm" variant="outline" disabled={retry.isPending} onClick={async () => { try { await retry.mutateAsync(job.id); toast.success("Deployment retry queued"); } catch (e) { toast.error(getApiErrorMessage(e)); } }}>Retry</Button>}{job.canRollback && <Button size="sm" variant="outline" disabled={rollback.isPending} onClick={async () => { try { await rollback.mutateAsync(job.id); toast.success("Rollback queued"); } catch (e) { toast.error(getApiErrorMessage(e)); } }}><RotateCcw className="h-3.5 w-3.5" />Rollback</Button>}</div></div>
          {selected === job.id && <pre className="mt-4 h-56 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-[11px] leading-relaxed">{job.logs || "No logs reported yet."}</pre>}
        </div>)}</div>}
      </QueryState>
    </CardContent></Card>
    {editing && <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l bg-background p-6 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Deployment settings</h2><Button variant="ghost" size="icon" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button></div><p className="mt-1 text-xs text-muted-foreground">Changes are saved to the configuration. Paste dotenv content below; comments and blank lines are ignored. Secrets are write-only, and leaving the replacement section blank preserves existing secrets.</p><div className="mt-6 space-y-4"><div><Label>Network</Label><Input value={editRuntime.network} onChange={e => setEditRuntime({...editRuntime, network: e.target.value})} /></div><div><Label>Restart policy</Label><Input value={editRuntime.restartPolicy} onChange={e => setEditRuntime({...editRuntime, restartPolicy: e.target.value})} /></div><div className="grid grid-cols-2 gap-3"><div><Label>Host port</Label><Input value={editRuntime.hostPort} onChange={e => setEditRuntime({...editRuntime, hostPort: e.target.value})} /></div><div><Label>Container port</Label><Input value={editRuntime.containerPort} onChange={e => setEditRuntime({...editRuntime, containerPort: e.target.value})} /></div></div><div><Label>Environment variables</Label><textarea className="mt-1 min-h-32 w-full rounded-md border bg-background p-2 font-mono text-xs" value={editEnv} onChange={e => setEditEnv(e.target.value)} placeholder={'# Application\nENVIRONMENT=production\nPORT=9005'} /></div><div><Label>Replace secrets</Label><textarea className="mt-1 min-h-24 w-full rounded-md border bg-background p-2 font-mono text-xs" value={editSecrets} onChange={e => setEditSecrets(e.target.value)} placeholder={'# Only secrets being replaced\nTELEGRAM_BOT_TOKEN=...'} /><p className="mt-1 text-xs text-muted-foreground">Use one KEY=value per line. Do not use comma-separated values.</p></div><Button className="w-full" disabled={updateConfiguration.isPending} onClick={async () => { try { await updateConfiguration.mutateAsync({ id: editing.id, payload: { network: editRuntime.network, restartPolicy: editRuntime.restartPolicy, hostPort: editRuntime.hostPort ? Number(editRuntime.hostPort) : undefined, containerPort: editRuntime.containerPort ? Number(editRuntime.containerPort) : undefined, env: parseEnvValues(editEnv), ...(editSecrets.trim() ? { secretEnv: parseEnvValues(editSecrets) } : {}) } }); toast.success("Deployment settings saved"); setEditing(null); } catch (e) { toast.error(getApiErrorMessage(e)); } }}>{updateConfiguration.isPending ? "Saving…" : "Save settings"}</Button></div></aside>}
  </div>;
}
