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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProjectStatusBadge } from "./ProjectStatusBadge";
import type { Project } from "@/types/project";

interface ProjectsTableProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onBlock: (project: Project) => void;
  onUnblock: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectsTable({ projects, onEdit, onBlock, onUnblock, onDelete }: ProjectsTableProps) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">
                  <Link to={`/app/projects/${project.slug}`} className="hover:underline">
                    {project.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{project.domain}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{project.type}</Badge>
                </TableCell>
                <TableCell>
                  <ProjectStatusBadge status={project.status} />
                </TableCell>
                <TableCell>{project.clientName ?? "—"}</TableCell>
                <TableCell>
                  {project.dueDate ? format(new Date(project.dueDate), "MMM d, yyyy") : "—"}
                </TableCell>
                <TableCell>
                  {project.amountDue != null
                    ? `${project.currency} ${project.amountDue.toLocaleString()}`
                    : "—"}
                </TableCell>
                <TableCell>
                  <ProjectActionsMenu
                    project={project}
                    onEdit={onEdit}
                    onBlock={onBlock}
                    onUnblock={onUnblock}
                    onDelete={onDelete}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-3">
        {projects.map((project) => (
          <div key={project.id} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                  <Link
                   to={`/app/projects/${project.slug}`}
                   className="font-medium hover:underline block truncate"
                 >
                  {project.name}
                </Link>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{project.domain}</p>
              </div>
              <ProjectActionsMenu
                project={project}
                onEdit={onEdit}
                onBlock={onBlock}
                onUnblock={onUnblock}
                onDelete={onDelete}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Status</span>
                <div className="mt-0.5">
                  <ProjectStatusBadge status={project.status} />
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Type</span>
                <div className="mt-0.5">
                  <Badge variant="secondary">{project.type}</Badge>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Client</span>
                <p className="truncate">{project.clientName ?? "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Due Date</span>
                <p>{project.dueDate ? format(new Date(project.dueDate), "MMM d, yyyy") : "—"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground">Amount</span>
                <p className="font-medium">
                  {project.amountDue != null
                    ? `${project.currency} ${project.amountDue.toLocaleString()}`
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
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