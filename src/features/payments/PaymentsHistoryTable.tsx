import { format } from "date-fns";
import { DataTable } from "@/components/common/DataTable";
import type { Payment } from "@/types/payment";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useReconcilePayment } from "@/hooks/useProjects";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface PaymentsHistoryTableProps {
  payments: Payment[];
  currency: string;
  projectSlug?: string;
  receiptUrls?: Record<string, string>;
  receiptNames?: Record<string, string>;
}

export function PaymentsHistoryTable({ payments, currency, projectSlug, receiptUrls = {}, receiptNames = {} }: PaymentsHistoryTableProps) {
  const reconcile = useReconcilePayment();
  const [receiptLoading, setReceiptLoading] = useState<string | null>(null);
  const openReceipt = async (payment: Payment) => {
    const receiptUrl = receiptUrls[payment.providerReference] || (projectSlug && `/api/customer/projects/${projectSlug}/payments/${payment.id}/receipt`);
    if (!receiptUrl) return;
    setReceiptLoading(payment.id);
    try {
      const response = await api.get(receiptUrl, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      const receiptName = receiptNames[payment.providerReference] || `receipt-${payment.providerReference}`;
      link.download = `${receiptName.replace(/[^a-zA-Z0-9._-]/g, "-")}.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error("Unable to download receipt");
    } finally {
      setReceiptLoading(null);
    }
  };
  if (payments.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No payments yet.</p>;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <DataTable data={payments} getRowKey={(payment) => payment.id}
          filters={[{ label: "Provider", options: [...new Set(payments.map((payment) => payment.provider))].map((value) => ({ label: value, value })), getValue: (payment) => payment.provider }, { label: "Status", options: [...new Set(payments.map((payment) => payment.gatewayStatus ?? payment.status))].map((value) => ({ label: value, value })), getValue: (payment) => payment.gatewayStatus ?? payment.status }]}
          columns={[
            { key: "reference", header: "Provider / reference", searchable: true, searchValue: (payment) => `${payment.provider} ${payment.providerReference}`, render: (payment) => <><Badge variant="outline" className="capitalize">{payment.provider}</Badge><p className="mt-1 font-mono text-xs">{payment.providerReference}</p></> },
            { key: "amount", header: "Amount", searchable: true, searchValue: (payment) => String(payment.amount), render: (payment) => `${currency} ${payment.amount.toLocaleString()}` },
            { key: "status", header: "Status", render: (payment) => <PaymentStatusBadge status={payment.gatewayStatus ?? payment.status} /> },
            { key: "verifiedVia", header: "Verified via", render: (payment) => <span className="capitalize text-muted-foreground">{payment.verifiedVia ?? "Not set"}</span> },
            { key: "paidAt", header: "Paid at", render: (payment) => payment.paidAt ? format(new Date(payment.paidAt), "MMM d, yyyy HH:mm") : "Not set" },
            { key: "actions", header: "", render: (payment) => <>{payment.gatewayStatus === "success" && (receiptUrls[payment.providerReference] || (projectSlug && `/api/customer/projects/${projectSlug}/payments/${payment.id}/receipt`)) && <Button size="sm" variant="outline" disabled={receiptLoading !== null} onClick={() => openReceipt(payment)}>{receiptLoading === payment.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{receiptLoading === payment.id ? "Downloading…" : "Download receipt"}</Button>}{payment.gatewayStatus !== "success" && <Button size="sm" variant="ghost" disabled={reconcile.isPending} onClick={() => reconcile.mutate(payment.id, { onSuccess: (result) => toast.success(result.data?.reconciled ? "Payment reconciled" : "Provider still pending"), onError: () => toast.error("Unable to reconcile payment") })}>Reconcile</Button>}</> },
          ]}
        />
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-3">
        {payments.map((payment) => (
          <div key={payment.id} className="rounded-lg border bg-card p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs truncate">{payment.paystackReference}</p>
              </div>
              <PaymentStatusBadge status={payment.gatewayStatus ?? payment.status} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Amount</span>
                <p className="font-medium">
                  {currency} {payment.amount.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Provider</span>
                <p className="capitalize">{payment.provider}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Verified via</span>
                <p className="capitalize">{payment.verifiedVia ?? "Not set"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground">Paid at</span>
                <p>{payment.paidAt ? format(new Date(payment.paidAt), "MMM d, yyyy HH:mm") : "Not set"}</p>
              </div>
              {payment.gatewayStatus === "success" && (receiptUrls[payment.providerReference] || (projectSlug && `/api/customer/projects/${projectSlug}/payments/${payment.id}/receipt`)) && (
                <Button size="sm" variant="outline" className="col-span-2" disabled={receiptLoading !== null} onClick={() => openReceipt(payment)}>{receiptLoading === payment.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{receiptLoading === payment.id ? "Downloading…" : "Download receipt"}</Button>
              )}
              {payment.gatewayStatus !== "success" && <Button size="sm" variant="outline" className="col-span-2" disabled={reconcile.isPending} onClick={() => reconcile.mutate(payment.id, { onSuccess: (result) => toast.success(result.data?.reconciled ? "Payment reconciled" : "Provider still pending"), onError: () => toast.error("Unable to reconcile payment") })}>Reconcile payment</Button>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
