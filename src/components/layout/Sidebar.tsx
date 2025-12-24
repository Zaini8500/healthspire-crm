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
  
  Settings,
  ChevronDown,
  Building2,
  Target,
  UserCheck,
  Clock,
  CreditCard,
  Folder,
  
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

  // 2. Clients
  { title: "Clients", href: "/clients", icon: Building2 },

  // 3. CRM
  {
    title: "CRM",
    href: "/crm",
    icon: Target,
    children: [
      { title: "Leads", href: "/crm/leads" },
    ],
  },

  // 4. HRM
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

  // 5. Projects
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    children: [
      { title: "Overview", href: "/projects" },
      { title: "Timeline", href: "/projects/timeline" },
      { title: "Project Requests", href: "/project-requests" },
    ],
  },

  // 6. Prospects
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

  // 7. Sales
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
  { title: "Tasks", href: "/tasks", icon: CheckSquare },
  { title: "Team Activity", href: "/tasks/activity", icon: Activity },
  { title: "Messages", href: "/messages", icon: MessageSquare },
  { title: "Announcements", href: "/announcements", icon: Megaphone },
  { title: "Subscriptions", href: "/subscriptions", icon: CreditCard },
  { title: "Calendar", href: "/calendar", icon: Calendar },
  { title: "Notes", href: "/notes", icon: StickyNote },
  { title: "Files", href: "/files", icon: Folder },

  // Extra groups requested: App Settings, Access Permission, Client portal, Sales & Prospects, Setup, Settings
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    children: [
      { title: "General", href: "/settings/general" },
      { title: "Localization", href: "/settings/localization" },
      { title: "Theme", href: "/settings/theme" },
      { title: "Email", href: "/settings/email" },
      { title: "Modules", href: "/settings/modules" },
      { title: "Menu", href: "/settings/left-menu" },
      { title: "Notifications", href: "/settings/notifications" },
      { title: "Integration", href: "/settings/integration" },
      { title: "System", href: "/settings/system" },
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
      { title: "Messages", href: "/client/messages" },
      { title: "Announcements", href: "/client/announcements" },
      { title: "Tickets", href: "/client/tickets" },
      { title: "Project Requests", href: "/client/project-requests" },
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
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onClose: () => void;
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

const API_BASE = (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname))
  ? "https://healthspire-crm.onrender.com"
  : "http://localhost:5000";

const normalizeAvatarSrc = (input: string) => {
  const s = String(input || "").trim();
  if (!s || s.startsWith("<")) return "/api/placeholder/64/64";
  try {
    const isAbs = /^https?:\/\//i.test(s);
    if (isAbs) {
      const u = new URL(s);
      if ((u.hostname === "localhost" || u.hostname === "127.0.0.1") && u.pathname.includes("/uploads/")) {
        return `${API_BASE}${u.pathname}`;
      }
      if (u.pathname.includes("/uploads/")) return `${API_BASE}${u.pathname}`;
      return s;
    }
    const rel = s.startsWith("/") ? s : `/${s}`;
    return `${API_BASE}${rel}`;
  } catch {
    const rel = s.startsWith("/") ? s : `/${s}`;
    return `${API_BASE}${rel}`;
  }
};

export function Sidebar({ collapsed, onToggle, mobileOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const me = getStoredAuthUser();
  const role = me?.role || "admin";
  const meName = String((me as any)?.name || "").trim();
  const meEmail = String(me?.email || "").trim();
  const meAvatar = String((me as any)?.avatar || "").trim();
  const meInitials = String(meName || meEmail || "U")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isAllowed = (item: NavItem) => {
    if (role === "admin") {
      // Hide Client portal from admin
      if (item.title === "Client portal") return false;
      return true;
    }

    if (role === "client") {
      const allowedTop = new Set([
        "Dashboard",
        "Client portal",
      ]);
      if (allowedTop.has(item.title)) return true;
      // Allow explicit portal paths even if the group title changes
      if (item.href?.startsWith("/client")) return true;
      return false;
    }

    // marketer
    if (role === "marketer") {
      const marketerTop = new Set([
        "Dashboard",
        "CRM",
        "HRM",
        "Projects",
        "Tasks",
        "Messages",
        "Announcements",
        "Calendar",
        "Notes",
        "Files",
      ]);
      if (marketerTop.has(item.title)) return true;
      // Hide admin configuration areas for marketers
      const blockedPrefixes = ["/settings", "/user-management", "/sales", "/prospects"];
      if (blockedPrefixes.some((p) => item.href?.startsWith(p))) return false;
      return false;
    }

    // staff (team member)
    const staffTop = new Set([
      "Dashboard",
      "HRM",
      "Projects",
      "Tasks",
      "Messages",
      "Announcements",
      "Calendar",
      "Notes",
      "Files",
    ]);
    if (staffTop.has(item.title)) return true;
    // Hide admin configuration areas and CRM for staff
    const blockedPrefixes = ["/settings", "/user-management", "/crm", "/sales", "/prospects"];
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
    <>
      {/* Mobile overlay */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 lg:hidden transition-opacity",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen bg-sidebar flex flex-col",
          "transition-transform duration-300 lg:transition-all",
          // width behavior
          collapsed ? "lg:w-[72px]" : "lg:w-64",
          "w-64",
          // mobile drawer translate
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
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
                      {item.children
                        .filter((child) => role === "admin" || child.href !== "/project-requests")
                        .map((child) => (
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
      <div className="p-4 border-t border-sidebar-border">
        {!collapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent">
              <div className="w-10 h-10 rounded-full bg-white border border-sidebar-border flex items-center justify-center font-semibold text-sidebar-foreground overflow-hidden">
                {meAvatar ? (
                  <img
                    src={normalizeAvatarSrc(String(meAvatar || ""))}
                    alt="User"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/api/placeholder/64/64"; }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{meInitials}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {meName || meEmail || "User"}
                </p>
                <p className="text-xs text-sidebar-muted truncate">
                  {role ? String(role).toUpperCase() : ""}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div />
        )}
      </div>
      </aside>
    </>
  );
}
