import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { Link2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/QueryState";
import { QueryState } from "@/components/QueryState";
import { useAddProjectAdjustment, useProjectDetail, useProjectOverview, useProjectInvoice, useResyncProjectInvoice, useCreateProjectInvoice, useTransferProject } from "@/hooks/useProjects";
import { useProjectPayments } from "@/hooks/usePayments";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api";
import { AuditLogTimeline } from "@/features/audit/AuditLogTimeline";
import { GeneratePaymentLinkDialog } from "@/features/payments/GeneratePaymentLinkDialog";
import { CaptureCashPaymentDialog } from "@/features/payments/CaptureCashPaymentDialog";
import { PaymentsHistoryTable } from "@/features/payments/PaymentsHistoryTable";
import { BlockUnblockDialog } from "@/features/projects/BlockUnblockDialog";
import { DeleteProjectDialog } from "@/features/projects/DeleteProjectDialog";
import { ProjectFormDialog } from "@/features/projects/ProjectFormDialog";
import { ProjectStatusBadge } from "@/features/projects/ProjectStatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function ProjectDetailPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError, error } = useProjectDetail(slug);
  const overview = useProjectOverview(slug);
  const invoiceQuery = useProjectInvoice(slug);
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [cashPayOpen, setCashPayOpen] = useState(false);
  const [blockMode, setBlockMode] = useState<"block" | "unblock" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [invoiceDownloading, setInvoiceDownloading] = useState(false);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [invoiceDescription, setInvoiceDescription] = useState("");
  const [paymentPage, setPaymentPage] = useState(0);
  const projectPayments = useProjectPayments(slug, 25, paymentPage * 25);
  const [deploymentMode, setDeploymentMode] = useState("client_hosted");
  const [serviceMode, setServiceMode] = useState("production");
  const [deploymentSource, setDeploymentSource] = useState({ repository: "", gitRef: "main", imageName: "", imageTag: "latest", autoDeploy: false });
  const [savingDeploymentSource, setSavingDeploymentSource] = useState(false);
  const transferProject = useTransferProject(slug);
  const addAdjustment = useAddProjectAdjustment(slug);
  const resyncInvoice = useResyncProjectInvoice(slug);
  const createInvoice = useCreateProjectInvoice(slug);
  useEffect(() => { if (data?.project) setDeploymentSource({ repository: data.project.githubRepository ?? "", gitRef: data.project.githubRef ?? "main", imageName: data.project.deployImageName ?? "", imageTag: data.project.deployImageTag ?? "latest", autoDeploy: data.project.autoDeploy ?? false }); }, [data?.project]);

  const defaultTab = searchParams.get("tab") === "payments" ? "payments" : "overview";

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
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-xl sm:text-2xl">{project.name}</CardTitle>
                  <ProjectStatusBadge status={project.status} />
                </div>
                <p className="text-sm text-muted-foreground break-all">{project.domain}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild><Link to={`/app/projects/setup/${project.id}?step=1`}>Project setup</Link></Button>
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="flex-1 sm:flex-none">
                  <Pencil className="h-4 w-4" />
                  <span className="sm:hidden">Edit</span>
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAdjustmentOpen(true)}>Add charge / discount</Button>
                {project.lifecycleStatus !== "archived" && (
                  <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)} className="flex-1 sm:flex-none">Transfer</Button>
                )}
                {project.status === "active" ? (
                  <Button variant="outline" size="sm" onClick={() => setBlockMode("block")} className="flex-1 border-red-500/50 text-red-600 hover:bg-red-500/10 hover:text-red-700 sm:flex-none">
                    Block
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setBlockMode("unblock")} className="flex-1 sm:flex-none">
                    Unblock
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="flex-1 sm:flex-none">
                  <Trash2 className="h-4 w-4" />
                  <span className="sm:hidden">Archive</span>
                  <span className="hidden sm:inline">Archive</span>
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Tabs defaultValue={defaultTab}>
            <div className="overflow-x-auto -mx-1 px-1">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="overview" className="flex-1 sm:flex-none">Overview</TabsTrigger>
                <TabsTrigger value="deployment" className="flex-1 sm:flex-none">Deployment</TabsTrigger>
                <TabsTrigger value="payments" className="flex-1 sm:flex-none">Payments</TabsTrigger>
                <TabsTrigger value="audit" className="flex-1 sm:flex-none">Audit Log</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview">
              {overview.data && <div className="mb-4 grid gap-4 xl:grid-cols-2">
                <Card><CardHeader><CardTitle>Access &amp; lifecycle</CardTitle><p className="text-sm text-muted-foreground">Business access and project lifecycle stay independent of runtime health.</p></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3"><InfoRow label="Access" value={formatStatus(overview.data.accessLifecycle.accessStatus)} /><InfoRow label="Lifecycle" value={formatStatus(overview.data.accessLifecycle.lifecycleStatus)} /><InfoRow label="Service mode" value={formatStatus(overview.data.accessLifecycle.serviceMode)} />{overview.data.accessLifecycle.blockReason && <InfoRow label="Block reason" value={overview.data.accessLifecycle.blockReason} />}</CardContent></Card>
                <Card><CardHeader><CardTitle>Desired configuration</CardTitle><p className="text-sm text-muted-foreground">Editable source and runtime target for the next deployment.</p></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><InfoRow label="Repository" value={overview.data.desiredConfiguration.repository ?? "Not configured"} /><InfoRow label="Ref" value={overview.data.desiredConfiguration.gitRef ?? "Not configured"} /><InfoRow label="Image" value={overview.data.desiredConfiguration.imageName ? `${overview.data.desiredConfiguration.registry}/${overview.data.desiredConfiguration.imageName}:${overview.data.desiredConfiguration.imageTag}` : "Not configured"} /><InfoRow label="Environment" value={overview.data.desiredConfiguration.environment ?? "Not configured"} /><InfoRow label="Environment keys" value={overview.data.desiredConfiguration.envKeys.join(", ") || "None"} /><InfoRow label="Secret set" value={overview.data.desiredConfiguration.secretSetVersion ? `Version ${overview.data.desiredConfiguration.secretSetVersion}` : "Not configured"} /></CardContent></Card>
                <Card><CardHeader><CardTitle>Current deployment &amp; runtime</CardTitle><p className="text-sm text-muted-foreground">The canonical active deployment pointer supplies runtime identity.</p></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><InfoRow label="Deployment" value={overview.data.currentDeployment.id ?? "No active deployment"} /><InfoRow label="State" value={formatStatus(overview.data.currentDeployment.status)} /><InfoRow label="Image digest" value={overview.data.currentDeployment.imageDigest ?? "Not available"} /><InfoRow label="Commit" value={overview.data.currentDeployment.commitSha ?? "Not available"} /><InfoRow label="Runtime" value={overview.data.currentDeployment.runtimeContainerName ?? "No runtime"} /><InfoRow label="Runtime health" value={formatStatus(overview.data.currentDeployment.runtimeHealth)} /><InfoRow label="Runtime upstream" value={overview.data.currentDeployment.runtimeUpstreamHost && overview.data.currentDeployment.runtimeUpstreamPort ? `${overview.data.currentDeployment.runtimeUpstreamHost}:${overview.data.currentDeployment.runtimeUpstreamPort}` : "Not resolved"} /><InfoRow label="Credential version" value={overview.data.currentDeployment.credentialSetVersion ? `Version ${overview.data.currentDeployment.credentialSetVersion}` : "Not recorded"} /></CardContent></Card>
                <Card><CardHeader><CardTitle>Domain &amp; gateway</CardTitle><p className="text-sm text-muted-foreground">Domain identity belongs to the project; upstream follows the active deployment.</p></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><InfoRow label="Domain" value={overview.data.domainsGateway.domain} /><InfoRow label="Site" value={overview.data.domainsGateway.configured ? formatStatus(overview.data.domainsGateway.reconciliationStatus ?? "configured") : "Not configured"} /><InfoRow label="TLS" value={formatStatus(overview.data.domainsGateway.tlsMode ?? "not configured")} /><InfoRow label="Payment gate" value={overview.data.domainsGateway.gateEnabled ? "Enabled" : "Disabled"} /><InfoRow label="Resolved upstream" value={overview.data.domainsGateway.resolvedUpstreamHost && overview.data.domainsGateway.resolvedUpstreamPort ? `${overview.data.domainsGateway.resolvedUpstreamHost}:${overview.data.domainsGateway.resolvedUpstreamPort}` : "No active target"} /></CardContent></Card>
                <Card className="xl:col-span-2"><CardHeader><CardTitle>Customer &amp; billing</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3"><InfoRow label="Customer" value={overview.data.customerBilling.customerId && overview.data.customerBilling.customerName ? <Link to={`/app/customers/${overview.data.customerBilling.customerId}`} className="text-primary hover:underline">{overview.data.customerBilling.customerName}</Link> : "Not set"} /><InfoRow label="Billing contact" value={overview.data.customerBilling.billingName ?? overview.data.customerBilling.customerName ?? "Not set"} /><InfoRow label="Billed" value={`${overview.data.customerBilling.currency} ${overview.data.customerBilling.billed.toLocaleString()}`} /><InfoRow label="Paid" value={`${overview.data.customerBilling.currency} ${overview.data.customerBilling.paid.toLocaleString()}`} /><InfoRow label="Balance" value={`${overview.data.customerBilling.currency} ${overview.data.customerBilling.balance.toLocaleString()}`} /><InfoRow label="Due date" value={overview.data.customerBilling.dueDate ?? "Not set"} /></CardContent></Card>
              </div>}
              {overview.isError && <Alert><AlertTitle>Project overview unavailable</AlertTitle><AlertDescription>{getApiErrorMessage(overview.error)}. Existing project details are still shown below.</AlertDescription></Alert>}
              <div className="grid items-stretch gap-4 lg:grid-cols-2">
              <Card className="h-full">
                <CardHeader><CardTitle>Customer &amp; Billing</CardTitle></CardHeader>
                <CardContent className="grid gap-4 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
                  <InfoRow label="Original charge" value={project.baseAmount != null ? `${project.currency} ${project.baseAmount.toLocaleString()}` : "Not set"} />
                  <InfoRow label="Additional charges" value={`${project.currency} ${project.additionalCharges.toLocaleString()}`} />
                  <InfoRow label="Discounts" value={`${project.currency} ${project.discounts.toLocaleString()}`} />
                  <InfoRow label="Successful payments" value={`${project.currency} ${project.successfulPayments.toLocaleString()}`} />
                  <InfoRow label="Customer" value={project.customerId && project.customerName ? <Link to={`/app/customers/${project.customerId}`} className="text-primary hover:underline">{project.customerName}</Link> : "Not set"} />
                  <InfoRow label="Customer email" value={project.customerEmail ?? "Not set"} />
                  <InfoRow label="Customer phone" value={project.customerPhone ?? "Not set"} />
                  <InfoRow
                    label="Remaining balance"
                    value={
                      project.amountDue != null
                        ? `${project.currency} ${(project.remainingBalance ?? 0).toLocaleString()}`
                        : `${project.currency} 0`
                    }
                  />
                  <InfoRow
                    label="Due date"
                    value={project.dueDate ? format(new Date(project.dueDate), "MMM d, yyyy") : "Not set"}
                  />
                  <InfoRow label="Grace period" value={`${project.gracePeriodDays} days`} />
                </CardContent>
              </Card>
              <Card className="h-full">
                <CardHeader><CardTitle>Subscription &amp; Policy</CardTitle></CardHeader>
                <CardContent className="grid gap-4 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
                  <InfoRow label="Type" value={project.type} />
                  {project.status !== "active" && <InfoRow label="Block reason" value={project.blockReason ?? "Not set"} />}
                </CardContent>
              </Card>
              </div>
            </TabsContent>

            <TabsContent value="deployment"><Card><CardHeader><CardTitle>Deployment source</CardTitle><p className="text-sm text-muted-foreground">Configure automatic redeployments for GitHub pushes.</p></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1"><Label>Repository</Label><Input placeholder="owner/repository" value={deploymentSource.repository} onChange={e => setDeploymentSource({...deploymentSource, repository: e.target.value})} /></div><div className="space-y-1"><Label>Branch or ref</Label><Input value={deploymentSource.gitRef} onChange={e => setDeploymentSource({...deploymentSource, gitRef: e.target.value})} /></div><div className="space-y-1"><Label>Image name</Label><Input placeholder="scribed" value={deploymentSource.imageName} onChange={e => setDeploymentSource({...deploymentSource, imageName: e.target.value})} /></div><div className="space-y-1"><Label>Image tag</Label><Input value={deploymentSource.imageTag} onChange={e => setDeploymentSource({...deploymentSource, imageTag: e.target.value})} /></div><label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={deploymentSource.autoDeploy} onChange={e => setDeploymentSource({...deploymentSource, autoDeploy: e.target.checked})} />Redeploy automatically on GitHub pushes</label></div><div className="mt-4 flex justify-end"><Button disabled={savingDeploymentSource} onClick={async () => { setSavingDeploymentSource(true); try { await api.patch(`/admin/projects/${encodeURIComponent(slug)}/deployment-source`, deploymentSource); toast.success("Deployment source saved"); } catch (error) { toast.error(getApiErrorMessage(error)); } finally { setSavingDeploymentSource(false); } }}>{savingDeploymentSource ? "Saving…" : "Save deployment source"}</Button></div></CardContent></Card></TabsContent>
            <TabsContent value="payments">
              {invoiceQuery.isLoading && <Card className="mb-4"><CardHeader><Skeleton className="h-6 w-36" /></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-4"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div></CardContent></Card>}
              {invoiceQuery.isError && getApiErrorCode(invoiceQuery.error) !== "invoice_unavailable" && <Alert className="mb-4"><AlertTitle>Invoice unavailable</AlertTitle><AlertDescription>{getApiErrorMessage(invoiceQuery.error)}</AlertDescription></Alert>}
              {invoiceQuery.isError && getApiErrorCode(invoiceQuery.error) === "invoice_unavailable" && <Card className="mb-4"><CardHeader className="flex flex-row items-center justify-between gap-3"><div><CardTitle>Invoice</CardTitle><p className="mt-1 text-sm text-muted-foreground">No invoice has been created for this project.</p></div><Button size="sm" onClick={() => { setInvoiceDescription(`Services for ${project.name}`); setCreateInvoiceOpen(true); }}>Create invoice</Button></CardHeader></Card>}
              {invoiceQuery.data && <Card className="mb-4"><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle>Invoice {invoiceQuery.data.invoice.number}</CardTitle><div className="flex gap-2">{invoiceQuery.data.invoice.download_url && <Button size="sm" variant="outline" disabled={invoiceDownloading} onClick={async () => { setInvoiceDownloading(true); try { const response = await api.get(`/admin/projects/${encodeURIComponent(slug)}/invoice/download`, { responseType: "blob" }); const url = URL.createObjectURL(response.data); const link = document.createElement("a"); link.href = url; link.download = `invoice-${slug}.pdf`; link.click(); URL.revokeObjectURL(url); } finally { setInvoiceDownloading(false); } }}>{invoiceDownloading ? "Downloading…" : "Download invoice"}</Button>}<Button size="sm" variant="outline" disabled={resyncInvoice.isPending} onClick={() => resyncInvoice.mutate(undefined, { onSuccess: () => toast.success("Scribed synchronization queued"), onError: (error) => toast.error(getApiErrorMessage(error)) })}>{resyncInvoice.isPending ? "Syncing…" : "Sync with Scribed"}</Button></div></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-4"><InfoRow label="Status" value={invoiceQuery.data.invoice.status.replace(/_/g, " ")} /><InfoRow label="Total" value={`${invoiceQuery.data.invoice.currency} ${invoiceQuery.data.invoice.amount}`} /><InfoRow label="Paid" value={`${invoiceQuery.data.invoice.currency} ${invoiceQuery.data.invoice.paid}`} /><InfoRow label="Balance" value={`${invoiceQuery.data.invoice.currency} ${invoiceQuery.data.invoice.balance}`} /></div></CardContent></Card>}
              <Dialog open={createInvoiceOpen} onOpenChange={setCreateInvoiceOpen}>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create invoice</DialogTitle><DialogDescription>Creates the invoice in Scribed, then syncs this project’s payment history so missing receipts can be generated.</DialogDescription></DialogHeader>
                  <div className="space-y-2"><Label htmlFor="invoice-description">Description</Label><Input id="invoice-description" value={invoiceDescription} onChange={event => setInvoiceDescription(event.target.value)} maxLength={500} /></div>
                  <p className="text-sm text-muted-foreground">Invoice total: {project.currency} {((project.baseAmount ?? project.amountDue ?? 0) + project.additionalCharges - project.discounts).toLocaleString()}</p>
                  <DialogFooter><Button variant="outline" onClick={() => setCreateInvoiceOpen(false)}>Cancel</Button><Button disabled={!invoiceDescription.trim() || createInvoice.isPending} onClick={() => createInvoice.mutate(invoiceDescription.trim(), { onSuccess: async () => { setCreateInvoiceOpen(false); toast.success("Invoice created; Scribed sync queued"); await invoiceQuery.refetch(); }, onError: error => toast.error(getApiErrorMessage(error)) })}>{createInvoice.isPending ? "Creating…" : "Create invoice"}</Button></DialogFooter>
                </DialogContent>
              </Dialog>
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Payment history</CardTitle>
                    {project.amountDue != null && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Remaining balance: <span className="font-semibold text-foreground">{project.currency} {(project.remainingBalance ?? 0).toLocaleString()}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button size="sm" onClick={() => setPayOpen(true)}>
                      <Link2 className="h-4 w-4" />
                      Generate payment link
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCashPayOpen(true)}>
                      Record cash payment
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reversalAlert && (
                    <Alert variant="destructive">
                      <AlertTitle>Payment reversed</AlertTitle>
                      <AlertDescription>
                        This project was automatically re-blocked due to a payment reversal on{" "}
                        {format(new Date(reversalAlert), "MMM d, yyyy")}.
                      </AlertDescription>
                    </Alert>
                  )}
                  <PaymentsHistoryTable payments={(projectPayments.data?.payments ?? []).map(payment => ({ ...payment, status: payment.gatewayStatus }))} currency={project.currency} projectSlug={project.slug} receiptUrls={Object.fromEntries((projectPayments.data?.payments ?? []).filter(payment => payment.gatewayStatus === "success").map(payment => [payment.providerReference, `/admin/projects/${encodeURIComponent(project.slug)}/payments/${payment.id}/receipt`]))} receiptNames={Object.fromEntries((invoiceQuery.data?.payments ?? []).map((payment) => [payment.provider_reference, payment.receipt_number]))} />
                  <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground"><span>{projectPayments.data ? `${projectPayments.data.offset + 1}-${projectPayments.data.offset + projectPayments.data.payments.length} of ${projectPayments.data.total}` : "Loading payments…"}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={paymentPage === 0 || projectPayments.isFetching} onClick={() => setPaymentPage(value => value - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={!projectPayments.data || projectPayments.data.offset + projectPayments.data.payments.length >= projectPayments.data.total || projectPayments.isFetching} onClick={() => setPaymentPage(value => value + 1)}>Next</Button></div></div>
                </CardContent>
              </Card>
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
          <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
            <AdjustmentDialogBody
              pending={addAdjustment.isPending}
              onSubmit={async (payload) => { await addAdjustment.mutateAsync(payload); setAdjustmentOpen(false); }}
              onCancel={() => setAdjustmentOpen(false)}
            />
          </Dialog>
          <GeneratePaymentLinkDialog project={project} open={payOpen} onOpenChange={setPayOpen} />
          <CaptureCashPaymentDialog project={project} open={cashPayOpen} onOpenChange={setCashPayOpen} />
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
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground break-all">{value}</p>
    </div>
  );
}

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
