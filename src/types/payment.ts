export type GatewayStatus = "pending" | "success" | "failed" | "abandoned" | "reversed";

export interface Payment {
  id: string;
  projectId: string;
  paystackReference: string;
  amount: number;
  status: string;
  gatewayStatus: GatewayStatus;
  verifiedVia?: "webhook" | "reconciliation" | "manual";
  paidAt?: string;
  rawWebhookPayload?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  projectId: string;
  projectName: string;
  projectSlug: string;
  paystackReference: string;
  amount: number;
  gatewayStatus: GatewayStatus;
  verifiedVia?: "webhook" | "reconciliation" | "manual";
  paidAt?: string;
  createdAt: string;
}

export interface OverdueProject {
  slug: string;
  name: string;
  clientName?: string;
  clientEmail?: string;
  dueDate: string;
  daysOverdue: number;
  gracePeriodDays: number;
  willAutoBlockOn: string;
  amountDue: number;
}

export interface RevenueReport {
  totalThisMonth: number;
  totalLastMonth: number;
  currency: string;
  byMonth: { month: string; amount: number }[];
}

export interface PaymentLinkResponse {
  payment_link: string;
}

export interface PaymentsListResponse {
  payments: PaymentRecord[];
  total: number;
  limit: number;
  offset: number;
}
