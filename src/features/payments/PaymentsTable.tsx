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
  );
}
