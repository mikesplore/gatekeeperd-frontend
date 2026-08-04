export interface NginxStatus {
  enabled: boolean;
  configPath: string;
  enabledPath: string;
  port: number;
  sslEnabled: boolean;
  certificateDomain: string | null;
  domain: string;
}

export interface NginxWizardContext {
  slug: string;
  domain: string;
  containerName: string | null;
  nginxEnabled: boolean;
  configuredContainerName: string | null;
  configuredPort: number | null;
  dockerContainerHealth: "running" | "exited" | "unknown" | null;
  dockerPublishedHostPorts: number[];
  installedCertificates: string[];
  resolvedCertificateDomain: string | null;
}

export interface EnableNginxPayload {
  port?: number;
  upstreamScheme?: "http" | "https";
  certificateDomain?: string;
  sslCertificatePath?: string;
  sslCertificateKeyPath?: string;
  requireSsl?: boolean;
}

export interface EnableNginxResponse {
  success: boolean;
  message: string;
  config: string;
  appPort: number;
  sslEnabled: boolean;
  certificateDomain: string | null;
}

export interface DisableNginxResponse {
  success: boolean;
  message: string;
}

export interface RemoveNginxResponse {
  success: boolean;
  message: string;
}

export interface InstallCertificatePayload {
  domain: string;
  email: string;
}

export interface CertificateInfo {
  certificateDomain: string;
  certificatePath: string;
  privateKeyPath: string;
}

export interface CertificateListResponse {
  certificates: CertificateInfo[];
}

export interface CertificateStatusResponse {
  domain: string;
  installed: boolean;
  certificatePath: string | null;
  privateKeyPath: string | null;
}