// Audit actions are extensible: deployment and integration workflows add event names over time.
export type AuditAction = string;

export interface AuditLogEntry {
  id: string;
  projectId?: string;
  action: AuditAction;
  actor: string;
  reason?: string;
  createdAt: string;
}
