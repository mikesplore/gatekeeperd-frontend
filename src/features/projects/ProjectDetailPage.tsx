import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { Link2, Pencil } from "lucide-react";
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
import { ProjectFormDialog } from "@/features/projects/ProjectFormDialog";
import { ProjectStatusBadge } from "@/features/projects/ProjectStatusBadge";

export function ProjectDetailPage() {
  const { slug = "" } = useParams();
  const { data, isLoading, isError, error } = useProjectDetail(slug);
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [blockMode, setBlockMode] = useState<"block" | "unblock" | null>(null);

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
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-2xl">{project.name}</CardTitle>
                  <ProjectStatusBadge status={project.status} />
                </div>
                <p className="text-muted-foreground">{project.domain}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                {project.status === "active" ? (
                  <Button variant="destructive" size="sm" onClick={() => setBlockMode("block")}>
                    Block
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setBlockMode("unblock")}>
                    Unblock
                  </Button>
                )}
              </div>
            </CardHeader>
          </Card>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="audit">Audit Log</TabsTrigger>
            </TabsList>

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
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Payment history</CardTitle>
                  <Button size="sm" onClick={() => setPayOpen(true)}>
                    <Link2 className="h-4 w-4" />
                    Generate payment link
                  </Button>
                </CardHeader>
                <CardContent>
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
        </div>
      )}
    </QueryState>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
