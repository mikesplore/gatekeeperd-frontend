import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Payment } from "@/types/payment";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PaymentsHistoryTableProps {
  payments: Payment[];
  currency: string;
  projectSlug?: string;
}

export function PaymentsHistoryTable({ payments, currency, projectSlug }: PaymentsHistoryTableProps) {
  if (payments.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No payments yet.</p>;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider / reference</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Verified via</TableHead>
              <TableHead>Paid at</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{payment.provider}</Badge>
                  <p className="mt-1 font-mono text-xs">{payment.providerReference}</p>
                </TableCell>
                <TableCell>
                  {currency} {payment.amount.toLocaleString()}
                </TableCell>
                <TableCell>
                  <PaymentStatusBadge status={payment.gatewayStatus ?? payment.status} />
                </TableCell>
                <TableCell className="capitalize text-muted-foreground">
                  {payment.verifiedVia ?? "—"}
                </TableCell>
                <TableCell>
                  {payment.paidAt ? format(new Date(payment.paidAt), "MMM d, yyyy HH:mm") : "—"}
                </TableCell>
                <TableCell>
                  {payment.gatewayStatus === "success" && projectSlug && (
                    <Button asChild size="sm" variant="outline"><a href={`/api/customer/projects/${projectSlug}/payments/${payment.id}/receipt`} target="_blank" rel="noreferrer">Receipt</a></Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-3">
        {payments.map((payment) => (
          <div key={payment.id} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs truncate">{payment.paystackReference}</p>
              </div>
              <PaymentStatusBadge status={payment.gatewayStatus ?? payment.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
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
              {payment.gatewayStatus === "success" && projectSlug && (
                <Button asChild size="sm" variant="outline" className="col-span-2"><a href={`/api/customer/projects/${projectSlug}/payments/${payment.id}/receipt`} target="_blank" rel="noreferrer">View receipt</a></Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
