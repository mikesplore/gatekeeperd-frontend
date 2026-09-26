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
        { key: "project", header: "Project", searchable: true, searchValue: payment => `${payment.projectName} ${payment.projectSlug}`, render: payment => <button type="button" className="text-left font-medium text-primary hover:underline" onClick={() => navigate(`/app/projects/${payment.projectSlug}?tab=payments`)}>{payment.projectName}<span className="block text-xs font-normal text-muted-foreground">{payment.projectSlug}</span></button> },
        { key: "provider", header: "Provider", render: payment => <Badge variant="outline" className="capitalize">{payment.provider}</Badge> },
        { key: "reference", header: "Reference", render: payment => <span className="font-mono text-xs">{payment.paystackReference}</span> },
        { key: "amount", header: "Amount", render: payment => `${currency} ${payment.amount.toLocaleString()}` },
        { key: "status", header: "Status", render: payment => <PaymentStatusBadge status={payment.gatewayStatus} /> },
        { key: "verified", header: "Verified via", render: payment => payment.verifiedVia ?? "Not set" },
        { key: "paidAt", header: "Paid at", render: payment => payment.paidAt ? format(new Date(payment.paidAt), "MMM d, yyyy HH:mm") : "Not set" },
      ]}
    />
  );
}
