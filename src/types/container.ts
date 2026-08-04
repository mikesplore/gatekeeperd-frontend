export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string;
  created: string;
}

export interface VolumeMount {
  hostPath: string;
  containerPath: string;
  readOnly?: boolean;
}

export interface CreateContainerPayload {
  name?: string;
  projectSlug?: string;
  image: string;
  ports?: Record<string, number>;
  env?: Record<string, string>;
  network?: string;
  volumes?: VolumeMount[];
  restartPolicy?: "no" | "always" | "unless-stopped" | "on-failure";
  pullImage?: boolean;
  pullViaCli?: boolean;
}

export interface ImageStatusPayload {
  image: string;
}

export interface ImageStatusResponse {
  image: string;
  exists: boolean;
}

export interface PortsCheckPayload {
  hostPorts: number[];
}

export interface PortsCheckResponse {
  ok: boolean;
  conflicts: number[];
}

export interface ContainerWizardContext {
  internalNetwork: string;
  internalNetworkExists: boolean;
  networks: string[];
}

export interface ContainerValidateResponse {
  success: boolean;
  message: string;
  normalizedRequest: CreateContainerPayload;
  imageExists: boolean;
  willPullImage: boolean;
  networkExists: boolean;
  willCreateInternalNetworkIfMissing: boolean;
  portConflicts: number[];
  warnings: string[];
}

export interface CreateContainerResponse {
  id: string;
  name: string;
  status: string;
  ports: string;
}

export interface ContainerActionResponse {
  status: string;
  container: string;
}

export interface DeleteImagePayload {
  image: string;
  tag?: string;
  force?: boolean;
}

export interface DeleteImageResponse {
  status: string;
  image: string;
}