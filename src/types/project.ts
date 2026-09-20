export type ProjectType = "frontend" | "backend";
export type ProjectStatus = "active" | "blocked" | "manual_block";

export interface Project {
  id: string;
  slug: string;
  name: string;
  domain: string;
  containerName: string;
  type: ProjectType;
  status: ProjectStatus;
  blockReason?: string;
  deploymentMode: "developer_hosted" | "client_hosted" | "external_hosted";
  serviceMode: "development" | "testing" | "production";
  lifecycleStatus: "active" | "transferred" | "archived" | "cancelled";
  clientName?: string;
  clientEmail?: string;
  amountDue?: number;
  remainingBalance?: number;
  currency: string;
  dueDate?: string;
  gracePeriodDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetailResponse {
  project: Project;
  payments: import("./payment").Payment[];
  audit_log: import("./audit").AuditLogEntry[];
}

export interface ProjectHealthResponse {
  project: Project;
  container?: string | null;
  containerHealth?: string | null;
  nginxEnabled: boolean;
  certificateInstalled: boolean;
  readiness: string;
}

export interface CreateProjectPayload {
  slug: string;
  name: string;
  domain: string;
  containerName: string;
  type: ProjectType;
  clientName?: string;
  clientEmail?: string;
  amountDue?: number;
  dueDate?: string;
  gracePeriodDays: number;
}

export type UpdateProjectPayload = Partial<Omit<CreateProjectPayload, "slug">>;

export interface ProjectWizardContainer {
  id: string;
  name: string;
  image: string;
  state: string;
  ports: string;
  suggestedSlug: string;
}

export interface ProjectWizardContext {
  containers: ProjectWizardContainer[];
  existingProjectSlugs: string[];
}
