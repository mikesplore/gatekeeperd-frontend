import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import type { PaymentRecord } from "@/types/payment";
import { PaymentStatusBadge } from "./PaymentStatusBadge";

interface PaymentsTableProps {
  payments: PaymentRecord[];
  currency?: string;
  toolbarContent?: ReactNode;
}

export function PaymentsTable({ payments, currency = "KES", toolbarContent }: PaymentsTableProps) {
  const navigate = useNavigate();

  return (
    <DataTable
      data={payments}
      getRowKey={payment => payment.id}
      pageSize={50}
      hidePagination
      searchPlaceholder="Search payments…"
      emptyMessage="No payments found."
      toolbarContent={toolbarContent}
      columns={[
        { key: "project", header: "Project", searchable: true, searchValue: payment => `${payment.projectName} ${payment.projectSlug}`, render: payment => <button type="button" className="block max-w-[14rem] truncate text-left font-medium text-primary hover:underline" title={payment.projectName} onClick={() => navigate(`/app/projects/${payment.projectSlug}?tab=payments`)}>{payment.projectName}</button> },
        { key: "provider", header: "Provider", render: payment => <Badge variant="outline" className="capitalize">{payment.provider}</Badge> },
        { key: "reference", header: "Reference", render: payment => <span className="block max-w-[12rem] truncate font-mono text-xs" title={payment.paystackReference}>{payment.paystackReference}</span> },
        { key: "amount", header: "Amount", render: payment => <span className="whitespace-nowrap">{currency} {payment.amount.toLocaleString()}</span> },
        { key: "status", header: "Status", render: payment => <PaymentStatusBadge status={payment.gatewayStatus} /> },
        { key: "verified", header: "Verified via", render: payment => <span className="text-muted-foreground">{payment.verifiedVia ?? "Not set"}</span> },
        { key: "paidAt", header: "Paid at", render: payment => <span className="whitespace-nowrap">{payment.paidAt ? format(new Date(payment.paidAt), "MMM d, yyyy HH:mm") : "Not set"}</span> },
      ]}
    />
  );
}
