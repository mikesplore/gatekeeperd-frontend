import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PaymentRecord } from "@/types/payment";
import { PaymentStatusBadge } from "./PaymentStatusBadge";

interface PaymentsTableProps {
  payments: PaymentRecord[];
  currency?: string;
}

export function PaymentsTable({ payments, currency = "KES" }: PaymentsTableProps) {
  const navigate = useNavigate();

  if (payments.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No payments found.</p>;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Verified via</TableHead>
              <TableHead>Paid at</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow
                key={payment.id}
                className="cursor-pointer"
                onClick={() => navigate(`/projects/${payment.projectSlug}?tab=payments`)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium">{payment.projectName}</p>
                    <p className="text-xs text-muted-foreground">{payment.projectSlug}</p>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{payment.paystackReference}</TableCell>
                <TableCell>
                  {currency} {payment.amount.toLocaleString()}
                </TableCell>
                <TableCell>
                  <PaymentStatusBadge status={payment.gatewayStatus} />
                </TableCell>
                <TableCell className="capitalize text-muted-foreground">
                  {payment.verifiedVia ?? "—"}
                </TableCell>
                <TableCell>
                  {payment.paidAt ? format(new Date(payment.paidAt), "MMM d, yyyy HH:mm") : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-3">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="rounded-lg border bg-card p-4 shadow-sm cursor-pointer active:bg-muted/50"
            onClick={() => navigate(`/projects/${payment.projectSlug}?tab=payments`)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{payment.projectName}</p>
                <p className="text-xs text-muted-foreground truncate">{payment.projectSlug}</p>
              </div>
              <PaymentStatusBadge status={payment.gatewayStatus} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Amount</span>
                <p className="font-medium">
                  {currency} {payment.amount.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Reference</span>
                <p className="font-mono text-xs truncate">{payment.paystackReference}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Verified via</span>
                <p className="capitalize">{payment.verifiedVia ?? "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Paid at</span>
                <p>{payment.paidAt ? format(new Date(payment.paidAt), "MMM d, HH:mm") : "—"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}