import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Calendar,
  MessageSquare,
  Ticket,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  User,
  Phone,
  Mail,
  MapPin,
  Star,
  Download,
  Eye,
  Edit,
  Plus,
} from "lucide-react";
import { useEffect, useState } from "react";

const API_BASE = "http://localhost:5000";

const projectProgressData = [
  { name: "Website Redesign", progress: 75, status: "In Progress" },
  { name: "Mobile App Development", progress: 45, status: "In Progress" },
  { name: "SEO Optimization", progress: 90, status: "Almost Complete" },
  { name: "Content Marketing", progress: 30, status: "Just Started" },
];

const invoiceStatusData = [
  { name: "Paid", value: 8, color: "#10b981" },
  { name: "Pending", value: 3, color: "#f59e0b" },
  { name: "Overdue", value: 1, color: "#ef4444" },
];

const monthlyActivityData = [
  { month: "Jan", projects: 2, invoices: 3 },
  { month: "Feb", projects: 3, invoices: 4 },
  { month: "Mar", projects: 1, invoices: 2 },
  { month: "Apr", projects: 4, invoices: 5 },
  { month: "May", projects: 2, invoices: 3 },
  { month: "Jun", projects: 3, invoices: 4 },
];

const recentTickets = [
  { id: "TK-001", title: "Login issue resolved", status: "Closed", date: "2024-06-15" },
  { id: "TK-002", title: "Feature request for dashboard", status: "In Progress", date: "2024-06-18" },
  { id: "TK-003", title: "Payment confirmation needed", status: "Pending", date: "2024-06-20" },
];

const recentInvoices = [
  { id: "INV-001", amount: "$2,500", status: "Paid", date: "2024-06-10" },
  { id: "INV-002", amount: "$1,800", status: "Pending", date: "2024-06-15" },
  { id: "INV-003", amount: "$3,200", status: "Overdue", date: "2024-06-05" },
];

export default function ClientDashboard() {
  const [activeProjects, setActiveProjects] = useState(0);
  const [completedProjects, setCompletedProjects] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    // Simulate API calls for client-specific data
    setActiveProjects(4);
    setCompletedProjects(12);
    setOpenTickets(2);
    setUnreadMessages(5);
    setPendingInvoices(4);
    setTotalSpent(28500);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome back, Sarah!</h1>
            <p className="text-blue-100">Here's what's happening with your projects today.</p>
          </div>
          <Avatar className="h-16 w-16 border-2 border-white">
            <AvatarImage src="/api/placeholder/64/64" alt="Client" />
            <AvatarFallback className="bg-white text-blue-600 text-xl">SC</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Active Projects</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{activeProjects}</p>
                <p className="text-xs text-blue-600 mt-1">+2 this month</p>
              </div>
              <div className="bg-blue-200 p-3 rounded-full">
                <FileText className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Completed</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{completedProjects}</p>
                <p className="text-xs text-green-600 mt-1">95% success rate</p>
              </div>
              <div className="bg-green-200 p-3 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Open Tickets</p>
                <p className="text-3xl font-bold text-orange-900 mt-1">{openTickets}</p>
                <p className="text-xs text-orange-600 mt-1">2 need attention</p>
              </div>
              <div className="bg-orange-200 p-3 rounded-full">
                <Ticket className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Total Spent</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">${totalSpent.toLocaleString()}</p>
                <p className="text-xs text-purple-600 mt-1">This year</p>
              </div>
              <div className="bg-purple-200 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Projects & Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Progress */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Project Progress</CardTitle>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectProgressData.map((project, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{project.name}</h4>
                        <p className="text-sm text-muted-foreground">{project.status}</p>
                      </div>
                      <span className="text-sm font-medium">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-3">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${project.progress}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Invoice Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Invoice Status</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download All
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={invoiceStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {invoiceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-4 mt-4">
                {invoiceStatusData.map((item) => (
                  <div key={item.name} className="text-center">
                    <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: item.color }} />
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-lg font-bold">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyActivityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="projects" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="invoices" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                New Project Request
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Ticket className="w-4 h-4 mr-2" />
                Create Support Ticket
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Message
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                View Invoices
              </Button>
            </CardContent>
          </Card>

          {/* Recent Tickets */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Tickets</CardTitle>
              <Badge variant="secondary">{openTickets} Open</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">{ticket.id} • {ticket.date}</p>
                    </div>
                    <Badge
                      variant={ticket.status === "Closed" ? "default" : ticket.status === "In Progress" ? "secondary" : "destructive"}
                    >
                      {ticket.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Invoices</CardTitle>
              <Badge variant="secondary">{pendingInvoices} Pending</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{invoice.id}</p>
                      <p className="text-xs text-muted-foreground">{invoice.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{invoice.amount}</p>
                      <Badge
                        variant={invoice.status === "Paid" ? "default" : invoice.status === "Pending" ? "secondary" : "destructive"}
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Account Manager */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Account Manager</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="/api/placeholder/48/48" alt="Manager" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">John Davidson</p>
                  <p className="text-sm text-muted-foreground">Senior Account Manager</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs">4.9</span>
                    </div>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">2 years</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="flex-1">
                  <Phone className="w-3 h-3 mr-1" />
                  Call
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <Mail className="w-3 h-3 mr-1" />
                  Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
