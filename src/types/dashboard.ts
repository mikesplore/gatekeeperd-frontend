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
