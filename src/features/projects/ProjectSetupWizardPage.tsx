import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Check, ChevronLeft, Rocket, Save } from "lucide-react";
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
  useAdoptableContainers,
  useAdoptProjectContainer,
  useSaveProjectSetupCredentials,
  useSaveProjectSetupGateway,
  useSaveProjectSetupRuntime,
  useContainerWizardContext,
  useProviderCredentialMetadata,
  type ProjectSetupRuntimeInput,
} from "@/hooks/useProjects";
import { getApiErrorMessage } from "@/lib/api";
import { SidePanel, SidePanelContent, SidePanelDescription, SidePanelHeader, SidePanelTitle } from "@/components/ui/side-panel";

const steps = ["Source & runtime", "Credentials", "Domain & gateway", "Deploy"];
const inProgressDeploymentStatuses = new Set(["queued", "building", "starting", "health-checking"]);

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
  network: "bridge", restartPolicy: "unless-stopped", environment: "production", env: {},
};

export function ProjectSetupWizardPage({ open, onOpenChange, projectId: providedProjectId, serviceId, initialStep = 1 }: { open?: boolean; onOpenChange?: (open: boolean) => void; projectId?: string; serviceId?: string; initialStep?: number }) {
  const { projectId: routeProjectId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = providedProjectId ?? routeProjectId;
  const requestedStep = Number(searchParams.get("step") ?? String(initialStep));
  const [step, setStep] = useState(projectId ? Math.max(1, Math.min(4, requestedStep)) : 0);
  const [projectForm, setProjectForm] = useState({ name: "", customerId: "" });
  const [runtime, setRuntime] = useState<ProjectSetupRuntimeInput>(initialRuntime);
  const [envText, setEnvText] = useState("");
  const [registryCredentialId, setRegistryCredentialId] = useState("");
  const [gateway, setGateway] = useState({ domain: "", tlsMode: "https", gateEnabled: true });
  const [queuedDeploymentId, setQueuedDeploymentId] = useState("");
  const [adoptContainerId, setAdoptContainerId] = useState("");
  const [adoptContainerPort, setAdoptContainerPort] = useState("");
  const status = useProjectSetupStatus(projectId, serviceId);
  const providerCredentials = useProviderCredentialMetadata();
  const adoptableContainers = useAdoptableContainers(Boolean(projectId) && step === 1);
  const adoptContainer = useAdoptProjectContainer(projectId);
  const dockerNetworkContext = useContainerWizardContext();
  const loadedConfiguration = useRef("");
  const savedRuntime = status.data?.sourceRuntime;
  const savedGatewayDomain = status.data?.gateway?.domain;
  const savedGatewayTlsMode = status.data?.gateway?.tlsMode;
  const savedGatewayEnabled = status.data?.gateway?.gateEnabled;
  const customers = useDashboardCustomers(100);
  const createProject = useCreateProjectSetup();
  const saveRuntime = useSaveProjectSetupRuntime(projectId);
  const saveCredentials = useSaveProjectSetupCredentials(projectId);
  const saveGateway = useSaveProjectSetupGateway(projectId);
  const deploy = useDeployProjectSetup(projectId, serviceId);
  const customerList = customers.data?.customers ?? [];
  const configuredRegistry = status.data?.sourceRuntime?.registry ?? runtime.registry;
  const registryCredentials = (providerCredentials.data ?? []).filter(item => item.provider === "docker" && item.type === "registry" && item.current && item.scope === configuredRegistry);
  const currentDeployment = status.data?.latestDeploymentStatus ?? status.data?.activeDeploymentStatus ?? "none";
  const active = status.data?.activeDeploymentStatus === "active";
  const deploymentInProgress = inProgressDeploymentStatuses.has(currentDeployment) || Boolean(queuedDeploymentId);

  useEffect(() => {
    if (!queuedDeploymentId || !status.data?.latestDeploymentId) return;
    if (status.data.latestDeploymentId === queuedDeploymentId && !inProgressDeploymentStatuses.has(status.data.latestDeploymentStatus ?? "")) {
      setQueuedDeploymentId("");
    }
  }, [queuedDeploymentId, status.data?.latestDeploymentId, status.data?.latestDeploymentStatus]);

  useEffect(() => {
    if (!savedRuntime || loadedConfiguration.current === `${projectId}:${savedRuntime.id}`) return;
    loadedConfiguration.current = `${projectId}:${savedRuntime.id}`;
    const saved = savedRuntime;
    setRuntime({
      repository: saved.repository ?? "", gitRef: saved.gitRef, registry: saved.registry,
      registryCredentialId: saved.registryCredentialId ?? null,
      imageName: saved.imageName, imageTag: saved.imageTag,
      network: saved.network, restartPolicy: saved.restartPolicy,
      environment: saved.environment, env: saved.env,
    });
    setEnvText(Object.entries(saved.env).map(([key, value]) => `${key}=${value}`).join("\n"));
    setRegistryCredentialId(saved.registryCredentialId ?? "");
  }, [projectId, savedRuntime]);

  useEffect(() => {
    if (savedGatewayDomain && savedGatewayTlsMode && savedGatewayEnabled != null) {
      setGateway({ domain: savedGatewayDomain, tlsMode: savedGatewayTlsMode, gateEnabled: savedGatewayEnabled });
    }
  }, [savedGatewayDomain, savedGatewayTlsMode, savedGatewayEnabled]);

  useEffect(() => {
    if (projectId) setStep(Math.max(1, Math.min(4, requestedStep)));
  }, [projectId, requestedStep]);

  const deploymentBadge = useMemo(() => active ? "default" : currentDeployment === "failed" ? "destructive" : "secondary", [active, currentDeployment]);

  const goToStep = (next: number) => {
    const bounded = Math.max(projectId ? 1 : 0, Math.min(4, next));
    setStep(bounded);
  };

  const resetProjectCreation = () => {
    setStep(0);
    setProjectForm({ name: "", customerId: "" });
    setRuntime(initialRuntime);
    setEnvText("");
    setRegistryCredentialId("");
    setGateway({ domain: "", tlsMode: "http_only", gateEnabled: true });
    setQueuedDeploymentId("");
    setAdoptContainerId("");
    setAdoptContainerPort("");
    loadedConfiguration.current = "";
  };

  const create = async () => {
    try {
      const created = await createProject.mutateAsync(projectForm);
      toast.success("Project created. Deployment setup can be completed later.");
      handleOpenChange(false);
      navigate(`/app/projects/${encodeURIComponent(created.slug)}`);
    } catch (error) { toast.error(getApiErrorMessage(error)); }
  };

  const saveSource = async () => {
    try {
      const env = parseEnv(envText);
      await saveRuntime.mutateAsync({ ...runtime, containerPort: undefined, hostPort: undefined, readinessType: undefined, readinessTarget: undefined, registryCredentialId: registryCredentialId || null, repository: runtime.repository?.trim() || null, env, serviceId });
      toast.success("Source and runtime settings saved");
      goToStep(2);
    } catch (error) { toast.error(error instanceof Error ? error.message : getApiErrorMessage(error)); }
  };

  const saveCredentialStep = async () => {
    try {
      await saveCredentials.mutateAsync({
        registry: configuredRegistry,
        registryCredentialId: registryCredentialId || null,
        serviceId,
      });
      toast.success("Service registry credential saved");
      goToStep(3);
    } catch (error) { toast.error(error instanceof Error ? error.message : getApiErrorMessage(error)); }
  };

  const saveGatewayStep = async () => {
    try {
      await saveGateway.mutateAsync({ ...gateway, serviceId });
      toast.success("Domain and gateway settings saved");
      goToStep(4);
    } catch (error) { toast.error(getApiErrorMessage(error)); }
  };

  const queueDeployment = async () => {
    try {
      const queued = await deploy.mutateAsync();
      setQueuedDeploymentId(queued.deploymentId);
      toast.success("Deployment queued");
    } catch (error) { toast.error(getApiErrorMessage(error)); }
  };

  const attachRunningContainer = async () => {
    if (!adoptContainerId || !adoptContainerPort) return;
    try {
      const result = await adoptContainer.mutateAsync({ containerId: adoptContainerId, containerPort: Number(adoptContainerPort), serviceId });
      toast.success("Running container attached", { description: result.message });
      setAdoptContainerId("");
      setAdoptContainerPort("");
    } catch (error) { toast.error(getApiErrorMessage(error)); }
  };

  const selectedAdoptableContainer = adoptableContainers.data?.find(container => container.id === adoptContainerId);

  const projectName = status.data?.name ?? projectForm.name;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !projectId) resetProjectCreation();
    if (onOpenChange) onOpenChange(nextOpen);
    else if (!nextOpen) navigate("/app/projects");
  };
  const closePanel = () => handleOpenChange(false);

  return (
    <SidePanel open={open ?? true} onOpenChange={handleOpenChange}>
      <SidePanelContent className="sm:max-w-3xl">
        {projectId ? <SidePanelHeader className="shrink-0 border-b px-4 py-4 pr-12 sm:px-6 sm:py-5 sm:pr-14">
          <SidePanelTitle>{projectName || "Project setup"}</SidePanelTitle>
          <SidePanelDescription>{status.data ? status.data.slug : "Configure deployment settings for this project."}</SidePanelDescription>
        </SidePanelHeader> : <SidePanelHeader className="shrink-0 border-b px-4 py-4 pr-12 sm:px-6 sm:py-5 sm:pr-14">
          <SidePanelTitle>Create project</SidePanelTitle>
          <SidePanelDescription>Add the project name and customer. Configure deployment whenever you are ready.</SidePanelDescription>
        </SidePanelHeader>}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:space-y-6 sm:px-6 sm:py-5">
      {projectId && <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((label, index) => {
          const stepIndex = index + 1;
          const done = (stepIndex === 1 && Boolean(status.data?.sourceRuntime)) ||
            (stepIndex === 2 && (status.data?.credentialsConfigured || Boolean(status.data?.sourceRuntime?.secretSetVersion))) ||
            (stepIndex === 3 && Boolean(status.data?.gateway)) ||
            (stepIndex === 4 && active);
          return <button key={label} type="button" onClick={() => goToStep(stepIndex)} className={`flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors ${step === stepIndex ? "border-primary bg-primary/5" : "hover:bg-muted/60"}`}>
            {done && <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
            <span>{label}</span>
          </button>;
        })}
      </div>}

      {!projectId ? (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="setup-name">Project name</Label><Input id="setup-name" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="Acme Portal" /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="setup-customer">Customer</Label>{customerList.length ? <select id="setup-customer" required className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={projectForm.customerId} onChange={e => setProjectForm({ ...projectForm, customerId: e.target.value })}><option value="">Select a customer</option>{customerList.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select> : <p className="text-sm text-muted-foreground">Create a customer before creating a project. <Link to="/app/customers" className="text-primary underline">Go to customers</Link></p>}</div>
            <div className="flex justify-end sm:col-span-2"><Button disabled={createProject.isPending || !projectForm.name.trim() || !projectForm.customerId} onClick={() => void create()}>{createProject.isPending ? "Creating…" : "Create project"}</Button></div>
        </div>
      ) : (
        <QueryState isLoading={status.isLoading} isError={status.isError} error={status.error} data={status.data}>
          {(setup) => (
            <>
              {step === 1 && <>
              <Card>
                <CardHeader><CardTitle>Attach a running container</CardTitle><CardDescription>Make an existing Docker container this project’s active deployment without restarting it. This updates desired source/runtime settings to match the container; any environment values are saved as encrypted project secrets.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {adoptableContainers.isLoading ? <p className="text-sm text-muted-foreground">Loading running containers…</p> : adoptableContainers.isError ? <p className="text-sm text-destructive">Could not load Docker containers. Check that Gatekeeperd can access Docker.</p> : (adoptableContainers.data ?? []).filter(container => container.ports.length > 0).length === 0 ? <p className="text-sm text-muted-foreground">No running containers with a published TCP port are available to attach.</p> : <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2"><Label>Running container</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={adoptContainerId} onChange={event => { const nextId = event.target.value; setAdoptContainerId(nextId); setAdoptContainerPort(String(adoptableContainers.data?.find(container => container.id === nextId)?.ports[0]?.containerPort ?? "")); }}><option value="">Select a container</option>{(adoptableContainers.data ?? []).filter(container => container.ports.length > 0).map(container => <option key={container.id} value={container.id}>{container.name} · {container.image}</option>)}</select></div>
                    <div className="space-y-2"><Label>Published application port</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={adoptContainerPort} onChange={event => setAdoptContainerPort(event.target.value)} disabled={!selectedAdoptableContainer}><option value="">Select a port</option>{selectedAdoptableContainer?.ports.map(port => <option key={port.containerPort} value={port.containerPort}>{port.containerPort} → host {port.hostPort}</option>)}</select></div>
                    {selectedAdoptableContainer && <p className="text-xs text-muted-foreground sm:col-span-2">Network: {selectedAdoptableContainer.networks.join(", ") || "bridge"}. {selectedAdoptableContainer.environmentVariableCount} environment variables will be encrypted into a new project secret version. The previous runtime, if any, will keep running.</p>}
                  </div>}
                  <div className="flex justify-end"><Button variant="outline" disabled={!adoptContainerId || !adoptContainerPort || adoptContainer.isPending} onClick={() => void attachRunningContainer()}>{adoptContainer.isPending ? "Attaching…" : "Attach container"}</Button></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Source and runtime</CardTitle><CardDescription>Save desired settings now. You can leave the project without a deployment and return later.</CardDescription></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>GitHub repository (optional)</Label><Input value={runtime.repository ?? ""} onChange={e => setRuntime({ ...runtime, repository: e.target.value })} placeholder="acme/portal" /><p className="text-xs text-muted-foreground">Connect a repository to build from source, or leave this blank to deploy an existing Docker image.</p></div>
                  <div className="space-y-2"><Label>Git ref</Label><Input value={runtime.gitRef} onChange={e => setRuntime({ ...runtime, gitRef: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Registry</Label><Input value={runtime.registry} onChange={e => setRuntime({ ...runtime, registry: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Image name</Label><Input value={runtime.imageName} onChange={e => setRuntime({ ...runtime, imageName: e.target.value })} placeholder="acme/portal" /></div>
                  <div className="space-y-2"><Label>Image tag</Label><Input value={runtime.imageTag} onChange={e => setRuntime({ ...runtime, imageTag: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Docker network</Label><select value={runtime.network} onChange={e => setRuntime({ ...runtime, network: e.target.value })} disabled={dockerNetworkContext.isLoading} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60">{dockerNetworkContext.isLoading ? <option value={runtime.network}>Loading networks…</option> : <>{!dockerNetworkContext.data?.networks.includes(runtime.network) && <option value={runtime.network}>{runtime.network} (current)</option>}{(dockerNetworkContext.data?.networks.length ? dockerNetworkContext.data.networks : ["bridge"]).map(network => <option key={network} value={network}>{network}{dockerNetworkContext.data?.internalNetwork === network ? " (internal)" : ""}</option>)}</>}</select></div>
                  <div className="space-y-2"><Label>Restart policy</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={runtime.restartPolicy} onChange={e => setRuntime({ ...runtime, restartPolicy: e.target.value })}><option value="unless-stopped">unless-stopped</option><option value="always">always</option><option value="on-failure">on-failure</option><option value="no">no</option></select></div>
                  <div className="space-y-2 sm:col-span-2"><Label>Non-secret runtime variables</Label><Textarea rows={5} value={envText} onChange={e => setEnvText(e.target.value)} placeholder="NODE_ENV=production" /><p className="text-xs text-muted-foreground">Use this for ordinary app settings. Put passwords, API keys, and other sensitive values in Credentials.</p></div>
                  <div className="flex justify-between sm:col-span-2"><Button variant="outline" onClick={closePanel}>Close</Button><Button disabled={saveRuntime.isPending || !runtime.imageName} onClick={() => void saveSource()}><Save className="mr-2 h-4 w-4" />{saveRuntime.isPending ? "Saving…" : "Save and continue"}</Button></div>
                </CardContent>
              </Card></>}

              {step === 2 && <Card>
                <CardHeader><CardTitle>Container registry access</CardTitle><CardDescription>Choose a connected provider account for private image pulls. Registry credentials authenticate Gatekeeperd with Docker Hub; they are never passed to your app container.</CardDescription></CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label>Registry host</Label><Input value={configuredRegistry} readOnly /></div>
                    <div className="space-y-2"><Label htmlFor="service-registry-credential">Provider connection</Label><select id="service-registry-credential" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={registryCredentialId} onChange={event => setRegistryCredentialId(event.target.value)}><option value="">No credentials (public images)</option>{registryCredentials.map(credential => <option key={credential.id} value={credential.id}>{credential.displayName} · v{credential.version}</option>)}</select></div>
                  </div>
                  {registryCredentialId && <p className="text-xs text-muted-foreground">This service uses the selected connection for registry pulls. The chosen credential version is pinned to each deployment.</p>}
                  {!registryCredentials.length && <div className="rounded-md border border-dashed p-4"><p className="text-sm text-muted-foreground">No Docker Hub connection is available for {configuredRegistry}.</p><Button variant="outline" size="sm" className="mt-3" asChild><Link to="/app/credentials">Connect Docker Hub</Link></Button></div>}
                  <div className="flex justify-between"><Button variant="outline" onClick={() => goToStep(1)}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button><div className="flex gap-2"><Button variant="outline" asChild><Link to="/app/credentials">Manage connections</Link></Button><Button disabled={saveRuntime.isPending || saveCredentials.isPending} onClick={() => void saveCredentialStep()}>{saveCredentials.isPending ? "Saving…" : "Save service credential"}</Button><Button variant="outline" onClick={() => goToStep(3)}>Continue</Button></div></div>
                </CardContent>
              </Card>}

              {step === 3 && <Card>
                <CardHeader><CardTitle>Domain and gateway</CardTitle><CardDescription>Set the public domain for this service. Nginx handles upstream routing, TLS, and payment gating.</CardDescription></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2"><Label>Service domain</Label><Input value={gateway.domain} onChange={e => setGateway({ ...gateway, domain: e.target.value })} /></div>
                  {setup.gateway && <div className="sm:col-span-2"><Badge variant="secondary">Site saved · {setup.gateway.status}</Badge></div>}
                  <div className="flex justify-between sm:col-span-2"><Button variant="outline" onClick={() => goToStep(2)}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button><div className="flex gap-2"><Button variant="outline" onClick={() => goToStep(4)}>Skip for now</Button><Button disabled={saveGateway.isPending || !gateway.domain.trim()} onClick={() => void saveGatewayStep()}>{saveGateway.isPending ? "Saving…" : "Save gateway"}</Button></div></div>
                </CardContent>
              </Card>}

              {step === 4 && <Card>
                <CardHeader><CardTitle>Deploy</CardTitle><CardDescription>Deployment is explicit. Saving credentials and runtime settings alone does not change the active service.</CardDescription></CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Desired image</p><p className="mt-1 font-medium">{setup.sourceRuntime ? `${setup.sourceRuntime.registry}/${setup.sourceRuntime.imageName}:${setup.sourceRuntime.imageTag}` : "Not configured"}</p></div><div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Service domain</p><p className="mt-1 font-medium">{setup.gateway?.domain ?? "Not configured"}</p></div></div>
                  <div className="flex items-center gap-3"><Badge variant={deploymentBadge}>{currentDeployment}</Badge>{setup.activeDeploymentId && <span className="font-mono text-xs">{setup.activeDeploymentId}</span>}</div>
                  {queuedDeploymentId && deploymentInProgress && <p className="text-sm text-muted-foreground">Deployment <code>{queuedDeploymentId}</code> is in progress. This page updates as the worker advances it.</p>}
                  {active && <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm">An active deployment is recorded. Review its runtime and version references on the project overview.</div>}
                  <div className="flex justify-between"><Button variant="outline" onClick={() => goToStep(3)}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button><div className="flex gap-2"><Button variant="outline" onClick={closePanel}>Close setup</Button><Button disabled={deploy.isPending || deploymentInProgress || !setup.sourceRuntime} onClick={() => void queueDeployment()}><Rocket className="mr-2 h-4 w-4" />{deploy.isPending ? "Queueing…" : deploymentInProgress ? "Deployment in progress" : "Deploy"}</Button></div></div>
                </CardContent>
              </Card>}
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
