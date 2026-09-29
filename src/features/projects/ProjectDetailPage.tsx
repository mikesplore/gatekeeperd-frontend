import { useMemo, useState, type ReactNode } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ChevronDown, Copy, Link2, Pencil, RefreshCw, Trash2, RotateCcw, Rocket, Upload, Info, Plus, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/QueryState";
import { QueryState } from "@/components/QueryState";
import { useAddProjectAdjustment, useProjectDetail, useProjectOverview, useProjectInvoice, useResyncProjectInvoice, useCreateProjectInvoice, useTransferProject, useProjectDeploymentHistory, useProjectSecretRotation, useProjectServices } from "@/hooks/useProjects";
import { useProjectPayments } from "@/hooks/usePayments";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api";
import { AuditLogTimeline } from "@/features/audit/AuditLogTimeline";
import { CapturePaymentDrawer } from "@/features/payments/CapturePaymentDrawer";
import { PaymentsHistoryTable } from "@/features/payments/PaymentsHistoryTable";
import { ServiceAdjustmentDialog } from "@/features/payments/ServiceAdjustmentDialog";
import { CreateServiceInvoiceDialog } from "@/features/payments/CreateServiceInvoiceDialog";
import { BlockUnblockDialog } from "@/features/projects/BlockUnblockDialog";
import { DeleteProjectDialog } from "@/features/projects/DeleteProjectDialog";
import { ProjectFormDialog } from "@/features/projects/ProjectFormDialog";
import { ProjectSetupWizardPage } from "@/features/projects/ProjectSetupWizardPage";
import { ProjectServicesPanel } from "@/features/projects/ProjectServicesPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { toast } from "sonner";

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
  return <Tooltip><TooltipTrigger asChild><button type="button" aria-label="More information" className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><Info className="h-4 w-4" /></button></TooltipTrigger><TooltipContent className="max-w-xs leading-relaxed">{children}</TooltipContent></Tooltip>;
}

export function ProjectDetailPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError, error, refetch: refetchProjectDetail } = useProjectDetail(slug);
  const overview = useProjectOverview(slug);
  const history = useProjectDeploymentHistory(slug);
  const rotateSecrets = useProjectSecretRotation(data?.project.id ?? "", slug);
  const [secretRows, setSecretRows] = useState<{ name: string; value: string }[]>([{ name: "", value: "" }]);
  const invoiceQuery = useProjectInvoice(slug);
  const servicesQuery = useProjectServices(data?.project.id ?? "");
  const [editOpen, setEditOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [serviceAdjustmentOpen, setServiceAdjustmentOpen] = useState(false);
  const [serviceInvoiceOpen, setServiceInvoiceOpen] = useState(false);
  const [capturePaymentOpen, setCapturePaymentOpen] = useState(false);
  const [blockMode, setBlockMode] = useState<"block" | "unblock" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [invoiceDownloading, setInvoiceDownloading] = useState(false);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [invoiceDescription, setInvoiceDescription] = useState("");
  const [paymentPage, setPaymentPage] = useState(0);
  const projectPayments = useProjectPayments(slug, 25, paymentPage * 25);
  const refreshPaymentData = async () => {
    await Promise.all([
      refetchProjectDetail(),
      projectPayments.refetch(),
      invoiceQuery.refetch(),
      servicesQuery.refetch(),
      overview.refetch(),
    ]);
  };
  const [deploymentMode, setDeploymentMode] = useState("client_hosted");
  const [serviceMode, setServiceMode] = useState("production");
  const transferProject = useTransferProject(slug);
  const addAdjustment = useAddProjectAdjustment(slug);
  const resyncInvoice = useResyncProjectInvoice(slug);
  const createInvoice = useCreateProjectInvoice(slug);

  const openProjectSetup = (step: number) => {
    setSetupStep(step);
    setSetupOpen(true);
  };

  const requestedTab = searchParams.get("tab");
  const defaultTab = requestedTab === "payments" || requestedTab === "settings" || requestedTab === "deployment" ? requestedTab : "overview";

  const reversalAlert = useMemo(() => {
    if (!data) return null;
    const { project, payments } = data;
    if (project.status === "active" || payments.length === 0) return null;
    const latest = payments[0];
    if (latest.gatewayStatus !== "reversed") return null;
    return latest.paidAt ?? latest.createdAt;
  }, [data]);

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
                <Button size="sm" onClick={() => openProjectSetup(1)}><Rocket className="h-4 w-4" />New deployment</Button>
                {project.status === "active" ? (
                  <Button variant="outline" size="sm" onClick={() => setBlockMode("block")} className="border-red-500/50 text-red-600 hover:bg-red-500/10 hover:text-red-700">Block project</Button>
                ) : (
                  <Button size="sm" onClick={() => setBlockMode("unblock")}>Unblock project</Button>
                )}
          </div>

          <Tabs defaultValue={defaultTab}>
            <div className="overflow-x-auto -mx-1 px-1">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="overview" className="flex-1 sm:flex-none">Overview</TabsTrigger>
                <TabsTrigger value="deployment" className="flex-1 sm:flex-none">Deployment</TabsTrigger>
                <TabsTrigger value="settings" className="flex-1 sm:flex-none">Settings</TabsTrigger>
                <TabsTrigger value="payments" className="flex-1 sm:flex-none">Payments</TabsTrigger>
                <TabsTrigger value="audit" className="flex-1 sm:flex-none">Audit Log</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview">
              {overview.data && <div className="mb-4 grid gap-4 xl:grid-cols-2">
                <Card className="xl:col-span-2"><CardHeader><CardTitle>Customer &amp; billing</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3"><InfoRow label="Customer" value={overview.data.customerBilling.customerId && overview.data.customerBilling.customerName ? <Link to={`/app/customers/${overview.data.customerBilling.customerId}`} className="text-primary hover:underline">{overview.data.customerBilling.customerName}</Link> : "Not set"} /><InfoRow label="Billing contact" value={overview.data.customerBilling.billingName ?? overview.data.customerBilling.customerName ?? "Not set"} /><InfoRow label="Billed" value={`${overview.data.customerBilling.currency} ${overview.data.customerBilling.billed.toLocaleString()}`} /><InfoRow label="Paid" value={`${overview.data.customerBilling.currency} ${overview.data.customerBilling.paid.toLocaleString()}`} /><InfoRow label="Balance" value={`${overview.data.customerBilling.currency} ${overview.data.customerBilling.balance.toLocaleString()}`} /><InfoRow label="Due date" value={overview.data.customerBilling.dueDate ?? "Not set"} /></CardContent></Card>
              </div>}
              {overview.isError && <Alert><AlertTitle>Project overview unavailable</AlertTitle><AlertDescription>{getApiErrorMessage(overview.error)}. Existing project details are still shown below.</AlertDescription></Alert>}
              <ProjectServicesPanel project={project} view="overview" />
            </TabsContent>

            <TabsContent value="deployment" className="space-y-4">
              {overview.data?.currentDeployment.status === "active" && history.data?.items[0]?.status.toLowerCase() === "failed" && <Alert className="border-amber-500/40 bg-amber-500/5"><AlertTitle>Running on the active build; latest deployment attempt failed</AlertTitle><AlertDescription>The active build {overview.data.currentDeployment.imageName}:{overview.data.currentDeployment.imageTag} is still serving traffic. The latest attempt failed on {new Date(history.data.items[0].createdAt).toLocaleString()}. Open that attempt’s Details row to see the failure reason.</AlertDescription></Alert>}
              <Card>
                <CardHeader><CardTitle>Current deployment</CardTitle><p className="text-sm text-muted-foreground">The active build currently serving this project.</p></CardHeader>
                <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoRow label="Status" value={<span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${deploymentStatusClass(overview.data?.currentDeployment.status ?? "unknown")}`}>{formatStatus(overview.data?.currentDeployment.status ?? "unknown")}</span>} />
                  <InfoRow label="Image" value={overview.data?.currentDeployment.imageName ? `${overview.data.currentDeployment.imageName}:${overview.data.currentDeployment.imageTag}` : "No active deployment"} />
                  <InfoRow label="Runtime health" value={formatStatus(overview.data?.currentDeployment.runtimeHealth ?? "unknown")} />
                  <InfoRow label="Active since" value={overview.data?.currentDeployment.activeAt ? new Date(overview.data.currentDeployment.activeAt).toLocaleString() : "Not active"} />
                  <InfoRow label="Digest" value={overview.data?.currentDeployment.imageDigest ? <div className="flex min-w-0 items-center gap-1"><code className="min-w-0 truncate text-xs" title={overview.data.currentDeployment.imageDigest}>{formatDigest(overview.data.currentDeployment.imageDigest)}</code><Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Copy full image digest" title="Copy full digest" onClick={async () => { try { await navigator.clipboard.writeText(overview.data!.currentDeployment.imageDigest!); toast.success("Digest copied"); } catch { toast.error("Could not copy digest"); } }}><Copy className="h-3.5 w-3.5" /></Button></div> : "Not available"} />
                  <InfoRow label="Commit" value={overview.data?.currentDeployment.commitSha ?? "Not available"} />
                  <InfoRow label="Upstream" value={overview.data?.currentDeployment.runtimeUpstreamHost && overview.data.currentDeployment.runtimeUpstreamPort ? `${overview.data.currentDeployment.runtimeUpstreamHost}:${overview.data.currentDeployment.runtimeUpstreamPort}` : "Not resolved"} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex-col items-start justify-between gap-2 space-y-0 py-3 text-left sm:flex-row sm:items-center"><div><CardTitle>Deployment history</CardTitle><p className="text-xs text-muted-foreground">Recent deployment attempts and their status.</p></div><Button variant="outline" size="sm" className="gap-2" onClick={() => history.refetch()}><RefreshCw className="h-3.5 w-3.5" />Refresh history</Button></CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {history.isLoading ? <Skeleton className="h-14 w-full" /> : history.isError ? <Alert variant="destructive"><AlertTitle>History unavailable</AlertTitle><AlertDescription>{getApiErrorMessage(history.error)}</AlertDescription></Alert> : history.data?.items.length ? history.data.items.map(item => <div key={item.id} className="rounded-lg border px-3 py-2.5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5"><span className="max-w-full break-all text-sm font-medium">{item.imageName}:{item.imageTag}</span><span className={`shrink-0 rounded px-2 py-1 text-xs font-medium ${deploymentStatusClass(item.status)}`}>{formatStatus(item.status)}</span><span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span></div>
                        <details className="group text-xs text-muted-foreground"><summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded text-foreground/80 hover:text-foreground"><ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />Details</summary><div className="mt-2 grid gap-x-6 gap-y-1.5 rounded-md bg-muted/30 p-2 sm:grid-cols-2"><p>{item.trigger} · {item.environment}</p><p>Commit: {item.sourceCommit ?? "not recorded"}</p><p>Digest: {item.imageDigest ? formatDigest(item.imageDigest) : "not recorded"}</p><p>Readiness: {formatStatus(item.healthCheckResult)}{item.failureReason ? ` · ${item.failureReason}` : ""}</p><p>Credential: {item.credentialSetId ? `${item.credentialSetId} v${item.credentialSetVersion}` : "not recorded"}</p><p>Secrets: {item.secretSetId ? `${item.secretSetId} v${item.secretSetVersion}` : "not recorded"}</p></div></details>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">{item.actions.includes("redeploy") && <Button size="sm" variant={item.status.toLowerCase() === "failed" ? "default" : "outline"} onClick={async () => { try { await api.post(`/admin/projects/${encodeURIComponent(slug)}/deployments/${item.id}/redeploy`); toast.success(item.status.toLowerCase() === "failed" ? "Retry queued" : "Redeployment queued"); await history.refetch(); } catch (e) { toast.error(getApiErrorMessage(e)); } }}><Rocket className="h-4 w-4" />{item.status.toLowerCase() === "failed" ? "Retry" : "Redeploy"}</Button>}{item.actions.includes("cancel") && <Button size="sm" variant="destructive" onClick={async () => { try { await api.post(`/admin/projects/${encodeURIComponent(slug)}/deployments/${item.id}/cancel?environment=${encodeURIComponent(item.environment)}`); toast.success("Deployment cancelled"); await history.refetch(); } catch (e) { toast.error(getApiErrorMessage(e)); } }}><Square className="h-4 w-4" />Cancel</Button>}{item.actions.includes("rollback") && <Button size="sm" variant="outline" onClick={async () => { try { await api.post(`/admin/projects/${encodeURIComponent(slug)}/deployments/${item.id}/rollback`); toast.success("Auditable rollback queued"); await history.refetch(); } catch (e) { toast.error(getApiErrorMessage(e)); } }}><RotateCcw className="h-4 w-4" />Rollback</Button>}</div>
                    </div>
                  </div>) : <p className="py-8 text-center text-sm text-muted-foreground">No canonical deployments recorded.</p>}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="settings">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-card p-4">
                <div><p className="mt-1 text-sm text-muted-foreground">Configure project details, deployments, provider connections, and shared or service environment variables.</p></div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" />Edit project</Button>
                  <Button variant="outline" size="sm" onClick={() => setAdjustmentOpen(true)}>Add charge / discount</Button>
                  {project.lifecycleStatus !== "archived" && <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>Transfer</Button>}
                  <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" />Archive</Button>
                </div>
              </div>
              <TooltipProvider delayDuration={200}>
                <div className="grid gap-4 lg:grid-cols-1">
                  <Card>
                    <CardHeader><div className="flex items-center gap-2"><CardTitle>Container registry access</CardTitle><InfoHint>Used by Gatekeeperd to pull private images. These credentials are not passed into your application container.</InfoHint></div></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p>Active registry credential: {overview.data?.currentDeployment.credentialSetId ? `${overview.data.currentDeployment.credentialSetId} · version ${overview.data.currentDeployment.credentialSetVersion}` : "Not recorded"}</p>
                      <Button variant="outline" asChild><Link to="/app/credentials">Manage registry credentials</Link></Button>
                    </CardContent>
                  </Card>
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
                      <Button disabled={rotateSecrets.isPending || !secretRows.some(row => row.name.trim())} onClick={async () => { try { const secretEnv: Record<string, string> = {}; const names = new Set<string>(); secretRows.filter(row => row.name.trim()).forEach((row, index) => { const name = row.name.trim(); if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`Invalid variable name in row ${index + 1}.`); if (names.has(name)) throw new Error(`Variable name ${name} appears more than once.`); names.add(name); secretEnv[name] = row.value; }); await rotateSecrets.mutateAsync(secretEnv); setSecretRows([{ name: "", value: "" }]); toast.success("Application secret version saved and deployment queued"); } catch (error) { toast.error(error instanceof Error ? error.message : getApiErrorMessage(error)); } }}>{rotateSecrets.isPending ? "Saving and queueing…" : "Save and deploy"}</Button>
                    </CardContent>
                  </Card>
                </div>
              </TooltipProvider>
              <ProjectServicesPanel project={project} view="settings" />
            </TabsContent>
            <TabsContent value="payments">
              {invoiceQuery.isLoading && <Card className="mb-4"><CardHeader><Skeleton className="h-6 w-36" /></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-4"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div></CardContent></Card>}
              {invoiceQuery.isError && getApiErrorCode(invoiceQuery.error) !== "invoice_unavailable" && <Alert className="mb-4"><AlertTitle>Invoice unavailable</AlertTitle><AlertDescription>{getApiErrorMessage(invoiceQuery.error)}</AlertDescription></Alert>}
              {invoiceQuery.isError && getApiErrorCode(invoiceQuery.error) === "invoice_unavailable" && (servicesQuery.data?.length ?? 0) > 1
                ? <Card className="mb-4"><CardHeader className="flex flex-row items-center justify-between gap-3"><div><CardTitle>Service invoices</CardTitle><p className="mt-1 text-sm text-muted-foreground">This project bills services independently. Enter an amount for each service invoice.</p></div><Button size="sm" onClick={() => setServiceInvoiceOpen(true)}>Create service invoice</Button></CardHeader></Card>
                : invoiceQuery.isError && getApiErrorCode(invoiceQuery.error) === "invoice_unavailable" && <Card className="mb-4"><CardHeader className="flex flex-row items-center justify-between gap-3"><div><CardTitle>Invoice</CardTitle><p className="mt-1 text-sm text-muted-foreground">No invoice has been created for this project.</p></div><Button size="sm" onClick={() => { setInvoiceDescription(`Services for ${project.name}`); setCreateInvoiceOpen(true); }}>Create invoice</Button></CardHeader></Card>}
              {invoiceQuery.data && <Card className="mb-4"><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle>Invoice {invoiceQuery.data.invoice.number}</CardTitle><div className="flex gap-2">{invoiceQuery.data.invoice.download_url && <Button size="sm" variant="outline" disabled={invoiceDownloading} onClick={async () => { setInvoiceDownloading(true); try { const response = await api.get(`/admin/projects/${encodeURIComponent(slug)}/invoice/download`, { responseType: "blob" }); const url = URL.createObjectURL(response.data); const link = document.createElement("a"); link.href = url; link.download = `invoice-${slug}.pdf`; link.click(); URL.revokeObjectURL(url); } finally { setInvoiceDownloading(false); } }}>{invoiceDownloading ? "Downloading…" : "Download invoice"}</Button>}<Button size="sm" variant="outline" disabled={resyncInvoice.isPending} onClick={() => resyncInvoice.mutate(undefined, { onSuccess: async () => { toast.success("Scribed synchronization queued"); await refreshPaymentData(); }, onError: (error) => toast.error(getApiErrorMessage(error)) })}>{resyncInvoice.isPending ? "Syncing…" : "Sync with Scribed"}</Button></div></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-4"><InfoRow label="Status" value={invoiceQuery.data.invoice.status.replace(/_/g, " ")} /><InfoRow label="Total" value={`${invoiceQuery.data.invoice.currency} ${invoiceQuery.data.invoice.amount}`} /><InfoRow label="Paid" value={`${invoiceQuery.data.invoice.currency} ${invoiceQuery.data.invoice.paid}`} /><InfoRow label="Balance" value={`${invoiceQuery.data.invoice.currency} ${invoiceQuery.data.invoice.balance}`} /></div></CardContent></Card>}
              <Dialog open={createInvoiceOpen} onOpenChange={setCreateInvoiceOpen}>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create invoice</DialogTitle><DialogDescription>Creates the invoice in Scribed, then syncs this project’s payment history so missing receipts can be generated.</DialogDescription></DialogHeader>
                  <div className="space-y-2"><Label htmlFor="invoice-description">Description</Label><Input id="invoice-description" value={invoiceDescription} onChange={event => setInvoiceDescription(event.target.value)} maxLength={500} /></div>
                  <p className="text-sm text-muted-foreground">Invoice total: {project.currency} {((project.baseAmount ?? project.amountDue ?? 0) + project.additionalCharges - project.discounts).toLocaleString()}</p>
                  <DialogFooter><Button variant="outline" onClick={() => setCreateInvoiceOpen(false)}>Cancel</Button><Button disabled={!invoiceDescription.trim() || createInvoice.isPending} onClick={() => createInvoice.mutate(invoiceDescription.trim(), { onSuccess: async () => { setCreateInvoiceOpen(false); toast.success("Invoice created; Scribed sync queued"); await refreshPaymentData(); }, onError: error => toast.error(getApiErrorMessage(error)) })}>{createInvoice.isPending ? "Creating…" : "Create invoice"}</Button></DialogFooter>
                </DialogContent>
              </Dialog>
              <section className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Payment history</CardTitle>
                    {project.amountDue != null && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Remaining balance: <span className="font-semibold text-foreground">{project.currency} {(project.remainingBalance ?? 0).toLocaleString()}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button size="sm" onClick={() => setCapturePaymentOpen(true)}><Link2 className="h-4 w-4" />Capture payment</Button>
                    {servicesQuery.data && servicesQuery.data.length > 1 && <Button size="sm" variant="outline" onClick={() => setServiceInvoiceOpen(true)}>Create service invoice</Button>}
                    {servicesQuery.data && servicesQuery.data.length > 1 && <Button size="sm" variant="outline" onClick={() => setServiceAdjustmentOpen(true)}><Plus className="h-4 w-4" />Add service charge</Button>}
                  </div>
                </div>
                  {reversalAlert && (
                    <Alert variant="destructive">
                      <AlertTitle>Payment reversed</AlertTitle>
                      <AlertDescription>
                        This project was automatically re-blocked due to a payment reversal on{" "}
                        {format(new Date(reversalAlert), "MMM d, yyyy")}.
                      </AlertDescription>
                    </Alert>
                  )}
                  <PaymentsHistoryTable payments={(projectPayments.data?.payments ?? []).map(payment => ({ ...payment, status: payment.gatewayStatus }))} currency={project.currency} projectSlug={project.slug} receiptUrls={Object.fromEntries((projectPayments.data?.payments ?? []).filter(payment => payment.gatewayStatus === "success").map(payment => [payment.providerReference, `/admin/projects/${encodeURIComponent(project.slug)}/payments/${payment.id}/receipt`]))} receiptNames={Object.fromEntries((invoiceQuery.data?.payments ?? []).map((payment) => [payment.provider_reference, payment.receipt_number]))} onPaymentChanged={refreshPaymentData} />
                  <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground"><span>{projectPayments.data ? `${projectPayments.data.offset + 1}-${projectPayments.data.offset + projectPayments.data.payments.length} of ${projectPayments.data.total}` : "Loading payments…"}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={paymentPage === 0 || projectPayments.isFetching} onClick={() => setPaymentPage(value => value - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={!projectPayments.data || projectPayments.data.offset + projectPayments.data.payments.length >= projectPayments.data.total || projectPayments.isFetching} onClick={() => setPaymentPage(value => value + 1)}>Next</Button></div></div>
              </section>
            </TabsContent>

            <TabsContent value="audit">
              <Card>
                <CardHeader>
                  <CardTitle>Audit log</CardTitle>
                </CardHeader>
                <CardContent>
                  <AuditLogTimeline entries={audit_log} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
          <ProjectSetupWizardPage open={setupOpen} onOpenChange={setSetupOpen} projectId={project.id} initialStep={setupStep} />
          <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
            <AdjustmentDialogBody
              pending={addAdjustment.isPending}
              onSubmit={async (payload) => { await addAdjustment.mutateAsync(payload); setAdjustmentOpen(false); }}
              onCancel={() => setAdjustmentOpen(false)}
            />
          </Dialog>
          <CapturePaymentDrawer project={project} open={capturePaymentOpen} onOpenChange={setCapturePaymentOpen} onPaymentChanged={refreshPaymentData} />
          <ServiceAdjustmentDialog projectId={project.id} currency={project.currency} open={serviceAdjustmentOpen} onOpenChange={setServiceAdjustmentOpen} onSaved={refreshPaymentData} />
          <CreateServiceInvoiceDialog projectId={project.id} projectName={project.name} currency={project.currency} open={serviceInvoiceOpen} onOpenChange={setServiceInvoiceOpen} onCreated={refreshPaymentData} />
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
              <DialogFooter><Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button><Button disabled={transferProject.isPending} onClick={async () => { await transferProject.mutateAsync({ deploymentMode, serviceMode }); setTransferOpen(false); }}>Transfer project</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </QueryState>
  );
}

function AdjustmentDialogBody({ pending, onSubmit, onCancel }: { pending: boolean; onSubmit: (payload: { type: "ADDITIONAL_CHARGE" | "DISCOUNT"; amount: number; reason: string }) => Promise<void>; onCancel: () => void }) {
  const [type, setType] = useState<"ADDITIONAL_CHARGE" | "DISCOUNT">("ADDITIONAL_CHARGE");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  return <DialogContent><DialogHeader><DialogTitle>Add charge or discount</DialogTitle><DialogDescription>Adjust the project ledger without changing its original charge or payment history.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><div className="space-y-2"><Label>Adjustment type</Label><select className="flex h-9 w-full rounded-md border bg-background px-3 text-sm" value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="ADDITIONAL_CHARGE">Additional charge</option><option value="DISCOUNT">Discount</option></select></div><div className="space-y-2"><Label htmlFor="adjustment-amount">Amount</Label><Input id="adjustment-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="adjustment-reason">Reason</Label><Input id="adjustment-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Added reporting feature" /></div></div><DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button disabled={pending || !(Number(amount) > 0) || !reason.trim()} onClick={() => onSubmit({ type, amount: Number(amount), reason: reason.trim() })}>{pending ? "Saving…" : "Save adjustment"}</Button></DialogFooter></DialogContent>;
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">{label}</p>
      <p className="text-sm font-medium text-foreground break-all">{value}</p>
    </div>
  );
}

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDigest(value: string) {
  const digest = value.split("@").at(-1) ?? value;
  const separator = digest.indexOf(":");
  if (separator < 0) return digest.length > 16 ? `${digest.slice(0, 10)}…${digest.slice(-4)}` : digest;
  const algorithm = digest.slice(0, separator);
  const hash = digest.slice(separator + 1);
  return hash.length > 12 ? `${algorithm}:${hash.slice(0, 6)}…${hash.slice(-4)}` : digest;
}

function deploymentStatusClass(value: string) {
  const status = value.toLowerCase().replace(/_/g, "-");
  if (["active", "success", "succeeded", "successful", "ready", "healthy"].includes(status)) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }
  if (["failed", "failure", "error", "unhealthy", "rejected"].includes(status)) {
    return "bg-red-500/10 text-red-700 dark:text-red-400";
  }
  if (["queued", "pending", "building", "starting", "health-checking", "deploying", "running"].includes(status)) {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  }
  return "bg-muted text-muted-foreground";
}
