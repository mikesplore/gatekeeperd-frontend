import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Globe, LockKeyhole, MoreHorizontal, Pencil, Plus, Rocket, Save, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/QueryState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useContainer, useProjectServices, useSaveServiceEnvironment, useSaveSharedEnvironment, useServiceEnvironmentMetadata, useSharedEnvironmentMetadata } from "@/hooks/useProjects";
import type { Project } from "@/types/project";
import type { DashboardSite } from "@/types/sites";
import { useDashboardSites } from "@/hooks/useSiteDashboard";
import { api, getApiErrorMessage } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { ProjectSetupWizardPage } from "@/features/projects/ProjectSetupWizardPage";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type HistoryResponse = { projectId: string; environment: string; items: { id: string; serviceId?: string; status: string; createdAt: string; activeAt?: string | null; imageName: string; imageTag: string; imageDigest?: string | null; sourceCommit?: string | null; healthCheckResult: string }[] };
export function ProjectServicesPanel({ project, view = "overview", serviceId }: { project: Project; view?: "overview" | "settings" | "detail"; serviceId?: string }) {
  const servicesQuery = useProjectServices(project.id);
  const sitesQuery = useDashboardSites("all", 500, 0);
  const sharedMetadata = useSharedEnvironmentMetadata(project.id);
  const saveShared = useSaveSharedEnvironment(project.id);
  const [sharedDraft, setSharedDraft] = useState<Record<string, string>>({});
  const [sharedNewKey, setSharedNewKey] = useState("");
  const [sharedNewValue, setSharedNewValue] = useState("");
  const [sharedImports, setSharedImports] = useState<Record<string, boolean>>({});
  const [newServiceName, setNewServiceName] = useState("");
  const [serviceDrafts, setServiceDrafts] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    setSharedImports({});
  }, [sharedMetadata.data?.latest?.id]);

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
        <div className="flex gap-2"><Input aria-label="New service name" placeholder="e.g. frontend" value={newServiceName} onChange={event => setNewServiceName(event.target.value)} /><Button disabled={!newServiceName.trim() || servicesQuery.isFetching} onClick={async () => { try { await api.post(`/admin/projects/${project.id}/services`, { name: newServiceName.trim() }); setNewServiceName(""); await servicesQuery.refetch(); toast.success("Service created"); } catch (error) { toast.error(getApiErrorMessage(error)); } }}><Plus className="h-4 w-4" />Add</Button></div>
      </CardHeader>
      <CardContent className="space-y-4">
        {servicesQuery.isLoading && <div className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>}
        {servicesQuery.isError && <Alert variant="destructive"><AlertTitle>Services unavailable</AlertTitle><AlertDescription>{getApiErrorMessage(servicesQuery.error)}</AlertDescription></Alert>}
        {!servicesQuery.isLoading && !servicesQuery.isError && servicesQuery.data?.length === 0 && <p className="text-sm text-muted-foreground">No services are configured for this project.</p>}
        {servicesQuery.data?.map(service => <ServiceCard key={service.id} project={project} service={service} view="overview" sites={relevantSites.filter(site => site.serviceId === service.id)} sharedSet={sharedMetadata.data?.latest ?? null} sharedImport={sharedImports[service.id]} setSharedImport={value => setSharedImports(current => ({ ...current, [service.id]: value }))} refreshServices={() => servicesQuery.refetch()} draft={serviceDrafts[service.id] ?? {}} setDraft={draft => setServiceDrafts(current => ({ ...current, [service.id]: draft }))} />)}
      </CardContent>
    </Card>}
    {view === "detail" && <>
      {servicesQuery.isLoading && <Skeleton className="h-32 w-full" />}
      {servicesQuery.isError && <Alert variant="destructive"><AlertTitle>Services unavailable</AlertTitle><AlertDescription>{getApiErrorMessage(servicesQuery.error)}</AlertDescription></Alert>}
      {!servicesQuery.isLoading && !servicesQuery.isError && !(servicesQuery.data ?? []).some(service => service.id === serviceId) && <Alert><AlertTitle>Service not found</AlertTitle><AlertDescription>This service does not belong to this project.</AlertDescription></Alert>}
      {(servicesQuery.data ?? []).filter(service => service.id === serviceId).map(service => <ServiceCard key={service.id} project={project} service={service} view="detail" sites={relevantSites.filter(site => site.serviceId === service.id)} sharedSet={sharedMetadata.data?.latest ?? null} sharedImport={sharedImports[service.id]} setSharedImport={value => setSharedImports(current => ({ ...current, [service.id]: value }))} refreshServices={() => servicesQuery.refetch()} draft={serviceDrafts[service.id] ?? {}} setDraft={draft => setServiceDrafts(current => ({ ...current, [service.id]: draft }))} />)}
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

function ServiceCard({ project, service, view, sites, sharedSet, sharedImport, setSharedImport, refreshServices, draft, setDraft }: {
  project: Project;
  view: "overview" | "detail";
  service: { id: string; name: string; accessStatus: string; blockReason?: string | null };
  sites: DashboardSite[]; sharedSet: { id: string; version: number; keys: string[] } | null; sharedImport?: boolean; setSharedImport: (value: boolean) => void;
  refreshServices: () => void;
  draft: Record<string, string>; setDraft: (draft: Record<string, string>) => void;
}) {
  const navigate = useNavigate();
  const environment = useServiceEnvironmentMetadata(project.id, service.id);
  const history = useQueryServiceHistory(project.slug, service.id);
  const activeInspection = useQuery({
    queryKey: ["service-active-deployment", project.id, service.id],
    queryFn: async () => (await api.get<import("@/types/project").ServiceActiveDeployment>(`/admin/projects/${project.id}/services/${service.id}/active-deployment`, { params: { environment: "production" } })).data,
    retry: false,
    refetchInterval: 15_000,
  });
  const activeContainerName = activeInspection.data?.containerName ?? "";
  const activeContainer = useContainer(activeContainerName);
  const save = useSaveServiceEnvironment(project.id);
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
  const [serviceActionPending, setServiceActionPending] = useState(false);
  const latestDeployment = history.data?.items[0];
  const active = history.data?.items.find(item => item.status === "active");
  const configuredSet = environment.data?.versions.find(item => item.id === environment.data.configuredSetId && item.version === environment.data.configuredSetVersion);
  const serviceKeys = configuredSet?.keys ?? [];
  const serviceHealth = sites.find(site => site.runtimeHealth)?.runtimeHealth ?? active?.healthCheckResult ?? latestDeployment?.healthCheckResult ?? latestDeployment?.status ?? "not deployed";
  const saveServiceName = async () => {
    const name = serviceName.trim();
    if (!name) return toast.error("Service name is required.");
    setServiceActionPending(true);
    try {
      await api.patch(`/admin/projects/${project.id}/services/${service.id}`, { name });
      await refreshServices();
      setEditOpen(false);
      toast.success("Service renamed");
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
  const sharedKeys = sharedSet?.keys ?? [];
  const importEnabled = sharedImport ?? Boolean(environment.data?.configuredSharedSetId);
  const sharedSetUnchanged = Boolean(environment.data?.configuredSharedSetId && environment.data.configuredSharedSetId === sharedSet?.id && environment.data.configuredSharedSetVersion === sharedSet?.version);
  const setToSave = async () => {
    try {
      const serviceValues = validateDraft(draft);
      const result = await save.mutateAsync({ serviceId: service.id, environment: "production", values: serviceValues,
        sharedEnvironmentSetId: importEnabled ? sharedSet?.id ?? null : null,
        sharedEnvironmentSetVersion: importEnabled ? sharedSet?.version ?? null : null });
      setDraft({});
      toast.success(`Service variables saved as v${result.version}; deployment queued.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : getApiErrorMessage(error)); }
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
          <div className="flex flex-wrap items-center gap-2"><Link to={`/app/projects/${encodeURIComponent(project.slug)}/services/${service.id}`} className="text-base font-semibold transition-colors hover:text-primary">{service.name}</Link><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${service.accessStatus === "active" ? "bg-emerald-500/10 text-emerald-700" : "bg-red-500/10 text-red-700"}`}>{formatStatus(service.accessStatus)}</span><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{formatStatus(serviceHealth)}</span></div>
          <p className="truncate text-sm text-muted-foreground">{sites.length ? sites.map(site => site.domain).join(", ") : "No domain attached"}</p>
        </div>
        <div className="flex shrink-0 gap-2"><Button asChild size="sm" variant="outline"><Link to={`/app/projects/${encodeURIComponent(project.slug)}/services/${service.id}`}>Manage service</Link></Button><Button size="sm" variant={service.accessStatus === "active" ? "destructive" : "outline"} onClick={() => service.accessStatus === "active" ? setConfirmBlockOpen(true) : void toggleBlock()}><LockKeyhole className="h-4 w-4" />{service.accessStatus === "active" ? "Block service" : "Unblock service"}</Button></div>
      </CardContent>
      {blockDialog}
    </Card>;
  }

  return <>
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{service.name}</CardTitle>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${service.accessStatus === "active" ? "bg-emerald-500/10 text-emerald-700" : "bg-red-500/10 text-red-700"}`}>Status: {formatStatus(service.accessStatus)}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Health: {formatStatus(serviceHealth)}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">{sites.length ? sites.map(site => <a className="inline-flex items-center gap-1.5 transition-colors hover:text-primary" key={site.slug} href={`${site.tlsMode === "http_only" ? "http" : "https"}://${site.domain}`} target="_blank" rel="noreferrer"><Globe className="h-3.5 w-3.5" />{site.domain}</a>) : <span>No domain attached</span>}</div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setSetupOpen(true)}><Settings2 className="h-4 w-4" />Configure service</Button><Button size="sm" variant={service.accessStatus === "active" ? "destructive" : "outline"} onClick={() => service.accessStatus === "active" ? setConfirmBlockOpen(true) : void toggleBlock()}><LockKeyhole className="h-4 w-4" />{service.accessStatus === "active" ? "Block service" : "Unblock service"}</Button><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="outline" aria-label={`More actions for ${service.name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={service.name === "default"} onSelect={() => { setServiceName(service.name); setEditOpen(true); }}><Pencil className="mr-2 h-4 w-4" />{service.name === "default" ? "Default service name is fixed" : "Edit name"}</DropdownMenuItem><DropdownMenuItem disabled={service.name === "default"} className="text-destructive focus:text-destructive" onSelect={() => setDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4" />{service.name === "default" ? "Default service is required" : "Delete service"}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">Running container</CardTitle></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div className="min-w-0"><p className="text-xs font-medium uppercase text-muted-foreground">Container</p>{activeContainerName ? <Link className="break-all font-medium text-primary hover:underline" to={`/app/containers/${encodeURIComponent(activeContainerName)}`}>{activeContainerName}</Link> : <p className="text-sm text-muted-foreground">{activeInspection.isLoading ? "Loading…" : "No active container"}</p>}</div>
        <div><p className="text-xs font-medium uppercase text-muted-foreground">Health</p><p className="text-sm">{activeContainer.isLoading ? "Loading…" : activeContainer.data?.health ?? (activeContainer.data?.state === "running" ? "No health check" : activeContainer.data?.state ?? "Not available")}</p></div>
        <div><p className="text-xs font-medium uppercase text-muted-foreground">Port</p><p className="text-sm font-mono">{activeContainer.isLoading ? "Loading…" : activeContainer.data?.ports || "Not published"}</p></div>
      </CardContent>
    </Card>
    <Card className="overflow-hidden">
      <CardContent className="space-y-5 pt-4">
        {service.accessStatus !== "active" && <p className="text-sm text-red-700">{service.blockReason || "No block reason set."}</p>}
        <div className="space-y-3">
          <div><p className="text-sm font-medium">Service environment overrides</p><p className="text-xs text-muted-foreground">Matching service keys override shared values. Existing values stay hidden; enter replacements or add keys.</p><p className="mt-1 text-xs text-muted-foreground">Configured service set: {environment.data?.configuredSetVersion ? `v${environment.data.configuredSetVersion}` : "not configured"} · Active service set: {activeInspection.data?.serviceSetVersion ? `v${activeInspection.data.serviceSetVersion}` : "not recorded"}</p></div>
          {sharedSet ? <label className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm"><input className="mt-1" type="checkbox" checked={importEnabled} onChange={event => setSharedImport(event.target.checked)} /><span><span className="font-medium">Import shared set v{sharedSet.version}</span><span className="block text-xs text-muted-foreground">Pins {sharedKeys.length} shared key(s): {sharedKeys.join(", ") || "empty set"}. Current pin: {environment.data?.configuredSharedSetVersion ? `v${environment.data.configuredSharedSetVersion}` : "none"}. Later shared edits require an explicit refresh.</span></span></label> : <p className="text-xs text-muted-foreground">No shared environment set exists for production yet.</p>}
          {importEnabled && sharedKeys.length > 0 && <div className="flex flex-wrap gap-2">{sharedKeys.map(key => <span key={key} className="rounded border px-2 py-1 font-mono text-xs">{key}<span className="ml-2 text-muted-foreground">{serviceKeys.includes(key) ? "service override" : "from shared"}</span></span>)}</div>}
          {serviceKeys.map(key => <div key={key} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"><Label className="self-center font-mono text-xs">{key}<span className="ml-2 text-muted-foreground">{sharedKeys.includes(key) ? "overrides shared" : "service only"}</span></Label><Input type="password" autoComplete="new-password" placeholder="Value hidden; enter replacement" value={draft[key] ?? ""} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /><Button size="sm" variant="ghost" onClick={() => setDraft(Object.fromEntries(Object.entries(draft).filter(([name]) => name !== key)))}>Clear replacement</Button></div>)}
          <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"><Input aria-label={`${service.name} variable name`} placeholder="SERVICE_TOKEN" value={newKey} onChange={event => setNewKey(event.target.value)} /><Input aria-label={`${service.name} variable value`} type="password" autoComplete="new-password" placeholder="Write-only value" value={newValue} onChange={event => setNewValue(event.target.value)} /><Button size="sm" variant="outline" onClick={() => { const key = newKey.trim(); if (!isVariableName(key)) return toast.error("Use a valid environment variable name."); setDraft({ ...draft, [key]: newValue }); setNewKey(""); setNewValue(""); }}><Plus className="h-4 w-4" />Add / override</Button></div>
          {Object.keys(draft).length > 0 && <p className="text-xs text-muted-foreground">Pending replacements: {Object.keys(draft).sort().join(", ")}. Saving replaces the whole service set, so reenter any existing values you want to keep.</p>}
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Imported shared set: {importEnabled ? `v${sharedSet?.version}` : "none"}</p><Button size="sm" disabled={save.isPending || (!Object.keys(draft).length && importEnabled === sharedSetUnchanged)} onClick={setToSave}><Rocket className="h-4 w-4" />{save.isPending ? "Saving…" : "Save & deploy service"}</Button></div>
        </div>
      </CardContent>
    </Card>
    {blockDialog}
    <Dialog open={editOpen} onOpenChange={open => { if (!serviceActionPending) setEditOpen(open); }}>
      <DialogContent><DialogHeader><DialogTitle>Rename service</DialogTitle><DialogDescription>Choose a name for this service within {project.name}.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor={`service-name-${service.id}`}>Service name</Label><Input id={`service-name-${service.id}`} value={serviceName} onChange={event => setServiceName(event.target.value)} autoFocus /></div><DialogFooter><Button variant="outline" disabled={serviceActionPending} onClick={() => setEditOpen(false)}>Cancel</Button><Button disabled={serviceActionPending || !serviceName.trim() || serviceName.trim() === service.name} onClick={() => void saveServiceName()}>{serviceActionPending ? "Saving…" : "Save name"}</Button></DialogFooter></DialogContent>
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

function validateDraft(draft: Record<string, string>) {
  for (const [key, value] of Object.entries(draft)) {
    if (!isVariableName(key)) throw new Error(`Invalid variable name: ${key}`);
    if (value.includes("\u0000")) throw new Error(`Invalid value for ${key}`);
  }
  return draft;
}

function isVariableName(value: string) { return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value); }
function formatStatus(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, char => char.toUpperCase()); }
function blockReasonCodeLabel(code: string) { return ({ payment: "Payment issue", manual_hold: "Manual hold", abuse_tos: "Abuse or terms violation", suspended_by_request: "Suspended by request", other: "Other" } as Record<string, string>)[code] ?? "Manual hold"; }
