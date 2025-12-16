import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/events/Events";
import Clients from "./pages/clients/Clients";
import ClientDetails from "./pages/clients/ClientDetails";
import PrimaryContact from "./pages/clients/PrimaryContact";
import Leads from "./pages/crm/Leads";
import Contacts from "./pages/crm/Contacts";
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
import Subscriptions from "./pages/subscriptions/Subscriptions";
import Orders from "./pages/sales/Orders";
import Store from "./pages/sales/Store";
import Payments from "./pages/sales/Payments";
import Items from "./pages/sales/Items";
import Contracts from "./pages/sales/Contracts";
import Expenses from "./pages/sales/Expenses";
import EstimateList from "./pages/prospects/EstimateList";
import EstimateDetail from "./pages/prospects/EstimateDetail";
import EstimateRequests from "./pages/prospects/EstimateRequests";
import EstimateForms from "./pages/prospects/EstimateForms";
import Proposals from "./pages/prospects/Proposals";
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
import Files from "./pages/files/Files";
import Notes from "./pages/notes/Notes";
import HelpSupportHelp from "./pages/help-support/Help";
import HelpSupportArticles from "./pages/help-support/Articles";
import HelpSupportCategories from "./pages/help-support/Categories";
import KnowledgeBaseArticles from "./pages/help-support/knowledge-base/Articles";
import KnowledgeBaseCategories from "./pages/help-support/knowledge-base/Categories";
import CalendarPage from "./pages/calendar/Calendar";
import Overview from "./pages/projects/Overview";
import Kanban from "./pages/projects/Kanban";
import Timeline from "./pages/projects/Timeline";
import ProjectDashboard from "./pages/projects/ProjectDashboard";
import Chat from "./pages/messages/Chat";
import InvoiceList from "./pages/invoices/InvoiceList";
import InvoiceDetailPage from "./pages/invoices/InvoiceDetailPage";
import InvoicePreview from "./pages/invoices/InvoicePreview";
import NotFound from "./pages/NotFound";
import AuthLayout from "./pages/auth/AuthLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public auth route */}
          <Route path="/auth" element={<AuthLayout />} />

          {/* Protected app */}
          <Route
            element={
              (localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token"))
                ? <MainLayout />
                : <Navigate to="/auth" replace />
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetails />} />
            <Route path="/clients/:id/primary-contact" element={<PrimaryContact />} />
            {/* CRM Routes */}
            <Route path="/crm/leads" element={<Leads />} />
            <Route path="/crm/pipeline" element={<Pipeline />} />
            <Route path="/crm/contacts" element={<Contacts />} />
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
            <Route path="/projects/:id" element={<ProjectDashboard />} />
            <Route path="/projects/tasks" element={<Kanban />} />
            <Route path="/projects/kanban" element={<Kanban />} />
            <Route path="/projects/timeline" element={<Timeline />} />
            {/* Communication */}
            <Route path="/messages" element={<Chat />} />
            <Route path="/email" element={<Chat />} />
            <Route path="/calls" element={<Chat />} />
            {/* General */}
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            {/* Sales */}
            <Route path="/sales/orders" element={<Orders />} />
            <Route path="/sales/store" element={<Store />} />
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
            {/* User Management */}
            <Route path="/user-management/users" element={<ManageUsers />} />
            <Route path="/user-management/roles" element={<RolesPermissions />} />
            <Route path="/user-management/delete-request" element={<DeleteRequest />} />
            <Route path="/tasks" element={<Kanban />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/files" element={<Files />} />
            <Route path="/tickets" element={<Tickets />} />
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
            <Route path="/invoices/:id/preview" element={<InvoicePreview />} />
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
            <Route path="/client" element={<Dashboard />} />
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/settings" element={<Dashboard />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
