import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Download,
  MoreHorizontal,
  Eye,
  Mail,
  Printer,
  FileText,
  HelpCircle,
  Paperclip,
  FileSpreadsheet,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type ListInvoice = {
  id: string;
  dbId: string;
  client: string;
  project?: string;
  billDate: string;
  dueDate: string;
  totalInvoiced: string;
  paymentReceived: string;
  due: string;
  status: "Paid" | "Partially paid" | "Unpaid";
  advancedAmount?: string;
};

const API_BASE = "http://localhost:5000";

export default function InvoiceList() {
  const [tab, setTab] = useState("list");
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const [rows, setRows] = useState<ListInvoice[]>([]);
  const [clientOptions, setClientOptions] = useState<{ id: string; name: string }[]>([]);
  const [projectOptions, setProjectOptions] = useState<{ id: string; title: string; clientId?: string }[]>([]);
  const [clientSel, setClientSel] = useState("");
  const [projectSel, setProjectSel] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string>("");
  const [editingInvoiceNum, setEditingInvoiceNum] = useState<string>("");
  const [billDate, setBillDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [dueDate, setDueDate] = useState<string>("");
  const [tax1Sel, setTax1Sel] = useState<string>("10");
  const [tax2Sel, setTax2Sel] = useState<string>("10");
  const [tdsSel, setTdsSel] = useState<string>("10");
  const [note, setNote] = useState<string>("");
  const [labels, setLabels] = useState<string>("");
  const [advanceAmount, setAdvanceAmount] = useState<string>("");
  const [attachments, setAttachments] = useState<{ name: string; path: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadClick = () => fileInputRef.current?.click();
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const f = e.target.files?.[0];
      if (!f) return;
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch(`${API_BASE}/api/invoices/upload`, { method: "POST", body: fd });
      if (r.ok) {
        const res = await r.json();
        setAttachments((prev) => [...prev, { name: res.name, path: res.path }]);
      }
    } catch {}
    finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Payments state and helpers (top-level)
  const [openPay, setOpenPay] = useState(false);
  const [payInvoiceNum, setPayInvoiceNum] = useState<string>("");
  const [payInvoiceId, setPayInvoiceId] = useState<string>("");
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<string>("Bank Transfer");
  const [payDate, setPayDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [payNote, setPayNote] = useState<string>("");
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentEditingId, setPaymentEditingId] = useState<string>("");
  const [payInvoiceDropdownOpen, setPayInvoiceDropdownOpen] = useState(false);

  const openPaymentFor = async (invoiceIdText: string) => {
    try {
      const num = invoiceIdText.split('#')[1]?.trim() || "";
      setPayInvoiceNum(num);
      setPaymentEditingId("");
      setPayAmount(""); setPayMethod("Bank Transfer"); setPayNote(""); setPayDate(new Date().toISOString().slice(0,10));
      if (!num) { setOpenPay(true); return; }
      const invRes = await fetch(`${API_BASE}/api/invoices/${encodeURIComponent(num)}`);
      if (!invRes.ok) { setOpenPay(true); return; }
      const inv = await invRes.json();
      const invId = inv._id || "";
      setPayInvoiceId(invId);
      const pRes = await fetch(`${API_BASE}/api/payments?invoiceId=${encodeURIComponent(invId)}`);
      if (pRes.ok) {
        const list = await pRes.json();
        setPayments(Array.isArray(list) ? list : []);
      } else {
        setPayments([]);
      }
      setOpenPay(true);
    } catch {
      setOpenPay(true);
    }
  };

  const openEditFor = async (invoiceIdText: string) => {
    try {
      const num = invoiceIdText.split('#')[1]?.trim() || "";
      if (!num) return;
      const r = await fetch(`${API_BASE}/api/invoices/${encodeURIComponent(num)}`);
      if (!r.ok) return;
      const inv = await r.json();
      setEditingInvoiceId(inv._id || "");
      setEditingInvoiceNum(inv.number || num);
      setBillDate(inv.issueDate ? new Date(inv.issueDate).toISOString().slice(0,10) : "");
      setDueDate(inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0,10) : "");
      if (inv.clientId) setClientSel(String(inv.clientId));
      if (inv.projectId) setProjectSel(String(inv.projectId));
      setTax1Sel(String(inv.tax1 ?? "10"));
      setTax2Sel(String(inv.tax2 ?? "10"));
      setTdsSel(String(inv.tds ?? "10"));
      setNote(inv.note || "");
      setLabels(inv.labels || "");
      setAdvanceAmount(inv.advanceAmount != null ? String(inv.advanceAmount) : "");
      setAttachments(Array.isArray(inv.attachments) ? inv.attachments : []);
      setIsEditing(true);
      setOpenAdd(true);
    } catch {}
  };

  const handleDropdownPayment = async (invoiceIdText: string) => {
    setPayInvoiceDropdownOpen(false);
    await openPaymentFor(invoiceIdText);
  };

  const loadInvoices = async () => {
    try {
      const url = `${API_BASE}/api/invoices${query ? `?q=${encodeURIComponent(query)}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const mapped: ListInvoice[] = (Array.isArray(data) ? data : []).map((d: any) => {
        const c = d.client;
        const p = d.project;
        const clientId = c && typeof c === 'object' ? String(c._id || c.id || '') : '';
        const clientName = c && typeof c === 'object' ? (c.name || c.company || c.person || '-') : (c || '-');
        const projectId = p && typeof p === 'object' ? String(p._id || p.id || '') : '';
        const projectTitle = p && typeof p === 'object' ? (p.title || '-') : (p || '-');
        return {
          id: `INVOICE #${d.number || '-'}`,
          dbId: String(d._id || ''),
          client: clientId || clientName,
          project: projectId || projectTitle,
          billDate: d.issueDate ? new Date(d.issueDate).toISOString().slice(0,10) : '-',
          dueDate: d.dueDate ? new Date(d.dueDate).toISOString().slice(0,10) : '-',
          totalInvoiced: d.amount != null ? `Rs.${d.amount}` : 'Rs.0',
          paymentReceived: 'Rs.0',
          due: d.amount != null ? `Rs.${d.amount}` : 'Rs.0',
          status: (d.status as any) || 'Unpaid',
          advancedAmount: d.advanceAmount != null ? String(d.advanceAmount) : undefined,
        };
      });
      setRows(mapped);
    } catch {}
  };

  useEffect(() => { loadInvoices(); }, [query]);

  useEffect(() => {
    (async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch(`${API_BASE}/api/clients`),
          fetch(`${API_BASE}/api/projects`),
        ]);
        if (cRes.ok) {
          const cData = await cRes.json();
          const cOpts: { id: string; name: string }[] = (Array.isArray(cData) ? cData : [])
            .map((c: any) => ({ id: String(c._id || ""), name: (c.company || c.person || "-") }))
            .filter((c: any) => c.id && c.name);
          setClientOptions(cOpts);
          if (!clientSel && cOpts.length) setClientSel(cOpts[0].id);
        }
        if (pRes.ok) {
          const pData = await pRes.json();
          const pOpts: { id: string; title: string; clientId?: string }[] = (Array.isArray(pData) ? pData : [])
            .map((p: any) => ({ id: String(p._id || ""), title: (p.title || "-"), clientId: p.clientId ? String(p.clientId) : undefined }))
            .filter((p: any) => p.id && p.title);
          setProjectOptions(pOpts);
        }
      } catch {}
    })();
  }, []);

  const totals = useMemo(() => {
    const parse = (s: string) => Number(String(s || "0").replace(/[^0-9.-]/g, "")) || 0;
    const invoiced = rows.reduce((sum, r) => sum + parse(r.totalInvoiced), 0);
    const received = rows.reduce((sum, r) => sum + parse(r.paymentReceived), 0);
    const due = rows.reduce((sum, r) => sum + parse(r.due), 0);
    return { invoiced, received, due };
  }, [rows]);

  const getClientName = (val: any) => {
    if (!val) return "-";
    if (typeof val === "object") {
      return val.name || val.company || val.person || val.id || "-";
    }
    const f = clientOptions.find(c => c.id === val);
    return f ? f.name : String(val);
  };
  const getProjectTitle = (val?: any) => {
    if (!val) return "-";
    if (typeof val === "object") {
      return val.title || val.name || val.id || "-";
    }
    const f = projectOptions.find(p => p.id === val);
    return f ? f.title : String(val);
  };

  // Export all invoices to CSV (opens a download)
  const handleExportCSV = () => {
    const csv = [
      [
        "Invoice ID",
        "Client",
        "Project",
        "Bill date",
        "Due date",
        "Total Invoiced",
        "Payment Received",
        "Due",
        "Status",
        "Advanced Amount",
      ].join(","),
      ...rows.map((r) => [
        r.id,
        getClientName(r.client),
        getProjectTitle(r.project),
        r.billDate,
        r.dueDate,
        r.totalInvoiced,
        r.paymentReceived,
        r.due,
        r.status,
        r.advancedAmount || "",
      ].join(",")),
    ].join("\n");
    const encoded = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const a = document.createElement("a");
    a.href = encoded;
    a.download = "invoices.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Print friendly page (new window) similar to the provided screenshot
  const handlePrintInvoices = () => {
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoices | Mindspire</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px; }
    h1 { text-align:center; margin: 0 0 16px; font-size: 22px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 10px; text-align: left; }
    thead th { border-bottom: 2px solid #ddd; }
    tbody td { border-top: 1px solid #eee; }
  </style>
  <script>function doPrint(){ setTimeout(function(){ window.print(); }, 50); }</script>
  </head>
  <body onload="doPrint()">
    <h1>Invoices | Mindspire</h1>
    <table>
      <thead>
        <tr>
          <th>Invoice ID</th>
          <th>Client</th>
          <th>Project</th>
          <th>Due date</th>
          <th>Total invoiced</th>
          <th>Payment Received</th>
          <th>Due</th>
          <th>Status</th>
          <th>Advanced Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${r.id}</td>
            <td>${getClientName(r.client)}</td>
            <td>${getProjectTitle(r.project)}</td>
            <td>${r.dueDate}</td>
            <td>${r.totalInvoiced}</td>
            <td>${r.paymentReceived}</td>
            <td>${r.due}</td>
            <td>${r.status}</td>
            <td>${r.advancedAmount || ''}</td>
          </tr>`).join("")}
      </tbody>
    </table>
  </body>
  </html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-sm text-muted-foreground">Invoices</h1>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-muted/40">
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="recurring">Recurring</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild><Button variant="outline" size="sm">Manage labels</Button></DialogTrigger>
            <DialogContent className="bg-card" aria-describedby={undefined}><DialogHeader><DialogTitle>Manage labels</DialogTitle></DialogHeader><DialogFooter><Button variant="outline">Close</Button></DialogFooter></DialogContent>
          </Dialog>
          <DropdownMenu open={payInvoiceDropdownOpen} onOpenChange={setPayInvoiceDropdownOpen}>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm">Add payment</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
              {rows.length === 0 ? (
                <DropdownMenuItem disabled>No invoices</DropdownMenuItem>
              ) : (
                rows.map((r) => (
                  <DropdownMenuItem key={r.id} onClick={() => handleDropdownPayment(r.id)}>
                    {r.id} – {getClientName(r.client)}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => handlePrintInvoices()}><Printer className="w-4 h-4 mr-2"/>Print</Button>
          <Button variant="outline" size="sm" onClick={() => handleExportCSV()}><FileSpreadsheet className="w-4 h-4 mr-2"/>Excel</Button>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild><Button variant="outline" size="sm" onClick={()=>setOpenAdd(true)}><Plus className="w-4 h-4 mr-2"/>Add invoice</Button></DialogTrigger>
            <DialogContent className="bg-card max-w-3xl" aria-describedby={undefined}>
              <DialogHeader><DialogTitle>Add invoice</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Bill date</div>
                <div className="sm:col-span-9"><Input type="date" value={billDate} onChange={(e)=>setBillDate(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Due date</div>
                <div className="sm:col-span-9"><Input type="date" value={dueDate} onChange={(e)=>setDueDate(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Client</div>
                <div className="sm:col-span-9">
                  <Select value={clientSel} onValueChange={(v)=>{ setClientSel(v); setProjectSel(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clientOptions.length === 0 ? (
                        <SelectItem value="__no_clients__" disabled>No clients</SelectItem>
                      ) : (
                        clientOptions.map((c)=> (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Project</div>
                <div className="sm:col-span-9">
                  <Select value={projectSel} onValueChange={setProjectSel}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const list = clientSel ? projectOptions.filter(p => p.clientId === clientSel) : projectOptions;
                        if (list.length === 0) return <SelectItem value="__no_projects__" disabled>No projects</SelectItem>;
                        return list.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">TAX</div>
                <div className="sm:col-span-9">
                  <Select value={tax1Sel} onValueChange={setTax1Sel}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Second TAX</div>
                <div className="sm:col-span-9">
                  <Select value={tax2Sel} onValueChange={setTax2Sel}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">TDS</div>
                <div className="sm:col-span-9">
                  <Select value={tdsSel} onValueChange={setTdsSel}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground flex items-center gap-1">Recurring <HelpCircle className="w-3 h-3 text-muted-foreground"/></div>
                <div className="sm:col-span-9 flex items-center gap-2"><Checkbox id="recurring" /><label htmlFor="recurring" className="text-sm"></label></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Note</div>
                <div className="sm:col-span-9"><Textarea placeholder="Note" className="min-h-[96px]" value={note} onChange={(e)=>setNote(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Labels</div>
                <div className="sm:col-span-9"><Input placeholder="Labels" value={labels} onChange={(e)=>setLabels(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Advanced Amount</div>
                <div className="sm:col-span-9"><Input placeholder="Advanced Amount" value={advanceAmount} onChange={(e)=>setAdvanceAmount(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <div className="w-full flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={handleUploadClick}><Paperclip className="w-4 h-4 mr-2"/>Upload File</Button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} />
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={()=>setOpenAdd(false)}>Close</Button>
                    <Button onClick={async ()=>{
                      const clientName = (()=>{ const f = clientOptions.find(c=>c.id===clientSel); return f?.name || "-"; })();
                      const payload:any = {
                        issueDate: billDate ? new Date(billDate) : undefined,
                        dueDate: dueDate ? new Date(dueDate) : undefined,
                        clientId: clientSel || undefined,
                        client: clientName,
                        status: 'Unpaid',
                        amount: 0,
                        advanceAmount: advanceAmount ? Number(advanceAmount) : undefined,
                        tax1: Number(tax1Sel)||0,
                        tax2: Number(tax2Sel)||0,
                        tds: Number(tdsSel)||0,
                        projectId: projectSel || undefined,
                        project: getProjectTitle(projectSel),
                        note,
                        labels,
                        attachments,
                      };
                      try {
                        const method = isEditing ? 'PUT' : 'POST';
                        const url = isEditing ? `${API_BASE}/api/invoices/${encodeURIComponent(editingInvoiceId)}` : `${API_BASE}/api/invoices`;
                        const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
                        if (r.ok) {
                          setOpenAdd(false);
                          // reset form
                          setDueDate(""); setTax1Sel("10"); setTax2Sel("10"); setTdsSel("10"); setNote(""); setLabels(""); setAdvanceAmount("");
                          setIsEditing(false); setEditingInvoiceId(""); setEditingInvoiceNum("");
                          await loadInvoices();
                        }
                      } catch {}
                    }}>Save</Button>
                  </div>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Add payment dialog */}
          <Dialog open={openPay} onOpenChange={setOpenPay}>
            <DialogContent className="bg-card max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
              <DialogHeader><DialogTitle>Add payment</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Invoice #</div>
                <div className="sm:col-span-8"><Input value={payInvoiceNum} readOnly /></div>
                <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Amount</div>
                <div className="sm:col-span-8"><Input type="number" value={payAmount} onChange={(e)=>setPayAmount(e.target.value)} placeholder="Amount" /></div>
                <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Method</div>
                <div className="sm:col-span-8">
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Stripe">Stripe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Date</div>
                <div className="sm:col-span-8"><Input type="date" value={payDate} onChange={(e)=>setPayDate(e.target.value)} /></div>
                <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Note</div>
                <div className="sm:col-span-8"><Textarea placeholder="Note" value={payNote} onChange={(e)=>setPayNote(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={()=>setOpenPay(false)}>Close</Button>
                <Button onClick={async ()=>{
                  try {
                    if (!payInvoiceNum) return;
                    const invRes = await fetch(`${API_BASE}/api/invoices/${encodeURIComponent(payInvoiceNum)}`);
                    if (!invRes.ok) return;
                    const inv = await invRes.json();
                    const payload:any = {
                      invoiceId: inv._id,
                      clientId: inv.clientId,
                      client: inv.client,
                      amount: payAmount ? Number(payAmount) : 0,
                      method: payMethod,
                      date: payDate ? new Date(payDate) : undefined,
                      note: payNote,
                    };
                    const method = paymentEditingId ? 'PUT' : 'POST';
                    const url = paymentEditingId ? `${API_BASE}/api/payments/${encodeURIComponent(paymentEditingId)}` : `${API_BASE}/api/payments`;
                    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (r.ok) {
                      setPayAmount(""); setPayMethod("Bank Transfer"); setPayNote(""); setPayDate(new Date().toISOString().slice(0,10));
                      setPaymentEditingId("");
                      // reload payments list
                      if (payInvoiceId) {
                        const pRes = await fetch(`${API_BASE}/api/payments?invoiceId=${encodeURIComponent(payInvoiceId)}`);
                        if (pRes.ok) {
                          const list = await pRes.json();
                          setPayments(Array.isArray(list) ? list : []);
                        }
                      }
                    }
                  } catch {}
                }}>{paymentEditingId ? "Update" : "Save"}</Button>
              </DialogFooter>
              {payments.length > 0 && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium mb-2">Existing payments</h4>
                    <div className="space-y-2">
                      {payments.map((p) => (
                        <div key={p._id} className="flex items-center justify-between text-xs bg-muted p-2 rounded">
                          <div className="flex-1">
                            <div className="font-medium">{p.method} • {p.date ? new Date(p.date).toLocaleDateString() : ''}</div>
                            <div className="text-muted-foreground">Rs.{p.amount || 0} {p.note ? `• ${p.note}` : ''}</div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => {
                              setPaymentEditingId(p._id);
                              setPayAmount(String(p.amount || ""));
                              setPayMethod(p.method || "Bank Transfer");
                              setPayDate(p.date ? new Date(p.date).toISOString().slice(0,10) : new Date().toISOString().slice(0,10));
                              setPayNote(p.note || "");
                            }}>Edit</Button>
                            <Button size="sm" variant="destructive" onClick={async () => {
                              if (!confirm("Delete this payment?")) return;
                              await fetch(`${API_BASE}/api/payments/${encodeURIComponent(p._id)}`, { method: 'DELETE' });
                              if (payInvoiceId) {
                                const pRes = await fetch(`${API_BASE}/api/payments?invoiceId=${encodeURIComponent(payInvoiceId)}`);
                                if (pRes.ok) {
                                  const list = await pRes.json();
                                  setPayments(Array.isArray(list) ? list : []);
                                }
                              }
                            }}>Delete</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select>
                <SelectTrigger className="w-36"><SelectValue placeholder="- Type -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Type -</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-36"><SelectValue placeholder="- Status -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Status -</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-36"><SelectValue placeholder="- Currency -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Currency -</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">Monthly</Button>
              <Button variant="outline">Yearly</Button>
              <Button variant="outline">Custom</Button>
              <Button variant="outline">Dynamic</Button>
              <Button variant="outline">December 2025</Button>
              <Button variant="success" size="sm">↻</Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">Excel</Button>
              <Button variant="outline" size="sm">Print</Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
              </div>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="mt-4">
            <TabsContent value="list">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Invoice ID</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Bill date</TableHead>
                        <TableHead>Due date</TableHead>
                        <TableHead>Total invoiced</TableHead>
                        <TableHead>Payment Received</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Advanced Amount</TableHead>
                        <TableHead className="w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r)=> (
                        <TableRow key={r.id}>
                          <TableCell className="text-primary underline cursor-pointer" onClick={()=>navigate(`/invoices/${encodeURIComponent(r.id.split('#')[1] || '1')}`)}>{r.id}</TableCell>
                          <TableCell>{getClientName(r.client)}</TableCell>
                          <TableCell>{getProjectTitle(r.project)}</TableCell>
                          <TableCell>{r.billDate}</TableCell>
                          <TableCell>{r.dueDate}</TableCell>
                          <TableCell>{r.totalInvoiced}</TableCell>
                          <TableCell>{r.paymentReceived}</TableCell>
                          <TableCell>{r.due}</TableCell>
                          <TableCell>
                            <Badge variant={r.status === 'Paid' ? 'success' : r.status === 'Partially paid' ? 'secondary' : 'destructive'}>{r.status}</Badge>
                          </TableCell>
                          <TableCell>{r.advancedAmount || '-'}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4"/></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={()=>openEditFor(r.id)}>Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={()=>navigate(`/invoices/${encodeURIComponent(r.id.split('#')[1] || '1')}/preview`)}>Preview</DropdownMenuItem>
                                <DropdownMenuItem onClick={async ()=>{
                                  const num = r.id.split('#')[1] || '';
                                  if (!num) return;
                                  await fetch(`${API_BASE}/api/invoices/${encodeURIComponent(num)}`, { method: 'DELETE' });
                                  await loadInvoices();
                                }}>Delete</DropdownMenuItem>
                                <DropdownMenuItem onClick={()=>openPaymentFor(r.id)}>Add payment</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="font-medium">Total</TableCell>
                        <TableCell colSpan={4}></TableCell>
                        <TableCell className="font-semibold">{`Rs.${totals.invoiced.toLocaleString()}`}</TableCell>
                        <TableCell className="font-semibold">{`Rs.${totals.received.toLocaleString()}`}</TableCell>
                        <TableCell className="font-semibold">{`Rs.${totals.due.toLocaleString()}`}</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recurring">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Invoice ID</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Next recurring</TableHead>
                        <TableHead>Repeat every</TableHead>
                        <TableHead>Cycles</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total invoiced</TableHead>
                        <TableHead className="w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">No record found.</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
