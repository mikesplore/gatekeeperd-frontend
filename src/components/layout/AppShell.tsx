import { Link, useLocation } from "react-router-dom";
import { Activity, Bell, CreditCard, Box, Container, FileClock, LayoutDashboard, LogOut, Menu, Moon, Sun, Server, Rocket, Settings, Network, Database } from "lucide-react";
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
import { useNotificationStream, useNotifications } from "@/hooks/useProjects";

const navGroups = [
  {
    label: "Overview",
    items: [{ to: "/app", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Manage",
    items: [
      { to: "/app/projects", label: "Projects", icon: Box },
      { to: "/app/payments", label: "Payments", icon: CreditCard },
    ],
  },
  {
    label: "Delivery",
    items: [
      { to: "/app/deployments", label: "Deployments", icon: Rocket },
      { to: "/app/nginx", label: "Nginx", icon: Server },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { to: "/app/containers", label: "Containers", icon: Container },
      { to: "/app/networks", label: "Networks", icon: Network },
      { to: "/app/volumes", label: "Volumes", icon: Database },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/app/operations", label: "Operations", icon: Activity },
      { to: "/app/audit", label: "Audit log", icon: FileClock },
      { to: "/app/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Account",
    items: [{ to: "/app/settings/profile", label: "Settings", icon: Settings }],
  },
];

const navItems = navGroups.flatMap(group => group.items);

function SidebarNav({ collapsed, onNav }: { collapsed?: boolean; onNav?: () => void }) {
  const location = useLocation();

  return (
    <nav className="space-y-4 p-2">
      {navGroups.map(group => <div key={group.label} className="space-y-1">
        {!collapsed && <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">{group.label}</p>}
        {group.items.map(({ to, label, icon: Icon }) => {
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
      </div>)}
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
  const notifications = useNotifications(10);
  useNotificationStream();
  const notificationItems = notifications.data ?? [];
  const notificationCount = notificationItems.length;

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
                      notificationItems.some(item => item.severity === "error") ? "bg-destructive" : "bg-primary",
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
                {notificationItems.slice(0, 5).map(item => <DropdownMenuItem key={item.id} asChild><Link to="/app/notifications" className="flex-col items-start gap-1 py-3"><span className={cn("font-medium capitalize", item.severity === "error" && "text-destructive")}>{item.title}</span><span className="line-clamp-2 text-xs text-muted-foreground">{item.message}</span></Link></DropdownMenuItem>)}
                {notificationCount === 0 && (
                  <div className="px-2 py-4 text-sm text-muted-foreground">No recent notifications.</div>
                )}
                {notificationCount > 5 && <DropdownMenuItem asChild><Link to="/app/notifications" className="justify-center text-xs text-primary">View all notifications</Link></DropdownMenuItem>}
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
                <DropdownMenuItem asChild><Link to="/app/settings/profile"><Settings className="h-4 w-4" />Profile settings</Link></DropdownMenuItem>
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
