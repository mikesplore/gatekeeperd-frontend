import { formatDateTime } from "@/lib/datetime";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import type { PaymentRecord } from "@/types/payment";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { Button } from "@/components/ui/button";

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
        { key: "project", header: "Project", searchable: true, searchValue: payment => `${payment.projectName} ${payment.projectSlug}`, render: payment => <Button type="button" variant="link" className="block h-auto max-w-[14rem] truncate px-0 py-0 text-left font-medium" title={payment.projectName} onClick={() => navigate(`/app/projects/${payment.projectSlug}?tab=payments`)}>{payment.projectName}</Button> },
        { key: "provider", header: "Provider", render: payment => <Badge variant="outline" className="capitalize">{payment.provider}</Badge> },
        { key: "reference", header: "Reference", render: payment => <span className="block max-w-[12rem] truncate font-mono text-xs" title={payment.paystackReference}>{payment.paystackReference}</span> },
        { key: "amount", header: "Amount", render: payment => <span className="whitespace-nowrap">{currency} {payment.amount.toLocaleString()}</span> },
        { key: "status", header: "Status", render: payment => <PaymentStatusBadge status={payment.gatewayStatus} /> },
        { key: "verified", header: "Verified via", render: payment => <span className="text-muted-foreground">{payment.verifiedVia ?? "Not set"}</span> },
        { key: "paidAt", header: "Paid at", render: payment => <span className="whitespace-nowrap">{payment.paidAt ? formatDateTime(payment.paidAt) : "Not set"}</span> },
      ]}
    />
  );
}
