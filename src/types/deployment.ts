export type DeploymentStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "rolled_back";

export interface DeploymentJob {
  id: string;
  repository: string;
  gitRef: string;
  registry: string;
  imageName: string;
  imageTag: string;
  status: DeploymentStatus;
  currentStep?: string | null;
  logs?: string | null;
  commitSha?: string | null;
  imageDigest?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt: string;
}

export interface DeploymentAuditEntry {
  id: string;
  projectId?: string | null;
  action: string;
  actor: string;
  reason?: string | null;
  createdAt: string;
}

export interface CreateDeploymentPayload {
  repository: string;
  gitRef: string;
  registry: string;
  imageName: string;
  imageTag: string;
  containerName?: string;
  hostPort?: number;
  containerPort?: number;
  network?: string;
  restartPolicy?: string;
  projectSlug?: string;
}

