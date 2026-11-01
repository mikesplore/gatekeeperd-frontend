import { Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useCurrentUser } from "@/hooks/usePermissions";

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const session = useCurrentUser();

  useEffect(() => {
    if (session.isError) logout();
  }, [session.isError, logout]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (session.isError) return <Navigate to="/login" replace />;
  if (session.isLoading || !session.data) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Checking access…</div>;
  }

  return <Outlet />;
}
