import { Link, useLocation } from "react-router-dom";
import { Activity, Bell, CreditCard, Box, Container, LayoutDashboard, LogOut, Menu, Moon, Sun, Server } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { api } from "@/lib/api";
import { useDashboardSummary } from "@/hooks/useProjects";

const navItems = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/projects", label: "Projects", icon: Box },
  { to: "/app/payments", label: "Payments", icon: CreditCard },
  { to: "/app/containers", label: "Containers", icon: Container },
  { to: "/app/nginx", label: "Nginx", icon: Server },
  { to: "/app/operations", label: "Operations", icon: Activity },
];

function SidebarNav({ collapsed, onNav }: { collapsed?: boolean; onNav?: () => void }) {
  const location = useLocation();

  return (
    <nav className="flex flex-col gap-1 p-2">
      {navItems.map(({ to, label, icon: Icon }) => {
        const active =
          to === "/app"
            ? location.pathname === "/app"
            : location.pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            onClick={onNav}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent",
              active && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell() {
  const location = useLocation();
  const email = useAuthStore((s) => s.email);
  const logout = useAuthStore((s) => s.logout);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dark = useThemeStore((s) => s.dark);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const { data: dashboardSummary } = useDashboardSummary();
  const deadLetters = dashboardSummary?.integrations.outboxDeadLetter ?? 0;
  const pendingIntegrations = (dashboardSummary?.integrations.outboxPending ?? 0) + (dashboardSummary?.integrations.outboxProcessing ?? 0);
  const notificationCount = deadLetters + pendingIntegrations;

  const initials = email?.slice(0, 2).toUpperCase() ?? "AD";
  const currentNav = navItems.find(({ to }) => to !== "/app" && location.pathname.startsWith(to)) ?? navItems[0];

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-56 border-r bg-sidebar text-sidebar-foreground transition-transform md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-14 items-center border-b border-sidebar-border px-4 font-semibold">Gatekeeperd</div>
        <SidebarNav onNav={() => setSidebarOpen(false)} />
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="text-sm font-semibold sm:text-base">{currentNav.label}</h1>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                  {notificationCount > 0 && (
                    <span className={cn(
                      "absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold text-white",
                      deadLetters > 0 ? "bg-destructive" : "bg-primary",
                    )}>
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="px-2 py-2">
                  <p className="text-sm font-semibold">Notifications</p>
                  <p className="text-xs text-muted-foreground">Operational events from Gatekeeperd</p>
                </div>
                <DropdownMenuSeparator />
                {deadLetters > 0 && (
                  <DropdownMenuItem asChild>
                    <Link to="/app/operations" className="flex-col items-start gap-1 py-3">
                      <span className="font-medium text-destructive">{deadLetters} failed integration {deadLetters === 1 ? "event" : "events"}</span>
                      <span className="text-xs text-muted-foreground">Review and replay dead-letter events.</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                {pendingIntegrations > 0 && (
                  <DropdownMenuItem asChild>
                    <Link to="/app/operations" className="flex-col items-start gap-1 py-3">
                      <span className="font-medium">{pendingIntegrations} integration {pendingIntegrations === 1 ? "event" : "events"} in progress</span>
                      <span className="text-xs text-muted-foreground">Pending delivery to connected services.</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                {notificationCount === 0 && (
                  <div className="px-2 py-4 text-sm text-muted-foreground">No active notifications.</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm sm:inline">{email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>{email}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    void api.post("/auth/revoke-refresh", { refreshToken });
                    logout();
                    window.location.href = "/login";
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <Separator />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
