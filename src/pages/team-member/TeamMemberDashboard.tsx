import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  CheckSquare, 
  FolderKanban, 
  MessageSquare, 
  Clock, 
  AlertCircle,
  Bell,
  Eye,
  Plus,
  FileText
} from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";

interface DashboardStats {
  assignedTasks: number;
  activeProjects: number;
  openTickets: number;
  attendanceToday: boolean;
  payrollStatus: string;
}

interface AssignedProject {
  _id: string;
  title: string;
  client: string;
  status: string;
  deadline: string;
  progress: number;
}

interface AssignedTask {
  _id: string;
  title: string;
  status: string;
  priority: string;
  deadline: string;
  progress: number;
  projectTitle?: string;
}

interface Ticket {
  _id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  lastReply?: string;
}

interface Announcement {
  _id: string;
  title: string;
  category: string;
  createdAt: string;
  read: boolean;
}

interface MyFile {
  _id: string;
  name: string;
  size: number;
  path?: string;
  url?: string;
  createdAt: string;
}

interface MyNote {
  _id: string;
  title: string;
  text: string;
  createdAt: string;
}

interface PayrollRow {
  _id: string;
  period: string;
  basic: number;
  allowances: number;
  deductions: number;
  net: number;
  status: string;
}

export default function TeamMemberDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    assignedTasks: 0,
    activeProjects: 0,
    openTickets: 0,
    attendanceToday: false,
    payrollStatus: "Not Available",
  });
  const [projects, setProjects] = useState<AssignedProject[]>([]);
  const [tasks, setTasks] = useState<AssignedTask[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [meName, setMeName] = useState("Team Member");
  const [meEmail, setMeEmail] = useState("");
  const [meAvatar, setMeAvatar] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [files, setFiles] = useState<MyFile[]>([]);
  const [fileUploading, setFileUploading] = useState(false);
  const [notes, setNotes] = useState<MyNote[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteText, setNewNoteText] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<PayrollRow[]>([]);
  const [taskUpdates, setTaskUpdates] = useState<Record<string, { status: string; comment: string }>>({});
  const [openTaskId, setOpenTaskId] = useState<string>("");
  const [taskDetail, setTaskDetail] = useState<any>(null);
  const [taskDetailLoading, setTaskDetailLoading] = useState(false);
  const [checklistDraft, setChecklistDraft] = useState("");
  const [subTaskDraft, setSubTaskDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");

  const loadDashboardData = async () => {
    try {
      const headers = getAuthHeaders();

      const meRes = await fetch(`${API_BASE}/api/users/me`, { headers });
      const meJson = await meRes.json().catch(() => null);
      const u = (meJson as any)?.user;
      if (meRes.ok && u) {
        setMeName(String(u?.name || u?.email || "Team Member"));
        setMeEmail(String(u?.email || ""));
        setMeAvatar(String(u?.avatar || ""));
      }

      // Load assigned projects and tasks
      const [projectsRes, tasksRes, ticketsRes, attendanceRes] = await Promise.all([
        fetch(`${API_BASE}/api/projects`, { headers }),
        fetch(`${API_BASE}/api/tasks`, { headers }),
        fetch(`${API_BASE}/api/tickets`, { headers }),
        fetch(`${API_BASE}/api/attendance/members`, { headers }),
      ]);

      const projectsData = await projectsRes.json().catch(() => []);
      const tasksData = await tasksRes.json().catch(() => []);
      const ticketsData = await ticketsRes.json().catch(() => []);
      const attendanceData = await attendanceRes.json().catch(() => []);

      setStats({
        assignedTasks: tasksData.length || 0,
        activeProjects: projectsData.length || 0,
        openTickets: ticketsData.filter((t: any) => t.status !== "closed").length || 0,
        attendanceToday: attendanceData[0]?.clockedIn || false,
        payrollStatus: "Available", // This would come from payroll API
      });

      // Determine employeeId for scoped resources
      const myEmpId = String(attendanceData?.[0]?.employeeId || "");
      setEmployeeId(myEmpId);

      // Load assigned projects
      setProjects(projectsData.map((project: any) => ({
        _id: project._id,
        title: project.title,
        client: project.client,
        status: project.status,
        deadline: project.deadline,
        progress: project.progress || 0,
      })));

      // Load assigned tasks
      setTasks(tasksData.map((task: any) => ({
        _id: task._id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        deadline: task.deadline,
        progress: task.progress || 0,
        projectTitle: task.projectId?.title,
      })));

      // Load assigned tickets
      setTickets(ticketsData.slice(0, 5).map((ticket: any) => ({
        _id: ticket._id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        lastReply: ticket.lastReply,
      })));

      // Load announcements (read-only from API)
      try {
        const annRes = await fetch(`${API_BASE}/api/announcements?active=1`, { headers });
        const annData = await annRes.json().catch(() => []);
        const ann = Array.isArray(annData)
          ? annData.slice(0, 5).map((a: any) => ({
              _id: String(a._id),
              title: String(a.title || "Announcement"),
              category: a.isActive ? "Active" : "",
              createdAt: String(a.createdAt || new Date().toISOString()),
              read: false,
            }))
          : [];
        setAnnouncements(ann);
      } catch {}

      // Load files, notes, events and payroll scoped to user
      try {
        const [filesRes, notesRes, eventsRes, payrollRes] = await Promise.all([
          myEmpId ? fetch(`${API_BASE}/api/files?employeeId=${encodeURIComponent(myEmpId)}`) : Promise.resolve({ json: async () => [] } as any),
          myEmpId ? fetch(`${API_BASE}/api/notes?employeeId=${encodeURIComponent(myEmpId)}`) : Promise.resolve({ json: async () => [] } as any),
          fetch(`${API_BASE}/api/events`),
          fetch(`${API_BASE}/api/payroll`, { headers }),
        ]);
        const filesData = await filesRes.json().catch(() => []);
        const notesData = await notesRes.json().catch(() => []);
        const eventsData = await eventsRes.json().catch(() => []);
        const payrollData = await payrollRes.json().catch(() => []);
        setFiles(Array.isArray(filesData) ? filesData : []);
        setNotes(Array.isArray(notesData) ? notesData : []);
        setEvents(Array.isArray(eventsData) ? eventsData : []);
        setPayroll(Array.isArray(payrollData) ? payrollData : (payrollData?.items || []));
      } catch {}

    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const openTask = async (id: string) => {
    setOpenTaskId(id);
    setTaskDetail(null);
    setTaskDetailLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/tasks/${id}`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        setTaskDetail(d);
      }
    } catch {}
    setTaskDetailLoading(false);
  };

  const updateTask = async (id: string, patch: any) => {
    try {
      const r = await fetch(`${API_BASE}/api/tasks/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(patch),
      });
      if (r.ok) {
        const d = await r.json();
        setTaskDetail(d);
        await loadDashboardData();
        return true;
      }
    } catch {}
    return false;
  };

  const toggleChecklist = async (idx: number) => {
    if (!taskDetail) return;
    const next = [...(taskDetail.checklist || [])];
    next[idx] = { ...(next[idx] || {}), done: !next[idx]?.done };
    await updateTask(taskDetail._id, { checklist: next });
  };

  const addChecklist = async () => {
    const text = checklistDraft.trim();
    if (!taskDetail || !text) return;
    const next = [...(taskDetail.checklist || []), { text, done: false }];
    setChecklistDraft("");
    await updateTask(taskDetail._id, { checklist: next });
  };

  const toggleSubTask = async (idx: number) => {
    if (!taskDetail) return;
    const next = [...(taskDetail.subTasks || [])];
    next[idx] = { ...(next[idx] || {}), done: !next[idx]?.done };
    await updateTask(taskDetail._id, { subTasks: next });
  };

  const addSubTask = async () => {
    const title = subTaskDraft.trim();
    if (!taskDetail || !title) return;
    const next = [...(taskDetail.subTasks || []), { title, done: false }];
    setSubTaskDraft("");
    await updateTask(taskDetail._id, { subTasks: next });
  };

  const addComment = async () => {
    const msg = commentDraft.trim();
    if (!taskDetail || !msg) return;
    const next = [{ type: 'update', message: msg, authorName: meName }, ...(taskDetail.activity || [])];
    setCommentDraft("");
    await updateTask(taskDetail._id, { activity: next });
  };

  const meInitials = String(meName || meEmail || "TM")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-100 text-amber-800 border-amber-200";
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "review": return "bg-purple-100 text-purple-800 border-purple-200";
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "open": return "bg-blue-100 text-blue-800 border-blue-200";
      case "closed": return "bg-slate-100 text-slate-800 border-slate-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "medium": return "bg-amber-100 text-amber-800 border-amber-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-emerald-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress >= 30) return "bg-amber-500";
    return "bg-rose-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          <div className="text-lg font-medium text-slate-700">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome back, {meName}!</h1>
            <p className="text-blue-100">{meEmail || "Here's what's happening with your work today."}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-blue-200">Assigned Tasks</p>
              <p className="text-3xl font-bold">{stats.assignedTasks}</p>
            </div>
            <Avatar className="h-16 w-16 border-2 border-white bg-white">
              <AvatarImage src={meAvatar ? `${API_BASE}${meAvatar}` : "/api/placeholder/64/64"} alt="Team Member" />
              <AvatarFallback className="bg-white text-blue-600 text-xl">{meInitials}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Assigned Tasks</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{stats.assignedTasks}</p>
                <p className="text-xs text-blue-600 mt-1">{tasks.filter(t => t.status === "completed").length} completed</p>
              </div>
              <div className="bg-blue-200 p-3 rounded-full">
                <CheckSquare className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Active Projects</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{stats.activeProjects}</p>
                <p className="text-xs text-green-600 mt-1">Assigned to you</p>
              </div>
              <div className="bg-green-200 p-3 rounded-full">
                <FolderKanban className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Open Tickets</p>
                <p className="text-3xl font-bold text-orange-900 mt-1">{stats.openTickets}</p>
                <p className="text-xs text-orange-600 mt-1">Need attention</p>
              </div>
              <div className="bg-orange-200 p-3 rounded-full">
                <AlertCircle className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Attendance</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">
                  {stats.attendanceToday ? "In" : "Out"}
                </p>
                <p className="text-xs text-purple-600 mt-1">Today's status</p>
              </div>
              <div className="bg-purple-200 p-3 rounded-full">
                <Clock className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assigned Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Assigned Projects</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/projects')}>
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects.map((project) => (
                  <div key={project._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <FolderKanban className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{project.title}</p>
                        <p className="text-sm text-muted-foreground">{project.client}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
                {projects.length === 0 && (
                  <div className="text-center py-8">
                    <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No assigned projects</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assigned Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Assigned Tasks</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/tasks')}>
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckSquare className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{task.title}</p>
                        {task.projectTitle && (
                          <p className="text-sm text-muted-foreground">{task.projectTitle}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right max-w-[420px] w-full flex items-center gap-3 justify-end">
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      <select
                        className="text-xs border rounded px-2 py-1"
                        value={taskUpdates[task._id]?.status ?? task.status}
                        onChange={(e) => setTaskUpdates((s) => ({ ...s, [task._id]: { status: e.target.value, comment: s[task._id]?.comment ?? "" } }))}
                      >
                        {['backlog','todo','in-progress','review','done'].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Add update (optional)"
                        className="border rounded px-2 py-1 text-xs w-44"
                        value={taskUpdates[task._id]?.comment ?? ""}
                        onChange={(e) => setTaskUpdates((s) => ({ ...s, [task._id]: { status: s[task._id]?.status ?? task.status, comment: e.target.value } }))}
                      />
                      <Button
                        size="sm"
                        onClick={async () => {
                          const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
                          const update = taskUpdates[task._id] || { status: task.status, comment: "" };
                          const body: any = { status: update.status };
                          if (update.comment?.trim()) {
                            body.activity = [{ type: 'update', message: update.comment, authorName: meName }];
                          }
                          await fetch(`${API_BASE}/api/tasks/${task._id}`, { method: 'PUT', headers, body: JSON.stringify(body) });
                          await loadDashboardData();
                        }}
                      >
                        Update
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openTask(task._id)}>Details</Button>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="text-center py-8">
                    <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No assigned tasks</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 1 column */}
        <div className="space-y-6">
          {/* Open Tickets */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Open Tickets</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/tickets')}>
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div key={ticket._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{ticket.subject}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                          <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status}
                    </Badge>
                  </div>
                ))}
                {tickets.length === 0 && (
                  <div className="text-center py-6">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No assigned tickets</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Announcements</CardTitle>
              <Badge variant="secondary">Latest</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {announcements.map((announcement) => (
                  <div key={announcement._id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bell className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{announcement.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Badge variant="outline">{announcement.category}</Badge>
                        <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {!announcement.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                    )}
                  </div>
                ))}
                {announcements.length === 0 && (
                  <div className="text-center py-6">
                    <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No announcements</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Events (read-only) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {events.slice(0,5).map((ev: any) => (
                  <div key={ev._id} className="p-3 border rounded-lg">
                    <p className="font-medium text-sm">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">{ev.date ? new Date(ev.date).toLocaleString() : ''}</p>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="text-center py-6 text-sm text-muted-foreground">No events</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payroll (read-only) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Payroll</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {payroll.slice(0,3).map((p) => (
                  <div key={p._id} className="p-3 border rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium">{p.period}</p>
                      <p className="text-xs text-muted-foreground">Net: {p.net} | Deductions: {p.deductions}</p>
                    </div>
                    <Badge variant="outline">{p.status}</Badge>
                  </div>
                ))}
                {payroll.length === 0 && (
                  <div className="text-center py-6 text-sm text-muted-foreground">No payroll data</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* My Files */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">My Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Open the Files page to upload and manage your files.</div>
                <Button size="sm" onClick={() => navigate('/files')}>Open Files</Button>
              </div>
            </CardContent>
          </Card>

          {/* My Notes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">My Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Open the Notes page to create and manage your notes.</div>
                <Button size="sm" onClick={() => navigate('/notes')}>Open Notes</Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/files')}>
                <FileText className="w-4 h-4 mr-2" />
                Open Files
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/notes')}>
                <FileText className="w-4 h-4 mr-2" />
                Open Notes
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/messages')}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Message
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={async () => {
                  if (!employeeId) return;
                  const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
                  if (stats.attendanceToday) {
                    await fetch(`${API_BASE}/api/attendance/clock-out`, { method: 'POST', headers, body: JSON.stringify({ employeeId }) });
                  } else {
                    await fetch(`${API_BASE}/api/attendance/clock-in`, { method: 'POST', headers, body: JSON.stringify({ employeeId }) });
                  }
                  await loadDashboardData();
                }}
              >
                <Clock className="w-4 h-4 mr-2" />
                {stats.attendanceToday ? 'Clock Out' : 'Clock In'}
              </Button>
              <div className="grid grid-cols-1 gap-2">
                <Button className="w-full justify-start" variant="outline" onClick={() => employeeId && navigate(`/hrm/employees/${employeeId}`)} disabled={!employeeId}>
                  <Eye className="w-4 h-4 mr-2" />
                  My Profile
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/hrm/attendance')}>
                  <Clock className="w-4 h-4 mr-2" />
                  My Attendance
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/hrm/leaves')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Apply Leave
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/hrm/payroll')}>
                  <FileText className="w-4 h-4 mr-2" />
                  View Payroll
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* ClickUp-like Task Dialog */}
      <Dialog open={!!openTaskId} onOpenChange={(v) => { if (!v) { setOpenTaskId(""); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Task details</DialogTitle>
          </DialogHeader>
          {taskDetailLoading ? (
            <div className="py-6 text-sm text-muted-foreground">Loading...</div>
          ) : taskDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Title</div>
                  <Input value={taskDetail.title || ''} onChange={(e) => setTaskDetail((p: any) => ({ ...p, title: e.target.value }))} onBlur={() => updateTask(taskDetail._id, { title: String(taskDetail.title || '') })} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Status</div>
                  <select
                    className="w-full h-9 border rounded px-2"
                    value={taskDetail.status || 'todo'}
                    onChange={async (e) => {
                      const v = e.target.value;
                      setTaskDetail((p: any) => ({ ...p, status: v }));
                      await updateTask(taskDetail._id, { status: v });
                    }}
                  >
                    {['backlog','todo','in-progress','review','done'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Priority</div>
                  <select
                    className="w-full h-9 border rounded px-2"
                    value={taskDetail.priority || 'medium'}
                    onChange={async (e) => {
                      const v = e.target.value;
                      setTaskDetail((p: any) => ({ ...p, priority: v }));
                      await updateTask(taskDetail._id, { priority: v });
                    }}
                  >
                    {['low','medium','high','urgent'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Checklist</div>
                <div className="space-y-2">
                  {(taskDetail.checklist || []).map((it: any, idx: number) => (
                    <label key={idx} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!it.done} onChange={() => toggleChecklist(idx)} />
                      <span className={cn(it.done && 'line-through text-muted-foreground')}>{it.text || ''}</span>
                    </label>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input placeholder="Add checklist item" value={checklistDraft} onChange={(e) => setChecklistDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addChecklist(); } }} />
                    <Button size="sm" onClick={addChecklist}>Add</Button>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Subtasks</div>
                <div className="space-y-2">
                  {(taskDetail.subTasks || []).map((it: any, idx: number) => (
                    <label key={idx} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!it.done} onChange={() => toggleSubTask(idx)} />
                      <span className={cn(it.done && 'line-through text-muted-foreground')}>{it.title || ''}</span>
                    </label>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input placeholder="Add subtask" value={subTaskDraft} onChange={(e) => setSubTaskDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addSubTask(); } }} />
                    <Button size="sm" onClick={addSubTask}>Add</Button>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Activity</div>
                <div className="space-y-2 max-h-48 overflow-auto border rounded p-2 bg-muted/30">
                  {(taskDetail.activity || []).map((a: any, i: number) => (
                    <div key={i} className="text-xs">
                      <span className="font-medium">{a.authorName || 'Member'}</span>
                      <span className="text-muted-foreground">: {a.message || a.type}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Textarea rows={2} placeholder="Add an update..." value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} />
                  <Button size="sm" onClick={addComment}>Post</Button>
                </div>
              </div>

          </div>
          ) : (
            <div className="py-6 text-sm text-muted-foreground">No task loaded</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTaskId("")}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
