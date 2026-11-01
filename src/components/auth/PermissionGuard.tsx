import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/usePermissions";

export function Can({ permission, children }: { permission: string; children: React.ReactNode }) {
  return useCan(permission) ? <>{children}</> : null;
}

export function RequirePermission({ permission, children }: { permission: string; children: React.ReactNode }) {
  const allowed = useCan(permission);
  const location = useLocation();

  if (allowed) return <>{children}</>;
  return <section className="mx-auto mt-12 max-w-lg space-y-3 rounded-lg border p-6 text-center">
    <h1 className="text-lg font-semibold">Access denied</h1>
    <p className="text-sm text-muted-foreground">Your account does not have the <code>{permission}</code> permission.</p>
    <Button asChild variant="outline"><Link to="/app">Return to dashboard</Link></Button>
    <span className="sr-only">Requested {location.pathname}</span>
  </section>;
}

export function AuthorizedHome() {
  const permissions = useAuthStore(state => state.permissions);
  const destinations: [string, string][] = [
    ["operations.read", "/app/operations"],
    ["projects.read", "/app/projects"],
    ["payments.read", "/app/payments"],
    ["customers.read", "/app/customers"],
    ["services.read", "/app/projects"],
    ["deployments.read", "/app/projects"],
    ["nginx.read", "/app/nginx"],
    ["docker.read", "/app/containers"],
    ["audit.read", "/app/audit"],
    ["users.read", "/app/settings/users"],
    ["roles.read", "/app/settings/roles"],
  ];
  const destination = destinations.find(([permission]) => permissions.includes(permission))?.[1] ?? "/app/settings/profile";
  return <Navigate to={destination} replace />;
}

export function PermissionRoute({ permission, children }: { permission: string; children: React.ReactNode }) {
  return <RequirePermission permission={permission}>{children}</RequirePermission>;
}
