import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import { RefreshCw, Search, Plus, Paperclip, Mic, Trash2, FileText, Edit3, MoreVertical } from "lucide-react";

const API_BASE = "http://localhost:5000";

type ProjectDoc = { _id: string; title?: string };

type ContractRow = {
  id: string;
  title: string;
  client: string;
  projectId?: string;
  contractDate: string;
  validUntil: string;
  amount: number;
  status: string;
  note: string;
};

const shortId = (id: string) => {
  const s = String(id || "");
  if (!s) return "-";
  return s.length <= 8 ? s : `${s.slice(0, 8)}…`;
};

export default function Contracts() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("-");
  const [pageSize, setPageSize] = useState("10");
  const [openAdd, setOpenAdd] = useState(false);

  const [rows, setRows] = useState<ContractRow[]>([]);
  const [projects, setProjects] = useState<ProjectDoc[]>([]);
  const [clientLeadOptions, setClientLeadOptions] = useState<string[]>([]);

  const [formTitle, setFormTitle] = useState("");
  const [formClient, setFormClient] = useState("");
  const [formProjectId, setFormProjectId] = useState("-");
  const [formContractDate, setFormContractDate] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formTax1, setFormTax1] = useState("0");
  const [formTax2, setFormTax2] = useState("0");
  const [formAmount, setFormAmount] = useState("0");
  const [formNote, setFormNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const projectTitleById = useMemo(() => {
    const m = new Map<string, string>();
    projects.forEach((p) => {
      if (p._id) m.set(p._id, p.title || "-");
    });
    return m;
  }, [projects]);

  const loadProjects = async () => {
    try {
      const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      const headers: any = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await fetch(`${API_BASE}/api/projects`, { headers });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load projects");
    }
  };

  const loadClientsLeads = async () => {
    try {
      const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      const headers: any = token ? { Authorization: `Bearer ${token}` } : undefined;
      const [rc, rl] = await Promise.all([
        fetch(`${API_BASE}/api/clients`, { headers }).then((r) => r.ok ? r.json() : []),
        fetch(`${API_BASE}/api/leads`, { headers }).then((r) => r.ok ? r.json() : []),
      ]);
      const clients: string[] = (Array.isArray(rc) ? rc : []).map((c: any) => c.company || c.person || c.name).filter(Boolean);
      const leads: string[] = (Array.isArray(rl) ? rl : []).map((l: any) => l.name || l.fullName || l.company || l.email).filter(Boolean);
      const all = Array.from(new Set([...(clients || []), ...(leads || [])])).slice(0, 500);
      setClientLeadOptions(all);
    } catch {
      // silent; optional source
    }
  };

  const loadContracts = async () => {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`${API_BASE}/api/contracts?${params.toString()}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to load contracts");
      const mapped: ContractRow[] = (Array.isArray(data) ? data : []).map((d: any) => ({
        id: String(d._id || ""),
        title: d.title || "-",
        client: d.client || "-",
        projectId: d.projectId ? String(d.projectId) : undefined,
        contractDate: d.contractDate ? new Date(d.contractDate).toISOString().slice(0, 10) : "-",
        validUntil: d.validUntil ? new Date(d.validUntil).toISOString().slice(0, 10) : "-",
        amount: Number(d.amount || 0),
        status: d.status || "Open",
        note: d.note || "",
      }));
      setRows(mapped);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load contracts");
    }
  };

  useEffect(() => {
    loadProjects();
    loadClientsLeads();
    loadContracts();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      loadContracts();
    }, 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const filteredRows = useMemo(() => {
    let out = rows;
    if (status && status !== "-") {
      out = out.filter((r) => String(r.status || "").toLowerCase() === String(status).toLowerCase());
    }
    return out;
  }, [rows, status]);

  const pageSizeNum = Math.max(1, Number(pageSize) || 10);
  const pageRows = useMemo(() => filteredRows.slice(0, pageSizeNum), [filteredRows, pageSizeNum]);

  const openNew = () => {
    setEditingId(null);
    setFormTitle("");
    setFormClient("");
    setFormProjectId("-");
    setFormContractDate("");
    setFormValidUntil("");
    setFormTax1("0");
    setFormTax2("0");
    setFormAmount("0");
    setFormNote("");
    setOpenAdd(true);
  };

  const save = async () => {
    try {
      const title = formTitle.trim();
      if (!title) return toast.error("Title is required");
      const payload: any = {
        title,
        client: formClient && formClient !== "-" ? formClient : "",
        projectId: formProjectId !== "-" ? formProjectId : undefined,
        contractDate: formContractDate ? new Date(formContractDate).toISOString() : undefined,
        validUntil: formValidUntil ? new Date(formValidUntil).toISOString() : undefined,
        tax1: Number(formTax1 || 0),
        tax2: Number(formTax2 || 0),
        amount: Number(formAmount || 0),
        note: formNote || "",
      };
      const isEdit = Boolean(editingId);
      const url = isEdit ? `${API_BASE}/api/contracts/${editingId}` : `${API_BASE}/api/contracts`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || "Failed to add contract");
      toast.success(isEdit ? "Contract updated" : "Contract created");
      setOpenAdd(false);
      if (isEdit) {
        setRows((prev) => prev.map((r) => (r.id === editingId ? {
          id: String(d._id || editingId),
          title: d.title || payload.title,
          client: d.client || payload.client || "-",
          projectId: d.projectId ? String(d.projectId) : undefined,
          contractDate: d.contractDate ? new Date(d.contractDate).toISOString().slice(0, 10) : (formContractDate || "-"),
          validUntil: d.validUntil ? new Date(d.validUntil).toISOString().slice(0, 10) : (formValidUntil || "-"),
          amount: Number(d.amount ?? payload.amount ?? 0),
          status: d.status || "Open",
          note: d.note || payload.note || "",
        } : r)));
      } else {
        await loadContracts();
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to add contract");
    }
  };

  const deleteRow = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/contracts/${id}`, { method: "DELETE" });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || "Failed");
      toast.success("Contract deleted");
      setRows((p) => p.filter((x) => x.id !== id));
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete contract");
    }
  };

  const patchStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/contracts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || "Failed");
      setRows((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success(`Marked as ${status}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  };

  const cloneContract = async (id: string) => {
    try {
      const src = rows.find((r) => r.id === id);
      if (!src) return;
      const getRes = await fetch(`${API_BASE}/api/contracts/${id}`);
      const doc = await getRes.json().catch(() => null);
      if (!getRes.ok) throw new Error(doc?.error || "Failed to clone");
      delete doc._id; delete doc.id; delete doc.createdAt; delete doc.updatedAt;
      const res = await fetch(`${API_BASE}/api/contracts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doc) });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || "Failed");
      toast.success("Contract cloned");
      await loadContracts();
    } catch (e: any) {
      toast.error(e?.message || "Failed to clone");
    }
  };

  const openPreview = (id: string) => {
    window.open(`/sales/contracts/${id}/preview`, "_blank", "noopener,noreferrer");
  };

  const openEditDialog = async (id: string) => {
    try {
      const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      const headers: any = token ? { Authorization: `Bearer ${token}` } : undefined;
      const r = await fetch(`${API_BASE}/api/contracts/${id}`, { headers });
      let d: any = null;
      try { d = await r.json(); } catch { d = null; }
      if (!r.ok) {
        const msg = d?.error || `Failed to load contract (HTTP ${r.status})`;
        throw new Error(msg);
      }
      setEditingId(id);
      setFormTitle(d.title || "");
      setFormClient(d.client || "");
      setFormProjectId(d.projectId ? String(d.projectId) : "-");
      setFormContractDate(d.contractDate ? new Date(d.contractDate).toISOString().slice(0,10) : "");
      setFormValidUntil(d.validUntil ? new Date(d.validUntil).toISOString().slice(0,10) : "");
      setFormTax1(String(d.tax1 ?? 0));
      setFormTax2(String(d.tax2 ?? 0));
      setFormAmount(String(d.amount ?? 0));
      setFormNote(d.note || "");
      setOpenAdd(true);
    } catch (e: any) {
      toast.error(e?.message || "Failed to open editor");
    }
  };

  const statusBadge = (s?: string) => {
    const t = String(s || "Draft").toLowerCase();
    const base = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium";
    if (t === "accepted") return <span className={`${base} bg-emerald-100 text-emerald-700`}>Accepted</span>;
    if (t === "declined" || t === "rejected") return <span className={`${base} bg-red-100 text-red-700`}>Declined</span>;
    if (t === "sent") return <span className={`${base} bg-blue-100 text-blue-700`}>Sent</span>;
    return <span className={`${base} bg-gray-100 text-gray-700`}>Draft</span>;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Contracts</h1>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild><Button variant="outline" size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-2"/>Add contract</Button></DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader><DialogTitle>{editingId ? "Edit contract" : "Add contract"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Title</div>
              <div className="sm:col-span-9"><Input placeholder="Title" value={formTitle} onChange={(e)=>setFormTitle(e.target.value)} /></div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Contract date</div>
              <div className="sm:col-span-9"><Input type="date" placeholder="Contract date" value={formContractDate} onChange={(e)=>setFormContractDate(e.target.value)} /></div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Valid until</div>
              <div className="sm:col-span-9"><Input type="date" placeholder="Valid until" value={formValidUntil} onChange={(e)=>setFormValidUntil(e.target.value)} /></div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Client/Lead</div>
              <div className="sm:col-span-9">
                <Select value={formClient || "-"} onValueChange={(v)=> setFormClient(v === "-" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Client/Lead" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">Client/Lead</SelectItem>
                    {clientLeadOptions.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Project</div>
              <div className="sm:col-span-9">
                <Select value={formProjectId} onValueChange={setFormProjectId}>
                  <SelectTrigger><SelectValue placeholder="Project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">Project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p._id} value={p._id}>{p.title || "-"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">TAX</div>
              <div className="sm:col-span-9"><Input type="number" value={formTax1} onChange={(e)=>setFormTax1(e.target.value)} /></div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Second TAX</div>
              <div className="sm:col-span-9"><Input type="number" value={formTax2} onChange={(e)=>setFormTax2(e.target.value)} /></div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Amount</div>
              <div className="sm:col-span-9"><Input type="number" value={formAmount} onChange={(e)=>setFormAmount(e.target.value)} /></div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Note</div>
              <div className="sm:col-span-9"><Textarea placeholder="Note" className="min-h-[96px]" value={formNote} onChange={(e)=>setFormNote(e.target.value)} /></div>
            </div>

            <DialogFooter>
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm"><Paperclip className="w-4 h-4 mr-2"/>Upload File</Button>
                  <Button variant="outline" size="icon" className="rounded-full" aria-label="Record note"><Mic className="w-4 h-4"/></Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={()=>setOpenAdd(false)}>Close</Button>
                  <Button onClick={save}>Save</Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-36"><SelectValue placeholder="- Status -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Status -</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">Monthly</Button>
              <Button variant="outline">Yearly</Button>
              <Button variant="outline">Custom</Button>
              <Button variant="outline">Dynamic</Button>
              <Button variant="outline">December 2025</Button>
              <Button variant="success" size="icon" onClick={loadContracts}><RefreshCw className="w-4 h-4"/></Button>
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

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Contract</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Contract date</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length ? pageRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">
                    <Link to={`/sales/contracts/${r.id}`} className="text-primary hover:underline">{shortId(r.id)}</Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{r.title}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.client}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.projectId ? (projectTitleById.get(r.projectId) || "-") : "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.contractDate}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.validUntil}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.amount.toLocaleString()}</TableCell>
                  <TableCell className="whitespace-nowrap">{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openPreview(r.id)}><FileText className="w-4 h-4 mr-2"/>Preview</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(r.id)}><Edit3 className="w-4 h-4 mr-2"/>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { if (confirm("Delete this contract?")) deleteRow(r.id); }} className="text-red-600 focus:text-red-600"><Trash2 className="w-4 h-4 mr-2"/>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between p-3 border-t mt-2">
            <div className="flex items-center gap-2 text-sm">
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>1-{Math.min(pageRows.length, filteredRows.length)} / {filteredRows.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">‹</Button>
              <Button variant="outline" size="sm">›</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
