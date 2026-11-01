import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ProjectStatusBadge } from "./ProjectStatusBadge";
import type { Project } from "@/types/project";

interface ProjectsTableProps {
  projects: Project[];
  selectedSlugs: string[];
  onSelectionChange: (slugs: string[]) => void;
  onEdit: (project: Project) => void;
  onBlock: (project: Project) => void;
  onUnblock: (project: Project) => void;
  onDelete: (project: Project) => void;
  onCreate: () => void;
  canManage: boolean;
}

export function ProjectsTable({ projects, selectedSlugs, onSelectionChange, onEdit, onBlock, onUnblock, onDelete, onCreate, canManage }: ProjectsTableProps) {
  const toggle = (slug: string) => onSelectionChange(selectedSlugs.includes(slug) ? selectedSlugs.filter(item => item !== slug) : [...selectedSlugs, slug]);
  return (
    <DataTable
      data={projects}
      getRowKey={project => project.id}
      pageSize={10}
      searchPlaceholder="Search by name or client…"
      emptyMessage="No projects found."
      emptyAction={canManage ? { label: "New Project", onClick: onCreate } : undefined}
      filters={[{ label: "Access", options: [{ label: "Active", value: "active" }, { label: "Blocked", value: "blocked" }, { label: "Manual block", value: "manual_block" }], getValue: project => project.status }]}
      columns={[
        ...(canManage ? [{ key: "select", header: "", render: (project: Project) => <input aria-label={`Select ${project.name}`} type="checkbox" checked={selectedSlugs.includes(project.slug)} onChange={() => toggle(project.slug)} className="h-4 w-4 accent-primary" /> }] : []),
        { key: "name", header: "Name", searchable: true, render: project => <Link to={`/app/projects/${project.slug}`} className="font-medium hover:underline">{project.name}</Link> },
        { key: "type", header: "Type", render: project => <Badge variant="secondary">{project.type}</Badge> },
        { key: "access", header: "Access", render: project => <ProjectStatusBadge status={project.status} /> },
        { key: "lifecycle", header: "Lifecycle", render: project => <Badge variant="outline" className="text-[10px]">{project.lifecycleStatus}</Badge> },
        { key: "deployment", header: "Deployment", render: project => <Badge variant="secondary" className="text-[10px]">{project.deploymentMode.replace(/_/g, " ")}</Badge> },
        { key: "customer", header: "Customer", searchable: true, render: project => <span className="block max-w-[12rem] break-words">{project.customerName ?? "Not set"}</span> },
        ...(canManage ? [{ key: "actions", header: "", render: (project: Project) => <ProjectActionsMenu project={project} onEdit={onEdit} onBlock={onBlock} onUnblock={onUnblock} onDelete={onDelete} /> }] : []),
      ]}
    />
  );
}

function ProjectActionsMenu({
  project,
  onEdit,
  onBlock,
  onUnblock,
  onDelete,
}: {
  project: Project;
  onEdit: (p: Project) => void;
  onBlock: (p: Project) => void;
  onUnblock: (p: Project) => void;
  onDelete: (p: Project) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/app/projects/${project.slug}`}>View</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setOpen(false); onEdit(project); }}>Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        {project.status === "active" ? (
          <DropdownMenuItem onClick={() => { setOpen(false); onBlock(project); }}>Block</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => { setOpen(false); onUnblock(project); }}>Unblock</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => { setOpen(false); onDelete(project); }}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
