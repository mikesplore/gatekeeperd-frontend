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
  name: string;
  image: string;
  ports: Record<string, number>;
  env?: Record<string, string>;
  network?: string;
  volumes?: VolumeMount[];
  restartPolicy?: "no" | "always" | "unless-stopped" | "on-failure";
  pullImage?: boolean;
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