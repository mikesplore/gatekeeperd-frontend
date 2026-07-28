import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const isHydrating = useAuthStore((s) => s.isHydrating);

  if (isHydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading session…
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
