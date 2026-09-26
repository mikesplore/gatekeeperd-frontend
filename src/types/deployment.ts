/** Canonical deployment history API types. */
export type CanonicalDeploymentStatus = "queued" | "building" | "starting" | "health-checking" | "active" | "superseded" | "failed" | "cancelled" | "rolled-back";

export interface CanonicalDeploymentHistoryItem {
  id: string; projectId: string; projectSlug: string; projectName: string; environment: string;
  sourceCommit?: string | null; imageName: string; imageTag: string; imageDigest?: string | null;
  trigger: string; actor?: string | null; status: CanonicalDeploymentStatus; createdAt: string;
  activeAt?: string | null; healthCheckResult: string; failureReason?: string | null;
  credentialSetId?: string | null; credentialSetVersion?: number | null;
  secretSetId?: string | null; secretSetVersion?: number | null; actions: string[];
}
