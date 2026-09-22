import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { LandingPage } from "@/features/landing/LandingPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { ForgotPasswordPage, ResetPasswordPage } from "@/features/auth/PasswordResetPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { ContainersPage } from "@/features/containers/ContainersPage";
import { ContainerDetailPage } from "@/features/containers/ContainerDetailPage";
import { DashboardOverviewPage } from "@/features/dashboard/DashboardOverviewPage";
import { NotFoundPage } from "@/features/NotFoundPage";
import { ProjectDetailPage } from "@/features/projects/ProjectDetailPage";
import { ProjectsListPage } from "@/features/projects/ProjectsListPage";
import { PaymentsPage } from "@/features/payments/PaymentsPage";
import { NginxPage } from "@/features/nginx/NginxPage";
import { OperationsPage } from "@/features/operations/OperationsPage";
import { DeploymentsPage } from "@/features/deployments/DeploymentsPage";
import { ProfileSettingsPage } from "@/features/settings/ProfileSettingsPage";
import { AdminUsersPage } from "@/features/settings/AdminUsersPage";
import { DockerResourcesPage } from "@/features/infrastructure/DockerResourcesPage";
import { NetworkDetailPage } from "@/features/infrastructure/NetworkDetailPage";
import { VolumeDetailPage } from "@/features/infrastructure/VolumeDetailPage";
import { AuditPage } from "@/features/audit/AuditPage";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { SitesDashboardPage } from "@/features/dashboard/SitesDashboardPage";
import { SiteDetailPage } from "@/features/dashboard/SiteDetailPage";
import { CustomerDetailPage, CustomersPage } from "@/features/dashboard/CustomersPage";
import { DeadConfigsPage } from "@/features/dashboard/DeadConfigsPage";

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
          { path: "containers/:name", element: <ContainerDetailPage /> },
          { path: "nginx", element: <SitesDashboardPage /> },
          { path: "nginx/manage", element: <NginxPage /> },
          { path: "nginx/sites/:slug", element: <SiteDetailPage /> },
          { path: "nginx/dead-configs", element: <DeadConfigsPage /> },
          { path: "customers", element: <CustomersPage /> },
          { path: "customers/:id", element: <CustomerDetailPage /> },
          { path: "operations", element: <OperationsPage /> },
          { path: "audit", element: <AuditPage /> },
          { path: "notifications", element: <NotificationsPage /> },
          { path: "deployments", element: <DeploymentsPage /> },
          { path: "settings/profile", element: <ProfileSettingsPage /> },
          { path: "settings/users", element: <AdminUsersPage /> },
          { path: "networks", element: <DockerResourcesPage kind="networks" /> },
          { path: "networks/:name", element: <NetworkDetailPage /> },
          { path: "volumes", element: <DockerResourcesPage kind="volumes" /> },
          { path: "volumes/:name", element: <VolumeDetailPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
