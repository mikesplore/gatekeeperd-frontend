import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types/project";

const statusStyles: Record<ProjectStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  blocked: "bg-red-500/15 text-red-600 border-red-500/20",
  manual_block: "bg-amber-500/15 text-amber-600 border-amber-500/20",
};

const statusLabels: Record<ProjectStatus, string> = {
  active: "Active",
  blocked: "Blocked",
  manual_block: "Manual Block",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", statusStyles[status])}>
      {statusLabels[status]}
    </Badge>
  );
}
