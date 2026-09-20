import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { LandingPage } from "@/features/landing/LandingPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { ForgotPasswordPage, ResetPasswordPage } from "@/features/auth/PasswordResetPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { ContainersPage } from "@/features/containers/ContainersPage";
import { DashboardOverviewPage } from "@/features/dashboard/DashboardOverviewPage";
import { NotFoundPage } from "@/features/NotFoundPage";
import { ProjectDetailPage } from "@/features/projects/ProjectDetailPage";
import { ProjectsListPage } from "@/features/projects/ProjectsListPage";
import { PaymentsPage } from "@/features/payments/PaymentsPage";
import { NginxPage } from "@/features/nginx/NginxPage";
import { OperationsPage } from "@/features/operations/OperationsPage";
import { DeploymentsPage } from "@/features/deployments/DeploymentsPage";
import { ProfileSettingsPage } from "@/features/settings/ProfileSettingsPage";

export const router = createBrowserRouter([
  {
    index: true,
    element: <LandingPage />,
  },
  {
    path: "login",
    element: <LoginPage />,
  },
  { path: "forgot-password", element: <ForgotPasswordPage /> },
  { path: "reset-password", element: <ResetPasswordPage /> },
  {
    path: "app",
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardOverviewPage /> },
          { path: "projects", element: <ProjectsListPage /> },
          { path: "projects/:slug", element: <ProjectDetailPage /> },
          { path: "payments", element: <PaymentsPage /> },
          { path: "containers", element: <ContainersPage /> },
          { path: "nginx", element: <NginxPage /> },
          { path: "operations", element: <OperationsPage /> },
          { path: "deployments", element: <DeploymentsPage /> },
          { path: "settings/profile", element: <ProfileSettingsPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
