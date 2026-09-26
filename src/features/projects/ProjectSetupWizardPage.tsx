import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Rocket, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QueryState } from "@/components/QueryState";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardCustomers } from "@/hooks/useSiteDashboard";
import {
  useCreateProjectSetup,
  useDeployProjectSetup,
  useProjectSetupStatus,
  useSaveProjectSetupCredentials,
  useSaveProjectSetupGateway,
  useSaveProjectSetupRuntime,
  type ProjectSetupRuntimeInput,
} from "@/hooks/useProjects";
import { getApiErrorMessage } from "@/lib/api";
import { SidePanel, SidePanelContent, SidePanelDescription, SidePanelHeader, SidePanelTitle } from "@/components/ui/side-panel";

const steps = ["Project", "Source & runtime", "Credentials", "Domain & gateway", "Deploy"];

function parseEnv(text: string): Record<string, string> {
  return Object.fromEntries(text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith("#")).map(line => {
    const separator = line.indexOf("=");
    if (separator < 1) throw new Error("Use KEY=value, one variable per line.");
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw new Error(`Invalid variable name: ${key}`);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    return [key, value];
  }));
}

const initialRuntime: ProjectSetupRuntimeInput = {
  repository: "", gitRef: "main", registry: "docker.io", imageName: "", imageTag: "latest",
  containerPort: undefined, hostPort: undefined, network: "bridge", restartPolicy: "unless-stopped",
  environment: "production", readinessType: "http", readinessTarget: "80/", env: {},
};

export function ProjectSetupWizardPage({ open, onOpenChange }: { open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const { projectId: routeProjectId = "" } = useParams();
  const navigate = useNavigate();
  const [createdProjectId, setCreatedProjectId] = useState("");
  const projectId = createdProjectId || routeProjectId;
  const [step, setStep] = useState(projectId ? 1 : 0);
  const [projectForm, setProjectForm] = useState({ slug: "", name: "", domain: "", type: "frontend" as "frontend" | "backend", customerId: "" });
  const [runtime, setRuntime] = useState<ProjectSetupRuntimeInput>(initialRuntime);
  const [envText, setEnvText] = useState("");
  const [registryUser, setRegistryUser] = useState("");
  const [registryPassword, setRegistryPassword] = useState("");
  const [secretText, setSecretText] = useState("");
  const [clearSecrets, setClearSecrets] = useState(false);
  const [gateway, setGateway] = useState({ domain: "", tlsMode: "http_only", gateEnabled: true });
  const [lastDeploymentId, setLastDeploymentId] = useState("");
  const status = useProjectSetupStatus(projectId);
  const loadedConfiguration = useRef("");
  const savedRuntime = status.data?.sourceRuntime;
  const savedGatewayDomain = status.data?.gateway?.domain;
  const savedGatewayTlsMode = status.data?.gateway?.tlsMode;
  const savedGatewayEnabled = status.data?.gateway?.gateEnabled;
  const savedProjectDomain = status.data?.domain;
  const customers = useDashboardCustomers(100);
  const createProject = useCreateProjectSetup();
  const saveRuntime = useSaveProjectSetupRuntime(projectId);
  const saveCredentials = useSaveProjectSetupCredentials(projectId);
  const saveGateway = useSaveProjectSetupGateway(projectId);
  const deploy = useDeployProjectSetup(projectId);
  const customerList = customers.data?.customers ?? [];
  const stepsAvailable = Boolean(projectId);
  const configuredRegistry = status.data?.sourceRuntime?.registry ?? runtime.registry;
  const currentDeployment = status.data?.latestDeploymentStatus ?? status.data?.activeDeploymentStatus ?? "none";
  const active = status.data?.activeDeploymentStatus === "active";

  useEffect(() => {
    if (!savedRuntime || loadedConfiguration.current === `${projectId}:${savedRuntime.id}`) return;
    loadedConfiguration.current = `${projectId}:${savedRuntime.id}`;
    const saved = savedRuntime;
    setRuntime({
      repository: saved.repository, gitRef: saved.gitRef, registry: saved.registry,
      imageName: saved.imageName, imageTag: saved.imageTag, containerPort: saved.containerPort ?? undefined,
      hostPort: saved.hostPort ?? undefined, network: saved.network, restartPolicy: saved.restartPolicy,
      environment: saved.environment, env: saved.env,
    });
    setEnvText(Object.entries(saved.env).map(([key, value]) => `${key}=${value}`).join("\n"));
  }, [projectId, savedRuntime]);

  useEffect(() => {
    if (savedGatewayDomain && savedGatewayTlsMode && savedGatewayEnabled != null) {
      setGateway({ domain: savedGatewayDomain, tlsMode: savedGatewayTlsMode, gateEnabled: savedGatewayEnabled });
    } else if (savedProjectDomain) {
      setGateway(current => ({ ...current, domain: current.domain || savedProjectDomain }));
    }
  }, [savedGatewayDomain, savedGatewayTlsMode, savedGatewayEnabled, savedProjectDomain]);

  useEffect(() => {
    if (projectId) setStep(current => current === 0 ? 1 : current);
  }, [projectId]);

  const deploymentBadge = useMemo(() => active ? "default" : currentDeployment === "failed" ? "destructive" : "secondary", [active, currentDeployment]);

  const goToStep = (next: number) => {
    const bounded = Math.max(projectId ? 1 : 0, Math.min(4, next));
    setStep(bounded);
  };

  const create = async () => {
    try {
      const created = await createProject.mutateAsync({
        ...projectForm,
        customerId: projectForm.customerId || undefined,
      });
      toast.success("Project created without a runtime");
      setCreatedProjectId(created.projectId);
      setStep(1);
    } catch (error) { toast.error(getApiErrorMessage(error)); }
  };

  const saveSource = async () => {
    try {
      const env = parseEnv(envText);
      await saveRuntime.mutateAsync({ ...runtime, env });
      toast.success("Source and runtime settings saved");
      goToStep(2);
    } catch (error) { toast.error(error instanceof Error ? error.message : getApiErrorMessage(error)); }
  };

  const saveCredentialStep = async () => {
    try {
      const secretEnv = secretText.trim() ? parseEnv(secretText) : undefined;
      await saveCredentials.mutateAsync({
        registry: configuredRegistry,
        ...(registryUser.trim() && registryPassword ? { username: registryUser.trim(), password: registryPassword } : {}),
        ...(secretEnv ? { secretEnv } : clearSecrets ? { secretEnv: {} } : {}),
      });
      setRegistryUser("");
      setRegistryPassword("");
      setSecretText("");
      toast.success("Credential and secret changes saved as versions");
      goToStep(3);
    } catch (error) { toast.error(error instanceof Error ? error.message : getApiErrorMessage(error)); }
  };

  const saveGatewayStep = async () => {
    try {
      await saveGateway.mutateAsync(gateway);
      toast.success("Domain and gateway settings saved");
      goToStep(4);
    } catch (error) { toast.error(getApiErrorMessage(error)); }
  };

  const queueDeployment = async () => {
    try {
      const queued = await deploy.mutateAsync();
      setLastDeploymentId(queued.deploymentId);
      toast.success("Deployment queued");
    } catch (error) { toast.error(getApiErrorMessage(error)); }
  };

  const projectName = status.data?.name ?? projectForm.name;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && onOpenChange && !routeProjectId) {
      setCreatedProjectId("");
      setStep(0);
      setProjectForm({ slug: "", name: "", domain: "", type: "frontend", customerId: "" });
    }
    if (onOpenChange) onOpenChange(nextOpen);
    else if (!nextOpen) navigate("/app/projects");
  };
  const closePanel = () => handleOpenChange(false);

  return (
    <SidePanel open={open ?? true} onOpenChange={handleOpenChange}>
      <SidePanelContent className="sm:max-w-3xl">
        <SidePanelHeader className="border-b px-6 py-5 pr-14">
          <SidePanelTitle>{projectName || "Project setup"}</SidePanelTitle>
          <SidePanelDescription>{status.data ? `${status.data.slug} · ${status.data.domain}` : "Create a project, then configure its runtime, credentials, and gateway."}</SidePanelDescription>
        </SidePanelHeader>
        <div className="space-y-6 overflow-y-auto px-6 py-5">
          <div className="flex justify-end">{status.data && <Button variant="outline" asChild><Link to={`/app/projects/${status.data.slug}`}>Project overview</Link></Button>}</div>

      <div className="grid gap-2 sm:grid-cols-5">
        {steps.map((label, index) => {
          const stepIndex = index;
          const done = projectId && (
            (index === 0) ||
            (index === 1 && Boolean(status.data?.sourceRuntime)) ||
            (index === 2 && (status.data?.credentialsConfigured || Boolean(status.data?.sourceRuntime?.secretSetVersion))) ||
            (index === 3 && Boolean(status.data?.gateway)) ||
            (index === 4 && active)
          );
          return <button key={label} type="button" disabled={(index > 0 && !stepsAvailable) || Boolean(projectId && index === 0)} onClick={() => goToStep(stepIndex)} className={`rounded-lg border p-3 text-left transition-colors ${step === stepIndex ? "border-primary bg-primary/5" : "hover:bg-muted/60"} ${index > 0 && !stepsAvailable ? "opacity-50" : ""}`}>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">{done ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : `0${index + 1}`} · Step {index + 1}</span>
            <span className="mt-1 block text-sm font-medium">{label}</span>
          </button>;
        })}
      </div>

      {!projectId ? (
        <Card>
          <CardHeader><CardTitle>1. Create the project</CardTitle><CardDescription>This creates the durable project record. Docker is not required, and you can return to the remaining setup later.</CardDescription></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="setup-slug">Project slug</Label><Input id="setup-slug" value={projectForm.slug} onChange={e => setProjectForm({ ...projectForm, slug: e.target.value })} placeholder="acme-portal" /></div>
            <div className="space-y-2"><Label htmlFor="setup-name">Project name</Label><Input id="setup-name" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="Acme Portal" /></div>
            <div className="space-y-2"><Label htmlFor="setup-domain">Primary domain</Label><Input id="setup-domain" value={projectForm.domain} onChange={e => setProjectForm({ ...projectForm, domain: e.target.value })} placeholder="portal.example.com" /></div>
            <div className="space-y-2"><Label htmlFor="setup-type">Application type</Label><select id="setup-type" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={projectForm.type} onChange={e => setProjectForm({ ...projectForm, type: e.target.value as "frontend" | "backend" })}><option value="frontend">Frontend</option><option value="backend">Backend</option></select></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="setup-customer">Customer (optional)</Label><select id="setup-customer" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={projectForm.customerId} onChange={e => setProjectForm({ ...projectForm, customerId: e.target.value })}><option value="">No customer selected</option>{customerList.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div>
            <div className="flex justify-end sm:col-span-2"><Button disabled={createProject.isPending || !projectForm.slug || !projectForm.name || !projectForm.domain} onClick={() => void create()}>{createProject.isPending ? "Creating…" : "Create project"}</Button></div>
          </CardContent>
        </Card>
      ) : (
        <QueryState isLoading={status.isLoading} isError={status.isError} error={status.error} data={status.data}>
          {(setup) => (
            <>
              {step === 1 && <Card>
                <CardHeader><CardTitle>2. Source and runtime</CardTitle><CardDescription>Save desired settings now. You can leave the project without a deployment and return later.</CardDescription></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>GitHub repository (owner/name)</Label><Input value={runtime.repository} onChange={e => setRuntime({ ...runtime, repository: e.target.value })} placeholder="acme/portal" /></div>
                  <div className="space-y-2"><Label>Git ref</Label><Input value={runtime.gitRef} onChange={e => setRuntime({ ...runtime, gitRef: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Registry</Label><Input value={runtime.registry} onChange={e => setRuntime({ ...runtime, registry: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Image name</Label><Input value={runtime.imageName} onChange={e => setRuntime({ ...runtime, imageName: e.target.value })} placeholder="acme/portal" /></div>
                  <div className="space-y-2"><Label>Image tag</Label><Input value={runtime.imageTag} onChange={e => setRuntime({ ...runtime, imageTag: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Container port</Label><Input type="number" value={runtime.containerPort ?? ""} onChange={e => setRuntime({ ...runtime, containerPort: e.target.value ? Number(e.target.value) : undefined })} placeholder="80" /><p className="text-xs text-muted-foreground">Required so the gateway can resolve the active runtime. Its host port is allocated dynamically.</p></div>
                  <div className="space-y-2"><Label>Docker network</Label><Input value={runtime.network} onChange={e => setRuntime({ ...runtime, network: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Restart policy</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={runtime.restartPolicy} onChange={e => setRuntime({ ...runtime, restartPolicy: e.target.value })}><option value="unless-stopped">unless-stopped</option><option value="always">always</option><option value="on-failure">on-failure</option><option value="no">no</option></select></div>
                  <div className="space-y-2"><Label>Readiness probe</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={runtime.readinessType ?? "http"} onChange={e => setRuntime({ ...runtime, readinessType: e.target.value })}><option value="http">HTTP</option><option value="tcp">TCP</option><option value="process">Process running</option></select></div>
                  <div className="space-y-2"><Label>Probe target</Label><Input value={runtime.readinessTarget ?? ""} onChange={e => setRuntime({ ...runtime, readinessTarget: e.target.value })} placeholder="80/" /></div>
                  <div className="space-y-2 sm:col-span-2"><Label>Non-secret environment values</Label><Textarea rows={5} value={envText} onChange={e => setEnvText(e.target.value)} placeholder={"NODE_ENV=production\nPORT=80"} /><p className="text-xs text-muted-foreground">Keep passwords, tokens, and keys for the credentials step.</p></div>
                  <div className="flex justify-between sm:col-span-2"><Button variant="outline" onClick={closePanel}>Close</Button><Button disabled={saveRuntime.isPending || !runtime.repository || !runtime.imageName || !runtime.containerPort || runtime.containerPort < 1 || runtime.containerPort > 65535} onClick={() => void saveSource()}><Save className="mr-2 h-4 w-4" />{saveRuntime.isPending ? "Saving…" : "Save and continue"}</Button></div>
                </CardContent>
              </Card>}

              {step === 2 && <Card>
                <CardHeader><CardTitle>3. Credentials</CardTitle><CardDescription>Registry and application values are write-only here. Saving new values creates versions; this does not deploy them.</CardDescription></CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label>Registry</Label><Input value={configuredRegistry} readOnly /></div><div className="space-y-2"><Label>Registry username</Label><Input value={registryUser} onChange={e => setRegistryUser(e.target.value)} placeholder={setup.credentialsConfigured ? "Configured; enter to rotate" : "Optional for public images"} /></div><div className="space-y-2"><Label>Registry password</Label><Input type="password" autoComplete="new-password" value={registryPassword} onChange={e => setRegistryPassword(e.target.value)} placeholder={setup.credentialsConfigured ? "Write-only; enter to rotate" : "Optional for public images"} /></div></div>
                  {setup.credentialsConfigured && <p className="text-xs text-muted-foreground">Current registry credential version: {setup.credentialVersion}. The password is never returned.</p>}
                  <div className="space-y-2"><Label>Application secret environment</Label><Textarea rows={7} value={secretText} onChange={e => setSecretText(e.target.value)} placeholder={"DATABASE_URL=…\nAPI_TOKEN=…"} /><p className="text-xs text-muted-foreground">{setup.sourceRuntime?.secretSetVersion ? `Saved secret set version ${setup.sourceRuntime.secretSetVersion}; re-enter values to replace it.` : "Values are encrypted and will only be supplied to the worker during deployment."}</p></div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={clearSecrets} onChange={e => setClearSecrets(e.target.checked)} />Replace the current secret set with an empty set</label>
                  <div className="flex justify-between"><Button variant="outline" onClick={() => goToStep(1)}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button><div className="flex gap-2"><Button variant="outline" onClick={() => goToStep(3)}>Skip for now</Button><Button disabled={saveCredentials.isPending || (Boolean(registryUser) !== Boolean(registryPassword))} onClick={() => void saveCredentialStep()}>{saveCredentials.isPending ? "Saving…" : "Save credentials"}</Button></div></div>
                </CardContent>
              </Card>}

              {step === 3 && <Card>
                <CardHeader><CardTitle>4. Domain and gateway</CardTitle><CardDescription>Save the domain/site intent before the runtime exists. The deployment cutover applies the gateway route after readiness succeeds.</CardDescription></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2"><Label>Primary domain</Label><Input value={gateway.domain || setup.domain} onChange={e => setGateway({ ...gateway, domain: e.target.value })} /></div>
                  <div className="space-y-2"><Label>TLS mode</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={gateway.tlsMode} onChange={e => setGateway({ ...gateway, tlsMode: e.target.value })}><option value="http_only">HTTP only</option><option value="https">HTTPS</option><option value="https_http2">HTTPS with HTTP/2</option></select></div>
                  <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={gateway.gateEnabled} onChange={e => setGateway({ ...gateway, gateEnabled: e.target.checked })} />Apply payment access gating at this site</label>
                  {setup.gateway && <div className="sm:col-span-2"><Badge variant="secondary">Site saved · {setup.gateway.status}</Badge></div>}
                  <div className="flex justify-between sm:col-span-2"><Button variant="outline" onClick={() => goToStep(2)}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button><div className="flex gap-2"><Button variant="outline" onClick={() => goToStep(4)}>Skip for now</Button><Button disabled={saveGateway.isPending || !gateway.domain.trim()} onClick={() => void saveGatewayStep()}>{saveGateway.isPending ? "Saving…" : "Save gateway"}</Button></div></div>
                </CardContent>
              </Card>}

              {step === 4 && <Card>
                <CardHeader><CardTitle>5. Deploy</CardTitle><CardDescription>Deployment is explicit. Saving credentials and runtime settings alone does not change the active service.</CardDescription></CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Desired image</p><p className="mt-1 font-medium">{setup.sourceRuntime ? `${setup.sourceRuntime.registry}/${setup.sourceRuntime.imageName}:${setup.sourceRuntime.imageTag}` : "Not configured"}</p></div><div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Gateway domain</p><p className="mt-1 font-medium">{setup.gateway?.domain ?? setup.domain}</p></div></div>
                  <div className="flex items-center gap-3"><Badge variant={deploymentBadge}>{currentDeployment}</Badge>{setup.activeDeploymentId && <span className="font-mono text-xs">{setup.activeDeploymentId}</span>}</div>
                  {lastDeploymentId && <p className="text-sm text-muted-foreground">Queued deployment <code>{lastDeploymentId}</code>. This page polls the active deployment pointer as the worker progresses.</p>}
                  {active && <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm">An active deployment is recorded. Review its runtime and version references on the project overview.</div>}
                  <div className="flex justify-between"><Button variant="outline" onClick={() => goToStep(3)}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button><div className="flex gap-2"><Button variant="outline" asChild><Link to={`/app/projects/${setup.slug}`}>Open project</Link></Button><Button disabled={deploy.isPending || !setup.sourceRuntime} onClick={() => void queueDeployment()}><Rocket className="mr-2 h-4 w-4" />{deploy.isPending ? "Queueing…" : "Deploy"}</Button></div></div>
                </CardContent>
              </Card>}

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => goToStep(step - 1)} disabled={step <= 1}><ChevronLeft className="mr-1 h-4 w-4" />Previous step</Button>
                {step < 4 && <Button variant="ghost" onClick={() => goToStep(step + 1)}>Next step<ChevronRight className="ml-1 h-4 w-4" /></Button>}
              </div>
            </>
          )}
        </QueryState>
      )}

      {!projectId && <p className="text-xs text-muted-foreground">Projects created here remain valid indefinitely before a source, runtime, or deployment is configured.</p>}
        </div>
      </SidePanelContent>
    </SidePanel>
  );
}
