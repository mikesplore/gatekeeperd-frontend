import { useMemo, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { Link2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/QueryState";
import { QueryState } from "@/components/QueryState";
import { useProjectDetail } from "@/hooks/useProjects";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api";
import { AuditLogTimeline } from "@/features/audit/AuditLogTimeline";
import { GeneratePaymentLinkDialog } from "@/features/payments/GeneratePaymentLinkDialog";
import { PaymentsHistoryTable } from "@/features/payments/PaymentsHistoryTable";
import { BlockUnblockDialog } from "@/features/projects/BlockUnblockDialog";
import { DeleteProjectDialog } from "@/features/projects/DeleteProjectDialog";
import { ProjectFormDialog } from "@/features/projects/ProjectFormDialog";
import { ProjectStatusBadge } from "@/features/projects/ProjectStatusBadge";

export function ProjectDetailPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError, error } = useProjectDetail(slug);
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [blockMode, setBlockMode] = useState<"block" | "unblock" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
          {getApiErrorMessage(error)} — check the slug or return to{" "}
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
                {project.status === "active" ? (
                  <Button variant="destructive" size="sm" onClick={() => setBlockMode("block")} className="flex-1 sm:flex-none">
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
              <Card>
                <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                  <InfoRow label="Client" value={project.clientName ?? "—"} />
                  <InfoRow label="Client email" value={project.clientEmail ?? "—"} />
                  <InfoRow
                    label="Amount due"
                    value={
                      project.amountDue != null
                        ? `${project.currency} ${project.amountDue.toLocaleString()}`
                        : "—"
                    }
                  />
                  <InfoRow
                    label="Due date"
                    value={project.dueDate ? format(new Date(project.dueDate), "MMM d, yyyy") : "—"}
                  />
                  <InfoRow label="Grace period" value={`${project.gracePeriodDays} days`} />
                  <InfoRow label="Container" value={project.containerName} />
                  <InfoRow label="Type" value={project.type} />
                  <InfoRow label="Slug" value={project.slug} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments">
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>Payment history</CardTitle>
                  <Button size="sm" onClick={() => setPayOpen(true)} className="w-full sm:w-auto">
                    <Link2 className="h-4 w-4" />
                    Generate payment link
                  </Button>
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
                  <PaymentsHistoryTable payments={payments} currency={project.currency} />
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
          <GeneratePaymentLinkDialog project={project} open={payOpen} onOpenChange={setPayOpen} />
          <BlockUnblockDialog project={project} mode={blockMode} onClose={() => setBlockMode(null)} />
          <DeleteProjectDialog
            project={project}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            onDeleted={() => navigate("/projects")}
          />
        </div>
      )}
    </QueryState>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm break-all">{value}</p>
    </div>
  );
}