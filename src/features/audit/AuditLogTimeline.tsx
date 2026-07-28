import { formatDistanceToNow } from "date-fns";
import { CreditCard, Lock, Unlock, UserCog, FolderPlus, Pencil } from "lucide-react";
import type { AuditAction, AuditLogEntry } from "@/types/audit";

const actionIcons: Record<AuditAction, React.ReactNode> = {
  blocked: <Lock className="h-4 w-4 text-red-500" />,
  unblocked: <Unlock className="h-4 w-4 text-emerald-500" />,
  payment_received: <CreditCard className="h-4 w-4 text-blue-500" />,
  manual_override: <UserCog className="h-4 w-4 text-amber-500" />,
  project_created: <FolderPlus className="h-4 w-4 text-violet-500" />,
  project_updated: <Pencil className="h-4 w-4 text-muted-foreground" />,
};

const actionLabels: Record<AuditAction, string> = {
  blocked: "Blocked",
  unblocked: "Unblocked",
  payment_received: "Payment received",
  manual_override: "Manual override",
  project_created: "Project created",
  project_updated: "Project updated",
};

interface AuditLogTimelineProps {
  entries: AuditLogEntry[];
}

export function AuditLogTimeline({ entries }: AuditLogTimelineProps) {
  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No audit entries yet.</p>;
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div key={entry.id} className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
            {actionIcons[entry.action]}
          </div>
          <div className="flex-1 space-y-1 pb-4 border-b last:border-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{actionLabels[entry.action]}</span>
              <span className="text-xs text-muted-foreground">by {entry.actor}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
              </span>
            </div>
            {entry.reason && <p className="text-sm text-muted-foreground">{entry.reason}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
