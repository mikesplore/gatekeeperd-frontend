import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, Rocket, Save } from "lucide-react";
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
  useSaveProjectSetupRuntime,
  useContainerWizardContext,
  type ProjectSetupRuntimeInput,
} from "@/hooks/useProjects";
import { getApiErrorMessage } from "@/lib/api";
import { SidePanel, SidePanelContent, SidePanelDescription, SidePanelHeader, SidePanelTitle } from "@/components/ui/side-panel";
import { CreateContainerDialog } from "@/features/containers/CreateContainerDialog";
import type { CreateContainerPayload } from "@/types/container";

const steps = ["Source", "Deploy"];
const inProgressDeploymentStatuses = new Set(["queued", "building", "starting", "health-checking", "ready"]);

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
  network: "bridge", restartPolicy: "unless-stopped", environment: "production", env: {}, autoDeploy: false,
};

export function ProjectSetupWizardPage({ open, onOpenChange, projectId: providedProjectId, serviceId, initialStep = 1 }: { open?: boolean; onOpenChange?: (open: boolean) => void; projectId?: string; serviceId?: string; initialStep?: number }) {
  const { projectId: routeProjectId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = providedProjectId ?? routeProjectId;
  const requestedStep = open !== undefined ? initialStep : Number(searchParams.get("step") ?? String(initialStep));
  const [step, setStep] = useState(projectId ? Math.max(1, Math.min(2, requestedStep)) : 0);
  const [projectForm, setProjectForm] = useState({ name: "", customerId: "" });
  const [runtime, setRuntime] = useState<ProjectSetupRuntimeInput>(initialRuntime);
  const [sourceMode, setSourceMode] = useState<"github" | "image">("image");
  const [envText, setEnvText] = useState("");
  const [queuedDeploymentId, setQueuedDeploymentId] = useState("");
  const [adoptContainerId, setAdoptContainerId] = useState("");
  const [adoptContainerPort, setAdoptContainerPort] = useState("");
  const [attachContainerOpen, setAttachContainerOpen] = useState(false);
  const [containerMakerOpen, setContainerMakerOpen] = useState(false);
  const status = useProjectSetupStatus(projectId, serviceId);
  const adoptableContainers = useAdoptableContainers(Boolean(projectId) && step === 1 && attachContainerOpen);
  const adoptContainer = useAdoptProjectContainer(projectId);
  const dockerNetworkContext = useContainerWizardContext();
  const loadedConfiguration = useRef("");
  const savedRuntime = status.data?.sourceRuntime;
  const customers = useDashboardCustomers(100);
  const createProject = useCreateProjectSetup();
  const saveRuntime = useSaveProjectSetupRuntime(projectId);
  const deploy = useDeployProjectSetup(projectId, serviceId);
  const customerList = customers.data?.customers ?? [];

  useEffect(() => {
    if (!queuedDeploymentId || !status.data?.latestDeploymentId) return;
    if (status.data.latestDeploymentId === queuedDeploymentId && !inProgressDeploymentStatuses.has(status.data.latestDeploymentStatus ?? "")) {
      setQueuedDeploymentId("");
    }
  }, [queuedDeploymentId, status.data?.latestDeploymentId, status.data?.latestDeploymentStatus]);

  useEffect(() => {
    if (open === false) return;
    if (!savedRuntime) {
      loadedConfiguration.current = "";
      setRuntime(initialRuntime);
      setSourceMode("image");
      setEnvText("");
      return;
    }
    if (loadedConfiguration.current === `${projectId}:${savedRuntime.id}`) return;
    loadedConfiguration.current = `${projectId}:${savedRuntime.id}`;
    const saved = savedRuntime;
    setSourceMode(saved.repository ? "github" : "image");
    setRuntime({
      repository: saved.repository ?? "", gitRef: saved.gitRef, registry: saved.registry,
      imageName: saved.imageName, imageTag: saved.imageTag,
      network: saved.network, restartPolicy: saved.restartPolicy,
      environment: saved.environment, env: saved.env, preset: saved.preset ?? null, volumes: saved.volumes ?? [], runtimeOptions: saved.runtimeOptions,
      autoDeploy: saved.autoDeploy ?? false,
    });
    setEnvText(Object.entries(saved.env).map(([key, value]) => `${key}=${value}`).join("\n"));
  }, [open, projectId, savedRuntime]);

  useEffect(() => {
    if (open === false) {
      loadedConfiguration.current = "";
      return;
    }
    setStep(projectId ? Math.max(1, Math.min(2, initialStep)) : 0);
    setQueuedDeploymentId("");
    setAttachContainerOpen(false);
    setAdoptContainerId("");
    setAdoptContainerPort("");
    setContainerMakerOpen(false);
  }, [open, projectId, initialStep]);

  useEffect(() => {
    if (projectId) setStep(Math.max(1, Math.min(2, requestedStep)));
  }, [projectId, requestedStep]);

  const goToStep = (next: number) => {
    const bounded = Math.max(projectId ? 1 : 0, Math.min(2, next));
    setStep(bounded);
  };

  const resetProjectCreation = () => {
    setStep(0);
    setProjectForm({ name: "", customerId: "" });
    setRuntime(initialRuntime);
    setSourceMode("image");
    setEnvText("");
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
      if (sourceMode === "github" && !runtime.repository?.trim()) throw new Error("Enter the GitHub owner and repository.");
      await saveRuntime.mutateAsync({ ...runtime, containerPort: runtime.containerPort, hostPort: undefined, readinessType: undefined, readinessTarget: undefined, repository: sourceMode === "github" ? runtime.repository?.trim() || null : null, autoDeploy: sourceMode === "github" && Boolean(runtime.autoDeploy), preset: sourceMode === "image" ? runtime.preset ?? null : null, runtimeOptions: sourceMode === "image" ? runtime.runtimeOptions : undefined, volumes: sourceMode === "image" ? runtime.volumes ?? [] : [], env, serviceId });
      toast.success("Source and runtime settings saved");
      goToStep(2);
    } catch (error) { toast.error(getApiErrorMessage(error)); }
  };


  const applyContainerMaker = (payload: CreateContainerPayload) => {
    const reference = payload.image.trim();
    const firstSlash = reference.indexOf("/");
    let registry = "docker.io";
    let imageName = reference;
    if (firstSlash > 0 && (reference.slice(0, firstSlash).includes(".") || reference.slice(0, firstSlash).includes(":") || reference.slice(0, firstSlash) === "localhost")) {
      registry = reference.slice(0, firstSlash);
      imageName = reference.slice(firstSlash + 1);
    }
    const lastSlash = imageName.lastIndexOf("/");
    const lastColon = imageName.lastIndexOf(":");
    const imageTag = lastColon > lastSlash ? imageName.slice(lastColon + 1) : "latest";
    if (lastColon > lastSlash) imageName = imageName.slice(0, lastColon);
    const preset = payload.preset === "generic" ? null : payload.preset;
    const ports = Object.values(payload.ports ?? {});
    setRuntime(current => ({
      ...current, repository: null, registry, imageName, imageTag, preset,
      containerPort: ports[0] ?? (preset === "postgres" ? 5432 : preset === "redis" ? 6379 : undefined),
      network: payload.network ?? current.network, restartPolicy: payload.restartPolicy ?? current.restartPolicy,
      volumes: payload.volumes ?? [], runtimeOptions: payload.runtimeOptions,
    }));
    setSourceMode("image");
    setEnvText(Object.entries(payload.env ?? {}).map(([key, value]) => `${key}=${value}`).join("\n"));
  };

  const queueDeployment = async () => {
    try {
      const queued = await deploy.mutateAsync();
      setQueuedDeploymentId(queued.deploymentId);
      toast.success("Deployment queued");
      if (onOpenChange) handleOpenChange(false);
    } catch (error) { toast.error(getApiErrorMessage(error)); }
  };

  const attachRunningContainer = async () => {
    if (!adoptContainerId || !adoptContainerPort) return;
    try {
      const result = await adoptContainer.mutateAsync({ containerId: adoptContainerId, containerPort: Number(adoptContainerPort), serviceId });
      loadedConfiguration.current = "";
      await status.refetch();
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
      {projectId && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {steps.map((label, index) => {
          const stepIndex = index + 1;
          return <Button key={label} type="button" variant="outline" onClick={() => goToStep(stepIndex)} className={`flex min-h-10 items-center justify-start gap-2 whitespace-normal px-3 py-2 text-left text-sm font-medium ${step === stepIndex ? "border-primary bg-primary/5" : "hover:bg-muted/60"}`}>
            <span>{label}</span>
          </Button>;
        })}
      </div>}

      {!projectId ? (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="setup-name">Project name</Label><Input id="setup-name" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="Acme Portal" /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="setup-customer">Customer</Label>{customerList.length ? <select id="setup-customer" required className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={projectForm.customerId} onChange={e => setProjectForm({ ...projectForm, customerId: e.target.value })}><option value="">Select a customer</option>{customerList.map(customer => <option key={customer.id} value={customer.id}>{customer.firstName} {customer.lastName}</option>)}</select> : <p className="text-sm text-muted-foreground">Create a customer before creating a project. <Link to="/app/customers" className="text-primary underline">Go to customers</Link></p>}</div>
            <div className="flex justify-end sm:col-span-2"><Button disabled={createProject.isPending || !projectForm.name.trim() || !projectForm.customerId} onClick={() => void create()} loading={createProject.isPending}>{createProject.isPending ? "Creating…" : "Create project"}</Button></div>
        </div>
      ) : (
        <QueryState isLoading={status.isLoading} isError={status.isError} error={status.error} data={status.data}>
          {(setup) => (
            <>
              {step === 1 && <>
              <details className="rounded-lg border" onToggle={event => setAttachContainerOpen(event.currentTarget.open)}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4"><span><span className="block text-sm font-medium">Already running a container?</span><span className="mt-1 block text-sm text-muted-foreground">Attach an existing container instead of deploying a new image.</span></span><Badge variant="outline">Optional</Badge></summary>
                <div className="space-y-4 border-t p-4">
                  {adoptableContainers.isLoading ? <p className="text-sm text-muted-foreground">Loading running containers…</p> : adoptableContainers.isError ? <p className="text-sm text-destructive">Could not load Docker containers. Check that Gatekeeperd can access Docker.</p> : (adoptableContainers.data ?? []).filter(container => container.ports.length > 0).length === 0 ? <p className="text-sm text-muted-foreground">No running containers with a published TCP port are available to attach.</p> : <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2"><Label>Running container</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={adoptContainerId} onChange={event => { const nextId = event.target.value; setAdoptContainerId(nextId); setAdoptContainerPort(String(adoptableContainers.data?.find(container => container.id === nextId)?.ports[0]?.containerPort ?? "")); }}><option value="">Select a container</option>{(adoptableContainers.data ?? []).filter(container => container.ports.length > 0).map(container => <option key={container.id} value={container.id}>{container.name} · {container.image}</option>)}</select></div>
                    <div className="space-y-2"><Label>Published application port</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={adoptContainerPort} onChange={event => setAdoptContainerPort(event.target.value)} disabled={!selectedAdoptableContainer}><option value="">Select a port</option>{selectedAdoptableContainer?.ports.map(port => <option key={port.containerPort} value={port.containerPort}>{port.containerPort} → host {port.hostPort}</option>)}</select></div>
                    {selectedAdoptableContainer && <p className="text-xs text-muted-foreground sm:col-span-2">Network: {selectedAdoptableContainer.networks.join(", ") || "bridge"}. {selectedAdoptableContainer.environmentVariableCount} environment variables will be encrypted into a new project secret version. The previous runtime, if any, will keep running.</p>}
                  </div>}
                  <div className="flex justify-end"><Button variant="outline" disabled={!adoptContainerId || !adoptContainerPort || adoptContainer.isPending} onClick={() => void attachRunningContainer()} loading={adoptContainer.isPending}>{adoptContainer.isPending ? "Attaching…" : "Attach container"}</Button></div>
                </div>
              </details>
              <Card>
                <CardHeader><CardTitle>Choose one deployment source</CardTitle><CardDescription>Select either a GitHub repository that Gatekeeperd builds, or an existing Docker image. These are separate deployment paths.</CardDescription></CardHeader>
                <CardContent className="grid gap-4">
                  <fieldset className="grid gap-3 sm:grid-cols-2">
                    <legend className="sr-only">Deployment source</legend>
                    <label className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${sourceMode === "github" ? "border-primary bg-primary/5" : ""}`}><input type="radio" name="deployment-source" value="github" checked={sourceMode === "github"} onChange={() => setSourceMode("github")} className="mt-1 h-4 w-4" /><span><span className="block text-sm font-medium">Build from GitHub</span><span className="block text-xs text-muted-foreground">Choose a repository and branch or tag. Gatekeeperd builds the image for deployment.</span></span></label>
                    <label className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${sourceMode === "image" ? "border-primary bg-primary/5" : ""}`}><input type="radio" name="deployment-source" value="image" checked={sourceMode === "image"} onChange={() => { setSourceMode("image"); setRuntime(current => ({ ...current, repository: "", autoDeploy: false })); }} className="mt-1 h-4 w-4" /><span><span className="block text-sm font-medium">Use a Docker image</span><span className="block text-xs text-muted-foreground">Deploy an image that has already been built and published.</span></span></label>
                  </fieldset>
                  {sourceMode === "github" ? <div className="grid gap-4 rounded-md border p-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label>GitHub repository</Label><Input value={runtime.repository ?? ""} onChange={e => setRuntime({ ...runtime, repository: e.target.value })} placeholder="acme/portal" /><p className="text-xs text-muted-foreground">Use owner/repository format.</p></div>
                    <div className="space-y-2"><Label>Branch or tag</Label><Input value={runtime.gitRef} onChange={e => setRuntime({ ...runtime, gitRef: e.target.value })} placeholder="main" /></div>
                    <div className="space-y-2"><Label>Registry for the built image</Label><Input value={runtime.registry} onChange={e => setRuntime({ ...runtime, registry: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Build image name</Label><Input value={runtime.imageName} onChange={e => setRuntime({ ...runtime, imageName: e.target.value })} placeholder="acme/portal" /></div>
                    <div className="space-y-2"><Label>Build image tag</Label><Input value={runtime.imageTag} onChange={e => setRuntime({ ...runtime, imageTag: e.target.value })} /></div>
                    <label className="flex items-start gap-3 rounded-md border p-3 sm:col-span-2"><input type="checkbox" className="mt-1 h-4 w-4" checked={runtime.autoDeploy ?? false} onChange={event => setRuntime({ ...runtime, autoDeploy: event.target.checked })} /><span><span className="block text-sm font-medium">Deploy on matching GitHub pushes</span><span className="block text-xs text-muted-foreground">Queue a deployment when the configured branch or tag changes.</span></span></label>
                  </div> : <div className="space-y-3 rounded-md border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-medium">Container configuration</p><p className="mt-1 text-sm text-muted-foreground">Use the shared container maker to choose an application, database, or Redis preset and configure its runtime.</p></div><Button type="button" variant="outline" onClick={() => setContainerMakerOpen(true)}>{runtime.preset || runtime.imageName ? "Edit container" : "Configure container"}</Button></div>
                    {runtime.imageName ? <p className="text-sm">{runtime.preset ? `${runtime.preset === "postgres" ? "PostgreSQL" : "Redis"} preset · ` : "Image · "}{runtime.registry}/{runtime.imageName}:{runtime.imageTag}{runtime.containerPort ? ` · container port ${runtime.containerPort}` : ""}</p> : <p className="text-sm text-muted-foreground">No container configuration yet.</p>}
                    <p className="text-xs text-muted-foreground">Gatekeeperd will use this configuration to create and verify the deployment candidate. It will not create a separate unmanaged container.</p>
                  </div>}
                  {sourceMode === "github" && <details className="rounded-md border"><summary className="cursor-pointer px-3 py-2.5 text-sm font-medium">Optional runtime settings</summary><div className="grid gap-4 border-t p-3 sm:grid-cols-2">
                    <div className="space-y-2"><Label>Docker network</Label><select value={runtime.network} onChange={e => setRuntime({ ...runtime, network: e.target.value })} disabled={dockerNetworkContext.isLoading || dockerNetworkContext.isError} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60">{dockerNetworkContext.isLoading ? <option value={runtime.network}>Loading networks…</option> : dockerNetworkContext.isError ? <option value={runtime.network}>Could not load Docker networks</option> : <>{!dockerNetworkContext.data?.networks.includes(runtime.network) && <option value={runtime.network}>{runtime.network} (current)</option>}{(dockerNetworkContext.data?.networks.length ? dockerNetworkContext.data.networks : ["bridge"]).map(network => <option key={network} value={network}>{network}{dockerNetworkContext.data?.internalNetwork === network ? " (internal)" : ""}</option>)}</>}</select>{dockerNetworkContext.isError && <Button type="button" size="sm" variant="link" onClick={() => void dockerNetworkContext.refetch()}>Retry</Button>}</div>
                    <div className="space-y-2"><Label>Restart policy</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={runtime.restartPolicy} onChange={e => setRuntime({ ...runtime, restartPolicy: e.target.value })}><option value="unless-stopped">unless-stopped</option><option value="always">always</option><option value="on-failure">on-failure</option><option value="no">no</option></select></div>
                    <div className="space-y-2 sm:col-span-2"><Label>Non-secret runtime variables</Label><Textarea rows={4} value={envText} onChange={e => setEnvText(e.target.value)} placeholder="NODE_ENV=production" /><p className="text-xs text-muted-foreground">Manage secrets in the service environment settings after saving.</p></div>
                  </div></details>}
                  <div className="flex justify-between"><Button variant="outline" onClick={closePanel}>Close</Button><Button disabled={saveRuntime.isPending || !runtime.imageName.trim() || (sourceMode === "github" && !runtime.repository?.trim())} onClick={() => void saveSource()} loading={saveRuntime.isPending}><Save className="mr-2 h-4 w-4" />{saveRuntime.isPending ? "Saving…" : "Save and continue"}</Button></div>
                </CardContent>
              </Card></>}

              {step === 2 && <Card>
                <CardHeader><CardTitle>Review and deploy</CardTitle><CardDescription>{setup.sourceRuntime?.repository ? "Gatekeeperd will build the selected GitHub revision, then check the candidate before switching traffic." : "Gatekeeperd checks for the selected image on this server first, uses it if present, and pulls it from the registry only when it is missing."} Registry access uses the centrally managed credentials when needed.</CardDescription></CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Selected source</p><p className="mt-1 font-medium">{setup.sourceRuntime ? setup.sourceRuntime.repository ? `GitHub · ${setup.sourceRuntime.repository}@${setup.sourceRuntime.gitRef}` : `${setup.sourceRuntime.preset ? `${setup.sourceRuntime.preset === "postgres" ? "PostgreSQL" : "Redis"} preset · ` : "Docker image · "}${setup.sourceRuntime.registry}/${setup.sourceRuntime.imageName}:${setup.sourceRuntime.imageTag}` : "Not configured"}</p>{setup.sourceRuntime?.repository && <p className="mt-2 text-xs text-muted-foreground">Build output: {setup.sourceRuntime.registry}/{setup.sourceRuntime.imageName}:{setup.sourceRuntime.imageTag}</p>}</div>
                  <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" onClick={() => goToStep(1)}><ChevronLeft className="mr-1 h-4 w-4" />Back to source</Button><div className="flex gap-2"><Button variant="outline" onClick={closePanel}>Close</Button><Button disabled={deploy.isPending || Boolean(queuedDeploymentId) || !setup.sourceRuntime} onClick={() => void queueDeployment()} loading={deploy.isPending}><Rocket className="mr-2 h-4 w-4" />{deploy.isPending ? "Queueing…" : "Make deployment"}</Button></div></div>
                </CardContent>
              </Card>}
            </>
          )}
        </QueryState>
      )}

      {projectId && <p className="text-xs text-muted-foreground">Projects created here remain valid indefinitely before a source, runtime, or deployment is configured.</p>}
        </div>
        <CreateContainerDialog open={containerMakerOpen} onOpenChange={setContainerMakerOpen} configureOnly onConfigured={applyContainerMaker} />
      </SidePanelContent>
    </SidePanel>
  );
}
