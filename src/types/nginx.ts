export interface NginxStatus {
  enabled: boolean;
  configPath: string;
  enabledPath: string;
  port: number;
  sslEnabled: boolean;
  domain: string;
}

export interface EnableNginxPayload {
  port?: number;
  sslCertificatePath?: string;
  sslCertificateKeyPath?: string;
}

export interface EnableNginxResponse {
  success: boolean;
  message: string;
  config: string;
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

export interface CertificateStatusResponse {
  domain: string;
  installed: boolean;
  certificatePath: string | null;
  privateKeyPath: string | null;
}