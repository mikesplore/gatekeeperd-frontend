import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryState } from "@/components/QueryState";
import { useProjects } from "@/hooks/useProjects";
import { BlockUnblockDialog } from "./BlockUnblockDialog";
import { DeleteProjectDialog } from "./DeleteProjectDialog";
import { ProjectFormDialog } from "./ProjectFormDialog";
import { ProjectsTable } from "./ProjectsTable";
import type { Project, ProjectStatus } from "@/types/project";

type StatusFilter = "all" | ProjectStatus;

export function ProjectsListPage() {
  const { data, isLoading, isError, error } = useProjects();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [blockTarget, setBlockTarget] = useState<{ project: Project; mode: "block" | "unblock" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.filter((p) => {
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.domain.toLowerCase().includes(q) ||
        (p.clientName?.toLowerCase().includes(q) ?? false);
      return matchesStatus && matchesSearch;
    });
  }, [data, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage client projects and access control.</p>
        </div>
        <Button onClick={() => { setEditProject(null); setFormOpen(true); }} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="overflow-x-auto -mx-1 px-1">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="all" className="flex-1 sm:flex-none">All</TabsTrigger>
              <TabsTrigger value="active" className="flex-1 sm:flex-none">Active</TabsTrigger>
              <TabsTrigger value="blocked" className="flex-1 sm:flex-none">Blocked</TabsTrigger>
              <TabsTrigger value="manual_block" className="flex-1 sm:flex-none">Manual Block</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Input
          placeholder="Search by name, domain, or client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-sm"
        />
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
            {() =>
              filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <p className="text-muted-foreground">No projects found.</p>
                  <Button onClick={() => { setEditProject(null); setFormOpen(true); }}>
                    <Plus className="h-4 w-4" />
                    New Project
                  </Button>
                </div>
              ) : (
                <ProjectsTable
                  projects={filtered}
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