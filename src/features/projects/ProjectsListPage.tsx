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
import { ProjectsTable } from "./ProjectsTable";
import type { Project } from "@/types/project";
import { api, getApiErrorMessage } from "@/lib/api";

export function ProjectsListPage() {
  const { data, isLoading, isError, error } = useProjects();
  const [formOpen, setFormOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [blockTarget, setBlockTarget] = useState<{ project: Project; mode: "block" | "unblock" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const qc = useQueryClient();
  const bulkAction = useMutation({ mutationFn: ({ action, reason }: { action: "block" | "unblock"; reason: string }) => api.post<{ slug: string; status: string; message?: string }[]>(`/admin/projects/bulk/${action}`, { slugs: selectedSlugs, reason }), onSuccess: async (response) => { const failed = response.data.filter(item => item.status === "failed"); await qc.invalidateQueries({ queryKey: ["projects"] }); setSelectedSlugs([]); toast.success(`${response.data.length - failed.length} project${response.data.length - failed.length === 1 ? "" : "s"} updated${failed.length ? `; ${failed.length} failed` : ""}`); } });
  const runBulk = async (action: "block" | "unblock") => { const reason = window.prompt(`Reason for ${action === "block" ? "blocking" : "unblocking"} these ${selectedSlugs.length} projects:`)?.trim(); if (!reason) return; try { await bulkAction.mutateAsync({ action, reason }); } catch (error) { toast.error(getApiErrorMessage(error)); } };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-muted-foreground">Manage client projects and access control.</p>
        </div>
        <div className="flex flex-wrap gap-2">{selectedSlugs.length > 0 && <><Button variant="outline" disabled={bulkAction.isPending} onClick={() => void runBulk("block")}><ShieldAlert className="mr-2 h-4 w-4"/>Block {selectedSlugs.length}</Button><Button variant="outline" disabled={bulkAction.isPending} onClick={() => void runBulk("unblock")}><ShieldCheck className="mr-2 h-4 w-4"/>Unblock {selectedSlugs.length}</Button></>}<Button onClick={() => { setEditProject(null); setFormOpen(true); }} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          New Project
        </Button></div>
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
            {(projects) =>
              projects.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <p className="text-muted-foreground">No projects found.</p>
                  <Button onClick={() => { setEditProject(null); setFormOpen(true); }}>
                    <Plus className="h-4 w-4" />
                    New Project
                  </Button>
                </div>
              ) : (
                <ProjectsTable
                  projects={projects}
                  selectedSlugs={selectedSlugs}
                  onSelectionChange={setSelectedSlugs}
                  onEdit={(p) => { setEditProject(p); setFormOpen(true); }}
                  onBlock={(p) => setBlockTarget({ project: p, mode: "block" })}
                  onUnblock={(p) => setBlockTarget({ project: p, mode: "unblock" })}
                  onDelete={setDeleteTarget}
                />
              )
            }
          </QueryState>
        </CardContent>
      </Card>

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

      <DeleteProjectDialog
        project={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );
}
