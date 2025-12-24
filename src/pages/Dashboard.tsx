import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Area,
  AreaChart,
} from "recharts";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Users,
  Briefcase,
  TrendingUp,
  Search,
  MoreHorizontal,
  DollarSign,
  Target,
  Activity,
  FileText,
  Settings,
  Bell,
  User,
  MapPin,
  Phone,
  Mail,
  Download,
  Eye,
  Edit,
  Plus,
  ArrowUp,
  ArrowDown,
  Star,
  Shield,
  Zap,
  Globe,
  Building,
  Award,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { getAuthHeaders } from "@/lib/api/auth";

const API_BASE = (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname))
  ? "https://healthspire-crm.onrender.com"
  : "http://localhost:5000";

const revenueData = [
  { month: "Jan", revenue: 4000, profit: 2400 },
  { month: "Feb", revenue: 3000, profit: 1398 },
  { month: "Mar", revenue: 2000, profit: 800 },
  { month: "Apr", revenue: 2780, profit: 1908 },
  { month: "May", revenue: 1890, profit: 1200 },
  { month: "Jun", revenue: 2390, profit: 1500 },
];

const invoiceData = [
  { name: "Paid", value: 8, color: "#10b981" },
  { name: "Not paid", value: 2, color: "#f59e0b" },
  { name: "Draft", value: 11, color: "#6366f1" },
];

const incomeData = [
  { month: "Jan", income: 4000, expense: 2400 },
  { month: "Feb", income: 3000, expense: 1398 },
  { month: "Mar", income: 2000, expense: 9800 },
  { month: "Apr", income: 2780, expense: 3908 },
  { month: "May", income: 1890, expense: 4800 },
  { month: "Jun", income: 2390, expense: 3800 },
];

const projectStatusData = [
  { name: "Completed", value: 45, color: "#10b981" },
  { name: "In Progress", value: 28, color: "#3b82f6" },
  { name: "On Hold", value: 12, color: "#f59e0b" },
  { name: "Not Started", value: 8, color: "#ef4444" },
];

const teamPerformanceData = [
  { name: "Development", completed: 85, total: 100 },
  { name: "Design", completed: 72, total: 85 },
  { name: "Marketing", completed: 68, total: 75 },
  { name: "Sales", completed: 92, total: 110 },
];

const recentActivities = [
  { action: "Project completed", detail: "E-commerce Platform", time: "2 hours ago", type: "success" },
  { action: "New team member", detail: "Sarah Johnson joined", time: "3 hours ago", type: "info" },
  { action: "Invoice sent", detail: "Client ABC - $5,000", time: "5 hours ago", type: "warning" },
  { action: "Task deadline", detail: "Mobile App UI Design", time: "1 day ago", type: "danger" },
];

const topPerformers = [
  { name: "Alex Chen", avatar: "AC", role: "Frontend Developer", tasks: 45, rating: 4.9 },
  { name: "Emma Wilson", avatar: "EW", role: "Project Manager", tasks: 38, rating: 4.8 },
  { name: "Mike Johnson", avatar: "MJ", role: "Backend Developer", tasks: 42, rating: 4.7 },
  { name: "Sarah Davis", avatar: "SD", role: "UX Designer", tasks: 35, rating: 4.9 },
];

type ProjectRow = { id: string; name: string; estimate: string };
type TaskRow = { id: string; title: string; startDate: string; deadline: string; status: string };

const announcements = [
  "polyfloor & doors door",
  "2 Medel MS Launch",
  "3 Marketing plan 10 pages",
  "4 Tender Websites",
];

export default function Dashboard() {
  const [openTasksCount, setOpenTasksCount] = useState(0);
  const [eventsToday, setEventsToday] = useState(0);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [meName, setMeName] = useState("Admin");
  const [meEmail, setMeEmail] = useState("");
  const [meAvatar, setMeAvatar] = useState<string>("");
  const [projectCounts, setProjectCounts] = useState({ open: 0, completed: 0, hold: 0 });
  const [tasksPie, setTasksPie] = useState({ todo: 0, inProgress: 0, completed: 0, expired: 0 });
  const [teamMembers, setTeamMembers] = useState(0);
  const [onLeaveToday, setOnLeaveToday] = useState(0);
  const [projectsList, setProjectsList] = useState<ProjectRow[]>([]);
  const [tasksTable, setTasksTable] = useState<TaskRow[]>([]);

  const adminAvatarSrc = useMemo(() => {
    const a = String(meAvatar || "").trim();
    if (!a) return "/api/placeholder/64/64";
    if (a.startsWith("http")) return a;
    if (a.startsWith("<")) return "/api/placeholder/64/64";
    const rel = a.startsWith("/") ? a : `/${a}`;
    return `${API_BASE}${rel}`;
  }, [meAvatar]);

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch(`${API_BASE}/api/users/me`, { headers: getAuthHeaders() });
        const meJson = await meRes.json().catch(() => null);
        const u = (meJson as any)?.user;
        if (meRes.ok && u) {
          setMeName(String(u?.name || u?.email || "Admin"));
          setMeEmail(String(u?.email || ""));
          setMeAvatar(String(u?.avatar || ""));
        }

        // Projects
        const pr = await fetch(`${API_BASE}/api/projects`, { headers: getAuthHeaders() });
        if (pr.ok) {
          const data = await pr.json();
          const list = (Array.isArray(data) ? data : []);
          const open = list.filter((p:any)=> (p.status||"Open")==="Open").length;
          const completed = list.filter((p:any)=> (p.status||"")==="Completed").length;
          const hold = list.filter((p:any)=> (p.status||"")==="Hold").length;
          setProjectCounts({ open, completed, hold });
          const sum = list.reduce((acc:number,p:any)=> acc + (Number(p.price||0)||0), 0);
          setTotalRevenue(sum);
          const right = list
            .slice(0,5)
            .map((p:any)=> ({ id: String(p._id||""), name: p.title || "-", estimate: p.deadline ? new Date(p.deadline).toISOString().slice(0,10).replaceAll('-','/') : "-" }));
          setProjectsList(right);
        }
      } catch {}
    })();
  }, []);

  const meInitials = String(meName || meEmail || "Admin")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    (async () => {
      try {
        // Tasks
        const tr = await fetch(`${API_BASE}/api/tasks`, { headers: getAuthHeaders() });
        if (tr.ok) {
          const data = await tr.json();
          const list = (Array.isArray(data) ? data : []);
          const todo = list.filter((t:any)=> t.status==="todo").length;
          const inProgress = list.filter((t:any)=> t.status==="in-progress").length;
          const completed = list.filter((t:any)=> t.status==="done").length;
          const todayIso = new Date().toISOString().slice(0,10);
          const events = list.filter((t:any)=> t.deadline && new Date(t.deadline).toISOString().slice(0,10)===todayIso).length;
          const expired = list.filter((t:any)=> t.deadline && new Date(t.deadline) < new Date() && t.status!=="done").length;
          setOpenTasksCount(list.filter((t:any)=> t.status!=="done").length);
          setEventsToday(events);
          setTasksPie({ todo, inProgress, completed, expired });
          const tbl: TaskRow[] = list.slice(0,8).map((t:any)=> ({ id: String(t._id||""), title: t.title||"-", startDate: t.start? new Date(t.start).toISOString().slice(0,10):"", deadline: t.deadline? new Date(t.deadline).toISOString().slice(0,10):"", status: t.status||"todo" }));
          setTasksTable(tbl);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Leaves
        const lr = await fetch(`${API_BASE}/api/leaves`, { headers: getAuthHeaders() });
        if (lr.ok) {
          const data = await lr.json();
          const list = (Array.isArray(data) ? data : []);
          setPendingLeaves(list.filter((l:any)=> (l.status||"pending")==="pending").length);
          const today = new Date();
          setOnLeaveToday(list.filter((l:any)=> l.from && l.to && new Date(l.from) <= today && today <= new Date(l.to)).length);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Employees count
        const er = await fetch(`${API_BASE}/api/employees`, { headers: getAuthHeaders() });
        if (er.ok) {
          const data = await er.json();
          setTeamMembers(Array.isArray(data)? data.length : 0);
        }
      } catch {}
    })();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome back, {meName}!</h1>
            <p className="text-blue-100">{meEmail || "Here's what's happening across your organization today."}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-blue-200">Total Revenue</p>
              <p className="text-3xl font-bold">${totalRevenue.toLocaleString()}</p>
            </div>
            <Avatar className="h-16 w-16 border-2 border-white bg-white">
              <AvatarImage
                src={adminAvatarSrc}
                alt="Admin"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/api/placeholder/64/64";
                }}
              />
              <AvatarFallback className="bg-white text-blue-600 text-xl">{meInitials}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Active Projects</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{projectCounts.open}</p>
                <p className="text-xs text-green-600 mt-1">+{projectCounts.completed} completed</p>
              </div>
              <div className="bg-green-200 p-3 rounded-full">
                <Briefcase className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Open Tasks</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{openTasksCount}</p>
                <p className="text-xs text-blue-600 mt-1">{eventsToday} due today</p>
              </div>
              <div className="bg-blue-200 p-3 rounded-full">
                <CheckCircle className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Team Members</p>
                <p className="text-3xl font-bold text-orange-900 mt-1">{teamMembers}</p>
                <p className="text-xs text-orange-600 mt-1">{onLeaveToday} on leave</p>
              </div>
              <div className="bg-orange-200 p-3 rounded-full">
                <Users className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Pending Leaves</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">{pendingLeaves}</p>
                <p className="text-xs text-purple-600 mt-1">Need approval</p>
              </div>
              <div className="bg-purple-200 p-3 rounded-full">
                <Calendar className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Charts & Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue & Profit Trend */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Revenue & Profit Trend</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="profit" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Project Status Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Project Status Overview</CardTitle>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {projectStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {projectStatusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Team Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamPerformanceData.map((team, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{team.name}</h4>
                      <span className="text-sm text-muted-foreground">{team.completed}/{team.total} tasks</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(team.completed / team.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Income vs Expenses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Income vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={incomeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} />
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
                New Project
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="w-4 h-4 mr-2" />
                Add Team Member
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                System Settings
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-2 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      activity.type === "success" ? "bg-green-500" :
                      activity.type === "warning" ? "bg-yellow-500" :
                      activity.type === "danger" ? "bg-red-500" : "bg-blue-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{activity.action}</span>
                        <span className="text-muted-foreground"> {activity.detail}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Top Performers</CardTitle>
              <Badge variant="secondary">This Month</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPerformers.map((performer) => (
                  <div key={performer.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{performer.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{performer.name}</p>
                        <p className="text-xs text-muted-foreground">{performer.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-3 h-3 fill-yellow-400" />
                        <span className="text-xs font-medium">{performer.rating}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{performer.tasks} tasks</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Invoice Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invoice Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={invoiceData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                    {invoiceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-1 gap-2 mt-4">
                {invoiceData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Open Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Open Projects</CardTitle>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {projectsList.slice(0, 5).map((project) => (
                  <div key={project.id} className="text-xs p-2 rounded-lg border">
                    <a href="#" className="text-primary font-medium hover:underline">{project.name}</a>
                    <p className="text-muted-foreground">Estimate: {project.estimate}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Tasks</CardTitle>
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            View All Tasks
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">ID</th>
                  <th className="text-left py-3 px-4">Title</th>
                  <th className="text-left py-3 px-4">Start Date</th>
                  <th className="text-left py-3 px-4">Deadline</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasksTable.slice(0, 5).map((task) => (
                  <tr key={task.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">{task.id}</td>
                    <td className="py-3 px-4 text-primary font-medium">{task.title}</td>
                    <td className="py-3 px-4">{task.startDate}</td>
                    <td className="py-3 px-4">{task.deadline}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={task.status === "done" ? "default" : 
                                task.status === "in-progress" ? "secondary" : "outline"}
                      >
                        {task.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
