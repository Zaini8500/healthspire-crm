import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCcw, Settings, Printer, FileDown, LayoutGrid, ChevronLeft, ChevronRight, GripVertical, Paperclip, Mic, CalendarDays, Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const API_BASE = "http://localhost:5000";

interface Project {
  id: string;
  title: string;
  clientId?: string;
  client?: string;
  price?: number;
  start?: string; // ISO
  deadline?: string; // ISO
  status?: string;
  description?: string;
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  start: string;
  deadline: string;
  priority: string;
}

interface ContractRow {
  id: string;
  title: string;
  amount: string;
  contractDate: string;
  validUntil: string;
  status: string;
}

interface SimpleItem { id: string; text: string; at?: string }
interface FileItem { id: string; name: string; size?: number }
interface InvoiceItem { id: string; number?: string; total?: number; status?: string; date?: string }
interface PaymentItem { id: string; amount?: number; date?: string; method?: string }
interface ExpenseItem { id: string; title?: string; amount?: number; date?: string; category?: string }
interface TimesheetItem { id: string; user?: string; date?: string; hours?: number; task?: string }
interface MilestoneItem { id: string; title?: string; due?: string; status?: string }
interface FeedbackItem { id: string; author?: string; text?: string; at?: string }

export default function ProjectOverviewPage() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [activity, setActivity] = useState<Array<{ id: string; text: string; at: string }>>([]);
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
  const [showProjectCountdown, setShowProjectCountdown] = useState(false);
  const [deadlineAlerted, setDeadlineAlerted] = useState(false);
  const [editDeadline, setEditDeadline] = useState("");
  const [taskQuery, setTaskQuery] = useState("");
  const [taskStatus, setTaskStatus] = useState("__all__");
  const [taskPriority, setTaskPriority] = useState("__all__");
  const [taskQuickFilter, setTaskQuickFilter] = useState("__none__");
  const [taskMilestoneFilter, setTaskMilestoneFilter] = useState("__all__");
  const [taskLabelFilter, setTaskLabelFilter] = useState("__all__");
  const [taskAssignedFilter, setTaskAssignedFilter] = useState("__all__");
  const [taskDeadlineFilter, setTaskDeadlineFilter] = useState("__all__");
  const [taskPageSize, setTaskPageSize] = useState("10");
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [notes, setNotes] = useState<SimpleItem[]>([]);
  const [comments, setComments] = useState<SimpleItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetItem[]>([]);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newComment, setNewComment] = useState("");

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState("todo");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskStart, setNewTaskStart] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPoints, setNewTaskPoints] = useState<number | "">(1);
  const [newTaskMilestoneId, setNewTaskMilestoneId] = useState("__none__");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskCollaborators, setNewTaskCollaborators] = useState("");
  const [newTaskLabels, setNewTaskLabels] = useState("");

  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDue, setNewMilestoneDue] = useState("");
  const [newMilestoneStatus, setNewMilestoneStatus] = useState("Open");
  const [milestoneStatusFilter, setMilestoneStatusFilter] = useState("__all__");

  const [showAddFile, setShowAddFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileSize, setNewFileSize] = useState<number | "">("");

  const [showAddFeedback, setShowAddFeedback] = useState(false);
  const [newFeedbackAuthor, setNewFeedbackAuthor] = useState("");
  const [newFeedbackText, setNewFeedbackText] = useState("");

  const [showAddTimesheet, setShowAddTimesheet] = useState(false);
  const [newTimesheetDate, setNewTimesheetDate] = useState("");
  const [newTimesheetUser, setNewTimesheetUser] = useState("");
  const [newTimesheetTask, setNewTimesheetTask] = useState("");
  const [newTimesheetHours, setNewTimesheetHours] = useState<number | "">("");

  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [newInvoiceNumber, setNewInvoiceNumber] = useState("");
  const [newInvoiceDate, setNewInvoiceDate] = useState("");
  const [newInvoiceStatus, setNewInvoiceStatus] = useState("Draft");
  const [newInvoiceTotal, setNewInvoiceTotal] = useState<number | "">("");

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPaymentDate, setNewPaymentDate] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("Cash");
  const [newPaymentAmount, setNewPaymentAmount] = useState<number | "">("");

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpenseTitle, setNewExpenseTitle] = useState("");
  const [newExpenseDate, setNewExpenseDate] = useState("");
  const [newExpenseCategory, setNewExpenseCategory] = useState("General");
  const [newExpenseAmount, setNewExpenseAmount] = useState<number | "">("");

  const [showAddContract, setShowAddContract] = useState(false);
  const [newContractTitle, setNewContractTitle] = useState("");
  const [newContractAmount, setNewContractAmount] = useState<number | "">("");
  const [newContractDate, setNewContractDate] = useState("");
  const [newContractValidUntil, setNewContractValidUntil] = useState("");
  const [newContractStatus, setNewContractStatus] = useState("Open");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/projects/${id}`);
        if (r.ok) {
          const d = await r.json();
          setProject({
            id: String(d._id || id),
            title: d.title || "-",
            clientId: d.clientId ? String(d.clientId) : undefined,
            client: d.client || "-",
            price: d.price,
            start: d.start ? new Date(d.start).toISOString() : undefined,
            deadline: d.deadline ? new Date(d.deadline).toISOString() : undefined,
            status: d.status || "Open",
            description: d.description || "",
          });
        }
      } catch {}
    })();
  }, [id]);

  useEffect(() => {
    setDeadlineAlerted(false);
  }, [id, project?.deadline]);

  useEffect(() => {
    if (!project?.deadline) {
      setEditDeadline("");
      return;
    }
    const dt = new Date(project.deadline);
    if (Number.isNaN(dt.getTime())) {
      setEditDeadline("");
      return;
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    setEditDeadline(local);
  }, [project?.deadline]);

  useEffect(() => {
    const t = window.setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Load contracts and related items (best-effort; ignore errors)
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/contracts?projectId=${id}`);
        if (r.ok) {
          const data = await r.json();
          setContracts((Array.isArray(data) ? data : []).map((c:any)=> ({
            id: String(c._id || ""),
            title: c.title || "-",
            amount: c.amount != null ? String(c.amount) : "-",
            contractDate: c.contractDate ? new Date(c.contractDate).toISOString().slice(0,10) : "-",
            validUntil: c.validUntil ? new Date(c.validUntil).toISOString().slice(0,10) : "-",
            status: c.status || "Open",
          })));
        }
      } catch {}
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      // best-effort fetches; fallbacks are empty arrays
      const safeFetch = async (path: string) => {
        try { const r = await fetch(path); if (!r.ok) return []; return await r.json(); } catch { return []; }
      };
      const [notesRes, commentsRes, filesRes, invoicesRes, paymentsRes, expensesRes, timesheetsRes, milestonesRes, feedbackRes] = await Promise.all([
        safeFetch(`${API_BASE}/api/notes?projectId=${id}`),
        safeFetch(`${API_BASE}/api/comments?projectId=${id}`),
        safeFetch(`${API_BASE}/api/files?projectId=${id}`),
        safeFetch(`${API_BASE}/api/invoices?projectId=${id}`),
        safeFetch(`${API_BASE}/api/payments?projectId=${id}`),
        safeFetch(`${API_BASE}/api/expenses?projectId=${id}`),
        safeFetch(`${API_BASE}/api/timesheets?projectId=${id}`),
        safeFetch(`${API_BASE}/api/milestones?projectId=${id}`),
        safeFetch(`${API_BASE}/api/feedback?projectId=${id}`),
      ]);
      setNotes((Array.isArray(notesRes) ? notesRes : []).map((n:any)=> ({ id: String(n._id || crypto.randomUUID()), text: String(n.text || n.note || "-"), at: n.at ? new Date(n.at).toISOString().slice(0,10) : undefined })));
      setComments((Array.isArray(commentsRes) ? commentsRes : []).map((n:any)=> ({ id: String(n._id || crypto.randomUUID()), text: String(n.text || n.comment || "-"), at: n.at ? new Date(n.at).toISOString().slice(0,10) : undefined })));
      setFiles((Array.isArray(filesRes) ? filesRes : []).map((f:any)=> ({ id: String(f._id || crypto.randomUUID()), name: f.name || f.filename || "file", size: f.size })));      
      setInvoices((Array.isArray(invoicesRes) ? invoicesRes : []).map((i:any)=> ({ id: String(i._id || ""), number: i.number || i.code, total: i.total ?? i.amount, status: i.status, date: i.date ? new Date(i.date).toISOString().slice(0,10) : undefined })));
      setPayments((Array.isArray(paymentsRes) ? paymentsRes : []).map((p:any)=> ({ id: String(p._id || ""), amount: p.amount ?? p.total, date: p.date ? new Date(p.date).toISOString().slice(0,10) : undefined, method: p.method })));
      setExpenses((Array.isArray(expensesRes) ? expensesRes : []).map((e:any)=> ({ id: String(e._id || ""), title: e.title || e.category || "-", amount: e.amount ?? e.total, date: e.date ? new Date(e.date).toISOString().slice(0,10) : undefined, category: e.category })));
      setTimesheets((Array.isArray(timesheetsRes) ? timesheetsRes : []).map((t:any)=> ({ id: String(t._id || ""), user: t.user || t.member || "-", date: t.date ? new Date(t.date).toISOString().slice(0,10) : "-", hours: Number(t.hours ?? 0), task: t.task || "-" })));
      setMilestones((Array.isArray(milestonesRes) ? milestonesRes : []).map((m:any)=> ({ id: String(m._id || ""), title: m.title || "-", due: m.due ? new Date(m.due).toISOString().slice(0,10) : "-", status: m.status || "Open" })));
      setFeedback((Array.isArray(feedbackRes) ? feedbackRes : []).map((f:any)=> ({ id: String(f._id || ""), author: f.author || f.client || "-", text: f.text || f.message || "-", at: f.at ? new Date(f.at).toISOString().slice(0,10) : undefined })));
    })();
  }, [id]);

  const addNote = async () => {
    const text = newNote.trim();
    if (!text || !id) return;
    try {
      const r = await fetch(`${API_BASE}/api/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: id, text }) });
      if (r.ok) {
        const d = await r.json();
        setNotes((prev) => [{ id: String(d._id || crypto.randomUUID()), text, at: new Date().toISOString().slice(0,10) }, ...prev]);
        setNewNote("");
        toast.success("Note added");
        return;
      }
    } catch {}
    // fallback local update
    setNotes((prev) => [{ id: crypto.randomUUID(), text, at: new Date().toISOString().slice(0,10) }, ...prev]);
    setNewNote("");
  };

  const addComment = async () => {
    const text = newComment.trim();
    if (!text || !id) return;
    try {
      const r = await fetch(`${API_BASE}/api/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: id, text }) });
      if (r.ok) {
        const d = await r.json();
        setComments((prev) => [{ id: String(d._id || crypto.randomUUID()), text, at: new Date().toISOString().slice(0,10) }, ...prev]);
        setNewComment("");
        toast.success("Comment added");
        return;
      }
    } catch {}
    setComments((prev) => [{ id: crypto.randomUUID(), text, at: new Date().toISOString().slice(0,10) }, ...prev]);
    setNewComment("");
  };

  const addTask = async () => {
    const title = newTaskTitle.trim();
    if (!id || !title) return;
    const payload = {
      projectId: id,
      title,
      description: newTaskDescription || undefined,
      points: newTaskPoints !== "" ? Number(newTaskPoints) : undefined,
      milestoneId: newTaskMilestoneId !== "__none__" ? newTaskMilestoneId : undefined,
      assignee: newTaskAssignee || undefined,
      collaborators: newTaskCollaborators || undefined,
      labels: newTaskLabels || undefined,
      status: newTaskStatus,
      priority: newTaskPriority,
      start: newTaskStart || undefined,
      deadline: newTaskDeadline || undefined,
    };
    try {
      const r = await fetch(`${API_BASE}/api/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const d = await r.json();
        setTasks(prev => [{ id: String(d._id || crypto.randomUUID()), title, status: newTaskStatus, start: newTaskStart || "-", deadline: newTaskDeadline || "-", priority: newTaskPriority }, ...prev]);
        toast.success("Task added");
      } else {
        setTasks(prev => [{ id: crypto.randomUUID(), title, status: newTaskStatus, start: newTaskStart || "-", deadline: newTaskDeadline || "-", priority: newTaskPriority }, ...prev]);
      }
    } catch {
      setTasks(prev => [{ id: crypto.randomUUID(), title, status: newTaskStatus, start: newTaskStart || "-", deadline: newTaskDeadline || "-", priority: newTaskPriority }, ...prev]);
    }
    setNewTaskTitle("");
    setNewTaskStart("");
    setNewTaskDeadline("");
    setNewTaskPriority("medium");
    setNewTaskStatus("todo");
    setNewTaskDescription("");
    setNewTaskPoints(1);
    setNewTaskMilestoneId("__none__");
    setNewTaskAssignee("");
    setNewTaskCollaborators("");
    setNewTaskLabels("");
    setShowAddTask(false);
  };

  const addMilestone = async () => {
    const title = newMilestoneTitle.trim();
    if (!id || !title) return;
    const payload = { projectId: id, title, due: newMilestoneDue || undefined, status: newMilestoneStatus };
    try {
      const r = await fetch(`${API_BASE}/api/milestones`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const d = await r.json();
        setMilestones(prev => [{ id: String(d._id || crypto.randomUUID()), title, due: newMilestoneDue || "-", status: newMilestoneStatus }, ...prev]);
        toast.success("Milestone added");
      } else {
        setMilestones(prev => [{ id: crypto.randomUUID(), title, due: newMilestoneDue || "-", status: newMilestoneStatus }, ...prev]);
      }
    } catch {
      setMilestones(prev => [{ id: crypto.randomUUID(), title, due: newMilestoneDue || "-", status: newMilestoneStatus }, ...prev]);
    }
    setNewMilestoneTitle("");
    setNewMilestoneDue("");
    setNewMilestoneStatus("Open");
    setShowAddMilestone(false);
  };

  const addFile = async () => {
    const name = newFileName.trim();
    if (!id || !name) return;
    const size = Number(newFileSize) || undefined;
    const payload = { projectId: id, name, size };
    try {
      const r = await fetch(`${API_BASE}/api/files`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const d = await r.json();
        setFiles(prev => [{ id: String(d._id || crypto.randomUUID()), name, size }, ...prev]);
        toast.success("File added");
      } else {
        setFiles(prev => [{ id: crypto.randomUUID(), name, size }, ...prev]);
      }
    } catch {
      setFiles(prev => [{ id: crypto.randomUUID(), name, size }, ...prev]);
    }
    setNewFileName("");
    setNewFileSize("");
    setShowAddFile(false);
  };

  const addFeedback = async () => {
    const text = newFeedbackText.trim();
    if (!id || !text) return;
    const author = newFeedbackAuthor.trim() || "Client";
    const payload = { projectId: id, author, text };
    try {
      const r = await fetch(`${API_BASE}/api/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const d = await r.json();
        setFeedback(prev => [{ id: String(d._id || crypto.randomUUID()), author, text, at: new Date().toISOString().slice(0,10) }, ...prev]);
        toast.success("Feedback added");
      } else {
        setFeedback(prev => [{ id: crypto.randomUUID(), author, text, at: new Date().toISOString().slice(0,10) }, ...prev]);
      }
    } catch {
      setFeedback(prev => [{ id: crypto.randomUUID(), author, text, at: new Date().toISOString().slice(0,10) }, ...prev]);
    }
    setNewFeedbackAuthor("");
    setNewFeedbackText("");
    setShowAddFeedback(false);
  };

  const addTimesheet = async () => {
    if (!id || !newTimesheetDate || !newTimesheetUser || !newTimesheetHours) return;
    const hours = Number(newTimesheetHours) || 0;
    const payload = { projectId: id, date: newTimesheetDate, user: newTimesheetUser, task: newTimesheetTask || undefined, hours };
    try {
      const r = await fetch(`${API_BASE}/api/timesheets`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const d = await r.json();
        setTimesheets(prev => [{ id: String(d._id || crypto.randomUUID()), date: newTimesheetDate, user: newTimesheetUser, task: newTimesheetTask || "-", hours }, ...prev]);
        toast.success("Timesheet added");
      } else {
        setTimesheets(prev => [{ id: crypto.randomUUID(), date: newTimesheetDate, user: newTimesheetUser, task: newTimesheetTask || "-", hours }, ...prev]);
      }
    } catch {
      setTimesheets(prev => [{ id: crypto.randomUUID(), date: newTimesheetDate, user: newTimesheetUser, task: newTimesheetTask || "-", hours }, ...prev]);
    }
    setNewTimesheetDate("");
    setNewTimesheetUser("");
    setNewTimesheetTask("");
    setNewTimesheetHours("");
    setShowAddTimesheet(false);
  };

  const addInvoice = async () => {
    if (!id || !newInvoiceNumber) return;
    const total = Number(newInvoiceTotal) || 0;
    const payload = { projectId: id, number: newInvoiceNumber, date: newInvoiceDate || undefined, status: newInvoiceStatus, total };
    try {
      const r = await fetch(`${API_BASE}/api/invoices`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const d = await r.json();
        setInvoices(prev => [{ id: String(d._id || crypto.randomUUID()), number: newInvoiceNumber, date: newInvoiceDate || "-", status: newInvoiceStatus, total }, ...prev]);
        toast.success("Invoice added");
      } else {
        setInvoices(prev => [{ id: crypto.randomUUID(), number: newInvoiceNumber, date: newInvoiceDate || "-", status: newInvoiceStatus, total }, ...prev]);
      }
    } catch {
      setInvoices(prev => [{ id: crypto.randomUUID(), number: newInvoiceNumber, date: newInvoiceDate || "-", status: newInvoiceStatus, total }, ...prev]);
    }
    setNewInvoiceNumber("");
    setNewInvoiceDate("");
    setNewInvoiceStatus("Draft");
    setNewInvoiceTotal("");
    setShowAddInvoice(false);
  };

  const addPayment = async () => {
    if (!id || !newPaymentDate || !newPaymentAmount) return;
    const amount = Number(newPaymentAmount) || 0;
    const payload = { projectId: id, date: newPaymentDate, method: newPaymentMethod, amount };
    try {
      const r = await fetch(`${API_BASE}/api/payments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const d = await r.json();
        setPayments(prev => [{ id: String(d._id || crypto.randomUUID()), date: newPaymentDate, method: newPaymentMethod, amount }, ...prev]);
        toast.success("Payment added");
      } else {
        setPayments(prev => [{ id: crypto.randomUUID(), date: newPaymentDate, method: newPaymentMethod, amount }, ...prev]);
      }
    } catch {
      setPayments(prev => [{ id: crypto.randomUUID(), date: newPaymentDate, method: newPaymentMethod, amount }, ...prev]);
    }
    setNewPaymentAmount("");
    setNewPaymentDate("");
    setNewPaymentMethod("Cash");
    setShowAddPayment(false);
  };

  const addExpense = async () => {
    if (!id || !newExpenseTitle || !newExpenseAmount) return;
    const amount = Number(newExpenseAmount) || 0;
    const payload = { projectId: id, title: newExpenseTitle, date: newExpenseDate || undefined, category: newExpenseCategory, amount };
    try {
      const r = await fetch(`${API_BASE}/api/expenses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const d = await r.json();
        setExpenses(prev => [{ id: String(d._id || crypto.randomUUID()), title: newExpenseTitle, date: newExpenseDate || "-", category: newExpenseCategory, amount }, ...prev]);
        toast.success("Expense added");
      } else {
        setExpenses(prev => [{ id: crypto.randomUUID(), title: newExpenseTitle, date: newExpenseDate || "-", category: newExpenseCategory, amount }, ...prev]);
      }
    } catch {
      setExpenses(prev => [{ id: crypto.randomUUID(), title: newExpenseTitle, date: newExpenseDate || "-", category: newExpenseCategory, amount }, ...prev]);
    }
    setNewExpenseTitle("");
    setNewExpenseDate("");
    setNewExpenseCategory("General");
    setNewExpenseAmount("");
    setShowAddExpense(false);
  };

  const addContract = async () => {
    if (!id || !newContractTitle) return;
    const amount = Number(newContractAmount) || 0;
    const payload = { projectId: id, title: newContractTitle, amount, contractDate: newContractDate || undefined, validUntil: newContractValidUntil || undefined, status: newContractStatus };
    try {
      const r = await fetch(`${API_BASE}/api/contracts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const d = await r.json();
        setContracts(prev => [{ id: String(d._id || crypto.randomUUID()), title: newContractTitle, amount: String(amount), contractDate: newContractDate || "-", validUntil: newContractValidUntil || "-", status: newContractStatus }, ...prev]);
        toast.success("Contract added");
      } else {
        setContracts(prev => [{ id: crypto.randomUUID(), title: newContractTitle, amount: String(amount), contractDate: newContractDate || "-", validUntil: newContractValidUntil || "-", status: newContractStatus }, ...prev]);
      }
    } catch {
      setContracts(prev => [{ id: crypto.randomUUID(), title: newContractTitle, amount: String(amount), contractDate: newContractDate || "-", validUntil: newContractValidUntil || "-", status: newContractStatus }, ...prev]);
    }
    setNewContractTitle("");
    setNewContractAmount("");
    setNewContractDate("");
    setNewContractValidUntil("");
    setNewContractStatus("Open");
    setShowAddContract(false);
  };
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/tasks?projectId=${id}`);
        if (r.ok) {
          const data = await r.json();
          const t = (Array.isArray(data) ? data : []).map((t:any)=> ({
            id: String(t._id || ""),
            title: t.title || "-",
            status: t.status || "todo",
            start: t.start ? new Date(t.start).toISOString().slice(0,10) : "-",
            deadline: t.deadline ? new Date(t.deadline).toISOString().slice(0,10) : "-",
            priority: t.priority || "medium",
          }));
          setTasks(t);
          setActivity(t.slice(0, 5).map((x) => ({ id: x.id, text: `Task: ${x.title}`, at: x.start })));
        }
      } catch {}
    })();
  }, [id]);

  const progress = useMemo(() => {
    if (!project?.start || !project.deadline) return 0;
    const s = new Date(project.start).getTime();
    const e = new Date(project.deadline).getTime();
    if (e <= s) return 0;
    const pct = Math.round(((Date.now() - s) / (e - s)) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [project?.start, project?.deadline]);

  const filteredTasks = useMemo(() => {
    let out = tasks;
    if (taskQuery) {
      const q = taskQuery.toLowerCase();
      out = out.filter((t) => [t.title, t.status, t.priority].some((v) => String(v).toLowerCase().includes(q)));
    }
    if (taskStatus && taskStatus !== "__all__") {
      out = out.filter((t) => String(t.status).toLowerCase() === taskStatus.toLowerCase());
    }
    if (taskPriority && taskPriority !== "__all__") {
      out = out.filter((t) => String(t.priority).toLowerCase() === taskPriority.toLowerCase());
    }
    if (taskDeadlineFilter && taskDeadlineFilter !== "__all__") {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      out = out.filter((t) => {
        const hasDeadline = t.deadline && t.deadline !== "-";
        if (!hasDeadline) return taskDeadlineFilter === "no_deadline";
        const d = new Date(t.deadline as any).getTime();
        if (taskDeadlineFilter === "past_due") return d < startOfToday;
        if (taskDeadlineFilter === "next_7_days") {
          const in7 = startOfToday + 7 * 24 * 60 * 60 * 1000;
          return d >= startOfToday && d <= in7;
        }
        return true;
      });
    }
    if (taskQuickFilter && taskQuickFilter !== "__none__") {
      if (taskQuickFilter === "high_priority") {
        out = out.filter((t) => String(t.priority).toLowerCase() === "high");
      } else if (taskQuickFilter === "overdue") {
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        out = out.filter((t) => {
          if (!t.deadline || t.deadline === "-") return false;
          const done = String(t.status || "").toLowerCase();
          const isDone = done.includes("done") || done.includes("complete");
          const d = new Date(t.deadline as any).getTime();
          return !isDone && d < startOfToday;
        });
      } else if (taskQuickFilter === "completed") {
        out = out.filter((t) => {
          const s = String(t.status || "").toLowerCase();
          return s.includes("done") || s.includes("complete");
        });
      }
    }
    return out;
  }, [tasks, taskQuery, taskStatus, taskPriority, taskDeadlineFilter, taskQuickFilter]);

  const statusCounts = useMemo(() => {
    const map = { todo: 0, in_progress: 0, done: 0 } as Record<string, number>;
    tasks.forEach((t) => {
      const s = String(t.status || "todo").toLowerCase().replace("-", "_");
      if (s.includes("progress")) map.in_progress += 1;
      else if (s.includes("done") || s.includes("complete")) map.done += 1;
      else map.todo += 1;
    });
    return map;
  }, [tasks]);

  const priorityCounts = useMemo(() => {
    const map = { low: 0, medium: 0, high: 0 } as Record<string, number>;
    tasks.forEach((t) => {
      const p = String(t.priority || "medium").toLowerCase();
      if (p in map) map[p] += 1; else map.medium += 1;
    });
    return map;
  }, [tasks]);

  const daysLeft = useMemo(() => {
    if (!project?.deadline) return "-";
    const diff = Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return `${Math.max(diff, 0)}d`;
  }, [project?.deadline]);

  const milestoneStatusCounts = useMemo(() => {
    const res = { open: 0, done: 0, overdue: 0 };
    const today = Date.now();
    milestones.forEach((m) => {
      const s = String(m.status || "Open").toLowerCase();
      const due = m.due ? new Date(m.due).getTime() : undefined;
      if (s.includes("done") || s.includes("complete")) res.done += 1;
      else if (due && due < today) res.overdue += 1;
      else res.open += 1;
    });
    return res;
  }, [milestones]);

  const totalFileSize = useMemo(() => files.reduce((a, f) => a + (Number((f as any).size) || 0), 0), [files]);

  const invoiceStatusCounts = useMemo(() => {
    const res: Record<string, number> = {};
    invoices.forEach((i) => {
      const s = String(i.status || "unknown").toLowerCase();
      res[s] = (res[s] || 0) + 1;
    });
    return res;
  }, [invoices]);

  const paymentMethodTotals = useMemo(() => {
    const res: Record<string, number> = {};
    payments.forEach((p) => {
      const m = String(p.method || "other");
      res[m] = (res[m] || 0) + (Number(p.amount) || 0);
    });
    return res;
  }, [payments]);

  const expenseCategoryTotals = useMemo(() => {
    const res: Record<string, number> = {};
    expenses.forEach((e) => {
      const c = String(e.category || "Other");
      res[c] = (res[c] || 0) + (Number(e.amount) || 0);
    });
    return res;
  }, [expenses]);

  const timesheetUserSegments = useMemo(() => {
    const map: Record<string, number> = {};
    timesheets.forEach((t) => { const u = String(t.user || ""); map[u] = (map[u] || 0) + (Number(t.hours) || 0); });
    const entries = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const palette = ["#60a5fa","#34d399","#f59e0b","#a78bfa","#f87171"];
    return entries.map(([k,v],i)=>({ value: v, color: palette[i % palette.length] }));
  }, [timesheets]);

  const contractStatusCounts = useMemo(() => {
    const res: Record<string, number> = {};
    contracts.forEach((c)=>{ const s = String(c.status || "Open").toLowerCase(); res[s] = (res[s] || 0) + 1; });
    return res;
  }, [contracts]);

  const statusBadgeClass = (s: string) => {
    const v = String(s || "").toLowerCase();
    if (v.includes("progress")) return "bg-sky-50 text-sky-700 border border-sky-200";
    if (v.includes("done") || v.includes("complete")) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    return "bg-zinc-50 text-zinc-700 border border-zinc-200";
  };

  const milestoneBadgeClass = (s: string) => {
    const v = String(s || "Open").toLowerCase();
    if (v.includes("done")) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (v.includes("overdue")) return "bg-rose-50 text-rose-700 border border-rose-200";
    return "bg-sky-50 text-sky-700 border border-sky-200";
  };

  const filteredMilestones = useMemo(() => {
    if (milestoneStatusFilter === "__all__") return milestones;
    const v = milestoneStatusFilter.toLowerCase();
    if (v === "overdue") {
      const today = Date.now();
      return milestones.filter((m)=> m.due ? new Date(m.due).getTime() < today && String(m.status||"").toLowerCase() !== "done" : false);
    }
    return milestones.filter((m)=> String(m.status||"").toLowerCase() === v);
  }, [milestones, milestoneStatusFilter]);

  const fileSizeSegments = useMemo(() => {
    const entries = files
      .map((f) => [f.name, Number((f as any).size) || 0] as [string, number])
      .sort((a,b)=>b[1]-a[1])
      .slice(0,5);
    const palette = ["#60a5fa","#34d399","#f59e0b","#a78bfa","#f87171"];
    return entries.map(([,v],i)=>({ value: v || 1, color: palette[i % palette.length] }));
  }, [files]);

  const feedbackAuthorSegments = useMemo(() => {
    const map: Record<string, number> = {};
    feedback.forEach((f)=>{ const a = String(f.author || "Client"); map[a] = (map[a] || 0) + 1; });
    const entries = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const palette = ["#60a5fa","#34d399","#f59e0b","#a78bfa","#f87171"];
    return entries.map(([,v],i)=>({ value: v, color: palette[i % palette.length] }));
  }, [feedback]);

  const totalTimesheetHours = useMemo(() => timesheets.reduce((a, t) => a + (Number(t.hours) || 0), 0), [timesheets]);
  const totalPayments = useMemo(() => payments.reduce((a, p) => a + (Number(p.amount) || 0), 0), [payments]);
  const totalExpenses = useMemo(() => expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0), [expenses]);
  const totalInvoicesTotal = useMemo(() => invoices.reduce((a, i) => a + (Number(i.total) || 0), 0), [invoices]);

  function DonutChart({ segments, size = 96, stroke = 12, centerText }: { segments: { value: number; color: string }[]; size?: number; stroke?: number; centerText?: string }) {
    const total = segments.reduce((a, b) => a + b.value, 0) || 1;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    let offset = 0;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {segments.map((s, i) => {
            const len = (s.value / total) * c;
            const dash = `${len} ${c - len}`;
            const el = (
              <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke={s.color} strokeWidth={stroke} strokeDasharray={dash} strokeDashoffset={-offset} />
            );
            offset += len;
            return el;
          })}
        </g>
        {centerText && (
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="text-sm" fill="currentColor">{centerText}</text>
        )}
      </svg>
    );
  }

  const countdownTarget = useMemo(() => {
    const raw = project?.deadline || project?.start;
    if (!raw) return null;
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  }, [project?.deadline, project?.start]);

  const countdown = useMemo(() => {
    if (!countdownTarget) return null;
    const diff = countdownTarget.getTime() - countdownNow;
    const ms = Math.abs(diff);
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (24 * 3600));
    const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { diff, days, hours, minutes, seconds };
  }, [countdownNow, countdownTarget]);

  const updateProjectDeadline = async () => {
    if (!id) return;
    if (!editDeadline) return;
    const dt = new Date(editDeadline);
    if (Number.isNaN(dt.getTime())) {
      toast.error("Invalid deadline date/time");
      return;
    }

    const localIso = dt.toISOString();
    setProject((prev) => (prev ? { ...prev, deadline: localIso } : prev));
    setDeadlineAlerted(false);

    try {
      const payload: any = { deadline: dt };
      const r = await fetch(`${API_BASE}/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        const d = await r.json().catch(() => null);
        const saved = d?.deadline ? new Date(d.deadline).toISOString() : localIso;
        setProject((prev) => (prev ? { ...prev, deadline: saved } : prev));
        toast.success("Deadline updated");
      } else {
        toast.success("Deadline updated locally");
      }
    } catch {
      toast.success("Deadline updated locally");
    }
  };

  useEffect(() => {
    if (!project?.deadline) return;
    if (!countdownTarget || !countdown) return;
    if (deadlineAlerted) return;
    if (countdown.diff <= 0) {
      setDeadlineAlerted(true);
      toast.error("Project deadline reached");
    }
  }, [countdown, countdownTarget, deadlineAlerted, project?.deadline]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-display">{project?.title || "Project"}</h1>
          <div className="text-sm text-muted-foreground">
            Client: {project?.clientId ? (
              <Link to={`/clients/${project.clientId}`} className="text-primary underline">{project?.client}</Link>
            ) : (project?.client || "-")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowProjectCountdown(true)}>
            <CalendarDays className="w-4 h-4 mr-2" />
            Project countdown
          </Button>
          <Badge variant={project?.status === "Completed" ? "secondary" : "outline"}>{project?.status || "Open"}</Badge>
        </div>
      </div>

      <Dialog open={showProjectCountdown} onOpenChange={setShowProjectCountdown}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Project countdown</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Start date</div>
                <div>{project?.start ? project.start.slice(0, 10) : "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Deadline</div>
                <div>{project?.deadline ? project.deadline.slice(0, 10) : "-"}</div>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <div className="text-sm font-medium text-sky-600">Set / update countdown</div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Deadline date & time</div>
                  <Input type="datetime-local" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} />
                </div>
                <Button onClick={updateProjectDeadline}>Update</Button>
              </div>
            </div>

            {!countdownTarget ? (
              <div className="text-sm text-muted-foreground">No project deadline or start date found to count down.</div>
            ) : (
              <div className="rounded-md border p-4">
                <div className="text-sm text-muted-foreground">Target</div>
                <div className="font-medium">{countdownTarget.toLocaleString()}</div>

                {countdown && (
                  <div className="mt-3">
                    <div className="text-sm text-muted-foreground">{countdown.diff >= 0 ? "Time remaining" : "Overdue by"}</div>
                    <div className="text-2xl font-semibold">
                      {countdown.days}d {String(countdown.hours).padStart(2, "0")}h {String(countdown.minutes).padStart(2, "0")}m {String(countdown.seconds).padStart(2, "0")}s
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {project?.deadline && countdownTarget && countdown && countdown.diff <= 0 && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          <div className="font-medium">Deadline reached</div>
          <div className="text-sm">This project is overdue. Deadline was {countdownTarget.toLocaleString()}.</div>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks-list">Tasks List</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="customer-feedback">Customer feedback</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-4 space-y-3 lg:col-span-2">
              <div className="text-sm font-medium text-sky-600">Progress</div>
              <div className="h-2 bg-muted/50 rounded">
                <div className="h-2 bg-sky-500 rounded" style={{ width: `${progress}%` }} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><div className="text-muted-foreground">Start date</div><div>{project?.start ? project.start.slice(0,10) : "-"}</div></div>
                <div><div className="text-muted-foreground">Deadline</div><div>{project?.deadline ? project.deadline.slice(0,10) : "-"}</div></div>
                <div><div className="text-muted-foreground">Client</div><div>{project?.client || "-"}</div></div>
                <div><div className="text-muted-foreground">Price</div><div>{project?.price ?? "-"}</div></div>
              </div>
            </Card>

            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-sky-600">Tasks status</div>
                <div className="text-xs text-muted-foreground">Days left: {daysLeft}</div>
              </div>
              <div className="flex items-center gap-4">
                <DonutChart
                  segments={[
                    { value: statusCounts.todo, color: "#e4e4e7" },
                    { value: statusCounts.in_progress, color: "#60a5fa" },
                    { value: statusCounts.done, color: "#34d399" },
                  ]}
                  centerText={`${tasks.length || 0}`}
                />
                <div className="text-xs space-y-2">
                  <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{background:'#e4e4e7'}}></span> Todo: {statusCounts.todo}</div>
                  <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{background:'#60a5fa'}}></span> In progress: {statusCounts.in_progress}</div>
                  <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{background:'#34d399'}}></span> Done: {statusCounts.done}</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 space-y-3 lg:col-span-2">
              <div className="text-sm font-medium text-sky-600">Project members</div>
              <div className="text-sm text-muted-foreground">No members</div>
            </Card>

            <Card className="p-4 space-y-2 lg:col-span-2">
              <div className="text-sm font-medium text-sky-600">Description</div>
              <div className="text-sm whitespace-pre-wrap">{project?.description || "No description"}</div>
            </Card>

            <Card className="p-4 space-y-3 lg:col-span-1">
              <div className="text-sm font-medium text-sky-600">Priorities</div>
              <div className="space-y-3 text-sm">
                {(["high","medium","low"] as const).map((k) => (
                  <div key={k} className="space-y-1">
                    <div className="flex items-center justify-between"><span className="capitalize">{k}</span><span className="text-muted-foreground">{priorityCounts[k]}</span></div>
                    <div className="h-2 bg-muted/40 rounded">
                      <div className={`h-2 rounded ${k === 'high' ? 'bg-rose-400' : k === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${tasks.length ? Math.round((priorityCounts[k] / tasks.length) * 100) : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks-list">
          <Card className="p-0 overflow-hidden shadow-sm">
            <div className="p-3 border-b bg-white flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Tasks</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => toast.success("Manage labels coming soon")}>Manage labels</Button>
                <Button variant="outline" size="sm" onClick={() => toast.success("Add multiple tasks coming soon")}>Add multiple tasks</Button>
                <Button size="sm" onClick={()=>setShowAddTask(v=>!v)}><Plus className="w-4 h-4 mr-1"/>Add task</Button>
              </div>
            </div>
            <div className="p-3 border-b bg-white flex flex-wrap items-center gap-2">
              <Button variant="outline" size="icon"><LayoutGrid className="w-4 h-4" /></Button>

              <Select value={taskQuickFilter} onValueChange={setTaskQuickFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Quick filters -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">- Quick filters -</SelectItem>
                  <SelectItem value="high_priority">High priority</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={taskMilestoneFilter} onValueChange={setTaskMilestoneFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Milestone -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">- Milestone -</SelectItem>
                  {milestones.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={taskPriority} onValueChange={setTaskPriority}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Priority -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={taskLabelFilter} onValueChange={setTaskLabelFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Label -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">- Label -</SelectItem>
                </SelectContent>
              </Select>

              <Select value={taskAssignedFilter} onValueChange={setTaskAssignedFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Assigned to -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">- Assigned to -</SelectItem>
                </SelectContent>
              </Select>

              <Select value={taskDeadlineFilter} onValueChange={setTaskDeadlineFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Deadline -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="past_due">Past due</SelectItem>
                  <SelectItem value="next_7_days">Next 7 days</SelectItem>
                  <SelectItem value="no_deadline">No deadline</SelectItem>
                </SelectContent>
              </Select>

              <Select value={taskStatus} onValueChange={setTaskStatus}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Status"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="todo">Todo</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon"><RefreshCcw className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon"><Settings className="w-4 h-4" /></Button>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm"><FileDown className="w-4 h-4 mr-2" />Excel</Button>
                <Button variant="outline" size="sm"><Printer className="w-4 h-4 mr-2" />Print</Button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9 w-64" placeholder="Search" value={taskQuery} onChange={(e)=>setTaskQuery(e.target.value)} />
                </div>
              </div>
            </div>
            <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Add task</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Title</div>
                    <Input className="sm:col-span-4" placeholder="Title" value={newTaskTitle} onChange={(e)=>setNewTaskTitle(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-start">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Description</div>
                    <Textarea className="sm:col-span-4" placeholder="Description" value={newTaskDescription} onChange={(e)=>setNewTaskDescription(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Points</div>
                    <Select value={String(newTaskPoints)} onValueChange={(v)=>setNewTaskPoints(Number(v))}>
                      <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="Points"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Point</SelectItem>
                        <SelectItem value="2">2 Points</SelectItem>
                        <SelectItem value="3">3 Points</SelectItem>
                        <SelectItem value="5">5 Points</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Milestone</div>
                    <Select value={newTaskMilestoneId} onValueChange={setNewTaskMilestoneId}>
                      <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="Milestone"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {milestones.map((m)=> (
                          <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Assign to</div>
                    <Input className="sm:col-span-4" placeholder="Mindspire tech" value={newTaskAssignee} onChange={(e)=>setNewTaskAssignee(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Collaborators</div>
                    <Input className="sm:col-span-4" placeholder="Collaborators" value={newTaskCollaborators} onChange={(e)=>setNewTaskCollaborators(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Status</div>
                    <Select value={newTaskStatus} onValueChange={setNewTaskStatus}>
                      <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="To do"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To do</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Priority</div>
                    <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                      <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="Priority"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Labels</div>
                    <Input className="sm:col-span-4" placeholder="Labels" value={newTaskLabels} onChange={(e)=>setNewTaskLabels(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Start date</div>
                    <Input className="sm:col-span-4" type="date" placeholder="YYYY-MM-DD" value={newTaskStart} onChange={(e)=>setNewTaskStart(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Deadline</div>
                    <Input className="sm:col-span-4" type="date" placeholder="YYYY-MM-DD" value={newTaskDeadline} onChange={(e)=>setNewTaskDeadline(e.target.value)} />
                  </div>
                </div>
                <DialogFooter className="items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={()=>toast.success("Upload coming soon")}> <Paperclip className="w-4 h-4 mr-2"/> Upload File</Button>
                    <Button variant="ghost" size="icon" onClick={()=>toast.success("Voice note coming soon")}> <Mic className="w-4 h-4"/> </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                    <Button variant="secondary" onClick={()=>{ addTask(); toast.success("Saved (show view coming soon)"); }}>Save & show</Button>
                    <Button onClick={addTask}>Save</Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Start date</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Collaborators</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map(t => (
                  <TableRow key={t.id} className="hover:bg-muted/50">
                    <TableCell>{t.id}</TableCell>
                    <TableCell>{t.title}</TableCell>
                    <TableCell>{t.start}</TableCell>
                    <TableCell>{t.deadline}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadgeClass(t.status)}>{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground"><GripVertical className="w-4 h-4" /></TableCell>
                  </TableRow>
                ))}
                {filteredTasks.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No record found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            <div className="p-3 border-t flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Select value={taskPageSize} onValueChange={setTaskPageSize}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">
                  {filteredTasks.length ? `1-${Math.min(filteredTasks.length, Number(taskPageSize))} / ${filteredTasks.length}` : "0-0 / 0"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" disabled><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" disabled><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Milestones */}
        <TabsContent value="milestones">
          <Card className="p-0 overflow-hidden shadow-sm">
            <div className="p-3 border-b bg-white flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Milestones</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={[{ value: milestoneStatusCounts.open, color: '#60a5fa' }, { value: milestoneStatusCounts.done, color: '#34d399' }, { value: milestoneStatusCounts.overdue, color: '#f87171' }]} centerText={`${milestones.length}`} />
                <Button onClick={()=>setShowAddMilestone(v=>!v)}><Plus className="w-4 h-4 mr-1"/>Add milestone</Button>
              </div>
            </div>
            <div className="p-3 border-b bg-white flex flex-wrap items-center gap-2">
              <Select value={milestoneStatusFilter} onValueChange={setMilestoneStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Status -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm"><FileDown className="w-4 h-4 mr-2"/>Excel</Button>
                <Button variant="outline" size="sm"><Printer className="w-4 h-4 mr-2"/>Print</Button>
                <div className="text-xs text-muted-foreground">Total: {filteredMilestones.length}</div>
              </div>
            </div>
            <Dialog open={showAddMilestone} onOpenChange={setShowAddMilestone}>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Add milestone</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Title</div>
                    <Input className="sm:col-span-3" placeholder="Title" value={newMilestoneTitle} onChange={(e)=>setNewMilestoneTitle(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Due</div>
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-muted-foreground"/>
                      <Input type="date" value={newMilestoneDue} onChange={(e)=>setNewMilestoneDue(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Status</div>
                    <Select value={newMilestoneStatus} onValueChange={setNewMilestoneStatus}>
                      <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Status"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={addMilestone}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMilestones.map(m => (
                  <TableRow key={m.id} className="hover:bg-muted/50">
                    <TableCell>{m.id}</TableCell>
                    <TableCell>{m.title}</TableCell>
                    <TableCell>{m.due}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={milestoneBadgeClass(m.status || "Open")}>
                        {m.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMilestones.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No milestones</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Gantt */}
        <TabsContent value="gantt">
          <Card className="p-0 overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Gantt</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={[{ value: tasks.length || 1, color: '#60a5fa' }]} centerText={`${tasks.length}`} />
                <Link to="/projects/timeline"><Button variant="outline">Open timeline</Button></Link>
              </div>
            </div>
            <div className="p-3 text-sm text-muted-foreground">Open the full project timeline</div>
          </Card>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          <Card className="p-0 overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Notes</div>
              <DonutChart size={64} segments={[{ value: notes.length, color: '#60a5fa' }]} centerText={`${notes.length}`} />
            </div>
            <div className="p-3 space-y-3">
              <div className="flex items-start gap-2">
                <Textarea className="min-h-[80px]" placeholder="Add a note" value={newNote} onChange={(e)=>setNewNote(e.target.value)} />
                <Button onClick={addNote}>Add</Button>
              </div>
              <div className="space-y-2 text-sm">
                {notes.map(n => (
                  <div key={n.id} className="p-3 rounded border flex items-center justify-between">
                    <div className="whitespace-pre-wrap">{n.text}</div>
                    <div className="text-muted-foreground text-xs">{n.at || ""}</div>
                  </div>
                ))}
                {notes.length === 0 && <div className="text-muted-foreground">No notes</div>}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Files */}
        <TabsContent value="files">
          <Card className="p-0 overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Files</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={fileSizeSegments} centerText={`${Math.round(totalFileSize/1024)}KB`} />
                <Button onClick={()=>setShowAddFile(v=>!v)}>Add file</Button>
              </div>
            </div>
            {showAddFile && (
              <div className="p-3 border-b grid gap-2 md:grid-cols-4 bg-muted/10">
                <Input placeholder="Name" value={newFileName} onChange={(e)=>setNewFileName(e.target.value)} />
                <Input type="number" placeholder="Size (bytes)" value={newFileSize as any} onChange={(e)=>setNewFileSize(e.target.value ? Number(e.target.value) : "")} />
                <div className="flex items-center gap-2">
                  <Button onClick={addFile}>Save</Button>
                  <Button variant="outline" onClick={()=>setShowAddFile(false)}>Cancel</Button>
                </div>
              </div>
            )}
            <div className="p-3 space-y-2 text-sm">
              {files.map(f => (
                <div key={f.id} className="p-3 rounded border flex items-center justify-between">
                  <div>{f.name}</div>
                  <div className="text-muted-foreground text-xs">{(f as any).size ? `${Math.round((Number((f as any).size))/1024)} KB` : ""}</div>
                </div>
              ))}
              {files.length === 0 && <div className="text-muted-foreground">No files</div>}
            </div>
          </Card>
        </TabsContent>

        {/* Comments */}
        <TabsContent value="comments">
          <Card className="p-0 overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Comments</div>
              <DonutChart size={64} segments={[{ value: comments.length, color: '#60a5fa' }]} centerText={`${comments.length}`} />
            </div>
            <div className="p-3 space-y-3">
              <div className="flex items-start gap-2">
                <Textarea className="min-h-[80px]" placeholder="Add a comment" value={newComment} onChange={(e)=>setNewComment(e.target.value)} />
                <Button onClick={addComment}>Comment</Button>
              </div>
              <div className="space-y-2 text-sm">
                {comments.map(n => (
                  <div key={n.id} className="p-3 rounded border flex items-center justify-between">
                    <div className="whitespace-pre-wrap">{n.text}</div>
                    <div className="text-muted-foreground text-xs">{n.at || ""}</div>
                  </div>
                ))}
                {comments.length === 0 && <div className="text-muted-foreground">No comments</div>}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Customer feedback */}
        <TabsContent value="customer-feedback">
          <Card className="p-0 overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Customer feedback</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={feedbackAuthorSegments} centerText={`${feedback.length}`} />
                <Button onClick={()=>setShowAddFeedback(v=>!v)}>Add feedback</Button>
              </div>
            </div>
            {showAddFeedback && (
              <div className="p-3 border-b grid gap-2 md:grid-cols-3 bg-muted/10">
                <Input placeholder="Author" value={newFeedbackAuthor} onChange={(e)=>setNewFeedbackAuthor(e.target.value)} />
                <Textarea placeholder="Feedback" value={newFeedbackText} onChange={(e)=>setNewFeedbackText(e.target.value)} />
                <div className="flex items-center gap-2">
                  <Button onClick={addFeedback}>Save</Button>
                  <Button variant="outline" onClick={()=>setShowAddFeedback(false)}>Cancel</Button>
                </div>
              </div>
            )}
            <div className="p-3 space-y-2 text-sm">
              {feedback.map(f => (
                <div key={f.id} className="p-3 rounded border">
                  <div className="text-sm font-medium">{f.author || "Client"}</div>
                  <div className="text-sm mt-1">{f.text}</div>
                  <div className="text-xs text-muted-foreground mt-1">{f.at || ""}</div>
                </div>
              ))}
              {feedback.length === 0 && <div className="text-muted-foreground text-sm">No customer feedback</div>}
            </div>
          </Card>
        </TabsContent>

        {/* Timesheets */}
        <TabsContent value="timesheets">
          <Card className="p-0 overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Timesheets</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={timesheetUserSegments} centerText={`${totalTimesheetHours}h`} />
                <Button onClick={()=>setShowAddTimesheet(v=>!v)}>Add timesheet</Button>
              </div>
            </div>
            {showAddTimesheet && (
              <div className="p-3 border-b grid gap-2 md:grid-cols-5 bg-muted/10">
                <Input type="date" value={newTimesheetDate} onChange={(e)=>setNewTimesheetDate(e.target.value)} />
                <Input placeholder="User" value={newTimesheetUser} onChange={(e)=>setNewTimesheetUser(e.target.value)} />
                <Input placeholder="Task" value={newTimesheetTask} onChange={(e)=>setNewTimesheetTask(e.target.value)} />
                <Input type="number" placeholder="Hours" value={newTimesheetHours as any} onChange={(e)=>setNewTimesheetHours(e.target.value ? Number(e.target.value) : "")} />
                <div className="flex items-center gap-2">
                  <Button onClick={addTimesheet}>Save</Button>
                  <Button variant="outline" onClick={()=>setShowAddTimesheet(false)}>Cancel</Button>
                </div>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timesheets.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>{t.date}</TableCell>
                    <TableCell>{t.user}</TableCell>
                    <TableCell>{t.task}</TableCell>
                    <TableCell>{t.hours}</TableCell>
                  </TableRow>
                ))}
                {timesheets.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No timesheets</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices">
          <Card className="p-0 overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Invoices</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={Object.entries(invoiceStatusCounts).map(([k,v],i)=>({ value: v, color: ['#60a5fa','#34d399','#f59e0b','#a78bfa','#f87171'][i%5] }))} centerText={`${Math.round(totalInvoicesTotal)}`} />
                <Button onClick={()=>setShowAddInvoice(v=>!v)}>Add invoice</Button>
              </div>
            </div>
            {showAddInvoice && (
              <div className="p-3 border-b grid gap-2 md:grid-cols-5 bg-muted/10">
                <Input placeholder="# Number" value={newInvoiceNumber} onChange={(e)=>setNewInvoiceNumber(e.target.value)} />
                <Input type="date" value={newInvoiceDate} onChange={(e)=>setNewInvoiceDate(e.target.value)} />
                <Select value={newInvoiceStatus} onValueChange={setNewInvoiceStatus}>
                  <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Sent">Sent</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Total" value={newInvoiceTotal as any} onChange={(e)=>setNewInvoiceTotal(e.target.value ? Number(e.target.value) : "")} />
                <div className="flex items-center gap-2">
                  <Button onClick={addInvoice}>Save</Button>
                  <Button variant="outline" onClick={()=>setShowAddInvoice(false)}>Cancel</Button>
                </div>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(i => (
                  <TableRow key={i.id}>
                    <TableCell>{i.number || i.id}</TableCell>
                    <TableCell>{i.date || "-"}</TableCell>
                    <TableCell>{i.status || "-"}</TableCell>
                    <TableCell>{i.total ?? "-"}</TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No invoices</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments">
          <Card className="p-0 overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Payments</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={Object.entries(paymentMethodTotals).map(([k,v],i)=>({ value: v, color: ['#60a5fa','#34d399','#f59e0b','#a78bfa','#f87171'][i%5] }))} centerText={`${Math.round(totalPayments)}`} />
                <Button onClick={()=>setShowAddPayment(v=>!v)}>Add payment</Button>
              </div>
            </div>
            {showAddPayment && (
              <div className="p-3 border-b grid gap-2 md:grid-cols-5 bg-muted/10">
                <Input type="date" value={newPaymentDate} onChange={(e)=>setNewPaymentDate(e.target.value)} />
                <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                  <SelectTrigger><SelectValue placeholder="Method"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Amount" value={newPaymentAmount as any} onChange={(e)=>setNewPaymentAmount(e.target.value ? Number(e.target.value) : "")} />
                <div className="flex items-center gap-2">
                  <Button onClick={addPayment}>Save</Button>
                  <Button variant="outline" onClick={()=>setShowAddPayment(false)}>Cancel</Button>
                </div>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{p.date || "-"}</TableCell>
                    <TableCell>{p.method || "-"}</TableCell>
                    <TableCell>{p.amount ?? "-"}</TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No payments</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Expenses */}
        <TabsContent value="expenses">
          <Card className="p-0 overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Expenses</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={Object.entries(expenseCategoryTotals).map(([k,v],i)=>({ value: v, color: ['#60a5fa','#34d399','#f59e0b','#a78bfa','#f87171'][i%5] }))} centerText={`${Math.round(totalExpenses)}`} />
                <Button onClick={()=>setShowAddExpense(v=>!v)}>Add expense</Button>
              </div>
            </div>
            {showAddExpense && (
              <div className="p-3 border-b grid gap-2 md:grid-cols-5 bg-muted/10">
                <Input placeholder="Title" value={newExpenseTitle} onChange={(e)=>setNewExpenseTitle(e.target.value)} />
                <Input type="date" value={newExpenseDate} onChange={(e)=>setNewExpenseDate(e.target.value)} />
                <Input placeholder="Category" value={newExpenseCategory} onChange={(e)=>setNewExpenseCategory(e.target.value)} />
                <Input type="number" placeholder="Amount" value={newExpenseAmount as any} onChange={(e)=>setNewExpenseAmount(e.target.value ? Number(e.target.value) : "")} />
                <div className="flex items-center gap-2">
                  <Button onClick={addExpense}>Save</Button>
                  <Button variant="outline" onClick={()=>setShowAddExpense(false)}>Cancel</Button>
                </div>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(e => (
                  <TableRow key={e.id}>
                    <TableCell>{e.title || e.id}</TableCell>
                    <TableCell>{e.date || "-"}</TableCell>
                    <TableCell>{e.category || "-"}</TableCell>
                    <TableCell>{e.amount ?? "-"}</TableCell>
                  </TableRow>
                ))}
                {expenses.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No expenses</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Contracts */}
        <TabsContent value="contracts">
          <Card className="p-0 overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Contracts</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={Object.entries(contractStatusCounts).map(([k,v],i)=>({ value: v, color: ['#60a5fa','#34d399','#f59e0b','#a78bfa','#f87171'][i%5] }))} centerText={`${contracts.length}`} />
                <Button onClick={()=>setShowAddContract(v=>!v)}>Add contract</Button>
              </div>
            </div>
            {showAddContract && (
              <div className="p-3 border-b grid gap-2 md:grid-cols-6 bg-muted/10">
                <Input placeholder="Title" value={newContractTitle} onChange={(e)=>setNewContractTitle(e.target.value)} />
                <Input type="number" placeholder="Amount" value={newContractAmount as any} onChange={(e)=>setNewContractAmount(e.target.value ? Number(e.target.value) : "")} />
                <Input type="date" value={newContractDate} onChange={(e)=>setNewContractDate(e.target.value)} />
                <Input type="date" value={newContractValidUntil} onChange={(e)=>setNewContractValidUntil(e.target.value)} />
                <Select value={newContractStatus} onValueChange={setNewContractStatus}>
                  <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Button onClick={addContract}>Save</Button>
                  <Button variant="outline" onClick={()=>setShowAddContract(false)}>Cancel</Button>
                </div>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Contract date</TableHead>
                  <TableHead>Valid until</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{c.id}</TableCell>
                    <TableCell>{c.title}</TableCell>
                    <TableCell>{c.amount}</TableCell>
                    <TableCell>{c.contractDate}</TableCell>
                    <TableCell>{c.validUntil}</TableCell>
                    <TableCell>{c.status}</TableCell>
                  </TableRow>
                ))}
                {contracts.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No contracts</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
