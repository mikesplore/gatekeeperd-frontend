export type ProjectType = "frontend" | "backend";
export type ProjectStatus = "active" | "blocked" | "manual_block";

export interface Project {
  id: string;
  slug: string;
  name: string;
  domain: string;
  type: ProjectType;
  status: ProjectStatus;
  blockReason?: string;
  deploymentMode: "developer_hosted" | "client_hosted" | "external_hosted";
  serviceMode: "development" | "testing" | "production";
  lifecycleStatus: "active" | "transferred" | "archived" | "cancelled";
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerId?: string;
  billingName?: string;
  billingEmail?: string;
  billingAddress?: string;
  amountDue?: number;
  baseAmount?: number;
  additionalCharges: number;
  discounts: number;
  successfulPayments: number;
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
  adjustments: ProjectAdjustment[];
}

export interface ProjectAdjustment { id: string; projectId: string; type: "ADDITIONAL_CHARGE" | "DISCOUNT"; amount: number; reason: string; actor: string; createdAt: string }

export interface ProjectHealthResponse {
  project: Project;
  runtimeHealth?: string | null;
  nginxEnabled: boolean;
  certificateInstalled: boolean;
  readiness: string;
}

export interface UpdateProjectPayload {
  name?: string; domain?: string; type?: ProjectType; billingName?: string; billingEmail?: string;
  billingAddress?: string; amountDue?: number; dueDate?: string; gracePeriodDays?: number;
  customerId?: string; currency?: string;
}

export interface ProjectSetupConfiguration {
  id: string; repository: string | null; gitRef: string; registry: string; imageName: string; imageTag: string;
  registryCredentialId?: string | null; containerPort?: number | null; hostPort?: number | null; network: string; restartPolicy: string; environment: string;
  env: Record<string, string>; envKeys: string[]; secretSetId?: string | null; secretSetVersion?: number | null;
}
export interface ProjectSetupStatus {
  projectId: string; slug: string; name: string; domain: string; sourceRuntime?: ProjectSetupConfiguration | null;
  credentialsConfigured: boolean; credentialVersion?: number | null;
  gateway?: { domain: string; tlsMode: string; gateEnabled: boolean; status: string } | null;
  activeDeploymentId?: string | null; activeDeploymentStatus?: string | null;
  latestDeploymentId?: string | null; latestDeploymentStatus?: string | null;
}
export interface AdoptableContainer {
  id: string; name: string; image: string; state: string; networks: string[];
  ports: Array<{ containerPort: number; hostPort: number }>;
  environmentVariableCount: number;
}
export interface ProjectOverview {
  projectId: string; slug: string; name: string; type: ProjectType;
  accessLifecycle: { accessStatus: string; blockReason?: string | null; deploymentMode: string; serviceMode: string; lifecycleStatus: string };
  desiredConfiguration: { configurationId?: string | null; environment?: string | null; repository?: string | null; gitRef?: string | null; registry?: string | null; imageName?: string | null; imageTag?: string | null; containerPort?: number | null; envKeys: string[]; secretSetId?: string | null; secretSetVersion?: number | null };
  currentDeployment: { id?: string | null; status: string; environment: string; triggerSource?: string | null; createdAt?: string | null; activeAt?: string | null; imageName?: string | null; imageTag?: string | null; imageDigest?: string | null; commitSha?: string | null; runtimeHealth: string; runtimeUpstreamHost?: string | null; runtimeUpstreamPort?: number | null; credentialSetId?: string | null; credentialSetVersion?: number | null; secretSetId?: string | null; secretSetVersion?: number | null };
  domainsGateway: { siteId?: string | null; domain: string; configured: boolean; tlsMode?: string | null; gateEnabled?: boolean | null; reconciliationStatus?: string | null; resolvedUpstreamHost?: string | null; resolvedUpstreamPort?: number | null };
  customerBilling: { customerId?: string | null; customerName?: string | null; customerEmail?: string | null; billingName?: string | null; billingEmail?: string | null; billingAddress?: string | null; currency: string; billed: number; paid: number; balance: number; dueDate?: string | null };
}

export interface ServiceAdminView { id: string; projectId: string; name: string; accessStatus: string; isDefault: boolean; blockReason?: string | null }
export interface EnvironmentVersionView { id: string; version: number; environment: string; keys: string[]; createdAt: string; createdBy?: string | null }
export interface SharedEnvironmentMetadata { projectId: string; environment: string; latest?: EnvironmentVersionView | null; versions: EnvironmentVersionView[]; values: "write-only" }
export interface ServiceEnvironmentMetadata { projectId: string; serviceId: string; environment: string; effectiveValues: Record<string, string> }
export interface ServiceActiveDeployment { deploymentId: string; status: string; containerName?: string | null; serviceId: string; environment: string; publishedPorts: Record<string, number>; imageName: string; imageTag: string; imageDigest?: string | null; commitSha?: string | null; activeAt?: string | null; sharedSetId?: string | null; sharedSetVersion?: number | null; serviceSetId?: string | null; serviceSetVersion?: number | null; variables: { key: string; source: string; fingerprint: string }[] }

export interface ProjectDeploymentHistoryItem {
  id: string; environment: string; sourceCommit?: string | null; imageName: string; imageTag: string;
  imageDigest?: string | null; trigger: string; actor?: string | null; status: string; createdAt: string;
  activeAt?: string | null; healthCheckResult: string; failureReason?: string | null;
  credentialSetId?: string | null; credentialSetVersion?: number | null;
  secretSetId?: string | null; secretSetVersion?: number | null; configurationId: string; actions: string[];
}

export interface ProviderCredentialMetadata {
  id: string; provider: "docker" | "github"; type: string; displayName: string; scope: string;
  version: number; current: boolean; rotatedAt?: string | null; rotatedBy?: string | null; createdAt: string;
}
