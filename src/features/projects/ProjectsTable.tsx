import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
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
}

export function ProjectsTable({ projects, selectedSlugs, onSelectionChange, onEdit, onBlock, onUnblock, onDelete, onCreate }: ProjectsTableProps) {
  const toggle = (slug: string) => onSelectionChange(selectedSlugs.includes(slug) ? selectedSlugs.filter(item => item !== slug) : [...selectedSlugs, slug]);
  return (
    <DataTable
      data={projects}
      getRowKey={project => project.id}
      pageSize={10}
      searchPlaceholder="Search by name, domain, or client…"
      emptyMessage="No projects found."
      emptyAction={{ label: "New Project", onClick: onCreate }}
      filters={[{ label: "Access", options: [{ label: "Active", value: "active" }, { label: "Blocked", value: "blocked" }, { label: "Manual block", value: "manual_block" }], getValue: project => project.status }]}
      columns={[
        { key: "select", header: "", render: project => <input aria-label={`Select ${project.name}`} type="checkbox" checked={selectedSlugs.includes(project.slug)} onChange={() => toggle(project.slug)} className="h-4 w-4 accent-primary" /> },
        { key: "name", header: "Name", searchable: true, render: project => <Link to={`/app/projects/${project.slug}`} className="font-medium hover:underline">{project.name}</Link> },
        { key: "domain", header: "Domain", searchable: true, render: project => <span className="text-muted-foreground">{project.domain || "Not configured"}</span> },
        { key: "type", header: "Type", render: project => <Badge variant="secondary">{project.type}</Badge> },
        { key: "access", header: "Access", render: project => <ProjectStatusBadge status={project.status} /> },
        { key: "lifecycle", header: "Lifecycle", render: project => <Badge variant="outline" className="text-[10px]">{project.lifecycleStatus}</Badge> },
        { key: "deployment", header: "Deployment", render: project => <Badge variant="secondary" className="text-[10px]">{project.deploymentMode.replace(/_/g, " ")}</Badge> },
        { key: "customer", header: "Customer", searchable: true, render: project => project.customerName ?? "Not set" },
        { key: "due", header: "Due date", render: project => project.dueDate ? format(new Date(project.dueDate), "MMM d, yyyy") : "Not set" },
        { key: "amount", header: "Remaining", render: project => project.remainingBalance != null ? `${project.currency} ${project.remainingBalance.toLocaleString()}` : project.amountDue != null ? `${project.currency} ${project.amountDue.toLocaleString()}` : "Not set" },
        { key: "actions", header: "", render: project => <ProjectActionsMenu project={project} onEdit={onEdit} onBlock={onBlock} onUnblock={onUnblock} onDelete={onDelete} /> },
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
