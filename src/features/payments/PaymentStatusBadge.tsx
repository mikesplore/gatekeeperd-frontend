import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GatewayStatus } from "@/types/payment";

const statusStyles: Record<GatewayStatus, string> = {
  success: "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15",
  pending: "bg-slate-500/15 text-slate-600 hover:bg-slate-500/15",
  failed: "bg-red-500/15 text-red-600 hover:bg-red-500/15",
  abandoned: "bg-amber-500/15 text-amber-600 hover:bg-amber-500/15",
  reversed: "bg-purple-500/15 text-purple-600 hover:bg-purple-500/15",
};

interface PaymentStatusBadgeProps {
  status: GatewayStatus | string;
  className?: string;
}

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  const key = status as GatewayStatus;
  const style = statusStyles[key] ?? statusStyles.pending;

  return (
    <Badge variant="secondary" className={cn("capitalize", style, className)}>
      {status}
    </Badge>
  );
}
