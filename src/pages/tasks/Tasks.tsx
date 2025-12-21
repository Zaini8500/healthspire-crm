import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { ExternalLink, Mic, Paperclip, Pencil, Plus, RefreshCw, Trash2, Tag } from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth";

const API_BASE = "http://localhost:5000";

type Employee = { _id: string; name?: string; firstName?: string; lastName?: string; avatar?: string; image?: string };

type TaskLabel = { _id: string; name: string; color?: string };

type LeadDoc = { _id: string; ownerId?: string; name?: string };

type TaskDoc = {
  _id: string;
  taskNo?: number;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  start?: string;
  deadline?: string;
  assignees?: Array<{ name?: string; initials?: string }>;
  collaborators?: string[];
  tags?: string[];
  leadId?: string;
  projectId?: string;
  invoiceId?: string;
  checklist?: Array<{ _id?: string; text?: string; done?: boolean }>;
  subTasks?: Array<{ _id?: string; title?: string; done?: boolean }>;
  reminders?: Array<{ _id?: string; title?: string; when?: string; repeat?: string; priority?: string }>;
  taskComments?: Array<{ _id?: string; authorName?: string; text?: string; attachmentCount?: number; createdAt?: string }>;
  dependencies?: { blockedBy?: string[]; blocking?: string[] };
  activity?: Array<{ _id?: string; type?: string; message?: string; authorName?: string; createdAt?: string }>;
};

export default function Tasks() {
  const navigate = useNavigate();
  const [items, setItems] = useState<TaskDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const [view, setView] = useState<"list" | "kanban" | "gantt">("list");

  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    assignedTo: "",
    tag: "",
    deadlineFrom: "",
    deadlineTo: "",
  });

  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [openManageLabels, setOpenManageLabels] = useState(false);
  const [manageLabelName, setManageLabelName] = useState("");
  const [manageLabelColor, setManageLabelColor] = useState("bg-blue-600");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const employeeNames = useMemo(() => {
    return (employees || [])
      .map((e) => (e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "").trim())
      .filter(Boolean);
  }, [employees]);

  const employeeByName = useMemo(() => {
    const m = new Map<string, Employee>();
    for (const e of employees || []) {
      const name = (e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "").trim();
      if (!name) continue;
      m.set(name, e);
    }
    return m;
  }, [employees]);

  const [leadOwnerByLeadId, setLeadOwnerByLeadId] = useState<Map<string, string>>(new Map());
  const [leadNameByLeadId, setLeadNameByLeadId] = useState<Map<string, string>>(new Map());

  const draggingTaskIdRef = useRef<string | null>(null);
  const draggingFromStatusRef = useRef<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  const [openAddTask, setOpenAddTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string>("");
  const [openTaskInfo, setOpenTaskInfo] = useState(false);
  const [taskInfo, setTaskInfo] = useState<TaskDoc | null>(null);
  const [taskInfoLoading, setTaskInfoLoading] = useState(false);

  const [checklistDraft, setChecklistDraft] = useState("");
  const [subTaskDraft, setSubTaskDraft] = useState("");
  const [reminderDraft, setReminderDraft] = useState({
    priority: "medium",
    title: "",
    date: "",
    time: "",
    repeat: "",
  });
  const [commentDraft, setCommentDraft] = useState("");
  const [commentFiles, setCommentFiles] = useState<File[]>([]);

  const [depOpen, setDepOpen] = useState(false);
  const [depBlockedBy, setDepBlockedBy] = useState<string>("");
  const [depBlocking, setDepBlocking] = useState<string>("");
  const [taskUploading, setTaskUploading] = useState(false);
  const [taskSelectedFiles, setTaskSelectedFiles] = useState<File[]>([]);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    points: "1",
    assignTo: "",
    collaborators: "",
    status: "todo",
    priority: "medium",
    labels: "",
    start: "",
    deadline: "",
  });

  const resetTaskForm = () => {
    setEditingTaskId("");
    setTaskForm({
      title: "",
      description: "",
      points: "1",
      assignTo: "",
      collaborators: "",
      status: "todo",
      priority: "medium",
      labels: "",
      start: "",
      deadline: "",
    });
    setTaskSelectedFiles([]);
  };

  const createLabel = async () => {
    const name = (manageLabelName || "").trim();
    if (!name) return;
    try {
      const r = await fetch(`${API_BASE}/api/task-labels`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name, color: manageLabelColor }),
      });
      if (r.ok) {
        const created = await r.json();
        setLabels((p) => [created, ...p]);
        setManageLabelName("");
        toast.success("Label added");
        return;
      }
    } catch {
    }
    toast.error("Failed to add label");
  };

  const deleteLabel = async (id: string) => {
    if (!confirm("Delete this label?")) return;
    try {
      const r = await fetch(`${API_BASE}/api/task-labels/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (r.ok) {
        setLabels((p) => p.filter((x) => x._id !== id));
        toast.success("Label deleted");
        return;
      }
    } catch {
    }
    toast.error("Failed to delete");
  };

  const uploadTaskFiles = async () => {
    if (!taskSelectedFiles.length) return 0;
    setTaskUploading(true);
    try {
      let uploaded = 0;
      for (const f of taskSelectedFiles) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("name", f.name);
        const r = await fetch(`${API_BASE}/api/files`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: fd,
        });
        if (r.ok) uploaded += 1;
      }
      return uploaded;
    } catch {
      return 0;
    } finally {
      setTaskUploading(false);
    }
  };

  const saveTask = async (mode: "save" | "save_show") => {
    const title = (taskForm.title || "").trim();
    if (!title) return;

    const attachmentsUploaded = await uploadTaskFiles();
    const payload: any = {
      title,
      description: (taskForm.description || "").trim() || undefined,
      points: taskForm.points ? Number(taskForm.points) : undefined,
      status: taskForm.status,
      priority: taskForm.priority,
      start: taskForm.start || undefined,
      deadline: taskForm.deadline || undefined,
      assignees: taskForm.assignTo ? [{ name: taskForm.assignTo, initials: taskForm.assignTo.slice(0, 2).toUpperCase() }] : [],
      collaborators: (taskForm.collaborators || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      tags: (taskForm.labels || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      attachments: attachmentsUploaded,
    };

    try {
      const method = editingTaskId ? "PUT" : "POST";
      const url = editingTaskId ? `${API_BASE}/api/tasks/${editingTaskId}` : `${API_BASE}/api/tasks`;
      const r = await fetch(url, {
        method,
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        const created = await r.json();
        setItems((prev) => {
          if (editingTaskId) return prev.map((x) => (x._id === editingTaskId ? created : x));
          return [created, ...prev];
        });
        toast.success(editingTaskId ? "Task updated" : "Task added");
        setOpenAddTask(false);
        resetTaskForm();
        if (mode === "save_show") navigate(`/tasks/${created._id}`);
        return;
      }
    } catch {
    }

    const optimistic: TaskDoc = {
      _id: crypto.randomUUID(),
      title,
      description: payload.description,
      status: payload.status,
      priority: payload.priority,
      start: payload.start,
      deadline: payload.deadline,
      assignees: payload.assignees,
      collaborators: payload.collaborators,
      tags: payload.tags,
    };
    setItems((prev) => {
      if (editingTaskId) return prev.map((x) => (x._id === editingTaskId ? optimistic : x));
      return [optimistic, ...prev];
    });
    setOpenAddTask(false);
    resetTaskForm();
    if (mode === "save_show") navigate(`/tasks/${optimistic._id}`);
  };

  const load = async (next?: Partial<{ q: string } & typeof filters>) => {
    setLoading(true);
    try {
      const qValue = next?.q ?? q;
      const statusValue = next?.status ?? filters.status;
      const priorityValue = next?.priority ?? filters.priority;
      const assignedToValue = next?.assignedTo ?? filters.assignedTo;
      const tagValue = next?.tag ?? filters.tag;
      const deadlineFromValue = next?.deadlineFrom ?? filters.deadlineFrom;
      const deadlineToValue = next?.deadlineTo ?? filters.deadlineTo;
      const params = new URLSearchParams();
      if ((qValue || "").trim()) params.set("q", qValue.trim());
      if ((statusValue || "").trim()) params.set("status", statusValue.trim());
      if ((priorityValue || "").trim()) params.set("priority", priorityValue.trim());
      if ((assignedToValue || "").trim()) params.set("assignedTo", assignedToValue.trim());
      if ((tagValue || "").trim()) params.set("tag", tagValue.trim());
      if ((deadlineFromValue || "").trim()) params.set("deadlineFrom", deadlineFromValue.trim());
      if ((deadlineToValue || "").trim()) params.set("deadlineTo", deadlineToValue.trim());
      const r = await fetch(`${API_BASE}/api/tasks?${params.toString()}`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        setItems(Array.isArray(d) ? d : []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(() => load(), 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/employees`, { headers: getAuthHeaders() });
        if (r.ok) {
          const d = await r.json();
          setEmployees(Array.isArray(d) ? d : []);
        }
      } catch {
      }
    })();
  }, []);

  const loadLabels = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/task-labels`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        setLabels(Array.isArray(d) ? d : []);
      }
    } catch {
    }
  };

  useEffect(() => {
    void loadLabels();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/leads`, { headers: getAuthHeaders() });
        if (r.ok) {
          const d = (await r.json()) as LeadDoc[];
          const m = new Map<string, string>();
          const n = new Map<string, string>();
          (Array.isArray(d) ? d : []).forEach((l) => {
            if (l?._id && l?.ownerId) m.set(String(l._id), String(l.ownerId));
            if (l?._id && l?.name) n.set(String(l._id), String(l.name));
          });
          setLeadOwnerByLeadId(m);
          setLeadNameByLeadId(n);
        }
      } catch {
      }
    })();
  }, []);

  const rows = useMemo(() => items, [items]);

  const columns = useMemo(
    () => [
      { id: "backlog", title: "Backlog", color: "bg-slate-400" },
      { id: "todo", title: "To do", color: "bg-amber-500" },
      { id: "in-progress", title: "In progress", color: "bg-blue-600" },
      { id: "review", title: "Review", color: "bg-fuchsia-600" },
      { id: "done", title: "Done", color: "bg-emerald-600" },
    ],
    []
  );

  const kanbanGroups = useMemo(() => {
    const m: Record<string, TaskDoc[]> = {};
    for (const c of columns) m[c.id] = [];
    for (const t of rows) {
      const s = (t.status || "todo").toLowerCase();
      const key = columns.some((c) => c.id === s) ? s : "todo";
      m[key].push(t);
    }
    return m;
  }, [rows, columns]);

  const updateTaskStatus = async (taskId: string, nextStatus: string) => {
    const prev = items.find((x) => x._id === taskId);
    const prevStatus = prev?.status || "todo";
    if ((prevStatus || "").toLowerCase() === nextStatus.toLowerCase()) return;

    setItems((p) => p.map((x) => (x._id === taskId ? { ...x, status: nextStatus } : x)));

    try {
      const r = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: nextStatus }),
      });
      if (r.ok) {
        const updated = await r.json();
        setItems((p) => p.map((x) => (x._id === taskId ? updated : x)));
        return;
      }
    } catch {
    }

    setItems((p) => p.map((x) => (x._id === taskId ? { ...x, status: prevStatus } : x)));
  };

  const getInitials = (name?: string) => {
    const s = (name || "").trim();
    if (!s) return "-";
    return s
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const openEmployeeProfile = (employeeId?: string, employeeName?: string) => {
    if (!employeeId) return;
    navigate(`/hrm/employees/${employeeId}`, {
      state: {
        dbId: employeeId,
        employee: { id: 0, name: employeeName || "Employee", initials: getInitials(employeeName || "") },
      },
    });
  };

  const PersonChip = ({ name }: { name?: string }) => {
    const display = (name || "").trim();
    if (!display) return <span className="text-muted-foreground">-</span>;
    const emp = employeeByName.get(display);
    const img = emp?.avatar || emp?.image;
    const clickable = !!emp?._id;
    return (
      <button
        type="button"
        className={clickable ? "flex items-center gap-2 text-primary hover:underline" : "flex items-center gap-2"}
        onClick={() => openEmployeeProfile(emp?._id, display)}
      >
        <Avatar className="h-6 w-6">
          {img ? <AvatarImage src={`${API_BASE}${img}`} alt={display} /> : null}
          <AvatarFallback className="text-[10px]">{getInitials(display)}</AvatarFallback>
        </Avatar>
        <span className="truncate max-w-[140px]">{display}</span>
      </button>
    );
  };

  const handleEdit = (t: TaskDoc) => {
    setEditingTaskId(t._id);
    setTaskForm({
      title: t.title || "",
      description: t.description || "",
      points: "1",
      assignTo: t.assignees?.[0]?.name || "",
      collaborators: (t.collaborators || []).join(", "),
      status: t.status || "todo",
      priority: t.priority || "medium",
      labels: (t.tags || []).join(", "),
      start: t.start ? new Date(t.start).toISOString().slice(0, 10) : "",
      deadline: t.deadline ? new Date(t.deadline).toISOString().slice(0, 10) : "",
    });
    setTaskSelectedFiles([]);
    setOpenAddTask(true);
  };

  const openTaskInfoDialog = (t: TaskDoc) => {
    setTaskInfo(t);
    setOpenTaskInfo(true);
    setChecklistDraft("");
    setSubTaskDraft("");
    setReminderDraft({ priority: "medium", title: "", date: "", time: "", repeat: "" });
    setCommentDraft("");
    setCommentFiles([]);
    setDepOpen(false);
    setDepBlockedBy("");
    setDepBlocking("");
    if (!t?._id) return;
    setTaskInfoLoading(true);
    fetch(`${API_BASE}/api/tasks/${t._id}`, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?._id) setTaskInfo(d);
      })
      .catch(() => {})
      .finally(() => setTaskInfoLoading(false));
  };

  const updateTask = async (taskId: string, patch: any) => {
    try {
      const r = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(patch),
      });
      if (r.ok) {
        const updated = await r.json();
        setTaskInfo(updated);
        setItems((p) => p.map((x) => (x._id === taskId ? updated : x)));
        setTaskInfo((p) => (p?._id === taskId ? updated : p));
        return { ok: true as const, updated };
      }
    } catch {
    }
    return { ok: false as const, updated: null as any };
  };

  const pushActivity = async (taskId: string, message: string) => {
    const current = taskInfo?._id === taskId ? taskInfo : items.find((x) => x._id === taskId);
    const author = (() => {
      try {
        const u = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
        if (!u) return "";
        const j = JSON.parse(u);
        return j?.name || j?.email || "";
      } catch {
        return "";
      }
    })();
    const next = [{ type: "update", message, authorName: author }, ...(current?.activity || [])];
    await updateTask(taskId, { activity: next });
  };

  const uploadCommentFiles = async () => {
    if (!commentFiles.length) return 0;
    try {
      let uploaded = 0;
      for (const f of commentFiles) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("name", f.name);
        const r = await fetch(`${API_BASE}/api/files`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: fd,
        });
        if (r.ok) uploaded += 1;
      }
      return uploaded;
    } catch {
      return 0;
    }
  };

  const cloneTask = async (t: TaskDoc) => {
    const payload: any = {
      title: t.title ? `${t.title} (copy)` : "Task (copy)",
      description: t.description || "",
      status: t.status || "todo",
      priority: t.priority || "medium",
      start: t.start,
      deadline: t.deadline,
      leadId: t.leadId,
      projectId: t.projectId,
      invoiceId: t.invoiceId,
      assignees: t.assignees || [],
      collaborators: t.collaborators || [],
      tags: t.tags || [],
    };
    try {
      const r = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        const created = await r.json();
        setItems((prev) => [created, ...prev]);
        toast.success("Task cloned");
        return;
      }
    } catch {
    }
    toast.error("Failed to clone");
  };

  const labelColors = [
    "bg-lime-500",
    "bg-emerald-500",
    "bg-sky-500",
    "bg-slate-400",
    "bg-yellow-500",
    "bg-orange-500",
    "bg-red-500",
    "bg-pink-500",
    "bg-fuchsia-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-blue-600",
  ];

  const handleDelete = async (t: TaskDoc) => {
    if (!confirm("Delete this task?")) return;
    try {
      const r = await fetch(`${API_BASE}/api/tasks/${t._id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (r.ok) {
        setItems((prev) => prev.filter((x) => x._id !== t._id));
        toast.success("Task deleted");
        return;
      }
    } catch {
    }
    setItems((prev) => prev.filter((x) => x._id !== t._id));
  };

  const fmt = (iso?: string) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toISOString().slice(0, 10);
    } catch {
      return "-";
    }
  };

  const statusLabel = (s?: string) => {
    const v = (s || "").toLowerCase();
    if (v === "in-progress") return "In progress";
    if (v === "todo") return "To do";
    if (v === "done") return "Done";
    if (v === "backlog") return "Backlog";
    if (v === "review") return "Review";
    return s || "-";
  };

  const fmtCompact = (iso?: string) => {
    if (!iso) return "";
    try {
      return new Date(iso).toISOString().slice(0, 10);
    } catch {
      return "";
    }
  };

  const ganttItems = useMemo(() => {
    const parse = (v?: string) => {
      if (!v) return null;
      const d = new Date(v);
      return Number.isFinite(d.getTime()) ? d : null;
    };
    return rows
      .map((t) => {
        const start = parse(t.start) || parse(t.deadline);
        const end = parse(t.deadline) || parse(t.start);
        if (!start || !end) return null;
        const s = start.getTime() <= end.getTime() ? start : end;
        const e = start.getTime() <= end.getTime() ? end : start;
        return { task: t, start: s, end: e };
      })
      .filter(Boolean) as Array<{ task: TaskDoc; start: Date; end: Date }>;
  }, [rows]);

  const ganttRange = useMemo(() => {
    if (!ganttItems.length) return null;
    let min = ganttItems[0].start;
    let max = ganttItems[0].end;
    for (const it of ganttItems) {
      if (it.start.getTime() < min.getTime()) min = it.start;
      if (it.end.getTime() > max.getTime()) max = it.end;
    }
    // pad 1 day on each side
    const oneDay = 24 * 60 * 60 * 1000;
    return {
      min: new Date(min.getTime() - oneDay),
      max: new Date(max.getTime() + oneDay),
    };
  }, [ganttItems]);

  const ganttDays = useMemo(() => {
    if (!ganttRange) return [] as Date[];
    const days: Date[] = [];
    const d = new Date(ganttRange.min);
    d.setHours(0, 0, 0, 0);
    const end = new Date(ganttRange.max);
    end.setHours(0, 0, 0, 0);
    while (d.getTime() <= end.getTime() && days.length < 120) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [ganttRange]);

  return (
    <div className="p-4 space-y-4">
      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="text-lg font-semibold">Tasks</div>
                <TabsList className="bg-muted/40">
                  <TabsTrigger value="list">List</TabsTrigger>
                  <TabsTrigger value="kanban">Kanban</TabsTrigger>
                  <TabsTrigger value="gantt">Gantt</TabsTrigger>
                </TabsList>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => { void loadLabels(); setOpenManageLabels(true); }}>
                  <Tag className="w-4 h-4 mr-2" />
                  Manage labels
                </Button>
                <Button type="button" variant="outline" onClick={() => load()} disabled={loading}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button type="button" onClick={() => { resetTaskForm(); setOpenAddTask(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add task
                </Button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end">
              <Input className="w-64" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-6 gap-2">
              <Select value={filters.status || "__any__"} onValueChange={(v) => setFilters((p) => ({ ...p, status: v === "__any__" ? "" : v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">- Status -</SelectItem>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="todo">To do</SelectItem>
                  <SelectItem value="in-progress">In progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.priority || "__any__"} onValueChange={(v) => setFilters((p) => ({ ...p, priority: v === "__any__" ? "" : v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">- Priority -</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Minor</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.assignedTo || "__any__"} onValueChange={(v) => setFilters((p) => ({ ...p, assignedTo: v === "__any__" ? "" : v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Assigned to" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">- Assigned to -</SelectItem>
                  {employeeNames.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.tag || "__any__"} onValueChange={(v) => setFilters((p) => ({ ...p, tag: v === "__any__" ? "" : v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Label" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">- Label -</SelectItem>
                  {labels.map((l) => (
                    <SelectItem key={l._id} value={l.name}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input className="h-9" type="date" value={filters.deadlineFrom} onChange={(e) => setFilters((p) => ({ ...p, deadlineFrom: e.target.value }))} />
              <Input className="h-9" type="date" value={filters.deadlineTo} onChange={(e) => setFilters((p) => ({ ...p, deadlineTo: e.target.value }))} />
            </div>

            <div className="mt-2 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setFilters({ status: "", priority: "", assignedTo: "", tag: "", deadlineFrom: "", deadlineTo: "" });
                window.setTimeout(() => load({ status: "", priority: "", assignedTo: "", tag: "", deadlineFrom: "", deadlineTo: "" }), 0);
              }}>Clear</Button>
              <Button type="button" onClick={() => load()}>Apply</Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <TabsContent value="list" className="m-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-20">ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Start date</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Assigned to</TableHead>
                    <TableHead>Collaborators</TableHead>
                    <TableHead>Related to</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-28"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length ? (
                    rows.map((t) => (
                      <TableRow key={t._id} className="hover:bg-muted/30">
                        <TableCell className="text-xs text-muted-foreground">{t.taskNo ? `#${t.taskNo}` : String(t._id || "").slice(-6)}</TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="text-primary underline"
                            onClick={() => openTaskInfoDialog(t)}
                          >
                            {t.title || "-"}
                          </button>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{fmt(t.start)}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmt(t.deadline)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <PersonChip name={t.assignees?.[0]?.name} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {Array.isArray(t.collaborators) && t.collaborators.length ? (
                            <div className="flex items-center gap-2">
                              {t.collaborators.slice(0, 3).map((n) => (
                                <PersonChip key={n} name={n} />
                              ))}
                              {t.collaborators.length > 3 ? (
                                <span className="text-xs text-muted-foreground">+{t.collaborators.length - 3}</span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {t.leadId ? (
                            <button
                              type="button"
                              className="text-primary underline truncate max-w-[220px] text-left"
                              onClick={() => navigate(`/crm/leads/${t.leadId}`)}
                            >
                              {leadNameByLeadId.get(String(t.leadId)) || "Lead"}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline">{statusLabel(t.status)}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button type="button" size="icon" variant="ghost" onClick={() => handleEdit(t)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" onClick={() => handleDelete(t)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No record found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="kanban" className="m-0">
              <div className="flex gap-3 overflow-x-auto pb-3 p-4">
                {columns.map((c) => (
                  <div key={c.id} className="flex-shrink-0 w-[280px]">
                    <Card className="h-full">
                      <CardHeader className="p-3 pb-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{c.title}</div>
                          <div className="text-xs text-muted-foreground">{kanbanGroups[c.id]?.length || 0}</div>
                        </div>
                        <div className={`h-0.5 mt-2 rounded ${c.color}`} />
                      </CardHeader>
                      <CardContent
                        className={`p-2 pt-0 space-y-2 min-h-[140px] ${dragOverStatus === c.id ? "bg-muted/30" : ""}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverStatus(c.id);
                        }}
                        onDragLeave={() => setDragOverStatus((s) => (s === c.id ? null : s))}
                        onDrop={(e) => {
                          e.preventDefault();
                          const taskId = e.dataTransfer.getData("text/taskId") || draggingTaskIdRef.current;
                          setDragOverStatus(null);
                          if (!taskId) return;
                          void updateTaskStatus(taskId, c.id);
                          draggingTaskIdRef.current = null;
                          draggingFromStatusRef.current = null;
                        }}
                      >
                        {(kanbanGroups[c.id] || []).map((t) => (
                          <div
                            key={t._id}
                            draggable
                            onDragStart={(e) => {
                              draggingTaskIdRef.current = t._id;
                              draggingFromStatusRef.current = t.status || "todo";
                              e.dataTransfer.setData("text/taskId", t._id);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragEnd={() => {
                              draggingTaskIdRef.current = null;
                              draggingFromStatusRef.current = null;
                              setDragOverStatus(null);
                            }}
                            className="kanban-card cursor-grab active:cursor-grabbing"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <button
                                type="button"
                                className="font-medium text-sm truncate text-left"
                                onClick={() => openTaskInfoDialog(t)}
                              >
                                {t.taskNo ? `#${t.taskNo} ` : ""}{t.title || "-"}
                              </button>

                              <div className="flex items-center gap-1">
                                <Button type="button" variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); handleEdit(t); }} aria-label="Edit">
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); handleDelete(t); }} aria-label="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="text-xs text-muted-foreground mt-2">
                              Deadline: {fmt(t.deadline)}
                            </div>

                            <div className="flex items-center justify-between mt-3">
                              <div className="text-xs text-muted-foreground truncate">
                                {t.assignees?.[0]?.name || "-"}
                              </div>
                              <Avatar className="h-6 w-6">
                                {(() => {
                                  const name = t.assignees?.[0]?.name;
                                  const emp = name ? employeeByName.get(String(name).trim()) : undefined;
                                  const img = emp?.avatar || emp?.image;
                                  return img ? <AvatarImage src={`${API_BASE}${img}`} alt="avatar" /> : null;
                                })()}
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(t.assignees?.[0]?.name)}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="gantt" className="m-0">
              <div className="p-4">
                {!ganttItems.length ? (
                  <div className="p-6 text-sm text-muted-foreground">No tasks with start/deadline dates.</div>
                ) : (
                  <div className="overflow-auto border rounded-md">
                    <div className="min-w-[900px]">
                      <div className="grid" style={{ gridTemplateColumns: `320px repeat(${ganttDays.length}, 28px)` }}>
                        <div className="sticky left-0 bg-card border-b px-3 py-2 text-xs font-medium">Task</div>
                        {ganttDays.map((d) => (
                          <div key={d.toISOString()} className="border-b text-[10px] text-muted-foreground flex items-center justify-center">
                            {String(d.getDate()).padStart(2, "0")}
                          </div>
                        ))}
                      </div>

                      {ganttItems.map(({ task, start, end }) => {
                        const minT = ganttRange!.min.getTime();
                        const dayMs = 24 * 60 * 60 * 1000;
                        const offsetDays = Math.max(0, Math.floor((start.getTime() - minT) / dayMs));
                        const widthDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / dayMs) + 1);
                        return (
                          <div
                            key={task._id}
                            className="grid items-stretch"
                            style={{ gridTemplateColumns: `320px repeat(${ganttDays.length}, 28px)` }}
                          >
                            <div className="sticky left-0 bg-card border-b px-3 py-2">
                              <button
                                type="button"
                                className="text-sm text-left hover:underline"
                                onClick={() => openTaskInfoDialog(task)}
                              >
                                <span className="text-xs text-muted-foreground mr-2">
                                  {task.taskNo ? `#${task.taskNo}` : ""}
                                </span>
                                {task.title || "-"}
                              </button>
                              <div className="text-[11px] text-muted-foreground mt-1">
                                {fmtCompact(task.start) || "-"} → {fmtCompact(task.deadline) || "-"}
                              </div>
                            </div>
                            <div className="relative border-b" style={{ gridColumn: `2 / span ${ganttDays.length}` }}>
                              <div
                                className="absolute top-2 h-5 rounded bg-blue-600/80"
                                style={{ left: `${offsetDays * 28}px`, width: `${widthDays * 28}px` }}
                                title={`${task.title || ""} (${fmtCompact(task.start)} - ${fmtCompact(task.deadline)})`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      <Dialog open={openAddTask} onOpenChange={setOpenAddTask}>
        <DialogContent className="bg-card max-w-3xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingTaskId ? "Edit task" : "Add task"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-5 items-center">
              <div className="text-sm text-muted-foreground sm:col-span-1">Title</div>
              <Input className="sm:col-span-4" placeholder="Title" value={taskForm.title} onChange={(e)=>setTaskForm((p)=>({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-5 items-start">
              <div className="text-sm text-muted-foreground sm:col-span-1">Description</div>
              <Textarea className="sm:col-span-4" placeholder="Description" value={taskForm.description} onChange={(e)=>setTaskForm((p)=>({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-5 items-center">
              <div className="text-sm text-muted-foreground sm:col-span-1">Points</div>
              <Select value={taskForm.points} onValueChange={(v)=>setTaskForm((p)=>({ ...p, points: v }))}>
                <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="1 Point"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Point</SelectItem>
                  <SelectItem value="2">2 Points</SelectItem>
                  <SelectItem value="3">3 Points</SelectItem>
                  <SelectItem value="4">4 Points</SelectItem>
                  <SelectItem value="5">5 Points</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-5 items-center">
              <div className="text-sm text-muted-foreground sm:col-span-1">Assign to</div>
              <Select value={taskForm.assignTo || "__none__"} onValueChange={(v)=>setTaskForm((p)=>({ ...p, assignTo: v === "__none__" ? "" : v }))}>
                <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="Mindspire tech"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-</SelectItem>
                  {employeeNames.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-5 items-center">
              <div className="text-sm text-muted-foreground sm:col-span-1">Collaborators</div>
              <div className="sm:col-span-4">
                <Input
                  list="tasks-module-collaborators"
                  placeholder="Collaborators (comma separated)"
                  value={taskForm.collaborators}
                  onChange={(e)=>setTaskForm((p)=>({ ...p, collaborators: e.target.value }))}
                />
                <datalist id="tasks-module-collaborators">
                  {employeeNames.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-5 items-center">
              <div className="text-sm text-muted-foreground sm:col-span-1">Status</div>
              <Select value={taskForm.status} onValueChange={(v)=>setTaskForm((p)=>({ ...p, status: v }))}>
                <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="To do"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To do</SelectItem>
                  <SelectItem value="in-progress">In progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-5 items-center">
              <div className="text-sm text-muted-foreground sm:col-span-1">Priority</div>
              <Select value={taskForm.priority} onValueChange={(v)=>setTaskForm((p)=>({ ...p, priority: v }))}>
                <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="Priority"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Minor</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-5 items-center">
              <div className="text-sm text-muted-foreground sm:col-span-1">Labels</div>
              <Input className="sm:col-span-4" placeholder="Labels" value={taskForm.labels} onChange={(e)=>setTaskForm((p)=>({ ...p, labels: e.target.value }))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-5 items-center">
              <div className="text-sm text-muted-foreground sm:col-span-1">Start date</div>
              <Input className="sm:col-span-4" type="date" placeholder="YYYY-MM-DD" value={taskForm.start} onChange={(e)=>setTaskForm((p)=>({ ...p, start: e.target.value }))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-5 items-center">
              <div className="text-sm text-muted-foreground sm:col-span-1">Deadline</div>
              <Input className="sm:col-span-4" type="date" placeholder="YYYY-MM-DD" value={taskForm.deadline} onChange={(e)=>setTaskForm((p)=>({ ...p, deadline: e.target.value }))} />
            </div>
          </div>

          <DialogFooter className="items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="file"
                multiple
                className="hidden"
                id="tasks-module-files"
                onChange={(e) => setTaskSelectedFiles(Array.from(e.target.files || []))}
              />
              <Button type="button" variant="outline" onClick={() => document.getElementById("tasks-module-files")?.click()} disabled={taskUploading}>
                <Paperclip className="w-4 h-4 mr-2" />
                Upload File
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => toast.success("Voice note coming soon")}> <Mic className="w-4 h-4" /> </Button>
              <div className="text-xs text-muted-foreground truncate">
                {taskSelectedFiles.length ? `${taskSelectedFiles.length} file(s) selected` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenAddTask(false)}>Close</Button>
              <Button type="button" variant="secondary" onClick={() => saveTask("save_show")} disabled={taskUploading}>Save & show</Button>
              <Button type="button" onClick={() => saveTask("save")} disabled={taskUploading}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openManageLabels} onOpenChange={setOpenManageLabels}>
        <DialogContent className="bg-card max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Manage labels</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {labelColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`h-6 w-6 rounded ${c} ${manageLabelColor === c ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}
                  onClick={() => setManageLabelColor(c)}
                  aria-label={c}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Input placeholder="Label" value={manageLabelName} onChange={(e) => setManageLabelName(e.target.value)} />
              <Button type="button" onClick={createLabel}>Save</Button>
            </div>

            <Separator />

            <div className="space-y-2">
              {labels.length ? (
                labels.map((l) => (
                  <div key={l._id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-2.5 w-2.5 rounded-full ${l.color || "bg-slate-300"}`} />
                      <div className="truncate">{l.name}</div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => deleteLabel(l._id)} className="text-destructive">
                      Delete
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No labels</div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenManageLabels(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openTaskInfo} onOpenChange={setOpenTaskInfo}>
        <DialogContent className="bg-card max-w-4xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <div>
                  Task info {taskInfo?.taskNo ? `#${taskInfo.taskNo}` : taskInfo?._id ? `#${String(taskInfo._id).slice(-6)}` : ""}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    if (!taskInfo?._id) return;
                    setOpenTaskInfo(false);
                    navigate(`/tasks/${taskInfo._id}`);
                  }}
                  aria-label="Open"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium truncate">{taskInfo?.title || "-"}</div>
                  {taskInfoLoading ? (
                    <div className="text-xs text-muted-foreground">Loading...</div>
                  ) : null}
                  {taskInfo?.leadId ? (
                    <button
                      type="button"
                      className="text-sm text-primary underline"
                      onClick={() => navigate(`/crm/leads/${taskInfo.leadId}`)}
                    >
                      Lead: {leadNameByLeadId.get(String(taskInfo.leadId)) || "Lead"}
                    </button>
                  ) : null}
                </div>

                <Separator />

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Checklist</div>
                  <div className="text-xs text-muted-foreground">
                    {(taskInfo?.checklist || []).filter((x) => !!x?.done).length}/{(taskInfo?.checklist || []).length}
                  </div>

                  <div className="space-y-2">
                    {(taskInfo?.checklist || []).map((it, idx) => (
                      <div key={it._id || String(idx)} className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={!!it.done}
                            onChange={async () => {
                              if (!taskInfo?._id) return;
                              const next = (taskInfo.checklist || []).map((x, i) => (i === idx ? { ...x, done: !x.done } : x));
                              const r = await updateTask(taskInfo._id, { checklist: next });
                              if (r.ok) void pushActivity(taskInfo._id, `Updated checklist item`);
                            }}
                          />
                          <span className={it.done ? "line-through text-muted-foreground truncate" : "truncate"}>{it.text || "-"}</span>
                        </label>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={async () => {
                            if (!taskInfo?._id) return;
                            const next = (taskInfo.checklist || []).filter((_, i) => i !== idx);
                            const r = await updateTask(taskInfo._id, { checklist: next });
                            if (r.ok) void pushActivity(taskInfo._id, `Removed checklist item`);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    <Input placeholder="Add item" value={checklistDraft} onChange={(e) => setChecklistDraft(e.target.value)} />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={async () => {
                          const text = (checklistDraft || "").trim();
                          if (!text || !taskInfo?._id) return;
                          const next = [{ text, done: false }, ...(taskInfo.checklist || [])];
                          const r = await updateTask(taskInfo._id, { checklist: next });
                          if (r.ok) {
                            setChecklistDraft("");
                            void pushActivity(taskInfo._id, `Added checklist item`);
                          }
                        }}
                      >
                        Add
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setChecklistDraft("")}>Cancel</Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Sub tasks</div>
                  <div className="space-y-2">
                    {(taskInfo?.subTasks || []).map((st, idx) => (
                      <div key={st._id || String(idx)} className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={!!st.done}
                            onChange={async () => {
                              if (!taskInfo?._id) return;
                              const next = (taskInfo.subTasks || []).map((x, i) => (i === idx ? { ...x, done: !x.done } : x));
                              const r = await updateTask(taskInfo._id, { subTasks: next });
                              if (r.ok) void pushActivity(taskInfo._id, `Updated sub task`);
                            }}
                          />
                          <span className={st.done ? "line-through text-muted-foreground truncate" : "truncate"}>{st.title || "-"}</span>
                        </label>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={async () => {
                            if (!taskInfo?._id) return;
                            const next = (taskInfo.subTasks || []).filter((_, i) => i !== idx);
                            const r = await updateTask(taskInfo._id, { subTasks: next });
                            if (r.ok) void pushActivity(taskInfo._id, `Removed sub task`);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    <Input placeholder="Create a sub task" value={subTaskDraft} onChange={(e) => setSubTaskDraft(e.target.value)} />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={async () => {
                          const title = (subTaskDraft || "").trim();
                          if (!title || !taskInfo?._id) return;
                          const next = [{ title, done: false }, ...(taskInfo.subTasks || [])];
                          const r = await updateTask(taskInfo._id, { subTasks: next });
                          if (r.ok) {
                            setSubTaskDraft("");
                            void pushActivity(taskInfo._id, `Added sub task`);
                          }
                        }}
                      >
                        Create
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setSubTaskDraft("")}>Cancel</Button>
                    </div>

                    <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setDepOpen((s) => !s)}>
                      Add dependency
                    </Button>

                    {depOpen ? (
                      <div className="border rounded-md p-3 space-y-2">
                        <div className="text-xs text-muted-foreground">This task blocked by</div>
                        <Select value={depBlockedBy || "__none__"} onValueChange={(v) => setDepBlockedBy(v === "__none__" ? "" : v)}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select task" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">-</SelectItem>
                            {rows.filter((x) => x._id !== taskInfo?._id).slice(0, 50).map((t) => (
                              <SelectItem key={t._id} value={t._id}>{t.taskNo ? `#${t.taskNo}` : ""} {t.title || "Task"}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="text-xs text-muted-foreground">This task blocking</div>
                        <Select value={depBlocking || "__none__"} onValueChange={(v) => setDepBlocking(v === "__none__" ? "" : v)}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select task" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">-</SelectItem>
                            {rows.filter((x) => x._id !== taskInfo?._id).slice(0, 50).map((t) => (
                              <SelectItem key={t._id} value={t._id}>{t.taskNo ? `#${t.taskNo}` : ""} {t.title || "Task"}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={async () => {
                              if (!taskInfo?._id) return;
                              const next = {
                                blockedBy: depBlockedBy ? [depBlockedBy] : [],
                                blocking: depBlocking ? [depBlocking] : [],
                              };
                              const r = await updateTask(taskInfo._id, { dependencies: next });
                              if (r.ok) {
                                void pushActivity(taskInfo._id, `Updated dependencies`);
                                setDepOpen(false);
                              }
                            }}
                          >
                            Add
                          </Button>
                          <Button type="button" variant="outline" onClick={() => { setDepOpen(false); setDepBlockedBy(""); setDepBlocking(""); }}>Cancel</Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Description</div>
                  <div className="text-sm whitespace-pre-wrap">{taskInfo?.description || "-"}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Write a comment...</div>
                  <Textarea placeholder="Write a comment..." value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} />

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        id="tasks-taskinfo-comment-files"
                        onChange={(e) => setCommentFiles(Array.from(e.target.files || []))}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("tasks-taskinfo-comment-files")?.click()}>
                        <Paperclip className="w-4 h-4 mr-2" />
                        Upload File
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => toast.success("Voice note coming soon")}> <Mic className="w-4 h-4" /> </Button>
                      <div className="text-xs text-muted-foreground truncate">
                        {commentFiles.length ? `${commentFiles.length} file(s) selected` : ""}
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={async () => {
                        const text = (commentDraft || "").trim();
                        if (!taskInfo?._id || !text) return;
                        const attachmentCount = await uploadCommentFiles();
                        const author = (() => {
                          try {
                            const u = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
                            if (!u) return "";
                            const j = JSON.parse(u);
                            return j?.name || j?.email || "";
                          } catch {
                            return "";
                          }
                        })();
                        const next = [{ authorName: author, text, attachmentCount }, ...(taskInfo.taskComments || [])];
                        const r = await updateTask(taskInfo._id, {
                          taskComments: next,
                          comments: next.length,
                          attachments: (taskInfo.attachments || 0) + attachmentCount,
                        });
                        if (r.ok) {
                          setCommentDraft("");
                          setCommentFiles([]);
                          void pushActivity(taskInfo._id, `Posted a comment`);
                        } else {
                          toast.error("Failed to post comment");
                        }
                      }}
                    >
                      Post Comment
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Activity</div>
                    {(taskInfo?.activity || []).length ? (
                      <div className="space-y-2">
                        {(taskInfo?.activity || []).slice(0, 20).map((a, idx) => (
                          <div key={a._id || String(idx)} className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{a.authorName || ""}</span>
                            {a.authorName ? " " : ""}
                            {a.message || a.type || ""}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">No activity yet.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{taskInfo?.assignees?.[0]?.name || "-"}</div>
                  <Select
                    value={(taskInfo?.status || "todo")}
                    onValueChange={async (v) => {
                      if (!taskInfo?._id) return;
                      const r = await updateTask(taskInfo._id, { status: v });
                      if (r.ok) void pushActivity(taskInfo._id, `Status changed to ${statusLabel(v)}`);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To do</SelectItem>
                      <SelectItem value="in-progress">In progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Start date</div>
                    <Input
                      type="date"
                      value={taskInfo?.start ? new Date(taskInfo.start).toISOString().slice(0, 10) : ""}
                      onChange={async (e) => {
                        if (!taskInfo?._id) return;
                        const v = e.target.value;
                        const r = await updateTask(taskInfo._id, { start: v || undefined });
                        if (r.ok) void pushActivity(taskInfo._id, `Start date updated`);
                      }}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Deadline</div>
                    <Input
                      type="date"
                      value={taskInfo?.deadline ? new Date(taskInfo.deadline).toISOString().slice(0, 10) : ""}
                      onChange={async (e) => {
                        if (!taskInfo?._id) return;
                        const v = e.target.value;
                        const r = await updateTask(taskInfo._id, { deadline: v || undefined });
                        if (r.ok) void pushActivity(taskInfo._id, `Deadline updated`);
                      }}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="text-sm">
                  <div className="text-xs text-muted-foreground">Priority</div>
                  <Select
                    value={(taskInfo?.priority || "medium")}
                    onValueChange={async (v) => {
                      if (!taskInfo?._id) return;
                      const r = await updateTask(taskInfo._id, { priority: v });
                      if (r.ok) void pushActivity(taskInfo._id, `Priority updated`);
                    }}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Critical</SelectItem>
                      <SelectItem value="high">Major</SelectItem>
                      <SelectItem value="medium">Minor</SelectItem>
                      <SelectItem value="low">Blocker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm">
                  <div className="text-xs text-muted-foreground">Label</div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={((taskInfo?.tags || [])[0] || "__none__")}
                      onValueChange={async (v) => {
                        if (!taskInfo?._id) return;
                        const nextTags = v === "__none__" ? [] : [v];
                        const r = await updateTask(taskInfo._id, { tags: nextTags });
                        if (r.ok) void pushActivity(taskInfo._id, `Label updated`);
                      }}
                    >
                      <SelectTrigger className="h-9"><SelectValue placeholder="Add Label" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-</SelectItem>
                        {labels.map((l) => (
                          <SelectItem key={l._id} value={l.name}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="text-sm">
                  <div className="text-xs text-muted-foreground">Collaborators</div>
                  {Array.isArray(taskInfo?.collaborators) && taskInfo?.collaborators?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {taskInfo!.collaborators!.slice(0, 4).map((n) => (
                        <PersonChip key={n} name={n} />
                      ))}
                      {taskInfo!.collaborators!.length > 4 ? (
                        <span className="text-xs text-muted-foreground">+{taskInfo!.collaborators!.length - 4}</span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="font-medium">-</div>
                  )}
                </div>

                <div className="text-sm">
                  <div className="text-xs text-muted-foreground">Reminders (Private):</div>
                  <button type="button" className="text-primary underline text-sm" onClick={() => setReminderDraft((p) => ({ ...p }))}>+ Add reminder</button>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Input placeholder="Title" value={reminderDraft.title} onChange={(e) => setReminderDraft((p) => ({ ...p, title: e.target.value }))} className="h-9" />
                    <Select value={reminderDraft.priority} onValueChange={(v) => setReminderDraft((p) => ({ ...p, priority: v }))}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Priority" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Minor</SelectItem>
                        <SelectItem value="high">Major</SelectItem>
                        <SelectItem value="urgent">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="date" value={reminderDraft.date} onChange={(e) => setReminderDraft((p) => ({ ...p, date: e.target.value }))} className="h-9" />
                    <Input type="time" value={reminderDraft.time} onChange={(e) => setReminderDraft((p) => ({ ...p, time: e.target.value }))} className="h-9" />
                    <Input placeholder="Repeat" value={reminderDraft.repeat} onChange={(e) => setReminderDraft((p) => ({ ...p, repeat: e.target.value }))} className="h-9 col-span-2" />
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      type="button"
                      onClick={async () => {
                        if (!taskInfo?._id) return;
                        const title = (reminderDraft.title || "").trim();
                        if (!title) return;
                        const when = reminderDraft.date
                          ? new Date(`${reminderDraft.date}T${reminderDraft.time || "00:00"}:00`).toISOString()
                          : undefined;
                        const next = [{
                          title,
                          when,
                          repeat: (reminderDraft.repeat || "").trim(),
                          priority: reminderDraft.priority,
                        }, ...(taskInfo.reminders || [])];
                        const r = await updateTask(taskInfo._id, { reminders: next });
                        if (r.ok) {
                          setReminderDraft({ priority: "medium", title: "", date: "", time: "", repeat: "" });
                          void pushActivity(taskInfo._id, `Added reminder`);
                        }
                      }}
                    >
                      Add
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setReminderDraft({ priority: "medium", title: "", date: "", time: "", repeat: "" })}>Cancel</Button>
                  </div>

                  {(taskInfo?.reminders || []).length ? (
                    <div className="mt-3 space-y-2">
                      {(taskInfo?.reminders || []).slice(0, 5).map((r, idx) => (
                        <div key={r._id || String(idx)} className="flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{r.title}</div>
                            <div className="text-muted-foreground truncate">{fmt(r.when as any) || ""}</div>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={async () => {
                              if (!taskInfo?._id) return;
                              const next = (taskInfo.reminders || []).filter((_, i) => i !== idx);
                              const rr = await updateTask(taskInfo._id, { reminders: next });
                              if (rr.ok) void pushActivity(taskInfo._id, `Removed reminder`);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-2">No record found.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex items-center justify-end gap-2 w-full">
              <Button type="button" variant="outline" onClick={() => taskInfo && cloneTask(taskInfo)} disabled={!taskInfo}>Clone task</Button>
              <Button type="button" variant="secondary" onClick={() => { if (taskInfo) handleEdit(taskInfo); setOpenTaskInfo(false); }} disabled={!taskInfo}>Edit task</Button>
              <Button type="button" variant="outline" onClick={() => setOpenTaskInfo(false)}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
