import { useState } from "react";
import { Plus, ShieldAlert, ShieldCheck } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryState } from "@/components/QueryState";
import { useProjects } from "@/hooks/useProjects";
import { BlockUnblockDialog } from "./BlockUnblockDialog";
import { DeleteProjectDialog } from "./DeleteProjectDialog";
import { ProjectFormDialog } from "./ProjectFormDialog";
import { ProjectSetupWizardPage } from "./ProjectSetupWizardPage";
import { ProjectsTable } from "./ProjectsTable";
import type { Project } from "@/types/project";
import { api, getApiErrorMessage } from "@/lib/api";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCan } from "@/hooks/usePermissions";

export function ProjectsListPage() {
  const canManageProjects = useCan("projects.manage");
  const { data, isLoading, isError, error } = useProjects();
  const [formOpen, setFormOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [blockTarget, setBlockTarget] = useState<{ project: Project; mode: "block" | "unblock" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [bulkBlockOpen, setBulkBlockOpen] = useState(false);
  const [bulkUnblockOpen, setBulkUnblockOpen] = useState(false);
  const [bulkUnblockReason, setBulkUnblockReason] = useState("");
  const [bulkBlockReasonCode, setBulkBlockReasonCode] = useState("");
  const [bulkBlockNote, setBulkBlockNote] = useState("");
  const qc = useQueryClient();
  const bulkAction = useMutation({ mutationFn: ({ action, reason, blockReasonCode, blockReasonNote }: { action: "block" | "unblock"; reason: string; blockReasonCode?: string; blockReasonNote?: string }) => api.post<{ slug: string; status: string; message?: string }[]>(`/admin/projects/bulk/${action}`, { slugs: selectedSlugs, reason, blockReasonCode, blockReasonNote }), onSuccess: async (response) => { const failed = response.data.filter(item => item.status === "failed"); await qc.invalidateQueries({ queryKey: ["projects"] }); setSelectedSlugs([]); setBulkBlockOpen(false); setBulkUnblockOpen(false); setBulkUnblockReason(""); setBulkBlockReasonCode(""); setBulkBlockNote(""); toast.success(`${response.data.length - failed.length} project${response.data.length - failed.length === 1 ? "" : "s"} updated${failed.length ? `; ${failed.length} failed` : ""}`); } });
  const runBulk = (action: "block" | "unblock") => { if (action === "block") { setBulkBlockReasonCode(""); setBulkBlockNote(""); setBulkBlockOpen(true); return; } setBulkUnblockReason(""); setBulkUnblockOpen(true); };
  const confirmBulkUnblock = async () => { const reason = bulkUnblockReason.trim(); if (!reason) return; try { await bulkAction.mutateAsync({ action: "unblock", reason }); } catch (error) { toast.error(getApiErrorMessage(error)); } };
  const confirmBulkBlock = async () => { if (!bulkBlockReasonCode) return; try { await bulkAction.mutateAsync({ action: "block", reason: bulkBlockNote.trim() || blockReasonCodeLabel(bulkBlockReasonCode), blockReasonCode: bulkBlockReasonCode, blockReasonNote: bulkBlockNote.trim() || undefined }); } catch (error) { toast.error(getApiErrorMessage(error)); } };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-muted-foreground">Manage client projects and access control.</p>
        </div>
        <div className="flex flex-wrap gap-2">{canManageProjects && selectedSlugs.length > 0 && <><Button variant="outline" loading={bulkAction.isPending} disabled={bulkAction.isPending} onClick={() => void runBulk("block")}><ShieldAlert className="mr-2 h-4 w-4"/>Block {selectedSlugs.length}</Button><Button variant="outline" loading={bulkAction.isPending} disabled={bulkAction.isPending} onClick={() => void runBulk("unblock")}><ShieldCheck className="mr-2 h-4 w-4"/>Unblock {selectedSlugs.length}</Button></>}{canManageProjects && <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          New Project
        </Button>}</div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All projects</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            data={data}
            loadingFallback={
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            }
          >
            {(projects) => (
              <ProjectsTable
                projects={projects}
                selectedSlugs={selectedSlugs}
                onSelectionChange={setSelectedSlugs}
                onEdit={(p) => { setEditProject(p); setFormOpen(true); }}
                onBlock={(p) => setBlockTarget({ project: p, mode: "block" })}
                onUnblock={(p) => setBlockTarget({ project: p, mode: "unblock" })}
                onDelete={setDeleteTarget}
                onCreate={() => setCreateOpen(true)}
                canManage={canManageProjects}
              />
            )}
          </QueryState>
        </CardContent>
      </Card>

      <ProjectSetupWizardPage open={createOpen} onOpenChange={setCreateOpen} />

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editProject}
      />

      <BlockUnblockDialog
        project={blockTarget?.project ?? null}
        mode={blockTarget?.mode ?? null}
        onClose={() => setBlockTarget(null)}
      />

      <AlertDialog open={bulkBlockOpen} onOpenChange={open => { if (!open) setBulkBlockOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {selectedSlugs.length} projects?</AlertDialogTitle>
            <AlertDialogDescription>Choose a reason to record before these projects are blocked.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="bulk-block-reason">Block reason <span className="text-destructive">*</span></Label>
            <Select value={bulkBlockReasonCode} onValueChange={setBulkBlockReasonCode}>
              <SelectTrigger id="bulk-block-reason"><SelectValue placeholder="Choose a reason" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="payment">Payment issue</SelectItem><SelectItem value="manual_hold">Manual hold</SelectItem><SelectItem value="abuse_tos">Abuse or terms violation</SelectItem><SelectItem value="suspended_by_request">Suspended by request</SelectItem><SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="bulk-block-note">Additional note (optional)</Label><Textarea id="bulk-block-note" value={bulkBlockNote} onChange={event => setBulkBlockNote(event.target.value)} rows={3} placeholder="Add context for this block" /></div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkAction.isPending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={!bulkBlockReasonCode || bulkAction.isPending} onClick={() => void confirmBulkBlock()} loading={bulkAction.isPending}>{bulkAction.isPending ? "Blocking…" : "Block projects"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={bulkUnblockOpen} onOpenChange={open => { if (!open && !bulkAction.isPending) setBulkUnblockOpen(false); }}>
        <DialogContent><DialogHeader><DialogTitle>Unblock {selectedSlugs.length} projects?</DialogTitle><DialogDescription>Enter a reason to add to the audit log for this bulk unblock.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="bulk-unblock-reason">Reason <span className="text-destructive">*</span></Label><Textarea id="bulk-unblock-reason" value={bulkUnblockReason} onChange={event => setBulkUnblockReason(event.target.value)} rows={3} placeholder="Reason for unblocking these projects" /></div><DialogFooter><Button variant="outline" disabled={bulkAction.isPending} onClick={() => setBulkUnblockOpen(false)}>Cancel</Button><Button loading={bulkAction.isPending} disabled={bulkAction.isPending || !bulkUnblockReason.trim()} onClick={() => void confirmBulkUnblock()}><ShieldCheck className="mr-2 h-4 w-4" />Unblock projects</Button></DialogFooter></DialogContent>
      </Dialog>

      <DeleteProjectDialog
        project={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );
}

function blockReasonCodeLabel(code: string) { return ({ payment: "Payment issue", manual_hold: "Manual hold", abuse_tos: "Abuse or terms violation", suspended_by_request: "Suspended by request", other: "Other" } as Record<string, string>)[code] ?? "Manual hold"; }
