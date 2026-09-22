export type GatewayStatus = "pending" | "success" | "failed" | "abandoned" | "reversed";

export interface Payment {
  id: string;
  projectId: string;
  provider: "paystack" | "mpesa" | string;
  providerReference: string;
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
  provider: "paystack" | "mpesa" | string;
  providerReference: string;
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
  customerName?: string;
  customerEmail?: string;
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

export interface ProjectInvoiceStatus {
  invoice: { id: number; number: string; status: string; amount: string; currency: string; paid: string; balance: string; download_url?: string };
  payments: { id: number; provider: string; provider_reference: string; amount: string; currency: string; paid_at: string; receipt_number: string; receipt_url: string }[];
}

export interface PaymentsListResponse {
  payments: PaymentRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore?: boolean;
}
