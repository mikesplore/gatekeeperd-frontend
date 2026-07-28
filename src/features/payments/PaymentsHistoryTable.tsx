import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Payment } from "@/types/payment";

interface PaymentsHistoryTableProps {
  payments: Payment[];
  currency: string;
}

export function PaymentsHistoryTable({ payments, currency }: PaymentsHistoryTableProps) {
  if (payments.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No payments yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Reference</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Paid at</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell className="font-mono text-xs">{payment.paystackReference}</TableCell>
            <TableCell>
              {currency} {payment.amount.toLocaleString()}
            </TableCell>
            <TableCell>{payment.status}</TableCell>
            <TableCell>
              {payment.paidAt ? format(new Date(payment.paidAt), "MMM d, yyyy HH:mm") : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
