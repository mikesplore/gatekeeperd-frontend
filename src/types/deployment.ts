/** Canonical deployment history API types. */
export type CanonicalDeploymentStatus = "queued" | "building" | "starting" | "health-checking" | "ready" | "active" | "superseded" | "failed" | "cancelled" | "rolled-back";

export interface CanonicalDeploymentHistoryItem {
  id: string; projectId: string; projectSlug: string; projectName: string; environment: string;
  sourceCommit?: string | null; imageName: string; imageTag: string; imageDigest?: string | null;
  trigger: string; actor?: string | null; status: CanonicalDeploymentStatus; createdAt: string;
  activeAt?: string | null; healthCheckResult: string; failureReason?: string | null;
  credentialSetId?: string | null; credentialSetVersion?: number | null;
  secretSetId?: string | null; secretSetVersion?: number | null; actions: string[];
}

export interface DeploymentDriftItem {
  code: string;
  detail: string;
}

export interface ActiveDeploymentReconciliation {
  projectId: string;
  projectSlug?: string | null;
  environment: string;
  deploymentId: string;
  containerName?: string | null;
  expectedPorts: Record<string, number>;
  observedContainerState?: string | null;
  observedPorts?: string | null;
  gatewayTarget?: string | null;
  drift: DeploymentDriftItem[];
}

export interface DeploymentReconciliationReport {
  observedAt: string;
  status: string;
  entries: ActiveDeploymentReconciliation[];
  errors: string[];
  actionsTaken: string[];
}
