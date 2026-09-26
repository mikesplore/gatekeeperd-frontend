import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ShieldAlert, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidePanel, SidePanelContent, SidePanelDescription, SidePanelFooter, SidePanelHeader, SidePanelTitle } from "@/components/ui/side-panel";
import { useCreateProjectSetup } from "@/hooks/useProjects";
import { useDashboardCustomers } from "@/hooks/useSiteDashboard";
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
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useProjects();
  const [formOpen, setFormOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newProject, setNewProject] = useState({ slug: "", name: "", domain: "", type: "frontend" as "frontend" | "backend", customerId: "" });
  const createProject = useCreateProjectSetup();
  const customers = useDashboardCustomers(100);
  const submitNewProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const created = await createProject.mutateAsync({ ...newProject, customerId: newProject.customerId || undefined });
      toast.success("Project created");
      setCreateOpen(false);
      setNewProject({ slug: "", name: "", domain: "", type: "frontend", customerId: "" });
      navigate(`/app/projects/setup/${created.projectId}?step=1`);
    } catch (error) { toast.error(getApiErrorMessage(error)); }
  };
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
        <div className="flex flex-wrap gap-2">{selectedSlugs.length > 0 && <><Button variant="outline" disabled={bulkAction.isPending} onClick={() => void runBulk("block")}><ShieldAlert className="mr-2 h-4 w-4"/>Block {selectedSlugs.length}</Button><Button variant="outline" disabled={bulkAction.isPending} onClick={() => void runBulk("unblock")}><ShieldCheck className="mr-2 h-4 w-4"/>Unblock {selectedSlugs.length}</Button></>}<Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
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
                  <Button onClick={() => setCreateOpen(true)}>
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

      <SidePanel open={createOpen} onOpenChange={setCreateOpen}>
        <SidePanelContent>
          <SidePanelHeader className="border-b px-6 py-5 pr-14"><SidePanelTitle>Create project</SidePanelTitle><SidePanelDescription>Create the project first. You can configure source, credentials, and gateway next.</SidePanelDescription></SidePanelHeader>
          <form onSubmit={submitNewProject} className="grid content-start gap-4 px-6 py-6">
            <div className="space-y-2"><Label htmlFor="new-project-name">Project name</Label><Input id="new-project-name" value={newProject.name} onChange={event => setNewProject({ ...newProject, name: event.target.value })} required /></div>
            <div className="space-y-2"><Label htmlFor="new-project-slug">Project slug</Label><Input id="new-project-slug" value={newProject.slug} onChange={event => setNewProject({ ...newProject, slug: event.target.value })} placeholder="acme-portal" required /></div>
            <div className="space-y-2"><Label htmlFor="new-project-domain">Primary domain</Label><Input id="new-project-domain" value={newProject.domain} onChange={event => setNewProject({ ...newProject, domain: event.target.value })} placeholder="portal.example.com" required /></div>
            <div className="space-y-2"><Label htmlFor="new-project-type">Application type</Label><select id="new-project-type" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={newProject.type} onChange={event => setNewProject({ ...newProject, type: event.target.value as "frontend" | "backend" })}><option value="frontend">Frontend</option><option value="backend">Backend</option></select></div>
            <div className="space-y-2"><Label htmlFor="new-project-customer">Customer (optional)</Label><select id="new-project-customer" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={newProject.customerId} onChange={event => setNewProject({ ...newProject, customerId: event.target.value })}><option value="">No customer selected</option>{customers.data?.customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div>
            <SidePanelFooter className="sticky bottom-0 -mx-6 mt-2 border-t bg-background px-6 py-4"><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" disabled={createProject.isPending || !newProject.slug.trim() || !newProject.name.trim() || !newProject.domain.trim()}>{createProject.isPending ? "Creating…" : "Create and continue"}</Button></SidePanelFooter>
          </form>
        </SidePanelContent>
      </SidePanel>

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
