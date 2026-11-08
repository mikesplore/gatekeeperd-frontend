import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { AuthorizedHome, PermissionRoute } from "@/components/auth/PermissionGuard";
import { RouteErrorPage } from "@/components/RouteErrorPage";
import { useCan } from "@/hooks/usePermissions";
// Keep route modules in the initial app bundle. An already-open tab can then
// navigate after a deployment without requesting chunks removed with the prior build.
import { LandingPage } from "@/features/landing/LandingPage";
import { SupportPage } from "@/features/support/SupportPage";
import { CustomerPortalPage } from "@/features/support/CustomerPortalPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { ForgotPasswordPage, ResetPasswordPage } from "@/features/auth/PasswordResetPage";
import { ContainersPage } from "@/features/containers/ContainersPage";
import { ContainerDetailPage } from "@/features/containers/ContainerDetailPage";
import { NotFoundPage } from "@/features/NotFoundPage";
import { ProjectDetailPage } from "@/features/projects/ProjectDetailPage";
import { DashboardOverviewPage } from "@/features/dashboard/DashboardOverviewPage";
import { ServiceDetailPage } from "@/features/projects/ServiceDetailPage";
import { ProjectsListPage } from "@/features/projects/ProjectsListPage";
import { PaymentsPage } from "@/features/payments/PaymentsPage";
import { OperationsPage } from "@/features/operations/OperationsPage";
import { PaymentEventsPage } from "@/features/payments/PaymentEventsPage";
import { CertificatesPage } from "@/features/nginx/CertificatesPage";
import { NginxErrorLogsPage } from "@/features/nginx/NginxErrorLogsPage";
import { ProfileSettingsPage } from "@/features/settings/ProfileSettingsPage";
import { AdminUsersPage } from "@/features/settings/AdminUsersPage";
import { RolesPage } from "@/features/settings/RolesPage";
import { NetworkDetailPage } from "@/features/infrastructure/NetworkDetailPage";
import { VolumeDetailPage } from "@/features/infrastructure/VolumeDetailPage";
import { AuditPage } from "@/features/audit/AuditPage";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { DeadConfigsPage } from "@/features/dashboard/DeadConfigsPage";
import { SitesDashboardPage } from "@/features/dashboard/SitesDashboardPage";
import { SiteDetailPage } from "@/features/dashboard/SiteDetailPage";
import { CustomerDetailPage, CustomersPage } from "@/features/dashboard/CustomersPage";
import { SiteAdvancedConfigPage } from "@/features/nginx/SiteAdvancedConfigPage";
import { ProjectSetupWizardPage } from "@/features/projects/ProjectSetupWizardPage";
import { InfrastructureCredentialsPage } from "@/features/settings/InfrastructureCredentialsPage";
import { LogsPage } from "@/features/logs/LogsPage";
import { DockerResourcesPage } from "@/features/infrastructure/DockerResourcesPage";

const allow = (permission: string, element: React.ReactNode) => <PermissionRoute permission={permission}>{element}</PermissionRoute>;

const isSelfServiceHost = window.location.hostname === "selfservice.gatekeeperd.mikesplore.me";
function DashboardHomeRoute() {
  const canReadProjects = useCan("projects.read");
  return canReadProjects ? <DashboardOverviewPage /> : <AuthorizedHome />;
}

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteErrorPage />,
    children: [
  {
    index: true,
    element: isSelfServiceHost ? <CustomerPortalPage /> : <LandingPage />,
  },
  { path: "portal", element: <CustomerPortalPage /> },
  { path: "portal/:slug", element: <CustomerPortalPage /> },
  {
    path: "help",
    element: <SupportPage />,
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
          { index: true, element: <DashboardHomeRoute /> },
          { path: "projects", element: allow("projects.read", <ProjectsListPage />) },
          { path: "projects/setup", element: allow("projects.manage", <ProjectSetupWizardPage />) },
          { path: "projects/setup/:projectId", element: allow("projects.manage", <ProjectSetupWizardPage />) },
          { path: "projects/:slug/services/:serviceId", element: allow("services.read", <ServiceDetailPage />) },
          { path: "projects/:slug", element: allow("projects.read", <ProjectDetailPage />) },
          { path: "payments", element: allow("payments.read", <PaymentsPage />) },
          { path: "payments/events", element: allow("payments.read", <PaymentEventsPage />) },
          { path: "containers", element: allow("docker.read", <ContainersPage />) },
          { path: "containers/:name", element: allow("docker.read", <ContainerDetailPage />) },
          { path: "nginx", element: allow("nginx.read", <SitesDashboardPage />) },
          { path: "nginx/manage", element: <Navigate to="/app/nginx" replace /> },
          { path: "nginx/error-logs", element: allow("nginx.read", <NginxErrorLogsPage />) },
          { path: "nginx/certificates", element: allow("nginx.read", <CertificatesPage />) },
          { path: "nginx/sites/:slug", element: allow("nginx.read", <SiteDetailPage />) },
          { path: "nginx/dead-configs", element: allow("nginx.read", <DeadConfigsPage />) },
          { path: "nginx/sites/:slug/advanced", element: allow("nginx.read", <SiteAdvancedConfigPage />) },
          { path: "customers", element: allow("customers.read", <CustomersPage />) },
          { path: "customers/:id", element: allow("customers.read", <CustomerDetailPage />) },
          { path: "operations", element: allow("operations.read", <OperationsPage />) },
          { path: "logs", element: allow("logs.read", <LogsPage />) },
          { path: "audit", element: allow("audit.read", <AuditPage />) },
          { path: "notifications", element: allow("notifications.read", <NotificationsPage />) },
          { path: "settings/profile", element: <ProfileSettingsPage /> },
          { path: "credentials", element: allow("integrations.read", <InfrastructureCredentialsPage />) },
          { path: "settings/users", element: allow("users.read", <AdminUsersPage />) },
          { path: "settings/roles", element: allow("roles.read", <RolesPage />) },
          { path: "networks", element: allow("docker.read", <DockerResourcesPage kind="networks" />) },
          { path: "networks/:name", element: allow("docker.read", <NetworkDetailPage />) },
          { path: "volumes", element: allow("docker.read", <DockerResourcesPage kind="volumes" />) },
          { path: "volumes/:name", element: allow("docker.read", <VolumeDetailPage />) },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
