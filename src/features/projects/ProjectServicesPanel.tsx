import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Globe, LockKeyhole, MoreHorizontal, Pencil, Plus, Rocket, Save, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/QueryState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdoptableContainers, useAdoptProjectContainer, useContainer, useCreateServiceDomain, useDeleteServiceDomain, useProjectServices, useProjectSetupStatus, useSaveServiceEnvironment, useSaveSharedEnvironment, useServiceDomainBindings, useServiceEnvironmentMetadata, useSetPrimaryServiceDomain, useSharedEnvironmentMetadata, useUpdateServiceDomain } from "@/hooks/useProjects";
import type { Project, ServiceType } from "@/types/project";
import type { DashboardSite } from "@/types/sites";
import { useDashboardSites } from "@/hooks/useSiteDashboard";
import { api, getApiErrorMessage } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { ProjectSetupWizardPage } from "@/features/projects/ProjectSetupWizardPage";
import { useDeployProjectSetup } from "@/hooks/useProjects";
import { useRepairDeploymentUpstream } from "@/hooks/useDeployments";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type HistoryResponse = { projectId: string; environment: string; items: { id: string; serviceId?: string; status: string; createdAt: string; activeAt?: string | null; environment: string; trigger: string; failureReason?: string | null; imageName: string; imageTag: string; imageDigest?: string | null; sourceCommit?: string | null; healthCheckResult: string }[] };
export function ProjectServicesPanel({ project, view = "overview", serviceId }: { project: Project; view?: "overview" | "settings" | "detail"; serviceId?: string }) {
  const queryClient = useQueryClient();
  const servicesQuery = useProjectServices(project.id);
  const sitesQuery = useDashboardSites("all", 500, 0);
  const sharedMetadata = useSharedEnvironmentMetadata(project.id);
  const saveShared = useSaveSharedEnvironment(project.id);
  const [sharedDraft, setSharedDraft] = useState<Record<string, string>>({});
  const [sharedNewKey, setSharedNewKey] = useState("");
  const [sharedNewValue, setSharedNewValue] = useState("");
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceType, setNewServiceType] = useState<ServiceType>("frontend");
  const [serviceDrafts, setServiceDrafts] = useState<Record<string, Record<string, string>>>({});

  const relevantSites = useMemo(() => (sitesQuery.data?.sites ?? []).filter(site => site.projectId === project.id), [sitesQuery.data?.sites, project.id]);

  return <div className={view === "settings" ? "mt-4 space-y-5" : "space-y-5"}>
    {view === "settings" && <SharedEnvironmentEditor
      metadata={sharedMetadata.data}
      draft={sharedDraft}
      setDraft={setSharedDraft}
      newKey={sharedNewKey}
      setNewKey={setSharedNewKey}
      newValue={sharedNewValue}
      setNewValue={setSharedNewValue}
      saving={saveShared.isPending}
      onSave={async () => {
        try {
          const values = validateDraft(sharedDraft);
          if (!Object.keys(values).length) throw new Error("Add at least one shared variable before saving.");
          const result = await saveShared.mutateAsync({ environment: "production", values });
          setSharedDraft({});
          toast.success(`Shared variables saved as v${result.version}; ${result.deploymentIds.length} deployment(s) queued.`);
        } catch (error) { toast.error(error instanceof Error ? error.message : getApiErrorMessage(error)); }
      }}
      onAdd={() => {
        const key = sharedNewKey.trim();
        if (!isVariableName(key)) return toast.error("Use a valid environment variable name.");
        setSharedDraft(current => ({ ...current, [key]: sharedNewValue }));
        setSharedNewKey(""); setSharedNewValue("");
      }}
    />}

    {view === "overview" && <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><CardTitle>Services</CardTitle><p className="mt-1 text-sm text-muted-foreground">Each service owns its deployment, access block, runtime health, and domains.</p></div>
        <div className="flex flex-wrap gap-2"><Input aria-label="New service name" placeholder="e.g. frontend" value={newServiceName} onChange={event => setNewServiceName(event.target.value)} /><Select value={newServiceType} onValueChange={value => setNewServiceType(value as ServiceType)}><SelectTrigger className="w-[140px]" aria-label="New service type"><SelectValue /></SelectTrigger><SelectContent><ServiceTypeOptions /></SelectContent></Select><Button disabled={!newServiceName.trim() || servicesQuery.isFetching} onClick={async () => { try { await api.post(`/admin/projects/${project.id}/services`, { name: newServiceName.trim(), serviceType: newServiceType }); setNewServiceName(""); await servicesQuery.refetch(); toast.success("Service created"); } catch (error) { toast.error(getApiErrorMessage(error)); } }}><Plus className="h-4 w-4" />Add</Button></div>
      </CardHeader>
      <CardContent className="space-y-4">
        {servicesQuery.isLoading && <div className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>}
        {servicesQuery.isError && <Alert variant="destructive"><AlertTitle>Services unavailable</AlertTitle><AlertDescription>{getApiErrorMessage(servicesQuery.error)}</AlertDescription></Alert>}
        {!servicesQuery.isLoading && !servicesQuery.isError && servicesQuery.data?.length === 0 && <p className="text-sm text-muted-foreground">No services are configured for this project.</p>}
        {servicesQuery.data?.map(service => <ServiceCard key={service.id} project={project} service={service} serviceCount={servicesQuery.data?.length ?? 0} view="overview" sites={relevantSites.filter(site => site.serviceId === service.id)} refreshServices={async () => { await servicesQuery.refetch(); await queryClient.invalidateQueries({ queryKey: ["project-overview"] }); }} draft={serviceDrafts[service.id] ?? {}} setDraft={draft => setServiceDrafts(current => ({ ...current, [service.id]: draft }))} />)}
      </CardContent>
    </Card>}
    {view === "detail" && <>
      {servicesQuery.isLoading && <Skeleton className="h-32 w-full" />}
      {servicesQuery.isError && <Alert variant="destructive"><AlertTitle>Services unavailable</AlertTitle><AlertDescription>{getApiErrorMessage(servicesQuery.error)}</AlertDescription></Alert>}
      {!servicesQuery.isLoading && !servicesQuery.isError && !(servicesQuery.data ?? []).some(service => service.id === serviceId) && <Alert><AlertTitle>Service not found</AlertTitle><AlertDescription>This service does not belong to this project.</AlertDescription></Alert>}
      {(servicesQuery.data ?? []).filter(service => service.id === serviceId).map(service => <ServiceCard key={service.id} project={project} service={service} serviceCount={servicesQuery.data?.length ?? 0} view="detail" sites={relevantSites.filter(site => site.serviceId === service.id)} refreshServices={async () => { await servicesQuery.refetch(); await queryClient.invalidateQueries({ queryKey: ["project-overview"] }); }} draft={serviceDrafts[service.id] ?? {}} setDraft={draft => setServiceDrafts(current => ({ ...current, [service.id]: draft }))} />)}
    </>}
  </div>;
}

function SharedEnvironmentEditor({ metadata, draft, setDraft, newKey, setNewKey, newValue, setNewValue, saving, onSave, onAdd }: {
  metadata?: { latest?: { version: number; keys: string[] } | null; versions: { id: string; version: number; keys: string[]; createdAt: string }[] };
  draft: Record<string, string>; setDraft: (value: Record<string, string>) => void;
  newKey: string; setNewKey: (value: string) => void; newValue: string; setNewValue: (value: string) => void;
  saving: boolean; onSave: () => void; onAdd: () => void;
}) {
  const keys = metadata?.latest?.keys ?? [];
  return <Card>
    <CardHeader><CardTitle>Project shared environment</CardTitle><p className="text-sm text-muted-foreground">Imported keys are available to services. Values are write-only; submitting creates a version and redeploys services that follow the latest shared set.</p></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-xs text-muted-foreground">Latest shared set: {metadata?.latest ? `v${metadata.latest.version}` : "not configured"} · {keys.length} key(s)</p>
      {keys.length > 0 && <div className="flex flex-wrap gap-2">{keys.map(key => <span key={key} className="rounded border px-2 py-1 font-mono text-xs">{key}{key in draft ? " · replacement entered" : " · value hidden"}</span>)}</div>}
      <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
        <div className="space-y-1"><Label htmlFor="shared-key">Variable name</Label><Input id="shared-key" value={newKey} onChange={event => setNewKey(event.target.value)} placeholder="DATABASE_URL" /></div>
        <div className="space-y-1"><Label htmlFor="shared-value">Value</Label><Input id="shared-value" type="password" autoComplete="new-password" value={newValue} onChange={event => setNewValue(event.target.value)} placeholder="Write-only value" /></div>
        <Button className="self-end" variant="outline" onClick={onAdd}><Plus className="h-4 w-4" />Add / replace</Button>
      </div>
      {Object.keys(draft).length > 0 && <div className="space-y-2 rounded-md border p-3"><p className="text-sm font-medium">Pending shared values</p>{Object.keys(draft).sort().map(key => <div key={key} className="flex items-center justify-between gap-2 font-mono text-xs"><span>{key}</span><Button size="sm" variant="ghost" onClick={() => setDraft(Object.fromEntries(Object.entries(draft).filter(([name]) => name !== key)))}>Remove</Button></div>)}</div>}
      <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Saving replaces the full shared set. Reenter existing values you want to retain.</p><Button disabled={saving || !Object.keys(draft).length} onClick={onSave}><Save className="h-4 w-4" />{saving ? "Saving…" : "Save shared & deploy"}</Button></div>
    </CardContent>
  </Card>;
}

function ServiceDomainBindings({ projectId, serviceId }: { projectId: string; serviceId: string }) {
  const bindingsQuery = useServiceDomainBindings(projectId, serviceId);
  const create = useCreateServiceDomain(projectId, serviceId);
  const update = useUpdateServiceDomain(projectId, serviceId);
  const remove = useDeleteServiceDomain(projectId, serviceId);
  const primary = useSetPrimaryServiceDomain(projectId, serviceId);
  const [domain, setDomain] = useState("");
  const [port, setPort] = useState("");
  const [editing, setEditing] = useState<{ id: string; domain: string; port: string } | null>(null);
  const availablePorts = bindingsQuery.data?.publishedPorts ?? [];
  const add = async () => {
    if (!domain.trim()) return toast.error("Enter a domain name.");
    try {
      await create.mutateAsync({ domain: domain.trim(), ...(port ? { containerPort: Number(port) } : {}) });
      setDomain(""); setPort(""); toast.success("Domain binding saved");
    } catch (error) { toast.error(getApiErrorMessage(error)); }
  };
  const saveEdit = async () => {
    if (!editing || !editing.domain.trim()) return;
    try {
      await update.mutateAsync({ bindingId: editing.id, domain: editing.domain.trim(), ...(editing.port ? { containerPort: Number(editing.port) } : {}) });
      setEditing(null); toast.success("Domain binding updated");
    } catch (error) { toast.error(getApiErrorMessage(error)); }
  };
  return <Card>
    <CardHeader><CardTitle className="text-base">Domain bindings</CardTitle><p className="text-xs text-muted-foreground">Manage public domains independently from deployments. Deploy the service first to select among multiple published ports.</p></CardHeader>
    <CardContent className="space-y-3">
      {bindingsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading domain bindings…</p>}
      {bindingsQuery.data?.bindings.map(binding => <div key={binding.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"><span><span className="font-medium">{binding.domain}</span><span className="ml-2 text-muted-foreground">{binding.containerPort == null ? "port pending" : `port ${binding.containerPort}`}</span>{binding.primary && <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">primary</span>}</span><span className="flex flex-wrap gap-1"><Button size="sm" variant="ghost" onClick={() => setEditing({ id: binding.id, domain: binding.domain, port: binding.containerPort?.toString() ?? "" })}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>{!binding.primary && binding.status === "bound" && <Button size="sm" variant="ghost" onClick={async () => { try { await primary.mutateAsync(binding.id); toast.success("Primary domain updated"); } catch (error) { toast.error(getApiErrorMessage(error)); } }}>Set primary</Button>}<Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { if (!window.confirm(`Remove ${binding.domain}?`)) return; try { await remove.mutateAsync(binding.id); toast.success("Domain binding removed"); } catch (error) { toast.error(getApiErrorMessage(error)); } }}><Trash2 className="mr-1 h-3.5 w-3.5" />Remove</Button></span></div>)}
      {!bindingsQuery.isLoading && !bindingsQuery.data?.bindings.length && <p className="text-sm text-muted-foreground">No domain bindings configured.</p>}
      <div className="grid gap-2 border-t pt-3 sm:grid-cols-[1fr_180px_auto]"><Input placeholder="app.example.com" value={domain} onChange={event => setDomain(event.target.value)} /><select className="h-10 rounded-md border bg-background px-3 text-sm" value={port} onChange={event => setPort(event.target.value)}><option value="">Automatic / pending port</option>{availablePorts.map(value => <option key={value} value={value}>Container port {value}</option>)}</select><Button disabled={create.isPending || !domain.trim()} onClick={() => void add()}><Plus className="mr-1 h-4 w-4" />Add domain</Button></div>
      <Dialog open={Boolean(editing)} onOpenChange={open => { if (!open) setEditing(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Edit domain binding</DialogTitle><DialogDescription>Change the domain or its published container port.</DialogDescription></DialogHeader>{editing && <div className="space-y-3"><div className="space-y-1"><Label>Domain</Label><Input value={editing.domain} onChange={event => setEditing({ ...editing, domain: event.target.value })} /></div><div className="space-y-1"><Label>Container port</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={editing.port} onChange={event => setEditing({ ...editing, port: event.target.value })}><option value="">Automatic / pending port</option>{availablePorts.map(value => <option key={value} value={value}>{value}</option>)}</select></div></div>}<DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={update.isPending} onClick={() => void saveEdit()}>{update.isPending ? "Saving…" : "Save binding"}</Button></DialogFooter></DialogContent>
      </Dialog>
    </CardContent>
  </Card>;
}

function ServiceCard({ project, service, serviceCount, view, sites, refreshServices, draft, setDraft }: {
  project: Project;
  view: "overview" | "detail";
  serviceCount: number;
  service: { id: string; name: string; serviceType: ServiceType; accessStatus: string; isDefault: boolean; blockReason?: string | null };
  sites: DashboardSite[];
  refreshServices: () => void;
  draft: Record<string, string>; setDraft: (draft: Record<string, string>) => void;
}) {
  const navigate = useNavigate();
  const environment = useServiceEnvironmentMetadata(project.id, service.id);
  const history = useQueryServiceHistory(project.slug, service.id);
  const setupStatus = useProjectSetupStatus(project.id, service.id, false);
  const activeInspection = useQuery({
    queryKey: ["service-runtime", project.id, service.id],
    queryFn: async () => (await api.get<import("@/types/project").ServiceActiveDeployment>(`/admin/projects/${project.id}/services/${service.id}/runtime`, { params: { environment: "production" } })).data,
    retry: false,
    refetchInterval: 15_000,
  });
  const activeContainerName = activeInspection.data?.containerName ?? "";
  const activeContainer = useContainer(activeContainerName);
  const publishedPortText = Object.entries(activeInspection.data?.publishedPorts ?? {})
    .map(([containerPort, hostPort]) => `${hostPort}:${containerPort}/tcp`)
    .join(", ");
  const save = useSaveServiceEnvironment(project.id);
  const deploy = useDeployProjectSetup(project.id, service.id);
  const repairGateway = useRepairDeploymentUpstream(service.id);
  const adoptable = useAdoptableContainers(true);
  const adopt = useAdoptProjectContainer(project.id);
  const [containerToAttach, setContainerToAttach] = useState("");
  const [removedKeys, setRemovedKeys] = useState<string[]>([]);
  const [environmentDirty, setEnvironmentDirty] = useState(false);
  const [environmentEditing, setEnvironmentEditing] = useState(false);
  const [environmentVisible, setEnvironmentVisible] = useState(false);
  const lastSyncedEnvironment = useRef("");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [blockReason, setBlockReason] = useState(service.blockReason ?? "");
  const [blockReasonCode, setBlockReasonCode] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [serviceName, setServiceName] = useState(service.name);
  const [serviceType, setServiceType] = useState<ServiceType>(service.serviceType);
  const [serviceActionPending, setServiceActionPending] = useState(false);
  const latestDeployment = history.data?.items[0];
  const active = history.data?.items.find(item => item.status === "active");
  const hasRuntimeConfiguration = Boolean(setupStatus.data?.sourceRuntime);
  const gateway = setupStatus.data?.gateway;
  const latestFailed = latestDeployment?.status.toLowerCase() === "failed";
  const gatewayNeedsRepair = Boolean(gateway && gateway.status !== "active" && latestDeployment?.status.toLowerCase() === "active");
  const currentValues = environment.data?.effectiveValues ?? {};
  const serviceKeys = Object.keys(currentValues);
  const environmentValues = environment.data?.effectiveValues;
  const environmentSignature = environmentValues ? JSON.stringify(environmentValues) : "";
  useEffect(() => {
    if (!environmentValues || environmentDirty || lastSyncedEnvironment.current === environmentSignature) return;
    lastSyncedEnvironment.current = environmentSignature;
    setDraft(environmentValues);
    setRemovedKeys([]);
  }, [environmentDirty, environmentSignature, environmentValues, setDraft]);
  const serviceHealth = sites.find(site => site.runtimeHealth)?.runtimeHealth ?? active?.healthCheckResult ?? latestDeployment?.healthCheckResult ?? latestDeployment?.status ?? "not deployed";
  const saveServiceName = async () => {
    const name = serviceName.trim();
    if (!name) return toast.error("Service name is required.");
    setServiceActionPending(true);
    try {
      await api.patch(`/admin/projects/${project.id}/services/${service.id}`, { name, serviceType });
      await refreshServices();
      setEditOpen(false);
      toast.success("Service renamed");
    } catch (error) { toast.error(getApiErrorMessage(error)); }
    finally { setServiceActionPending(false); }
  };
  const makeDefault = async () => {
    setServiceActionPending(true);
    try {
      await api.patch(`/admin/projects/${project.id}/services/${service.id}`, { isDefault: true });
      await refreshServices();
      toast.success(`${service.name} is now the default service`);
    } catch (error) { toast.error(getApiErrorMessage(error)); }
    finally { setServiceActionPending(false); }
  };
  const deleteService = async () => {
    setServiceActionPending(true);
    try {
      await api.delete(`/admin/projects/${project.id}/services/${service.id}`);
      await refreshServices();
      toast.success("Service deleted");
      navigate(`/app/projects/${encodeURIComponent(project.slug)}?tab=overview`, { replace: true });
    } catch (error) { toast.error(getApiErrorMessage(error)); }
    finally { setServiceActionPending(false); setDeleteOpen(false); }
  };
  const visibleKeys = [...new Set([...serviceKeys, ...Object.keys(draft)])].filter(key => !removedKeys.includes(key)).sort();
  const setToSave = async () => {
    try {
      const serviceValues = validateDraft(Object.fromEntries(visibleKeys.map(key => [key, draft[key] ?? currentValues[key] ?? ""])));
      const result = await save.mutateAsync({ serviceId: service.id, environment: "production", values: serviceValues,
        replaceExisting: true });
      setEnvironmentDirty(false);
      toast.success(result.deploymentIds.length
        ? "Environment saved; deployment queued."
        : "Environment saved. Configure a runtime to deploy it.");
    } catch (error) { toast.error(error instanceof Error ? error.message : getApiErrorMessage(error)); }
  };

  const handleVariablePaste = (field: "name" | "value", event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    const likelyAssignments = text.includes("=") && (field === "name" || text.includes("\n") || text.includes("\r"));
    if (!likelyAssignments) return;
    event.preventDefault();
    try {
      const values = parseEnvContent(text);
      const entries = Object.entries(values);
      if (!entries.length) throw new Error("No KEY=value entries found.");
      if (entries.length === 1) {
        setNewKey(entries[0][0]);
        setNewValue(entries[0][1]);
      } else {
        setDraft({ ...draft, ...values });
        setRemovedKeys(current => current.filter(key => !(key in values)));
        setEnvironmentDirty(true);
        setNewKey("");
        setNewValue("");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not parse environment variables.");
    }
  };

  const toggleBlock = async () => {
    const next = service.accessStatus === "active" ? "blocked" : "active";
    if (next === "blocked" && !blockReasonCode) return;
    try {
      await api.patch(`/admin/projects/${project.id}/services/${service.id}`, next === "active"
        ? { accessStatus: next, blockReason: null, blockReasonCode: null, blockReasonNote: null }
        : { accessStatus: next, blockReason: blockReason.trim() || blockReasonCodeLabel(blockReasonCode), blockReasonCode, blockReasonNote: blockReason.trim() || null });
      setBlocking(false);
      setConfirmBlockOpen(false);
      setBlockReasonCode("");
      setBlockReason("");
      await refreshServices();
      toast.success(next === "active" ? "Service unblocked" : "Service blocked");
    } catch (error) { toast.error(getApiErrorMessage(error)); }
  };

  const blockDialog = <AlertDialog open={confirmBlockOpen} onOpenChange={setConfirmBlockOpen}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Block {service.name}?</AlertDialogTitle>
        <AlertDialogDescription>Choose a reason before traffic to this service is blocked.</AlertDialogDescription>
      </AlertDialogHeader>
      <div className="space-y-2 py-2">
        <Label htmlFor={`service-block-reason-${service.id}`}>Block reason <span className="text-destructive">*</span></Label>
        <Select value={blockReasonCode} onValueChange={setBlockReasonCode}>
          <SelectTrigger id={`service-block-reason-${service.id}`}><SelectValue placeholder="Choose a reason" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="payment">Payment issue</SelectItem><SelectItem value="manual_hold">Manual hold</SelectItem><SelectItem value="abuse_tos">Abuse or terms violation</SelectItem><SelectItem value="suspended_by_request">Suspended by request</SelectItem><SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`service-block-note-${service.id}`}>Additional note (optional)</Label>
        <Textarea id={`service-block-note-${service.id}`} value={blockReason} onChange={event => setBlockReason(event.target.value)} rows={3} placeholder="Add context for this block" />
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={blocking}>Cancel</AlertDialogCancel>
        <Button variant="destructive" disabled={!blockReasonCode || blocking} onClick={() => { setBlocking(true); void toggleBlock().finally(() => setBlocking(false)); }}>{blocking ? "Blocking…" : "Block service"}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;

  if (view === "overview") {
    return <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2"><Link to={`/app/projects/${encodeURIComponent(project.slug)}/services/${service.id}`} className="text-base font-semibold transition-colors hover:text-primary">{service.name}</Link><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{formatStatus(service.serviceType)}</span>{service.isDefault && <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">Default</span>}<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${service.accessStatus === "active" ? "bg-emerald-500/10 text-emerald-700" : "bg-red-500/10 text-red-700"}`}>{formatStatus(service.accessStatus)}</span><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{formatStatus(serviceHealth)}</span></div>
          <p className="truncate text-sm text-muted-foreground">{sites.length ? sites.map(site => site.domain).join(", ") : "No domain attached"}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">{serviceCount > 1 && !service.isDefault && <Button size="sm" variant="outline" disabled={serviceActionPending} onClick={() => void makeDefault()}>{serviceActionPending ? "Saving…" : "Set as default"}</Button>}<Button asChild size="sm" variant="outline"><Link to={`/app/projects/${encodeURIComponent(project.slug)}/services/${service.id}`}>Manage service</Link></Button><Button size="sm" variant={service.accessStatus === "active" ? "destructive" : "outline"} onClick={() => service.accessStatus === "active" ? setConfirmBlockOpen(true) : void toggleBlock()}><LockKeyhole className="h-4 w-4" />{service.accessStatus === "active" ? "Block service" : "Unblock service"}</Button></div>
      </CardContent>
      {blockDialog}
    </Card>;
  }

  return <>
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <            CardTitle className="text-base">{service.name}</CardTitle><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{formatStatus(service.serviceType)}</span>
            {service.isDefault && <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">Default</span>}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${service.accessStatus === "active" ? "bg-emerald-500/10 text-emerald-700" : "bg-red-500/10 text-red-700"}`}>Status: {formatStatus(service.accessStatus)}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Health: {formatStatus(serviceHealth)}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">{sites.length ? sites.map(site => <a className="inline-flex items-center gap-1.5 transition-colors hover:text-primary" key={site.slug} href={`${site.tlsMode === "http_only" ? "http" : "https"}://${site.domain}`} target="_blank" rel="noreferrer"><Globe className="h-3.5 w-3.5" />{site.domain}</a>) : <span>No domain attached</span>}</div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setSetupOpen(true)}><Settings2 className="h-4 w-4" />Configure service</Button><Button size="sm" variant={service.accessStatus === "active" ? "destructive" : "outline"} onClick={() => service.accessStatus === "active" ? setConfirmBlockOpen(true) : void toggleBlock()}><LockKeyhole className="h-4 w-4" />{service.accessStatus === "active" ? "Block service" : "Unblock service"}</Button><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="outline" aria-label={`More actions for ${service.name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => { setServiceName(service.name); setEditOpen(true); }}><Pencil className="mr-2 h-4 w-4" />Edit name</DropdownMenuItem>{serviceCount > 1 && !service.isDefault && <DropdownMenuItem disabled={serviceActionPending} onSelect={() => void makeDefault()}><Settings2 className="mr-2 h-4 w-4" />Set as default</DropdownMenuItem>}<DropdownMenuItem disabled={service.isDefault} className="text-destructive focus:text-destructive" onSelect={() => setDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4" />{service.isDefault ? "Default service is required" : "Delete service"}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
      </CardContent>
    </Card>
    <ServiceDomainBindings projectId={project.id} serviceId={service.id} />
    {(!hasRuntimeConfiguration || latestFailed || gatewayNeedsRepair || (!gateway && latestDeployment?.status.toLowerCase() === "active")) && <Alert className="border-amber-500/40 bg-amber-500/5"><AlertTitle>Next steps for {service.name}</AlertTitle><AlertDescription className="space-y-2"><p>{!hasRuntimeConfiguration ? "Configure source and runtime before deploying this service." : latestFailed ? `The latest deployment failed${latestDeployment?.failureReason ? `: ${latestDeployment.failureReason}` : "."}` : gatewayNeedsRepair ? "The service is deployed, but its gateway route is not active. Repair the gateway before sending traffic." : "The service is deployed, but no gateway is configured yet. Configure the site before sending traffic."}</p><div className="flex flex-wrap gap-2">{!hasRuntimeConfiguration ? <Button size="sm" variant="outline" onClick={() => setSetupOpen(true)}>Configure runtime</Button> : latestFailed ? <Button size="sm" variant="outline" disabled={deploy.isPending} onClick={async () => { try { await deploy.mutateAsync(); toast.success("Deployment retry queued"); } catch (error) { toast.error(getApiErrorMessage(error)); } }}>{deploy.isPending ? "Queuing…" : "Retry deployment"}</Button> : gatewayNeedsRepair ? <Button size="sm" variant="outline" disabled={repairGateway.isPending} onClick={async () => { try { await repairGateway.mutateAsync(); toast.success("Gateway repair queued"); } catch (error) { toast.error(getApiErrorMessage(error)); } }}>{repairGateway.isPending ? "Repairing…" : "Repair gateway"}</Button> : <Button size="sm" variant="outline" onClick={() => setSetupOpen(true)}>Configure gateway</Button>}</div></AlertDescription></Alert>}
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3"><div><CardTitle className="text-base">Service deployments</CardTitle><p className="text-xs text-muted-foreground">Deployment history and actions belong to this service.</p></div><Button size="sm" onClick={async () => { try { await deploy.mutateAsync(); toast.success("Service deployment queued"); } catch (error) { toast.error(getApiErrorMessage(error)); } }} disabled={deploy.isPending || !hasRuntimeConfiguration}><Rocket className="mr-2 h-4 w-4" />{deploy.isPending ? "Queuing…" : "Deploy"}</Button></CardHeader>
      <CardContent className="space-y-2">{history.data?.items.slice(0, 5).map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"><div className="min-w-0"><p className="truncate font-medium">{item.imageName}:{item.imageTag}</p><p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()} · {item.environment} · {item.trigger}</p>{item.failureReason && <p className="mt-1 text-xs text-destructive">{item.failureReason}</p>}</div><span className={`rounded px-2 py-1 text-xs font-medium ${item.status.toLowerCase() === "failed" ? "bg-red-500/10 text-red-700" : item.status.toLowerCase() === "active" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted"}`}>{formatStatus(item.status)}</span></div>)}{!history.isLoading && !history.data?.items.length && <p className="text-sm text-muted-foreground">No deployment attempts for this service yet.</p>}</CardContent>
    </Card>
    <Card>
      <CardHeader className="pb-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle className="text-base">Service containers</CardTitle><p className="mt-1 text-xs text-muted-foreground">Bundle application, database, Redis, and cache containers with this service.</p></div>{activeInspection.data?.status === "ready" && <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300">Ready · gateway cutover pending</span>}</div></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div className="min-w-0"><p className="text-xs font-medium uppercase text-muted-foreground">Container</p>{activeContainerName ? <Link className="break-all font-medium text-primary hover:underline" to={`/app/containers/${encodeURIComponent(activeContainerName)}`}>{activeContainerName}</Link> : <p className="text-sm text-muted-foreground">{activeInspection.isLoading ? "Loading…" : "No active container"}</p>}</div>
        <div><p className="text-xs font-medium uppercase text-muted-foreground">Health</p><p className="text-sm">{activeContainer.isLoading ? "Loading…" : activeInspection.data?.status === "ready" || active?.healthCheckResult === "passed" ? "Passed readiness" : activeContainer.data?.health ?? (activeContainer.data?.state === "running" ? "No health check" : activeContainer.data?.state ?? "Not available")}</p></div>
        <div><p className="text-xs font-medium uppercase text-muted-foreground">Port</p><p className="text-sm font-mono">{activeInspection.isLoading ? "Loading…" : publishedPortText || "Not published"}</p></div>
        {activeInspection.data?.publicExposure && <div className="sm:col-span-3 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">This adopted container is bound to a public host address. The warning clears when this deployment is retired.</div>}
        <div className="sm:col-span-3 flex flex-wrap items-center gap-2 border-t pt-3"><Select value={containerToAttach} onValueChange={setContainerToAttach}><SelectTrigger className="min-w-[220px] flex-1" aria-label="Container to attach"><SelectValue placeholder={adoptable.isLoading ? "Loading containers…" : "Attach an existing container"} /></SelectTrigger><SelectContent>{(adoptable.data ?? []).map(container => <SelectItem key={container.id} value={container.id}>{container.name} · {container.image}</SelectItem>)}</SelectContent></Select><Button size="sm" variant="outline" disabled={!containerToAttach || adopt.isPending} onClick={async () => { const selected = adoptable.data?.find(item => item.id === containerToAttach); const port = selected?.ports[0]?.containerPort; if (!selected || !port) return toast.error("Select a container with a published port."); try { await adopt.mutateAsync({ containerId: selected.id, containerPort: port, serviceId: service.id }); setContainerToAttach(""); toast.success(`${selected.name} attached to ${service.name}`); } catch (error) { toast.error(getApiErrorMessage(error)); } }}>{adopt.isPending ? "Attaching…" : "Attach container"}</Button></div>
      </CardContent>
    </Card>
    <Card className="overflow-hidden">
      <CardContent className="space-y-5 pt-4">
        {service.accessStatus !== "active" && <p className="text-sm text-red-700">{service.blockReason || "No block reason set."}</p>}
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-medium">Service environment</p><p className="text-xs text-muted-foreground">Values are hidden by default. Enable editing to replace or remove variables, then save and redeploy.</p></div><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setEnvironmentVisible(value => !value)}>{environmentVisible ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}{environmentVisible ? "Hide values" : "Reveal values"}</Button><Button type="button" size="sm" variant={environmentEditing ? "secondary" : "outline"} onClick={() => setEnvironmentEditing(value => !value)}>{environmentEditing ? "Done editing" : "Edit variables"}</Button></div></div>
          {visibleKeys.map(key => {
            return <div key={key} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"><Label className="self-center font-mono text-xs">{key}</Label><Input aria-label={`Value for ${key}`} type={environmentVisible ? "text" : "password"} readOnly={!environmentEditing} value={draft[key] ?? currentValues[key] ?? ""} onChange={event => { setDraft({ ...draft, [key]: event.target.value }); setEnvironmentDirty(true); }} /><Button disabled={!environmentEditing} size="sm" variant="ghost" onClick={() => { setDraft(Object.fromEntries(Object.entries(draft).filter(([name]) => name !== key))); setRemovedKeys(current => [...new Set([...current, key])]); setEnvironmentDirty(true); }}>Delete</Button></div>;
          })}
          {environmentEditing && <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"><Input aria-label={`${service.name} variable name`} placeholder="Name" value={newKey} onPaste={event => handleVariablePaste("name", event)} onChange={event => setNewKey(event.target.value)} /><Input aria-label={`${service.name} variable value`} type={environmentVisible ? "text" : "password"} placeholder="Value" value={newValue} onPaste={event => handleVariablePaste("value", event)} onChange={event => setNewValue(event.target.value)} /><Button size="sm" variant="outline" onClick={() => { const key = newKey.trim(); if (!isVariableName(key)) return toast.error("Use a valid environment variable name."); setDraft({ ...draft, [key]: newValue }); setRemovedKeys(current => current.filter(item => item !== key)); setEnvironmentDirty(true); setNewKey(""); setNewValue(""); }}><Plus className="h-4 w-4" />Add variable</Button></div>}
          {environmentEditing && <div className="flex justify-end"><Button size="sm" disabled={save.isPending || setupStatus.isLoading || setupStatus.isError || !environmentDirty} onClick={setToSave}><Rocket className="h-4 w-4" />{save.isPending ? "Saving…" : setupStatus.isLoading ? "Checking runtime…" : setupStatus.isError ? "Runtime status unavailable" : hasRuntimeConfiguration ? "Save & deploy" : "Save variables"}</Button></div>}
        </div>
      </CardContent>
    </Card>
    {blockDialog}
    <Dialog open={editOpen} onOpenChange={open => { if (!serviceActionPending) setEditOpen(open); }}>
      <DialogContent><DialogHeader><DialogTitle>Edit service</DialogTitle><DialogDescription>Manage the service identity and runtime role within {project.name}.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor={`service-name-${service.id}`}>Service name</Label><Input id={`service-name-${service.id}`} value={serviceName} onChange={event => setServiceName(event.target.value)} autoFocus /></div><div className="space-y-2"><Label>Service type</Label><Select value={serviceType} onValueChange={value => setServiceType(value as ServiceType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><ServiceTypeOptions /></SelectContent></Select></div><DialogFooter><Button variant="outline" disabled={serviceActionPending} onClick={() => setEditOpen(false)}>Cancel</Button><Button disabled={serviceActionPending || !serviceName.trim() || (serviceName.trim() === service.name && serviceType === service.serviceType)} onClick={() => void saveServiceName()}>{serviceActionPending ? "Saving…" : "Save service"}</Button></DialogFooter></DialogContent>
    </Dialog>
    <AlertDialog open={deleteOpen} onOpenChange={open => { if (!serviceActionPending) setDeleteOpen(open); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {service.name}?</AlertDialogTitle><AlertDialogDescription>This removes the service from {project.name}. Services with deployment, environment, or domain history cannot be deleted.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={serviceActionPending}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={serviceActionPending} onClick={event => { event.preventDefault(); void deleteService(); }}>{serviceActionPending ? "Deleting…" : "Delete service"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
    <ProjectSetupWizardPage open={setupOpen} onOpenChange={setSetupOpen} projectId={project.id} serviceId={service.id} initialStep={1} />
  </>;
}

function useQueryServiceHistory(projectSlug: string, serviceId: string) {
  return useProjectServiceHistory(projectSlug, serviceId);
}

function useProjectServiceHistory(projectSlug: string, serviceId: string) {
  return useQuery({
    queryKey: ["project-service-history", projectSlug, serviceId],
    queryFn: async () => {
      const response = await api.get<HistoryResponse>(`/admin/projects/${encodeURIComponent(projectSlug)}/deployments/history`, { params: { environment: "production", serviceId } });
      return response.data;
    },
  });
}

function ServiceTypeOptions() {
  return <>{[
    ["frontend", "Frontend"],
    ["backend", "Backend / API"],
    ["worker", "Worker"],
    ["database", "Database"],
    ["redis", "Redis"],
    ["cache", "Cache"],
    ["custom", "Custom container"],
  ].map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</>;
}

function validateDraft(draft: Record<string, string>) {
  for (const [key, value] of Object.entries(draft)) {
    if (!isVariableName(key)) throw new Error(`Invalid variable name: ${key}`);
    if (value.includes("\u0000")) throw new Error(`Invalid value for ${key}`);
  }
  return draft;
}

function parseEnvContent(content: string) {
  const values: Record<string, string> = {};
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index].trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice(7).trimStart();
    const equalsAt = line.indexOf("=");
    if (equalsAt < 1) throw new Error(`Invalid .env entry on line ${index + 1}; expected KEY=value.`);
    const key = line.slice(0, equalsAt).trim();
    if (!isVariableName(key)) throw new Error(`Invalid variable name on line ${index + 1}: ${key || "(empty)"}`);
    let value = line.slice(equalsAt + 1).trim();
    if (value.startsWith("'") || value.startsWith('"')) {
      const quote = value[0];
      let closingQuote = -1;
      for (let cursor = value.length - 1; cursor > 0; cursor -= 1) {
        if (value[cursor] !== quote) continue;
        let backslashes = 0;
        for (let previous = cursor - 1; previous >= 0 && value[previous] === "\\"; previous -= 1) backslashes += 1;
        if (backslashes % 2 === 0) { closingQuote = cursor; break; }
      }
      if (closingQuote < 1 || value.slice(closingQuote + 1).trim().replace(/^#.*$/, "").trim()) {
        throw new Error(`Unclosed or malformed quoted value on line ${index + 1}.`);
      }
      value = value.slice(1, closingQuote);
    } else {
      value = value.replace(/\s+#.*$/, "").trimEnd();
    }
    if (value.includes("\u0000")) throw new Error(`Invalid value on line ${index + 1}.`);
    values[key] = value;
  }
  return values;
}

function isVariableName(value: string) { return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value); }
function formatStatus(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, char => char.toUpperCase()); }
function blockReasonCodeLabel(code: string) { return ({ payment: "Payment issue", manual_hold: "Manual hold", abuse_tos: "Abuse or terms violation", suspended_by_request: "Suspended by request", other: "Other" } as Record<string, string>)[code] ?? "Manual hold"; }
