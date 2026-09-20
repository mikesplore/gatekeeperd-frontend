import { useMemo, useState, type ReactNode } from "react";
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
import { useAddProjectAdjustment, useProjectDetail, useProjectHealth, useProjectInvoice, useTransferProject } from "@/hooks/useProjects";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api";
import { AuditLogTimeline } from "@/features/audit/AuditLogTimeline";
import { GeneratePaymentLinkDialog } from "@/features/payments/GeneratePaymentLinkDialog";
import { CaptureCashPaymentDialog } from "@/features/payments/CaptureCashPaymentDialog";
import { PaymentsHistoryTable } from "@/features/payments/PaymentsHistoryTable";
import { BlockUnblockDialog } from "@/features/projects/BlockUnblockDialog";
import { DeleteProjectDialog } from "@/features/projects/DeleteProjectDialog";
import { ProjectFormDialog } from "@/features/projects/ProjectFormDialog";
import { ProjectStatusBadge } from "@/features/projects/ProjectStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export function ProjectDetailPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError, error } = useProjectDetail(slug);
  const healthQuery = useProjectHealth(slug);
  const invoiceQuery = useProjectInvoice(slug);
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [cashPayOpen, setCashPayOpen] = useState(false);
  const [blockMode, setBlockMode] = useState<"block" | "unblock" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [invoiceDownloading, setInvoiceDownloading] = useState(false);
  const [deploymentMode, setDeploymentMode] = useState("client_hosted");
  const [serviceMode, setServiceMode] = useState("production");
  const transferProject = useTransferProject(slug);
  const addAdjustment = useAddProjectAdjustment(slug);

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
      {({ project, payments, audit_log }) => (
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
                <TabsTrigger value="payments" className="flex-1 sm:flex-none">Payments</TabsTrigger>
                <TabsTrigger value="audit" className="flex-1 sm:flex-none">Audit Log</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview">
              <Card className="mb-4">
                <CardHeader><CardTitle>Operational state</CardTitle><p className="text-sm text-muted-foreground">Access, deployment, and lifecycle are tracked separately.</p></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3">
                  <StateCard label="Access" value={formatStatus(project.status)} />
                  <StateCard label="Deployment" value={formatStatus(project.deploymentMode)} />
                  <StateCard label="Lifecycle" value={formatStatus(project.lifecycleStatus)} />
                </CardContent>
              </Card>
              <Card className="mb-4">
                <CardHeader><CardTitle>Runtime health</CardTitle></CardHeader>
                <CardContent>
                  {healthQuery.isLoading ? <Skeleton className="h-16 w-full" /> : healthQuery.data ? (
                    <div className="grid gap-4 sm:grid-cols-4">
                      <InfoRow label="Readiness" value={healthQuery.data.readiness.replace(/_/g, " ")} />
                      <InfoRow label="Container" value={healthQuery.data.containerHealth ?? "unknown"} />
                      <InfoRow label="Nginx" value={<HealthBadge active={healthQuery.data.nginxEnabled} onLabel="Enabled" offLabel="Disabled" />} />
                      <InfoRow label="Certificate" value={<HealthBadge active={healthQuery.data.certificateInstalled} onLabel="Installed" offLabel="Missing" />} />
                    </div>
                  ) : <p className="text-sm text-muted-foreground">Health data unavailable.</p>}
                </CardContent>
              </Card>
              <div className="grid items-stretch gap-4 lg:grid-cols-2">
              <Card className="h-full">
                <CardHeader><CardTitle>Client &amp; Billing</CardTitle></CardHeader>
                <CardContent className="grid gap-4 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
                  <InfoRow label="Original charge" value={project.baseAmount != null ? `${project.currency} ${project.baseAmount.toLocaleString()}` : "Not set"} />
                  <InfoRow label="Additional charges" value={`${project.currency} ${project.additionalCharges.toLocaleString()}`} />
                  <InfoRow label="Discounts" value={`${project.currency} ${project.discounts.toLocaleString()}`} />
                  <InfoRow label="Successful payments" value={`${project.currency} ${project.successfulPayments.toLocaleString()}`} />
                  <InfoRow label="Client" value={project.clientName ?? "Not set"} />
                  <InfoRow label="Client email" value={project.clientEmail ?? "Not set"} />
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
                  <InfoRow label="Block reason" value={project.blockReason ?? "Not set"} />
                </CardContent>
              </Card>
              </div>
            </TabsContent>

            <TabsContent value="payments">
              {invoiceQuery.isLoading && <Card className="mb-4"><CardHeader><Skeleton className="h-6 w-36" /></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-4"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div></CardContent></Card>}
              {invoiceQuery.isError && <Alert className="mb-4"><AlertTitle>Invoice unavailable</AlertTitle><AlertDescription>{getApiErrorMessage(invoiceQuery.error)}</AlertDescription></Alert>}
              {invoiceQuery.data && <Card className="mb-4"><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle>Invoice {invoiceQuery.data.invoice.number}</CardTitle>{invoiceQuery.data.invoice.download_url && <Button size="sm" variant="outline" disabled={invoiceDownloading} onClick={async () => { setInvoiceDownloading(true); try { const response = await api.get(`/admin/projects/${encodeURIComponent(slug)}/invoice/download`, { responseType: "blob" }); const url = URL.createObjectURL(response.data); const link = document.createElement("a"); link.href = url; link.download = `invoice-${slug}.pdf`; link.click(); URL.revokeObjectURL(url); } finally { setInvoiceDownloading(false); } }}>{invoiceDownloading ? "Downloading…" : "Download invoice"}</Button>}</CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-4"><InfoRow label="Status" value={invoiceQuery.data.invoice.status.replace(/_/g, " ")} /><InfoRow label="Total" value={`${invoiceQuery.data.invoice.currency} ${invoiceQuery.data.invoice.amount}`} /><InfoRow label="Paid" value={`${invoiceQuery.data.invoice.currency} ${invoiceQuery.data.invoice.paid}`} /><InfoRow label="Balance" value={`${invoiceQuery.data.invoice.currency} ${invoiceQuery.data.invoice.balance}`} /></div></CardContent></Card>}
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
                  <PaymentsHistoryTable payments={payments} currency={project.currency} projectSlug={project.slug} receiptUrls={Object.fromEntries((invoiceQuery.data?.payments ?? []).map((payment) => [payment.provider_reference, payment.receipt_url]))} />
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

function HealthBadge({ active, onLabel, offLabel }: { active: boolean; onLabel: string; offLabel: string }) {
  return <Badge variant="outline" className={active ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400" : "border-amber-500/40 text-amber-700 dark:text-amber-400"}><span className={active ? "mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" : "mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500"} />{active ? onLabel : offLabel}</Badge>;
}

function StateCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}
