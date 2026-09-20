import { format } from "date-fns";
import { DataTable } from "@/components/common/DataTable";
import type { Payment } from "@/types/payment";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useReconcilePayment } from "@/hooks/useProjects";

interface PaymentsHistoryTableProps {
  payments: Payment[];
  currency: string;
  projectSlug?: string;
  receiptUrls?: Record<string, string>;
}

export function PaymentsHistoryTable({ payments, currency, projectSlug, receiptUrls = {} }: PaymentsHistoryTableProps) {
  const reconcile = useReconcilePayment();
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
            { key: "verifiedVia", header: "Verified via", render: (payment) => <span className="capitalize text-muted-foreground">{payment.verifiedVia ?? "—"}</span> },
            { key: "paidAt", header: "Paid at", render: (payment) => payment.paidAt ? format(new Date(payment.paidAt), "MMM d, yyyy HH:mm") : "—" },
            { key: "actions", header: "", render: (payment) => <>{payment.gatewayStatus === "success" && (receiptUrls[payment.providerReference] || (projectSlug && `/api/customer/projects/${projectSlug}/payments/${payment.id}/receipt`)) && <Button asChild size="sm" variant="outline"><a href={receiptUrls[payment.providerReference] || `/api/customer/projects/${projectSlug}/payments/${payment.id}/receipt`} target="_blank" rel="noreferrer">View receipt</a></Button>}{payment.gatewayStatus !== "success" && <Button size="sm" variant="ghost" disabled={reconcile.isPending} onClick={() => reconcile.mutate(payment.id, { onSuccess: (result) => toast.success(result.data?.reconciled ? "Payment reconciled" : "Provider still pending"), onError: () => toast.error("Unable to reconcile payment") })}>Reconcile</Button>}</> },
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
                <p className="capitalize">{payment.verifiedVia ?? "—"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground">Paid at</span>
                <p>{payment.paidAt ? format(new Date(payment.paidAt), "MMM d, yyyy HH:mm") : "—"}</p>
              </div>
              {payment.gatewayStatus === "success" && (receiptUrls[payment.providerReference] || (projectSlug && `/api/customer/projects/${projectSlug}/payments/${payment.id}/receipt`)) && (
                <Button asChild size="sm" variant="outline" className="col-span-2"><a href={receiptUrls[payment.providerReference] || `/api/customer/projects/${projectSlug}/payments/${payment.id}/receipt`} target="_blank" rel="noreferrer">View receipt</a></Button>
              )}
              {payment.gatewayStatus !== "success" && <Button size="sm" variant="outline" className="col-span-2" disabled={reconcile.isPending} onClick={() => reconcile.mutate(payment.id, { onSuccess: (result) => toast.success(result.data?.reconciled ? "Payment reconciled" : "Provider still pending"), onError: () => toast.error("Unable to reconcile payment") })}>Reconcile payment</Button>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
