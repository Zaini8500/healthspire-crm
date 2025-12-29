import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Plus, FileText, DollarSign, CheckSquare, Mail, Printer, Download, Copy, MessageCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { getAuthHeaders } from "@/lib/api/auth";

const API_BASE = "http://localhost:5000";

const DEFAULT_PAYMENT_INFO = `A/c Title: Health Spire Pvt LTd
Bank No: 3130301000008524
IBAN: PK81FAYS3130301000008524
Faysal Bank Bahria Orchard
Branch Code 3139.

A/c Title: Health Spire Pvt LTd
Bank No: 02220113618930
IBAN: PK86MEZN0002220113618930
Meezan Bank College
Road Branch Lahore Code 0222`;

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const brand = {
    name: "HealthSpire",
    phone: "+92 312 7231875",
    email: "info@healthspire.org",
    website: "www.healthspire.org",
    address: "764D2 Shah Jelani Rd Township Lahore",
    logo: "/HealthSpire%20logo.png",
  };
  const [inv, setInv] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [openInfo, setOpenInfo] = useState(false);
  const [infoName, setInfoName] = useState("");
  const [infoAddress, setInfoAddress] = useState("");
  const [infoPhone, setInfoPhone] = useState("");
  const [infoEmail, setInfoEmail] = useState("");
  const [infoWebsite, setInfoWebsite] = useState("");
  const [infoTaxId, setInfoTaxId] = useState("");
  const [infoLogo, setInfoLogo] = useState("");
  const [paymentInfo, setPaymentInfo] = useState("");
  const [openPay, setOpenPay] = useState(false);
  const [openTask, setOpenTask] = useState(false);
  const [openItem, setOpenItem] = useState(false);
  const [openReminder, setOpenReminder] = useState(false);
  const [remTitle, setRemTitle] = useState("");
  const [remDueAt, setRemDueAt] = useState("");
  const [remRepeat, setRemRepeat] = useState(false);
  const [reminderEditingId, setReminderEditingId] = useState("");
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
  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemRate, setItemRate] = useState("0");
  const [itemUnit, setItemUnit] = useState("");
  const [itemTaxable, setItemTaxable] = useState(false);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [itemQuery, setItemQuery] = useState("");
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const invoiceDbId = useMemo(() => String(inv?._id || ""), [inv?._id]);

  const itemCatalog = useMemo(() => ([
    { title:"POS", desc:"", unit:"", rate:0 },
    { title:"Tool Modifications", desc:"", unit:"", rate:0 },
    { title:"website development", desc:"web development for Umrah Website", unit:"hours", rate:100 },
    { title:"Quran Academy Website", desc:"", unit:"hours", rate:0 },
    { title:"Website Design", desc:"", unit:"", rate:25000 },
    { title:"Website Redesign", desc:"", unit:"", rate:250 },
  ]), []);
  const filteredCatalog = useMemo(() => {
    const q = (itemQuery || itemName).toLowerCase();
    return itemCatalog.filter(i => i.title.toLowerCase().includes(q));
  }, [itemCatalog, itemQuery, itemName]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const invRes = await fetch(`${API_BASE}/api/invoices/${id}`, { headers: getAuthHeaders() });
        if (!invRes.ok) return;
        const invRow = await invRes.json();
        setInv(invRow);

        const invId = String(invRow?._id || "");
        const [payRes, taskRes] = await Promise.all([
          fetch(`${API_BASE}/api/payments?invoiceId=${encodeURIComponent(invId)}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/tasks?invoiceId=${encodeURIComponent(invId)}`, { headers: getAuthHeaders() }),
        ]);
        if (payRes.ok) setPayments(await payRes.json());
        if (taskRes.ok) setTasks(await taskRes.json());
      } catch {}
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        if (!invoiceDbId) return;
        const r = await fetch(`${API_BASE}/api/reminders?invoiceId=${encodeURIComponent(invoiceDbId)}`);
        if (r.ok) setReminders(await r.json());
      } catch {}
    })();
  }, [id, invoiceDbId]);

  useEffect(() => {
    if (inv) setItems(Array.isArray(inv.items) ? inv.items : []);
  }, [inv]);

  useEffect(() => {
    if (!inv) return;
    const b = inv?.branding || {};
    setInfoName(b.name || brand.name);
    setInfoAddress(b.address || brand.address);
    setInfoPhone(b.phone || brand.phone);
    setInfoEmail(b.email || brand.email);
    setInfoWebsite(b.website || brand.website);
    setInfoTaxId(b.taxId || "");
    setInfoLogo(b.logo || brand.logo);
    setPaymentInfo((inv?.paymentInfo || "").trim() ? inv.paymentInfo : DEFAULT_PAYMENT_INFO);
  }, [inv]);

  const formatClient = (c: any) => {
    if (!c) return "-";
    if (typeof c === "string") return c;
    return c.name || c.company || c.person || "-";
  };

  const subtotal = useMemo(() => (items || []).reduce((s: number, it: any) => s + (Number(it.quantity||0) * Number(it.rate||0)), 0), [items]);
  const paymentsTotal = useMemo(() => (payments || []).reduce((s: number, p: any) => s + (Number(p.amount||0)), 0), [payments]);
  const balanceDue = useMemo(() => Math.max(0, subtotal - paymentsTotal), [subtotal, paymentsTotal]);

  const saveItems = async (nextItems: any[]) => {
    if (!inv?._id) return;
    const amount = nextItems.reduce((s, it) => s + (Number(it.quantity||0) * Number(it.rate||0)), 0);
    const r = await fetch(`${API_BASE}/api/invoices/${inv._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: nextItems, amount })
    });
    if (r.ok) {
      setItems(nextItems);
      setInv({ ...(inv||{}), items: nextItems, amount });
    }
  };

  const openEditInfo = () => {
    const b = inv?.branding || {};
    setInfoName(b.name || brand.name);
    setInfoAddress(b.address || brand.address);
    setInfoPhone(b.phone || brand.phone);
    setInfoEmail(b.email || brand.email);
    setInfoWebsite(b.website || brand.website);
    setInfoTaxId(b.taxId || "");
    setInfoLogo(b.logo || brand.logo);
    setPaymentInfo((inv?.paymentInfo || "").trim() ? inv.paymentInfo : DEFAULT_PAYMENT_INFO);
    setOpenInfo(true);
  };

  const saveInvoiceInfo = async () => {
    if (!inv?._id) return;
    try {
      const payload = {
        branding: {
          name: infoName,
          address: infoAddress,
          phone: infoPhone,
          email: infoEmail,
          website: infoWebsite,
          taxId: infoTaxId,
          logo: infoLogo,
        },
        paymentInfo,
      };
      const r = await fetch(`${API_BASE}/api/invoices/${inv._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        const updated = await r.json();
        setInv(updated);
        setOpenInfo(false);
      }
    } catch {}
  };

  const openAddItem = () => {
    setEditingItemIndex(null);
    setItemName(""); setItemDesc(""); setItemUnit(""); setItemQty("1"); setItemRate("0"); setItemTaxable(false); setItemQuery("");
    setOpenItem(true);
  };
  const openEditItem = (idx: number) => {
    const it = items[idx];
    setEditingItemIndex(idx);
    setItemName(it?.name || "");
    setItemDesc(it?.description || "");
    setItemQty(String(it?.quantity ?? 1));
    setItemRate(String(it?.rate ?? 0));
    setItemUnit(it?.unit || "");
    setItemTaxable(Boolean(it?.taxable));
    setOpenItem(true);
  };
  const saveItem = async () => {
    const it = {
      name: itemName,
      description: itemDesc,
      quantity: Number(itemQty)||0,
      rate: Number(itemRate)||0,
      unit: itemUnit,
      taxable: Boolean(itemTaxable),
      total: (Number(itemQty)||0) * (Number(itemRate)||0),
    };
    const next = [...items];
    if (editingItemIndex == null) next.push(it); else next[editingItemIndex] = it;
    await saveItems(next);
    setOpenItem(false);
  };
  const deleteItem = async (idx: number) => {
    if (!confirm("Delete this item?")) return;
    const next = items.filter((_: any, i: number) => i !== idx);
    await saveItems(next);
  };

  const savePayment = async () => {
    try {
      const payload: any = {
        invoiceId: invoiceDbId || id,
        clientId: inv?.clientId,
        client: formatClient(inv?.client),
        amount: Number(payAmount || 0),
        method: payMethod,
        date: payDate ? new Date(payDate) : new Date(),
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
        const pRes = await fetch(`${API_BASE}/api/payments?invoiceId=${encodeURIComponent(invoiceDbId || id || "")}`);
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
      const url = taskEditingId ? `${API_BASE}/api/tasks/${taskEditingId}` : `${API_BASE}/api/tasks`;
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        setTaskTitle(""); setTaskDescription(""); setTaskStatus("Pending"); setTaskPriority("Medium");
        setTaskEditingId("");
        setOpenTask(false);
        // reload tasks
        const tRes = await fetch(`${API_BASE}/api/tasks?invoiceId=${encodeURIComponent(invoiceDbId || id || "")}`, { headers: getAuthHeaders() });
        if (tRes.ok) setTasks(await tRes.json());
      }
    } catch {}
  };

  const handleDeleteTask = async (tid: string) => {
    if (!confirm("Delete this task?")) return;
    await fetch(`${API_BASE}/api/tasks/${tid}`, { method: "DELETE" });
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

  const openAddReminder = () => {
    setReminderEditingId("");
    setRemTitle("");
    setRemDueAt("");
    setRemRepeat(false);
    setOpenReminder(true);
  };

  const openEditReminder = (r: any) => {
    setReminderEditingId(r?._id || "");
    setRemTitle(r?.title || "");
    setRemDueAt(r?.dueAt ? new Date(r.dueAt).toISOString().slice(0, 10) : "");
    setRemRepeat(Boolean(r?.repeat));
    setOpenReminder(true);
  };

  const loadReminders = async () => {
    if (!invoiceDbId) return;
    const r = await fetch(`${API_BASE}/api/reminders?invoiceId=${encodeURIComponent(invoiceDbId)}`);
    if (r.ok) setReminders(await r.json());
  };

  const handleSaveReminder = async () => {
    if (!invoiceDbId) return;
    try {
      const payload = {
        invoiceId: invoiceDbId,
        title: remTitle,
        dueAt: remDueAt ? new Date(remDueAt) : undefined,
        repeat: remRepeat,
      };
      const method = reminderEditingId ? "PUT" : "POST";
      const url = reminderEditingId ? `${API_BASE}/api/reminders/${reminderEditingId}` : `${API_BASE}/api/reminders`;
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        setOpenReminder(false);
        await loadReminders();
      }
    } catch {}
  };

  const handleDeleteReminder = async (rid: string) => {
    if (!confirm("Delete this reminder?")) return;
    await fetch(`${API_BASE}/api/reminders/${rid}`, { method: "DELETE" });
    setReminders(reminders.filter((r) => r._id !== rid));
  };

  const openPrintWindow = (mode: "print" | "pdf") => {
    if (!id) return;
    const url =
      mode === "print"
        ? `${window.location.origin}/invoices/${id}/preview?print=1&mode=print`
        : `${window.location.origin}/invoices/${id}/preview?mode=pdf`;
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) w.focus();
  };

  const openShareWindow = async (channel: "email" | "whatsapp") => {
    try {
      const sp = new URLSearchParams();
      sp.set("share", "1");
      sp.set("channel", channel);
      const url = `/invoices/${id}/preview?${sp.toString()}`;
      // Must open synchronously to avoid popup blockers.
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (w) w.focus();
    } catch {}
  };

  if (!inv) return <div className="p-4">Loading…</div>;

  const viewBrand = {
    name: inv?.branding?.name || brand.name,
    phone: inv?.branding?.phone || brand.phone,
    email: inv?.branding?.email || brand.email,
    website: inv?.branding?.website || brand.website,
    address: inv?.branding?.address || brand.address,
    taxId: inv?.branding?.taxId || "",
    logo: inv?.branding?.logo || brand.logo,
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">INVOICE #{inv.number || id}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setOpenPay(true)}><DollarSign className="w-4 h-4 mr-2"/>Add payment</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm">Actions</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/invoices/${id}/preview`)}><FileText className="w-4 h-4 mr-2"/>Preview</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openPrintWindow("pdf")}><Download className="w-4 h-4 mr-2"/>Download PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openPrintWindow("print")}><Printer className="w-4 h-4 mr-2"/>Print</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openShareWindow("email")}><Mail className="w-4 h-4 mr-2"/>Email (auto PDF link)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openShareWindow("whatsapp")}><MessageCircle className="w-4 h-4 mr-2"/>WhatsApp (auto PDF link)</DropdownMenuItem>
              <DropdownMenuItem onClick={openEditInfo}><MoreHorizontal className="w-4 h-4 mr-2"/>Edit invoice info</DropdownMenuItem>
              <DropdownMenuItem onClick={async () => { await fetch(`${API_BASE}/api/invoices/${id}`, { method: "PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ status: "Unpaid" }) }); setInv(inv ? { ...inv, status: "Unpaid" } : inv);} }>Mark as Not paid</DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                if (!inv) return;
                const clone = { ...inv };
                delete clone._id; delete clone.createdAt; delete clone.updatedAt; delete clone.__v; delete clone.number;
                const r = await fetch(`${API_BASE}/api/invoices`, { method: "POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(clone) });
                if (r.ok) { const n = await r.json(); navigate(`/invoices/${n._id}`); }
              }}><Copy className="w-4 h-4 mr-2"/>Clone Invoice</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { const mail = `mailto:?subject=Invoice%20${encodeURIComponent(inv?.number||"")}&body=${encodeURIComponent(window.location.origin + "/invoices/" + id + "/preview")}`; window.location.href = mail; }}><Mail className="w-4 h-4 mr-2"/>Email invoice to client</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="mb-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <Card className="lg:col-span-8">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <img src={viewBrand.logo} alt="HealthSpire" className="h-14 w-auto" />
                    <div className="text-sm">
                      <div className="font-semibold">{viewBrand.name}</div>
                      <div className="text-muted-foreground">{viewBrand.address}</div>
                      <div className="text-muted-foreground">Email: {viewBrand.email}</div>
                      <div className="text-muted-foreground">Website: {viewBrand.website}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-purple-600 text-white px-3 py-1 rounded text-sm font-semibold">INVOICE #{inv.number}</div>
                    <div className="text-xs text-muted-foreground mt-2">Advanced Amount: {inv.advanceAmount || 0}</div>
                    <div className="text-xs text-muted-foreground">Bill date: {inv.issueDate ? new Date(inv.issueDate).toISOString().slice(0,10) : "-"}</div>
                    <div className="text-xs text-muted-foreground">Due date: {inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0,10) : "-"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <div className="font-semibold mb-1">Bill To</div>
                    <div className="text-muted-foreground">{formatClient(inv.client)}</div>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Project</div>
                    <div className="text-muted-foreground">{inv.project || "-"}</div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Taxable</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-muted-foreground">No record found.</TableCell></TableRow>
                    ) : (
                      items.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{it.name}</TableCell>
                          <TableCell>{it.quantity}</TableCell>
                          <TableCell>{it.rate}</TableCell>
                          <TableCell>{it.taxable ? "Yes" : "No"}</TableCell>
                          <TableCell>Rs.{(Number(it.quantity||0) * Number(it.rate||0)).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={()=>openEditItem(idx)}>Edit</Button>
                            <Button size="sm" variant="destructive" className="ml-2" onClick={()=>deleteItem(idx)}>Delete</Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Button size="sm" variant="outline" className="rounded-full bg-muted hover:bg-muted/80" onClick={openAddItem}><Plus className="w-4 h-4 mr-2"/>Add item</Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={4}></TableCell>
                      <TableCell className="font-medium">Sub Total</TableCell>
                      <TableCell>Rs.{subtotal.toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={4}></TableCell>
                      <TableCell className="font-semibold">Balance Due</TableCell>
                      <TableCell className="font-semibold">Rs.{balanceDue.toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="lg:col-span-4">
              <CardContent className="p-4 text-sm">
                <div className="mb-4"><div className="text-muted-foreground">Client</div><div className="font-medium">{formatClient(inv.client)}</div></div>
                <div className="mb-4"><div className="text-muted-foreground">Project</div><div className="font-medium">{inv.project || "-"}</div></div>
                <div className="mb-4"><div className="text-muted-foreground">Status</div><div><Badge variant={inv.status === "Paid" ? "success" : inv.status === "Partially paid" ? "secondary" : "destructive"}>{inv.status || "Unpaid"}</Badge></div></div>
                <div className="mb-4"><div className="text-muted-foreground">Last email sent</div><div className="font-medium">Never</div></div>
                <div className="mb-4">
                  <div className="text-muted-foreground">Reminders (Private)</div>
                  <div className="mt-2 space-y-2">
                    {reminders.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No reminders.</div>
                    ) : (
                      reminders.map((r) => (
                        <div key={r._id} className="rounded border bg-muted/20 p-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{r.title || "(No title)"}</div>
                              <div className="text-xs text-muted-foreground">
                                {r.dueAt ? new Date(r.dueAt).toISOString().slice(0, 10) : "No due date"}{r.repeat ? " • Repeat" : ""}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openEditReminder(r)}>Edit</Button>
                              <Button size="sm" variant="destructive" className="h-7 px-2" onClick={() => handleDeleteReminder(r._id)}>Del</Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={openAddReminder} className="px-2 py-1 mt-2 rounded bg-purple-50 text-purple-700 hover:bg-purple-100">+ Add reminder</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Invoice payment list</h2>
                <Button size="sm" onClick={() => setOpenPay(true)}><Plus className="w-4 h-4 mr-2"/>Add payment</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment date</TableHead>
                    <TableHead>Payment method</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-muted-foreground">No record found.</TableCell></TableRow>
                  ) : (
                    payments.map((p) => (
                      <TableRow key={p._id}>
                        <TableCell>{p.date ? new Date(p.date).toISOString().slice(0,10) : "-"}</TableCell>
                        <TableCell>{p.method}</TableCell>
                        <TableCell>{p.note || "-"}</TableCell>
                        <TableCell className="text-right">Rs.{(p.amount||0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={()=>handleEditPayment(p)}>Edit</Button>
                          <Button size="sm" variant="destructive" className="ml-2" onClick={()=>handleDeletePayment(p._id)}>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Tasks</h2>
                <Button size="sm" onClick={() => setOpenTask(true)}><Plus className="w-4 h-4 mr-2"/>Add task</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Start date</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Assigned to</TableHead>
                    <TableHead>Collaborators</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-muted-foreground">No record found.</TableCell></TableRow>
                  ) : (
                    tasks.map((t) => (
                      <TableRow key={t._id}>
                        <TableCell>{t._id.slice(-6)}</TableCell>
                        <TableCell>{t.title}</TableCell>
                        <TableCell>{t.start ? new Date(t.start).toISOString().slice(0,10) : "-"}</TableCell>
                        <TableCell>{t.deadline ? new Date(t.deadline).toISOString().slice(0,10) : "-"}</TableCell>
                        <TableCell>{(t.assignees?.[0]?.name) || "-"}</TableCell>
                        <TableCell>{(t.assignees?.slice(1).map((a:any)=>a.name).join(", ")) || "-"}</TableCell>
                        <TableCell>{t.status}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={()=>handleEditTask(t)}>Edit</Button>
                          <Button size="sm" variant="destructive" className="ml-2" onClick={()=>handleDeleteTask(t._id)}>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={openInfo} onOpenChange={setOpenInfo}>
        <DialogContent className="bg-card max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Edit invoice info</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Company name</div>
            <div className="sm:col-span-9"><Input value={infoName} onChange={(e)=>setInfoName(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Address</div>
            <div className="sm:col-span-9"><Input value={infoAddress} onChange={(e)=>setInfoAddress(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Phone</div>
            <div className="sm:col-span-9"><Input value={infoPhone} onChange={(e)=>setInfoPhone(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Email</div>
            <div className="sm:col-span-9"><Input value={infoEmail} onChange={(e)=>setInfoEmail(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Website</div>
            <div className="sm:col-span-9"><Input value={infoWebsite} onChange={(e)=>setInfoWebsite(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Tax ID</div>
            <div className="sm:col-span-9"><Input value={infoTaxId} onChange={(e)=>setInfoTaxId(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Logo URL</div>
            <div className="sm:col-span-9">
              <div className="flex items-center gap-2">
                <Input value={infoLogo} onChange={(e)=>setInfoLogo(e.target.value)} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const fd = new FormData();
                      fd.append("file", file);
                      const res = await fetch(`${API_BASE}/api/invoices/upload`, { method: "POST", body: fd });
                      const data = await res.json().catch(() => null);
                      if (res.ok && data?.path) {
                        setInfoLogo(data.path);
                      }
                    } catch {}
                    // reset input so the same file can be re-selected if needed
                    e.currentTarget.value = "";
                  }}
                />
              </div>
            </div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Payment information</div>
            <div className="sm:col-span-9"><Textarea rows={8} value={paymentInfo} onChange={(e)=>setPaymentInfo(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenInfo(false)}>Close</Button>
            <Button onClick={saveInvoiceInfo}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Payment Dialog */}
      <Dialog open={openPay} onOpenChange={setOpenPay}>
        <DialogContent className="bg-card max-w-md" aria-describedby={undefined}>
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
            <Button onClick={savePayment}>{paymentEditingId ? "Update" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Task Dialog */}
      <Dialog open={openTask} onOpenChange={setOpenTask}>
        <DialogContent className="bg-card max-w-md" aria-describedby={undefined}>
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

      {/* Add/Edit Item Dialog */}
      <Dialog open={openItem} onOpenChange={(v)=>{ setOpenItem(v); if(!v){ setItemPickerOpen(false);} }}>
        <DialogContent className="bg-card max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{editingItemIndex == null ? "Add item" : "Edit item"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Item</div>
            <div className="sm:col-span-8 relative">
              <Input
                placeholder="Select from list or create new item..."
                value={itemName}
                onFocus={()=> setItemPickerOpen(true)}
                onChange={(e)=>{ setItemName(e.target.value); setItemQuery(e.target.value); setItemPickerOpen(true);} }
              />
              {itemPickerOpen && (
                <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-sm">
                  <div className="p-2 sticky top-0 bg-popover">
                    <Input placeholder="Search" value={itemQuery} onChange={(e)=>setItemQuery(e.target.value)} />
                  </div>
                  {filteredCatalog.map((opt, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 cursor-pointer hover:bg-accent"
                      onMouseDown={(e)=>{ e.preventDefault(); setItemName(opt.title); setItemDesc(opt.desc||""); setItemUnit(opt.unit||""); setItemRate(String(opt.rate||0)); setItemPickerOpen(false); }}
                    >
                      {opt.title}
                    </div>
                  ))}
                  <div className="px-3 py-2 cursor-pointer text-primary hover:bg-accent" onMouseDown={(e)=>{ e.preventDefault(); setItemName(itemQuery || itemName); setItemPickerOpen(false); }}>
                    + Create new item
                  </div>
                </div>
              )}
            </div>

            <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Description</div>
            <div className="sm:col-span-8"><Textarea placeholder="Description" value={itemDesc} onChange={(e)=>setItemDesc(e.target.value)} className="min-h-[72px]"/></div>

            <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Quantity</div>
            <div className="sm:col-span-8"><Input type="number" value={itemQty} onChange={(e)=>setItemQty(e.target.value)} /></div>

            <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Unit type</div>
            <div className="sm:col-span-8"><Input placeholder="Unit type (Ex: hours, pc, etc.)" value={itemUnit} onChange={(e)=>setItemUnit(e.target.value)} /></div>

            <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Rate</div>
            <div className="sm:col-span-8"><Input type="number" value={itemRate} onChange={(e)=>setItemRate(e.target.value)} /></div>

            <div className="sm:col-span-4 sm:text-right sm:pt-1 text-sm text-muted-foreground">Taxable</div>
            <div className="sm:col-span-8 flex items-center gap-2"><Checkbox checked={itemTaxable} onCheckedChange={(v)=>setItemTaxable(Boolean(v))} /><span className="text-sm"></span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setOpenItem(false)}>Close</Button>
            <Button onClick={saveItem}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openReminder} onOpenChange={setOpenReminder}>
        <DialogContent className="bg-card max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{reminderEditingId ? "Edit reminder" : "Add reminder"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Input placeholder="Title" value={remTitle} onChange={(e)=>setRemTitle(e.target.value)} /></div>
            <div><Input type="date" value={remDueAt} onChange={(e)=>setRemDueAt(e.target.value)} /></div>
            <div className="flex items-center gap-2">
              <Checkbox checked={remRepeat} onCheckedChange={(v)=>setRemRepeat(Boolean(v))} />
              <span className="text-sm">Repeat</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenReminder(false)}>Close</Button>
            <Button onClick={handleSaveReminder}>{reminderEditingId ? "Update" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
