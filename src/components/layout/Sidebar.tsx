import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderKanban,
  MessageSquare,
  Calendar,
  Mail,
  Settings,
  ChevronDown,
  Building2,
  Target,
  UserCheck,
  Clock,
  CreditCard,
  Folder,
  Video,
  CheckSquare,
  StickyNote,
  Activity,
  Shield,
  ChevronLeft,
  Megaphone,
  ShoppingCart,
  Anchor,
  BarChart3,
  Ticket,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  children?: { title: string; href: string }[];
}

const navigation: NavItem[] = [
  // 1. Dashboard
  { title: "Dashboard", href: "/", icon: LayoutDashboard },

  // 2. CRM
  {
    title: "CRM",
    href: "/crm",
    icon: Target,
    children: [
      { title: "Leads", href: "/crm/leads" },
    ],
  },

  // 3. HRM
  {
    title: "HRM",
    href: "/hrm",
    icon: Users,
    children: [
      { title: "Employees", href: "/hrm/employees" },
      { title: "Departments", href: "/hrm/departments" },
      { title: "Attendance", href: "/hrm/attendance" },
      { title: "Leaves", href: "/hrm/leaves" },
      { title: "Recruitment", href: "/hrm/recruitment" },
      { title: "Payroll", href: "/hrm/payroll" },
    ],
  },

  // 4. Projects
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    children: [
      { title: "Overview", href: "/projects" },
      { title: "Timeline", href: "/projects/timeline" },
    ],
  },

  // 5. Prospects
  {
    title: "Prospects",
    href: "/prospects",
    icon: Anchor,
    children: [
      { title: "Estimate List", href: "/prospects/estimates" },
      { title: "Estimate Requests", href: "/prospects/estimate-requests" },
      { title: "Estimate Forms", href: "/prospects/estimate-forms" },
      { title: "Proposals", href: "/prospects/proposals" },
    ],
  },

  // 6. Sales
  {
    title: "Sales",
    href: "/sales",
    icon: ShoppingCart,
    children: [
      { title: "Invoices", href: "/invoices" },
      { title: "Orders list", href: "/sales/orders" },
      { title: "Store", href: "/sales/store" },
      { title: "Payments", href: "/sales/payments" },
      { title: "Expenses", href: "/sales/expenses" },
      { title: "Items", href: "/sales/items" },
      { title: "Contracts", href: "/sales/contracts" },
    ],
  },

  // 7+. Rest
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Tickets", href: "/tickets", icon: Ticket },
  { title: "Events", href: "/events", icon: Calendar },
  { title: "Clients", href: "/clients", icon: Users },
  { title: "Tasks", href: "/tasks", icon: CheckSquare },
  { title: "Messages", href: "/messages", icon: MessageSquare },
  { title: "Announcements", href: "/announcements", icon: Megaphone },
  { title: "Subscriptions", href: "/subscriptions", icon: CreditCard },
  { title: "Calendar", href: "/calendar", icon: Calendar },
  { title: "Email", href: "/email", icon: Mail },
  { title: "Video Calls", href: "/calls", icon: Video },
  { title: "Notes", href: "/notes", icon: StickyNote },
  { title: "Files", href: "/files", icon: Folder },

  // Extra groups requested: App Settings, Access Permission, Client portal, Sales & Prospects, Setup, Plugins
  {
    title: "App Settings",
    href: "/settings",
    icon: Settings,
    children: [
      { title: "General", href: "/settings" },
      { title: "Localization", href: "/settings/localization" },
      { title: "Email", href: "/settings/email" },
      { title: "Email templates", href: "/settings/templates" },
      { title: "Modules", href: "/settings/modules" },
      { title: "Left menu", href: "/settings/left-menu" },
      { title: "Notifications", href: "/settings/notifications" },
      { title: "Integration", href: "/settings/integration" },
      { title: "Cron Job", href: "/settings/cron" },
      { title: "Updates", href: "/settings/updates" },
    ],
  },
  {
    title: "Access Permission",
    href: "/user-management",
    icon: Shield,
    children: [
      { title: "Roles & Permissions", href: "/user-management/roles" },
      { title: "Manage Users", href: "/user-management/users" },
    ],
  },
  {
    title: "Client portal",
    href: "/client",
    icon: Building2,
    children: [
      { title: "Portal Home", href: "/client" },
      { title: "Announcements", href: "/announcements" },
      { title: "Tickets", href: "/tickets" },
    ],
  },
  {
    title: "Sales & Prospects",
    href: "/sales-prospects",
    icon: Megaphone,
    children: [
      // Sales
      { title: "Invoices", href: "/invoices" },
      { title: "Orders", href: "/sales/orders" },
      { title: "Store", href: "/sales/store" },
      { title: "Payments", href: "/sales/payments" },
      { title: "Expenses", href: "/sales/expenses" },
      { title: "Items", href: "/sales/items" },
      { title: "Contracts", href: "/sales/contracts" },
      // Prospects
      { title: "Estimate List", href: "/prospects/estimates" },
      { title: "Estimate Requests", href: "/prospects/estimate-requests" },
      { title: "Estimate Forms", href: "/prospects/estimate-forms" },
      { title: "Proposals", href: "/prospects/proposals" },
    ],
  },
  {
    title: "Setup",
    href: "/setup",
    icon: CheckSquare,
    children: [
      { title: "Departments", href: "/hrm/departments" },
      { title: "Help Categories", href: "/help-support/categories" },
      { title: "KB Categories", href: "/help-support/knowledge-base/categories" },
    ],
  },
  {
    title: "Plugins",
    href: "/plugins",
    icon: Activity,
    children: [
      { title: "Email", href: "/email" },
      { title: "Video Calls", href: "/calls" },
      { title: "Calendar", href: "/calendar" },
    ],
  },

  // User Management just above Settings
  {
    title: "User Management",
    href: "/user-management",
    icon: Users,
    children: [
      { title: "Manage Users", href: "/user-management/users" },
      { title: "Roles & Permissions", href: "/user-management/roles" },
      { title: "Delete Request", href: "/user-management/delete-request" },
    ],
  },
  {
    title: "Help & Support",
    href: "/help-support",
    icon: HelpCircle,
    children: [
      { title: "Help", href: "/help-support/help" },
      { title: "Articles", href: "/help-support/articles" },
      { title: "Categories", href: "/help-support/categories" },
      { title: "Knowledge base: Articles", href: "/help-support/knowledge-base/articles" },
      { title: "Knowledge base: Categories", href: "/help-support/knowledge-base/categories" },
    ],
  },
  { title: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const getStoredAuthUser = (): { id?: string; _id?: string; email?: string; role?: string } | null => {
  const raw = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const role = getStoredAuthUser()?.role || "admin";

  const isAllowed = (item: NavItem) => {
    if (role === "admin") return true;

    if (role === "client") {
      const allowedTop = new Set([
        "Dashboard",
        "Messages",
        "Announcements",
        "Tickets",
        "Client portal",
      ]);
      if (allowedTop.has(item.title)) return true;
      // Allow explicit portal paths even if the group title changes
      if (item.href?.startsWith("/client")) return true;
      return false;
    }

    // staff
    const staffTop = new Set([
      "Dashboard",
      "CRM",
      "HRM",
      "Projects",
      "Clients",
      "Tasks",
      "Messages",
      "Announcements",
      "Calendar",
    ]);
    if (staffTop.has(item.title)) return true;
    // Hide admin configuration areas for staff
    const blockedPrefixes = ["/settings", "/user-management"];
    if (blockedPrefixes.some((p) => item.href?.startsWith(p))) return false;
    return false;
  };

  const visibleNavigation = navigation.filter(isAllowed);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 flex flex-col",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-3">
          {collapsed ? (
            <img src="/HealthSpire%20logo.png" alt="HealthSpire" className="h-12 w-12 rounded-lg object-contain" />
          ) : (
            <img src="/HealthSpire%20logo.png" alt="HealthSpire" className="h-12 w-auto max-w-[300px] object-contain" />
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <ChevronLeft
            className={cn(
              "w-4 h-4 transition-transform duration-300",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
        <ul className="space-y-1">
          {visibleNavigation.map((item) => (
            <li key={item.title}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleMenu(item.title)}
                    className={cn(
                      "sidebar-nav-item w-full justify-between",
                      isActive(item.href) && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span className="whitespace-nowrap">{item.title}</span>}
                    </span>
                    {!collapsed && (
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform",
                          openMenus.includes(item.title) && "rotate-180"
                        )}
                      />
                    )}
                  </button>
                  {!collapsed && openMenus.includes(item.title) && (
                    <ul className="mt-1 ml-6 space-y-1 border-l border-sidebar-border pl-4">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <NavLink
                            to={child.href}
                            className={({ isActive }) =>
                              cn(
                                "block py-2 px-3 text-sm rounded-md transition-colors",
                                isActive
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                  : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
                              )
                            }
                          >
                            {child.title}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <NavLink
                  to={item.href}
                  end={item.href === "/"}
                  className={({ isActive }) =>
                    cn(
                      "sidebar-nav-item",
                      isActive && "active"
                    )
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile */}
      {!collapsed && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-indigo flex items-center justify-center text-primary-foreground font-semibold">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                John Doe
              </p>
              <p className="text-xs text-sidebar-muted truncate">
                Administrator
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
