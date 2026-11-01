import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Activity, CheckCircle2, CircleAlert, CreditCard, FolderPlus, Link2, Lock, Pencil, Rocket, RotateCcw, Server, Trash2, Unlock, UserCog, XCircle } from "lucide-react";
import type { AuditAction, AuditLogEntry } from "@/types/audit";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 8;

const actionPresentation: Record<string, { label: string; icon: typeof Activity; color: string }> = {
  blocked: { label: "Access blocked", icon: Lock, color: "text-red-500 bg-red-500/10" },
  unblocked: { label: "Access restored", icon: Unlock, color: "text-emerald-500 bg-emerald-500/10" },
  payment_received: { label: "Payment received", icon: CreditCard, color: "text-blue-500 bg-blue-500/10" },
  manual_override: { label: "Manual override", icon: UserCog, color: "text-amber-500 bg-amber-500/10" },
  project_created: { label: "Project created", icon: FolderPlus, color: "text-violet-500 bg-violet-500/10" },
  project_updated: { label: "Project updated", icon: Pencil, color: "text-muted-foreground bg-muted" },
  deployment_activated: { label: "Deployment activated", icon: Rocket, color: "text-emerald-500 bg-emerald-500/10" },
  deployment_readiness_succeeded: { label: "Deployment passed checks", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
  deployment_failed: { label: "Deployment failed", icon: XCircle, color: "text-red-500 bg-red-500/10" },
  deployment_cutover_failed: { label: "Traffic switch failed", icon: CircleAlert, color: "text-red-500 bg-red-500/10" },
  deployment_rollback_activated: { label: "Rollback activated", icon: RotateCcw, color: "text-amber-500 bg-amber-500/10" },
  deployment_runtime_superseded: { label: "Previous runtime stopped", icon: Server, color: "text-muted-foreground bg-muted" },
  deployment_runtime_missing: { label: "Runtime needs attention", icon: CircleAlert, color: "text-amber-500 bg-amber-500/10" },
  deployment_cancelled: { label: "Deployment cancelled", icon: XCircle, color: "text-muted-foreground bg-muted" },
  deployment_deleted: { label: "Deployment deleted", icon: Trash2, color: "text-muted-foreground bg-muted" },
  deployment_candidate_cleaned_up: { label: "Unused runtime cleaned up", icon: Server, color: "text-muted-foreground bg-muted" },
  container_adopted: { label: "Container attached", icon: Server, color: "text-blue-500 bg-blue-500/10" },
  domain_binding_removed: { label: "Domain removed", icon: Link2, color: "text-muted-foreground bg-muted" },
  project_adjustment: { label: "Project adjustment", icon: CreditCard, color: "text-blue-500 bg-blue-500/10" },
};

function humanizeAction(action: AuditAction) {
  const known = actionPresentation[action];
  if (known) return known;
  return {
    label: action.replace(/[_-]+/g, " ").replace(/^\w/, letter => letter.toUpperCase()),
    icon: Activity,
    color: "text-muted-foreground bg-muted",
  };
}

function humanizeReason(reason?: string) {
  if (!reason) return undefined;
  const installation = reason.match(/event=installation\s+repository=([^\s]+)\s+queued=(\d+)/i);
  if (installation) {
    const repository = installation[1] === "unknown" ? "a GitHub repository" : installation[1];
    return `GitHub app installed on ${repository}${installation[2] === "0" ? "" : `; ${installation[2]} deployment${installation[2] === "1" ? "" : "s"} queued`}.`;
  }
  const labels: Record<string, string> = {
    deployment: "Deployment",
    previous: "Previous deployment",
    rolled_back_to: "Rolled back to",
    container: "Container",
    service: "Service",
    domain: "Domain",
    job: "Job",
    error: "Error",
  };
  const details = [...reason.matchAll(/([a-z_]+)=([^\s]+)/gi)]
    .map(([, key, value]) => {
      const label = labels[key] ?? key.replace(/[_-]+/g, " ").replace(/^\w/, letter => letter.toUpperCase());
      if (value === "none" || value === "unknown") return null;
      const readableValue = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value) ? value.slice(0, 8) : value;
      return `${label}: ${readableValue}`;
    })
    .filter((detail): detail is string => Boolean(detail));
  return details.length ? details.join(" · ") : reason;
}

interface AuditLogTimelineProps {
  entries: AuditLogEntry[];
}

export function AuditLogTimeline({ entries }: AuditLogTimelineProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No audit entries yet.</p>;
  }

  const visibleEntries = entries.slice(0, visibleCount);
  const remainingCount = entries.length - visibleEntries.length;

  return <div className="space-y-3">
    <ol className="space-y-2">
    {visibleEntries.map(entry => {
      const presentation = humanizeAction(entry.action);
      const Icon = presentation.icon;
      const reason = humanizeReason(entry.reason);
      return <li key={entry.id} className="flex gap-2.5 rounded-md border px-3 py-2.5">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${presentation.color}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="text-sm font-medium leading-5 text-foreground">{presentation.label}</span>
            <time className="text-[11px] text-muted-foreground" dateTime={entry.createdAt}>
              {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
            </time>
          </div>
          <p className="text-[11px] leading-4 text-muted-foreground">by {entry.actor}</p>
          {reason && <p className="break-words text-xs leading-4 text-foreground/80">{reason}</p>}
        </div>
      </li>;
    })}
    </ol>
    {remainingCount > 0 && <div className="flex justify-center pt-1"><Button variant="outline" size="sm" onClick={() => setVisibleCount(count => count + PAGE_SIZE)}>Load more</Button></div>}
  </div>;
}
