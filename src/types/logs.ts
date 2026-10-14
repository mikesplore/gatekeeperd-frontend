export interface AdminLogEntry {
  id: string;
  timestamp: string;
  level: string;
  logger?: string | null;
  thread?: string | null;
  message: string;
  requestId?: string | null;
  stackTrace?: string | null;
}

export interface AdminLogSummary {
  scanned: number;
  errorLogs: number;
  warningLogs: number;
  requestCount: number;
  successfulRequests: number;
  failedRequests: number;
  successRate?: number | null;
  errorRate?: number | null;
}

export interface AdminLogsPage {
  logs: AdminLogEntry[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  truncated: boolean;
  summary: AdminLogSummary;
}
