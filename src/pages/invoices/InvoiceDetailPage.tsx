import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, FileText, DollarSign, CheckSquare } from "lucide-react";

const API_BASE = "http://localhost:5000";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inv, setInv] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [openPay, setOpenPay] = useState(false);
  const [openTask, setOpenTask] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Bank Transfer");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0,10));
  const [payNote, setPayNote] = useState("");
  const [paymentEditingId, setPaymentEditingId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState("Pending");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskEditingId, setTaskEditingId] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [invRes, payRes, taskRes] = await Promise.all([
          fetch(`${API_BASE}/api/invoices/${id}`),
          fetch(`${API_BASE}/api/payments?invoiceId=${id}`),
          fetch(`${API_BASE}/tasks?invoiceId=${id}`)
        ]);
        if (invRes.ok) setInv(await invRes.json());
        if (payRes.ok) setPayments(await payRes.json());
        if (taskRes.ok) setTasks(await taskRes.json());
      } catch {}
    })();
  }, [id]);

  const formatClient = (c: any) => {
    if (!c) return "-";
    if (typeof c === "string") return c;
    return c.name || c.company || c.person || "-";
  };

  const handleSavePayment = async () => {
    try {
      const payload = {
        invoiceId: inv?._id,
        clientId: inv?.clientId,
        client: inv?.client,
        amount: Number(payAmount) || 0,
        method: payMethod,
        date: payDate ? new Date(payDate) : undefined,
        note: payNote,
      };
      const method = paymentEditingId ? "PUT" : "POST";
      const url = paymentEditingId ? `${API_BASE}/api/payments/${paymentEditingId}` : `${API_BASE}/api/payments`;
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        setPayAmount(""); setPayMethod("Bank Transfer"); setPayNote(""); setPayDate(new Date().toISOString().slice(0,10));
        setPaymentEditingId("");
        setOpenPay(false);
        // reload payments
        const pRes = await fetch(`${API_BASE}/api/payments?invoiceId=${id}`);
        if (pRes.ok) setPayments(await pRes.json());
      }
    } catch {}
  };

  const handleDeletePayment = async (pid: string) => {
    if (!confirm("Delete this payment?")) return;
    await fetch(`${API_BASE}/api/payments/${pid}`, { method: "DELETE" });
    setPayments(payments.filter(p => p._id !== pid));
  };

  const handleEditPayment = (p: any) => {
    setPaymentEditingId(p._id);
    setPayAmount(String(p.amount || ""));
    setPayMethod(p.method || "Bank Transfer");
    setPayDate(p.date ? new Date(p.date).toISOString().slice(0,10) : new Date().toISOString().slice(0,10));
    setPayNote(p.note || "");
    setOpenPay(true);
  };

  const handleSaveTask = async () => {
    try {
      const payload = {
        invoiceId: inv?._id,
        title: taskTitle,
        description: taskDescription,
        status: taskStatus,
        priority: taskPriority,
      };
      const method = taskEditingId ? "PUT" : "POST";
      const url = taskEditingId ? `${API_BASE}/tasks/${taskEditingId}` : `${API_BASE}/tasks`;
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        setTaskTitle(""); setTaskDescription(""); setTaskStatus("Pending"); setTaskPriority("Medium");
        setTaskEditingId("");
        setOpenTask(false);
        // reload tasks
        const tRes = await fetch(`${API_BASE}/tasks?invoiceId=${id}`);
        if (tRes.ok) setTasks(await tRes.json());
      }
    } catch {}
  };

  const handleDeleteTask = async (tid: string) => {
    if (!confirm("Delete this task?")) return;
    await fetch(`${API_BASE}/tasks/${tid}`, { method: "DELETE" });
    setTasks(tasks.filter(t => t._id !== tid));
  };

  const handleEditTask = (t: any) => {
    setTaskEditingId(t._id);
    setTaskTitle(t.title || "");
    setTaskDescription(t.description || "");
    setTaskStatus(t.status || "Pending");
    setTaskPriority(t.priority || "Medium");
    setOpenTask(true);
  };

  if (!inv) return <div className="p-4">Loading…</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Invoice #{inv.number || id}</h1>
          <p className="text-sm text-muted-foreground">{formatClient(inv.client)}</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/invoices/${id}/preview`)}><FileText className="w-4 h-4 mr-2"/>Preview</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/invoices/${id}/edit`)}><FileText className="w-4 h-4 mr-2"/>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpenPay(true)}><DollarSign className="w-4 h-4 mr-2"/>Add Payment</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpenTask(true)}><CheckSquare className="w-4 h-4 mr-2"/>Add Task</DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                if (!confirm("Delete this invoice?")) return;
                await fetch(`${API_BASE}/api/invoices/${id}`, { method: "DELETE" });
                navigate("/invoices");
              }} className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
        </div>
      </div>

      {/* Invoice Info */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Bill Date</div>
              <div>{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Due Date</div>
              <div>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Amount</div>
              <div>Rs.{inv.amount || 0}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Status</div>
              <Badge variant={inv.status === "Paid" ? "success" : inv.status === "Partially paid" ? "secondary" : "destructive"}>{inv.status || "Unpaid"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Payments</h2>
            <Button size="sm" onClick={() => setOpenPay(true)}><Plus className="w-4 h-4 mr-2"/>Add Payment</Button>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p._id} className="flex items-center justify-between p-2 border rounded">
                  <div className="text-sm">
                    <div className="font-medium">{p.method} • {p.date ? new Date(p.date).toLocaleDateString() : ""}</div>
                    <div className="text-muted-foreground">Rs.{p.amount || 0} {p.note ? `• ${p.note}` : ""}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => handleEditPayment(p)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeletePayment(p._id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Tasks</h2>
            <Button size="sm" onClick={() => setOpenTask(true)}><Plus className="w-4 h-4 mr-2"/>Add Task</Button>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={t._id} className="flex items-center justify-between p-2 border rounded">
                  <div className="text-sm">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-muted-foreground">{t.description} • {t.status} • {t.priority}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => handleEditTask(t)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteTask(t._id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Payment Dialog */}
      <Dialog open={openPay} onOpenChange={setOpenPay}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader><DialogTitle>{paymentEditingId ? "Edit Payment" : "Add Payment"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Input type="number" placeholder="Amount" value={payAmount} onChange={(e)=>setPayAmount(e.target.value)} /></div>
            <div>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Stripe">Stripe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Input type="date" value={payDate} onChange={(e)=>setPayDate(e.target.value)} /></div>
            <div><Textarea placeholder="Note" value={payNote} onChange={(e)=>setPayNote(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPay(false)}>Close</Button>
            <Button onClick={handleSavePayment}>{paymentEditingId ? "Update" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Task Dialog */}
      <Dialog open={openTask} onOpenChange={setOpenTask}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader><DialogTitle>{taskEditingId ? "Edit Task" : "Add Task"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Input placeholder="Title" value={taskTitle} onChange={(e)=>setTaskTitle(e.target.value)} /></div>
            <div><Textarea placeholder="Description" value={taskDescription} onChange={(e)=>setTaskDescription(e.target.value)} /></div>
            <div>
              <Select value={taskStatus} onValueChange={setTaskStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={taskPriority} onValueChange={setTaskPriority}>
                <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTask(false)}>Close</Button>
            <Button onClick={handleSaveTask}>{taskEditingId ? "Update" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
