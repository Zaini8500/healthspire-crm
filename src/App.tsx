import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { MessagingProvider } from "@/contexts/MessagingContext";
import Dashboard from "./pages/Dashboard";
import ClientDashboard from "./pages/dashboard/ClientDashboard";
import TeamMemberDashboard from "./pages/dashboard/TeamMemberDashboard";
import MarketerDashboard from "./pages/dashboard/MarketerDashboard";
import ClientTickets from "./pages/client/ClientTickets";
import ClientTicketDetails from "./pages/client/ClientTicketDetails";
import ClientAnnouncements from "./pages/client/ClientAnnouncements";
import ClientMessages from "./pages/client/ClientMessages.tsx";
import ClientProjectRequests from "./pages/client/ProjectRequests";
import Events from "./pages/events/Events";
import Clients from "./pages/clients/Clients";
import ClientDetails from "./pages/clients/ClientDetails";
import PrimaryContact from "./pages/clients/PrimaryContact";
import Leads from "./pages/crm/Leads";
import LeadDetails from "./pages/crm/LeadDetails";
import Contacts from "./pages/crm/Contacts";
import ContactProfile from "./pages/crm/ContactProfile";
import Companies from "./pages/crm/Companies";
import Pipeline from "./pages/crm/Pipeline";
import Employees from "./pages/hrm/Employees";
import EmployeeProfile from "./pages/hrm/EmployeeProfile";
import Attendance from "./pages/hrm/Attendance";
import Leave from "./pages/hrm/Leave";
import Payroll from "./pages/hrm/Payroll";
import Recruitment from "./pages/hrm/Recruitment";
import Departments from "./pages/hrm/Departments";
import Announcements from "./pages/announcements/Announcements";
import AddAnnouncement from "./pages/announcements/AddAnnouncement";
import AnnouncementView from "./pages/announcements/AnnouncementView";
import Subscriptions from "./pages/subscriptions/Subscriptions";
import SubscriptionDetails from "./pages/subscriptions/SubscriptionDetails";
import Messaging from "./pages/messaging";
import Orders from "./pages/sales/Orders";
import Store from "./pages/sales/Store";
import Checkout from "./pages/sales/Checkout";
import OrderDetailPage from "./pages/sales/OrderDetailPage";
import Payments from "./pages/sales/Payments";
import Items from "./pages/sales/Items";
import Contracts from "./pages/sales/Contracts";
import Expenses from "./pages/sales/Expenses";
import EstimateList from "./pages/prospects/EstimateList";
import EstimateDetail from "./pages/prospects/EstimateDetail";
import EstimateRequests from "./pages/prospects/EstimateRequests";
import EstimateForms from "./pages/prospects/EstimateForms";
import Proposals from "./pages/prospects/Proposals";
import ProposalDetail from "./pages/prospects/ProposalDetail";
import ManageUsers from "./pages/user-management/ManageUsers";
import RolesPermissions from "./pages/user-management/RolesPermissions";
import DeleteRequest from "./pages/user-management/DeleteRequest";
import InvoicesSummary from "./pages/reports/sales/InvoicesSummary";
import IncomeVsExpenses from "./pages/reports/finance/IncomeVsExpenses";
import ExpensesSummary from "./pages/reports/finance/ExpensesSummary";
import PaymentsSummary from "./pages/reports/finance/PaymentsSummary";
import TimesheetsReport from "./pages/reports/timesheets/Timesheets";
import ProjectsTeamMembers from "./pages/reports/projects/TeamMembers";
import ProjectsClients from "./pages/reports/projects/Clients";
import LeadsConversions from "./pages/reports/leads/Conversions";
import LeadsTeamMembers from "./pages/reports/leads/TeamMembers";
import TicketsStatistics from "./pages/reports/tickets/Statistics";
import Tickets from "./pages/tickets/Tickets";
import TicketDetails from "./pages/tickets/TicketDetails";
import Files from "./pages/files/Files";
import Notes from "./pages/notes/Notes";
import HelpSupportHelp from "./pages/help-support/Help";
import HelpSupportArticles from "./pages/help-support/Articles";
import HelpSupportCategories from "./pages/help-support/Categories";
import KnowledgeBaseArticles from "./pages/help-support/knowledge-base/Articles";
import KnowledgeBaseCategories from "./pages/help-support/knowledge-base/Categories";
import CalendarPage from "./pages/calendar/Calendar";
import Overview from "./pages/projects/Overview";

import Timeline from "./pages/projects/Timeline";
import ProjectDashboard from "./pages/projects/ProjectDashboard";
import ProjectOverviewPage from "./pages/projects/ProjectOverview";
import Chat from "./pages/messages/Chat";
import InvoiceList from "./pages/invoices/InvoiceList";
import InvoiceDetailPage from "./pages/invoices/InvoiceDetailPage";
import InvoicePreview from "./pages/invoices/InvoicePreview";
import EstimatePreview from "./pages/prospects/EstimatePreview";
import Tasks from "./pages/tasks/Tasks";
import TaskDetails from "./pages/tasks/TaskDetails";
import NotFound from "./pages/NotFound";
import SettingsPage from "./pages/settings/Settings";
import AuthLayout from "./pages/auth/AuthLayout";

const queryClient = new QueryClient();

const getStoredAuthUser = (): { id?: string; _id?: string; email?: string; role?: string; permissions?: string[] } | null => {
  const raw = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const normalizePerms = (p?: any): Set<string> => {
  const out = new Set<string>();
  if (Array.isArray(p)) {
    for (const x of p) {
      const s = String(x || "").trim();
      if (s) out.add(s);
    }
  }
  return out;
};

const getModuleFromPath = (pathname: string): string => {
  if (pathname.startsWith("/crm")) return "crm";
  if (pathname.startsWith("/hrm")) return "hrm";
  if (pathname.startsWith("/projects")) return "projects";
  if (pathname.startsWith("/prospects")) return "prospects";
  if (pathname.startsWith("/sales") || pathname.startsWith("/invoices")) return "sales";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/tickets")) return "tickets";
  if (pathname.startsWith("/events")) return "events";
  if (pathname.startsWith("/clients")) return "clients";
  if (pathname.startsWith("/tasks")) return "tasks";
  if (pathname.startsWith("/messages") || pathname.startsWith("/messaging") || pathname.startsWith("/email") || pathname.startsWith("/calls")) return "messages";
  if (pathname.startsWith("/announcements")) return "announcements";
  if (pathname.startsWith("/subscriptions")) return "subscriptions";
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/notes")) return "notes";
  if (pathname.startsWith("/files")) return "files";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/user-management")) return "user_management";
  if (pathname.startsWith("/client")) return "client_portal";
  if (pathname === "/") return "dashboard";
  return "other";
};

const RoleGuard = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const user = getStoredAuthUser();
  const role = user?.role || "admin";
  const perms = normalizePerms(user?.permissions);
  const moduleKey = getModuleFromPath(location.pathname);

  if (role === "admin") return <>{children}</>;

  if (role === "client") {
    const allowed = new Set(["client_portal", "messages", "dashboard"]);
    if (allowed.has(moduleKey)) return <>{children}</>;
    return <Navigate to="/client" replace />;
  }

  // staff (including marketer)
  const staffDefault = new Set(["dashboard", "messages", "announcements", "calendar", "tasks"]);
  if (staffDefault.has(moduleKey)) return <>{children}</>;
  if (perms.has(moduleKey)) return <>{children}</>;
  return <Navigate to="/" replace />;
};

const InvoicePreviewAccess = () => {
  const hasToken = Boolean(localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token"));
  const location = useLocation();
  const sp = new URLSearchParams(location.search || "");
  const isPrintMode = sp.get("print") === "1";
  const isPdfMode = sp.get("mode") === "pdf";
  return hasToken || isPrintMode || isPdfMode ? <InvoicePreview /> : <Navigate to="/auth" replace />;
};

const EstimatePreviewAccess = () => {
  const hasToken = Boolean(localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token"));
  const location = useLocation();
  const sp = new URLSearchParams(location.search || "");
  const isPrintMode = sp.get("print") === "1";
  const isPdfMode = sp.get("mode") === "pdf";
  return hasToken || isPrintMode || isPdfMode ? <EstimatePreview /> : <Navigate to="/auth" replace />;
};

const DashboardByRole = () => {
  const user = getStoredAuthUser();
  const role = user?.role || "admin";
  
  switch (role) {
    case "client":
      return <ClientDashboard />;
    case "marketer":
      return <MarketerDashboard />;
    case "staff":
      return <TeamMemberDashboard />;
    default:
      return <Dashboard />;
  }
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
<<<<<<< HEAD
      <MessagingProvider>
        <BrowserRouter future={{ v7_relativeSplatPath: true }}>
          <Routes>
=======
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <Routes>
>>>>>>> 730fa665efcb7325c76fac1f1d5c841e9f138166
          {/* Public auth route */}
          <Route path="/auth" element={<AuthLayout />} />

          {/* Public/print-safe invoice preview */}
          <Route path="/invoices/:id/preview" element={<InvoicePreviewAccess />} />

          {/* Public/print-safe estimate preview */}
          <Route path="/prospects/estimates/:id/preview" element={<EstimatePreviewAccess />} />

          {/* Protected app */}
          <Route
            element={
              (localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token"))
                ? (
                  <RoleGuard>
                    <MainLayout />
                  </RoleGuard>
                )
                : <Navigate to="/auth" replace />
            }
          >
            <Route path="/" element={<DashboardByRole />} />
            <Route path="/events" element={<Events />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetails />} />
            <Route path="/clients/:id/primary-contact" element={<PrimaryContact />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/:id" element={<TaskDetails />} />
            {/* CRM Routes */}
            <Route path="/crm/leads" element={<Leads />} />
            <Route path="/crm/leads/:id" element={<LeadDetails />} />
            <Route path="/crm/pipeline" element={<Pipeline />} />
            <Route path="/crm/contacts" element={<Contacts />} />
            <Route path="/crm/contacts/:id" element={<ContactProfile />} />
            <Route path="/crm/companies" element={<Companies />} />
            {/* HRM Routes */}
            <Route path="/hrm/employees" element={<Employees />} />
            <Route path="/hrm/employees/:id" element={<EmployeeProfile />} />
            <Route path="/hrm/departments" element={<Departments />} />
            <Route path="/hrm/attendance" element={<Attendance />} />
            <Route path="/hrm/leaves" element={<Leave />} />
            <Route path="/hrm/recruitment" element={<Recruitment />} />
            <Route path="/hrm/payroll" element={<Payroll />} />
            {/* Project Routes */}
            <Route path="/projects" element={<Overview />} />
            <Route path="/projects/overview/:id" element={<ProjectOverviewPage />} />
            <Route path="/projects/:id" element={<ProjectDashboard />} />
            <Route path="/projects/timeline" element={<Timeline />} />
            {/* Communication */}
<<<<<<< HEAD
            <Route path="/messages" element={<Messaging />} />
            <Route path="/email" element={<Chat />} />
            <Route path="/calls" element={<Chat />} />
            <Route path="/messaging" element={<Messaging />} />
=======
            <Route path="/messages" element={<Chat />} />
            {/* Removed: /email and /calls */}
>>>>>>> 730fa665efcb7325c76fac1f1d5c841e9f138166
            {/* General */}
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/announcements/new" element={<AddAnnouncement />} />
            <Route path="/announcements/:id" element={<AnnouncementView />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/subscriptions/:id" element={<SubscriptionDetails />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/sales/orders/:id" element={<OrderDetailPage />} />
            <Route path="/sales/store" element={<Store />} />
            <Route path="/sales/checkout" element={<Checkout />} />
            <Route path="/sales/payments" element={<Payments />} />
            <Route path="/sales/expenses" element={<Expenses />} />
            <Route path="/sales/items" element={<Items />} />
            <Route path="/sales/contracts" element={<Contracts />} />
            {/* Prospects */}
            <Route path="/prospects/estimates" element={<EstimateList />} />
            <Route path="/prospects/estimates/:id" element={<EstimateDetail />} />
            <Route path="/prospects/estimate-requests" element={<EstimateRequests />} />
            <Route path="/prospects/estimate-forms" element={<EstimateForms />} />
            <Route path="/prospects/proposals" element={<Proposals />} />
            <Route path="/prospects/proposals/:id" element={<ProposalDetail />} />
            {/* User Management */}
            <Route path="/user-management/users" element={<ManageUsers />} />
            <Route path="/user-management/roles" element={<RolesPermissions />} />
            <Route path="/user-management/delete-request" element={<DeleteRequest />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/files" element={<Files />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/tickets/:id" element={<TicketDetails />} />
            <Route path="/calendar" element={<CalendarPage />} />
            {/* Help & Support */}
            <Route path="/help-support" element={<HelpSupportHelp />} />
            <Route path="/help-support/help" element={<HelpSupportHelp />} />
            <Route path="/help-support/articles" element={<HelpSupportArticles />} />
            <Route path="/help-support/categories" element={<HelpSupportCategories />} />
            <Route path="/help-support/knowledge-base/articles" element={<KnowledgeBaseArticles />} />
            <Route path="/help-support/knowledge-base/categories" element={<KnowledgeBaseCategories />} />
            {/* Invoices */}
            <Route path="/invoices" element={<InvoiceList />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            {/* Reports */}
            <Route path="/reports" element={<InvoicesSummary />} />
            <Route path="/reports/sales/invoices-summary" element={<InvoicesSummary />} />
            <Route path="/reports/finance/income-vs-expenses" element={<IncomeVsExpenses />} />
            <Route path="/reports/finance/expenses-summary" element={<ExpensesSummary />} />
            <Route path="/reports/finance/payments-summary" element={<PaymentsSummary />} />
            <Route path="/reports/timesheets" element={<TimesheetsReport />} />
            <Route path="/reports/projects/team-members" element={<ProjectsTeamMembers />} />
            <Route path="/reports/projects/clients" element={<ProjectsClients />} />
            <Route path="/reports/leads/conversions" element={<LeadsConversions />} />
            <Route path="/reports/leads/team-members" element={<LeadsTeamMembers />} />
            <Route path="/reports/tickets/statistics" element={<TicketsStatistics />} />
            {/* Portals */}
<<<<<<< HEAD
            <Route path="/client" element={<ClientDashboard />} />
<<<<<<< Updated upstream
=======
>>>>>>> 730fa665efcb7325c76fac1f1d5c841e9f138166
=======
            <Route path="/client/messages" element={<ClientMessages />} />
            <Route path="/client/announcements" element={<ClientAnnouncements />} />
            <Route path="/client/tickets" element={<ClientTickets />} />
            <Route path="/client/tickets/:id" element={<ClientTicketDetails />} />
            <Route path="/client/project-requests" element={<ClientProjectRequests />} />
>>>>>>> Stashed changes
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/:section" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </MessagingProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
