import { Link, useLocation } from "react-router-dom";
import { useDashboardCustomer } from "@/hooks/useSiteDashboard";

const sections = [
  { to: "/app/projects", label: "Projects" },
  { to: "/app/customers", label: "Customers" },
  { to: "/app/payments", label: "Payments" },
  { to: "/app/nginx", label: "Nginx" },
  { to: "/app/containers", label: "Containers" },
  { to: "/app/networks", label: "Networks" },
  { to: "/app/volumes", label: "Volumes" },
  { to: "/app/operations", label: "Operations" },
  { to: "/app/audit", label: "Audit log" },
  { to: "/app/notifications", label: "Notifications" },
  { to: "/app/deployments", label: "Deployments" },
  { to: "/app/settings", label: "Settings" },
];

export function AppBreadcrumb() {
  const location = useLocation();
  const customerMatch = location.pathname.match(/^\/app\/customers\/([^/]+)/);
  const customerId = customerMatch?.[1] ?? "";
  const customer = useDashboardCustomer(customerId);
  const section = sections.find(item => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));
  const detail = location.pathname.match(/^\/app\/(projects|containers|networks|volumes|nginx\/sites)\/([^/]+)/)?.[2];
  const detailLabel = detail ? decodeURIComponent(detail) : null;

  if (customerMatch) {
    return <h1 className="flex items-center gap-2 text-sm font-semibold sm:text-base"><Link to="/app/customers" className="transition-colors hover:text-primary">Customers</Link><span className="text-muted-foreground/60">/</span><span className="max-w-48 truncate text-muted-foreground">{customer.isLoading ? "Loading…" : customer.data?.name ?? "Customer"}</span></h1>;
  }

  if (location.pathname === "/app") return <h1 className="text-sm font-semibold sm:text-base">Dashboard</h1>;
  const childLabel = location.pathname === "/app/nginx/dead-configs" ? "Dead configs" : detailLabel;
  return <h1 className="flex items-center gap-2 text-sm font-semibold sm:text-base"><Link to={section?.to ?? "/app"} className="transition-colors hover:text-primary">{section?.label ?? "Dashboard"}</Link>{childLabel && <><span className="text-muted-foreground/60">/</span><span className="max-w-48 truncate text-muted-foreground">{childLabel}</span></>}</h1>;
}
