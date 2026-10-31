import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";

const LandingPage = lazy(() => import("@/features/landing/LandingPage").then((module) => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import("@/features/auth/LoginPage").then((module) => ({ default: module.LoginPage })));
const ForgotPasswordPage = lazy(() => import("@/features/auth/PasswordResetPage").then((module) => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("@/features/auth/PasswordResetPage").then((module) => ({ default: module.ResetPasswordPage })));
const ContainersPage = lazy(() => import("@/features/containers/ContainersPage").then((module) => ({ default: module.ContainersPage })));
const ContainerDetailPage = lazy(() => import("@/features/containers/ContainerDetailPage").then((module) => ({ default: module.ContainerDetailPage })));
const DashboardOverviewPage = lazy(() => import("@/features/dashboard/DashboardOverviewPage").then((module) => ({ default: module.DashboardOverviewPage })));
const NotFoundPage = lazy(() => import("@/features/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));
const ProjectDetailPage = lazy(() => import("@/features/projects/ProjectDetailPage").then((module) => ({ default: module.ProjectDetailPage })));
const ServiceDetailPage = lazy(() => import("@/features/projects/ServiceDetailPage").then((module) => ({ default: module.ServiceDetailPage })));
const ProjectsListPage = lazy(() => import("@/features/projects/ProjectsListPage").then((module) => ({ default: module.ProjectsListPage })));
const PaymentsPage = lazy(() => import("@/features/payments/PaymentsPage").then((module) => ({ default: module.PaymentsPage })));
const PaymentEventsPage = lazy(() => import("@/features/payments/PaymentEventsPage").then((module) => ({ default: module.PaymentEventsPage })));
const CertificatesPage = lazy(() => import("@/features/nginx/CertificatesPage").then((module) => ({ default: module.CertificatesPage })));
const OperationsPage = lazy(() => import("@/features/operations/OperationsPage").then((module) => ({ default: module.OperationsPage })));
const ProfileSettingsPage = lazy(() => import("@/features/settings/ProfileSettingsPage").then((module) => ({ default: module.ProfileSettingsPage })));
const AdminUsersPage = lazy(() => import("@/features/settings/AdminUsersPage").then((module) => ({ default: module.AdminUsersPage })));
const NetworkDetailPage = lazy(() => import("@/features/infrastructure/NetworkDetailPage").then((module) => ({ default: module.NetworkDetailPage })));
const VolumeDetailPage = lazy(() => import("@/features/infrastructure/VolumeDetailPage").then((module) => ({ default: module.VolumeDetailPage })));
const AuditPage = lazy(() => import("@/features/audit/AuditPage").then((module) => ({ default: module.AuditPage })));
const NotificationsPage = lazy(() => import("@/features/notifications/NotificationsPage").then((module) => ({ default: module.NotificationsPage })));
const DeadConfigsPage = lazy(() => import("@/features/dashboard/DeadConfigsPage").then((module) => ({ default: module.DeadConfigsPage })));
const SitesDashboardPage = lazy(() => import("@/features/dashboard/SitesDashboardPage").then((module) => ({ default: module.SitesDashboardPage })));
const SiteDetailPage = lazy(() => import("@/features/dashboard/SiteDetailPage").then((module) => ({ default: module.SiteDetailPage })));
const CustomerDetailPage = lazy(() => import("@/features/dashboard/CustomersPage").then((module) => ({ default: module.CustomerDetailPage })));
const CustomersPage = lazy(() => import("@/features/dashboard/CustomersPage").then((module) => ({ default: module.CustomersPage })));
const SiteAdvancedConfigPage = lazy(() => import("@/features/nginx/SiteAdvancedConfigPage").then((module) => ({ default: module.SiteAdvancedConfigPage })));
const ProjectSetupWizardPage = lazy(() => import("@/features/projects/ProjectSetupWizardPage").then((module) => ({ default: module.ProjectSetupWizardPage })));
const InfrastructureCredentialsPage = lazy(() => import("@/features/settings/InfrastructureCredentialsPage").then((module) => ({ default: module.InfrastructureCredentialsPage })));
const LogsPage = lazy(() => import("@/features/logs/LogsPage").then((module) => ({ default: module.LogsPage })));
const NetworkResourcesPage = lazy(() => import("@/features/infrastructure/DockerResourcesPage").then(({ DockerResourcesPage }) => ({ default: () => <DockerResourcesPage kind="networks" /> })));
const VolumeResourcesPage = lazy(() => import("@/features/infrastructure/DockerResourcesPage").then(({ DockerResourcesPage }) => ({ default: () => <DockerResourcesPage kind="volumes" /> })));

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
          { path: "projects/setup", element: <ProjectSetupWizardPage /> },
          { path: "projects/setup/:projectId", element: <ProjectSetupWizardPage /> },
          { path: "projects/:slug/services/:serviceId", element: <ServiceDetailPage /> },
          { path: "projects/:slug", element: <ProjectDetailPage /> },
          { path: "payments", element: <PaymentsPage /> },
          { path: "payments/events", element: <PaymentEventsPage /> },
          { path: "containers", element: <ContainersPage /> },
          { path: "containers/:name", element: <ContainerDetailPage /> },
          { path: "nginx", element: <SitesDashboardPage /> },
          { path: "nginx/manage", element: <Navigate to="/app/nginx" replace /> },
          { path: "nginx/certificates", element: <CertificatesPage /> },
          { path: "nginx/sites/:slug", element: <SiteDetailPage /> },
          { path: "nginx/dead-configs", element: <DeadConfigsPage /> },
          { path: "nginx/sites/:slug/advanced", element: <SiteAdvancedConfigPage /> },
          { path: "customers", element: <CustomersPage /> },
          { path: "customers/:id", element: <CustomerDetailPage /> },
          { path: "operations", element: <OperationsPage /> },
          { path: "logs", element: <LogsPage /> },
          { path: "audit", element: <AuditPage /> },
          { path: "notifications", element: <NotificationsPage /> },
          { path: "settings/profile", element: <ProfileSettingsPage /> },
          { path: "credentials", element: <InfrastructureCredentialsPage /> },
          { path: "settings/users", element: <AdminUsersPage /> },
          { path: "networks", element: <NetworkResourcesPage /> },
          { path: "networks/:name", element: <NetworkDetailPage /> },
          { path: "volumes", element: <VolumeResourcesPage /> },
          { path: "volumes/:name", element: <VolumeDetailPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
