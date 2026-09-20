export interface DashboardSummary {
  generatedAt: string;
  projects: Record<string, number>;
  payments: Record<string, number>;
  revenue: { thisMonth: string; lastMonth: string };
  integrations: {
    outboxPending: number;
    outboxProcessing: number;
    outboxDeadLetter: number;
    outboxDelivered: number;
  };
  nginx: { availableSites: number; enabledSites: number };
  metrics: Record<string, number>;
}

export interface IntegrationOutboxEvent {
  id: string;
  eventType: string;
  idempotencyKey: string;
  payload: string;
  attempts: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error";
  action: string;
  createdAt: string;
  read: boolean;
}
