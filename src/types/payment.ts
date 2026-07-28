export interface Payment {
  id: string;
  projectId: string;
  paystackReference: string;
  amount: number;
  status: string;
  paidAt?: string;
  rawWebhookPayload?: string;
  createdAt: string;
}

export interface PaymentLinkResponse {
  payment_link: string;
}
