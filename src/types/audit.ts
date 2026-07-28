export type AuditAction =
  | "blocked"
  | "unblocked"
  | "payment_received"
  | "manual_override"
  | "project_created"
  | "project_updated";

export interface AuditLogEntry {
  id: string;
  projectId?: string;
  action: AuditAction;
  actor: string;
  reason?: string;
  createdAt: string;
}
