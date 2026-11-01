import { useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { Pencil, Trash2, Upload, Info, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/QueryState";
import { QueryState } from "@/components/QueryState";
import { useProjectDetail, useProjectOverview, useTransferProject, useProjectSecretRotation } from "@/hooks/useProjects";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api";
import { AuditLogTimeline } from "@/features/audit/AuditLogTimeline";
import { BlockUnblockDialog } from "@/features/projects/BlockUnblockDialog";
import { DeleteProjectDialog } from "@/features/projects/DeleteProjectDialog";
import { ProjectFormDialog } from "@/features/projects/ProjectFormDialog";
import { ProjectServicesPanel } from "@/features/projects/ProjectServicesPanel";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useCan } from "@/hooks/usePermissions";

function parseSecretEnv(text: string): [string, string][] {
  const entries: [string, string][] = [];
  let multiline: { name: string; value: string; quote: string; line: number } | null = null;
  const lines = text.split(/\r\n|\n|\r/);
  for (const [index, rawLine] of lines.entries()) {
    if (multiline) {
      const ending = rawLine.trimEnd();
      if (ending.endsWith(multiline.quote)) {
        multiline.value += `\n${ending.slice(0, -1)}`;
        entries.push([multiline.name, multiline.value]);
        multiline = null;
      } else {
        multiline.value += `\n${rawLine}`;
      }
      continue;
    }
    let line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    line = line.replace(/^export\s+/, "");
    const separator = line.indexOf("=");
    if (separator < 1) throw new Error(`Invalid .env entry on line ${index + 1}; expected KEY=value.`);
    const name = line.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`Invalid variable name on line ${index + 1}.`);
    const rawValue = line.slice(separator + 1).trim();
    const quote = rawValue[0];
    if ((quote === '"' || quote === "'") && !rawValue.slice(1).endsWith(quote)) {
      multiline = { name, value: rawValue.slice(1), quote, line: index + 1 };
    } else if ((quote === '"' || quote === "'") && rawValue.endsWith(quote)) {
      entries.push([name, rawValue.slice(1, -1)]);
    } else {
      entries.push([name, rawValue]);
    }
  }
  if (multiline) throw new Error(`Unclosed quoted value for ${multiline.name}, starting on line ${multiline.line}.`);
  if (!entries.length) throw new Error("The .env file contains no variables.");
  return entries;
}

function InfoHint({ children }: { children: string }) {
  return <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label="More information" className="h-6 w-6 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><Info className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent className="max-w-xs leading-relaxed">{children}</TooltipContent></Tooltip>;
}

export function ProjectDetailPage() {
  const canManageProjects = useCan("projects.manage");
  const canReadServices = useCan("services.read");
  const canReadAudit = useCan("audit.read");
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError, error } = useProjectDetail(slug);
  const overview = useProjectOverview(slug);
  const rotateSecrets = useProjectSecretRotation(data?.project.id ?? "", slug);
  const [secretRows, setSecretRows] = useState<{ name: string; value: string }[]>([{ name: "", value: "" }]);
  const [editOpen, setEditOpen] = useState(false);
  const [blockMode, setBlockMode] = useState<"block" | "unblock" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [deploymentMode, setDeploymentMode] = useState("client_hosted");
  const [serviceMode, setServiceMode] = useState("production");
  const transferProject = useTransferProject(slug);

  const requestedTab = searchParams.get("tab");
  const requestedDefaultTab = requestedTab === "settings" ? requestedTab : "overview";
  const defaultTab = requestedDefaultTab === "settings" && !canManageProjects ? "overview" : requestedDefaultTab;

  if (isError && getApiErrorCode(error) === "project_not_found") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Project not found</AlertTitle>
        <AlertDescription>
          {getApiErrorMessage(error)}. Check the slug or return to{" "}
          <Link to="/projects" className="underline">projects</Link>.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError}
      error={error}
      data={data}
      loadingFallback={
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      {({ project, audit_log }) => (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-end gap-2">
                {canManageProjects && (project.status === "active" ? (
                  <Button variant="outline" size="sm" onClick={() => setBlockMode("block")} className="border-red-500/50 text-red-600 hover:bg-red-500/10 hover:text-red-700">Block project</Button>
                ) : (
                  <Button size="sm" onClick={() => setBlockMode("unblock")}>Unblock project</Button>
                ))}
          </div>

          <Tabs defaultValue={defaultTab}>
            <div className="overflow-x-auto -mx-1 px-1">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="overview" className="flex-1 sm:flex-none">Overview</TabsTrigger>
                {canManageProjects && <TabsTrigger value="settings" className="flex-1 sm:flex-none">Settings</TabsTrigger>}
                {canReadAudit && <TabsTrigger value="audit" className="flex-1 sm:flex-none">Audit Log</TabsTrigger>}
              </TabsList>
            </div>

            <TabsContent value="overview">
              {overview.isError && <Alert><AlertTitle>Project overview unavailable</AlertTitle><AlertDescription>{getApiErrorMessage(overview.error)}. Existing project details are still shown below.</AlertDescription></Alert>}
              {canReadServices && <ProjectServicesPanel project={project} view="overview" />}
            </TabsContent>

            {canManageProjects && <TabsContent value="settings">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-card p-4">
                <div><p className="mt-1 text-sm text-muted-foreground">Configure project details, deployments, provider connections, and shared or service environment variables.</p></div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" />Edit project</Button>
                  {canManageProjects && project.lifecycleStatus !== "archived" && <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>Transfer</Button>}
                  <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" />Archive</Button>
                </div>
              </div>
              <TooltipProvider delayDuration={200}>
                <div className="grid gap-4 lg:grid-cols-1">
                  <Card className="hidden">
                    <CardHeader><div className="flex items-center gap-2"><CardTitle>Application environment variables</CardTitle><InfoHint>These are secrets your app reads at runtime, such as DATABASE_URL or API_TOKEN. Values are encrypted and write-only: after saving, admins cannot view them again. Edit the draft or upload a replacement .env, then save to create a new immutable version and queue a deployment. Paste KEY=value lines into the first name field or upload a .env file. Keep a secure copy of values you may need later.</InfoHint></div></CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm">Desired secret set: {overview.data?.desiredConfiguration.secretSetId ? `Version ${overview.data.desiredConfiguration.secretSetVersion}` : "Not configured"} · Active deployment: {overview.data?.currentDeployment.secretSetId ? `Version ${overview.data.currentDeployment.secretSetVersion}` : "No secret version recorded"}</p>
                      <div className="space-y-2">
                        <div className="grid gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_2.25rem]"><span>Name</span><span>Value</span><span className="sr-only">Row actions</span></div>
                        <div className="max-h-96 space-y-2 overflow-y-auto overscroll-contain pr-2">
                          {secretRows.map((row, index) => <div key={index} className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_2.25rem]">
                          <Input aria-label={`Variable name ${index + 1}`} className="min-w-0 font-mono text-xs" placeholder="DATABASE_URL" value={row.name} onChange={event => setSecretRows(current => current.map((item, rowIndex) => rowIndex === index ? { ...item, name: event.target.value } : item))} onPaste={event => { const pasted = event.clipboardData.getData("text"); if (!pasted.includes("=") || (!pasted.includes("\n") && !pasted.includes("\r"))) return; try { const parsed = parseSecretEnv(pasted); event.preventDefault(); setSecretRows(parsed.map(([name, value]) => ({ name, value }))); toast.success("Environment variables pasted into rows."); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to parse pasted environment variables"); } }} />
                          <Input aria-label={`Variable value ${index + 1}`} className="min-w-0 font-mono text-xs" placeholder="Value" value={row.value} onChange={event => setSecretRows(current => current.map((item, rowIndex) => rowIndex === index ? { ...item, value: event.target.value } : item))} />
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" aria-label={`Remove variable ${index + 1}`} disabled={secretRows.length === 1} onClick={() => setSecretRows(current => current.filter((_, rowIndex) => rowIndex !== index))}><Trash2 className="h-4 w-4" /></Button>
                        </div>)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setSecretRows(current => [...current, { name: "", value: "" }])}><Plus className="h-4 w-4" />Add variable</Button>
                          <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border px-3 text-xs font-medium hover:bg-muted"><Upload className="h-4 w-4" />Upload .env<input type="file" accept=".env,text/plain" className="sr-only" onChange={async event => { const input = event.currentTarget; const file = input.files?.[0]; if (!file) return; try { const text = await file.text(); const parsed = parseSecretEnv(text); setSecretRows(parsed.map(([name, value]) => ({ name, value }))); toast.success(".env file loaded into rows. Review, then save and deploy."); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to read .env file"); } finally { input.value = ""; } }} /></label>
                        </div>
                        <InfoHint>Saving creates a new secret version and queues a deployment. The deployment worker supplies the values to the container when it starts.</InfoHint>
                      </div>
                      <Button disabled={rotateSecrets.isPending || !secretRows.some(row => row.name.trim())} onClick={async () => { try { const secretEnv: Record<string, string> = {}; const names = new Set<string>(); secretRows.filter(row => row.name.trim()).forEach((row, index) => { const name = row.name.trim(); if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`Invalid variable name in row ${index + 1}.`); if (names.has(name)) throw new Error(`Variable name ${name} appears more than once.`); names.add(name); secretEnv[name] = row.value; }); await rotateSecrets.mutateAsync(secretEnv); setSecretRows([{ name: "", value: "" }]); toast.success("Application secret version saved and deployment queued"); } catch (error) { toast.error(error instanceof Error ? error.message : getApiErrorMessage(error)); } }} loading={rotateSecrets.isPending}>{rotateSecrets.isPending ? "Saving and queueing…" : "Save and deploy"}</Button>
                    </CardContent>
                  </Card>
                </div>
              </TooltipProvider>
              {canReadServices && <ProjectServicesPanel project={project} view="settings" />}
            </TabsContent>}
            {canReadAudit && <TabsContent value="audit">
              <Card>
                <CardHeader>
                  <CardTitle>Audit log</CardTitle>
                </CardHeader>
                <CardContent>
                  <AuditLogTimeline entries={audit_log} />
                </CardContent>
              </Card>
            </TabsContent>}
          </Tabs>

          <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
          <BlockUnblockDialog project={project} mode={blockMode} onClose={() => setBlockMode(null)} />
          <DeleteProjectDialog
            project={project}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            onDeleted={() => navigate("/projects")}
          />
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Transfer project</DialogTitle><DialogDescription>Set the hosting and service state for this project after transfer.</DialogDescription></DialogHeader>
              <div className="grid gap-4 py-2 sm:grid-cols-2">
                <label className="space-y-1 text-sm">Deployment mode<select value={deploymentMode} onChange={(event) => setDeploymentMode(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2"><option value="client_hosted">Client hosted</option><option value="external_hosted">External hosted</option><option value="developer_hosted">Developer hosted</option></select></label>
                <label className="space-y-1 text-sm">Service mode<select value={serviceMode} onChange={(event) => setServiceMode(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2"><option value="production">Production</option><option value="testing">Testing</option><option value="development">Development</option></select></label>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button><Button loading={transferProject.isPending} disabled={transferProject.isPending} onClick={async () => { await transferProject.mutateAsync({ deploymentMode, serviceMode }); setTransferOpen(false); }}>Transfer project</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </QueryState>
  );
}

