import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, Filter, Plus, Search, Upload, Tags, Paperclip, MoreVertical, Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { getAuthHeaders } from "@/lib/api/auth";

import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";

interface Row {
  id: string;
  title: string;
  clientId?: string;
  client: string;
  price: string;
  start: string; // yyyy-mm-dd
  due: string; // yyyy-mm-dd
  progress: number; // 0-100
  status: "Open" | "Completed" | "Hold";
  labels?: string;
  description?: string;
}


export default function Overview() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [openLabels, setOpenLabels] = useState(false);
  // form state
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState("Client Project");
  const [client, setClient] = useState("");
  const [clientIdSel, setClientIdSel] = useState("");
  const [clientOptions, setClientOptions] = useState<{ id: string; name: string }[]>([]);
  const [desc, setDesc] = useState("");
  const [start, setStart] = useState("");
  const [deadline, setDeadline] = useState("");
  const [price, setPrice] = useState("");
  const [labels, setLabels] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("__all__");
  const [labelFilter, setLabelFilter] = useState("__all__");
  const [startFrom, setStartFrom] = useState("");
  const [deadlineTo, setDeadlineTo] = useState("");
  const [labelOptions, setLabelOptions] = useState<string[]>([]);
  const [labelDraft, setLabelDraft] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Progress editor dialog state
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressProjectId, setProgressProjectId] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const url = `${API_BASE}/api/projects${query ? `?q=${encodeURIComponent(query)}` : ""}`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          const mapped: Row[] = (Array.isArray(data) ? data : []).map((d: any) => ({
            id: String(d._id || ""),
            title: d.title || "-",
            clientId: d.clientId ? String(d.clientId) : undefined,
            client: d.client || "-",
            price: d.price != null ? String(d.price) : "-",
            start: d.start ? new Date(d.start).toISOString().slice(0,10) : "-",
            due: d.deadline ? new Date(d.deadline).toISOString().slice(0,10) : "-",
            progress: (()=>{ const p = typeof d.progress === 'number' ? Number(d.progress) : (d.status === "Completed" ? 100 : 0); return Math.max(0, Math.min(100, isNaN(p) ? 0 : p)); })(),
            status: (d.status as any) || "Open",
            labels: typeof d.labels === "string" ? d.labels : Array.isArray(d.labels) ? d.labels.join(", ") : "",
            description: d.description || "",
          }));
          setRows(mapped);
        }
      } catch {}
    })();
  }, [query]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/clients`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const opts: { id: string; name: string }[] = (Array.isArray(data) ? data : [])
          .map((c:any)=> ({ id: String(c._id || ""), name: (c.company || c.person || "-") }))
          .filter((c:any)=> c.id && c.name);
        setClientOptions(opts);
        if (!client && opts.length) {
          setClient(opts[0].name);
          setClientIdSel(opts[0].id);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    try {
      const ls = JSON.parse(localStorage.getItem("project_labels") || "[]");
      if (Array.isArray(ls)) setLabelOptions(ls.filter((x: any) => typeof x === "string" && x.trim()).map((x: string) => x.trim()));
    } catch {}
  }, []);

  useEffect(() => {
    if (!openLabels) return;
    setLabelDraft(labelOptions);
    setNewLabel("");
  }, [openLabels, labelOptions]);

  const saveProject = async (keepOpen: boolean) => {
    if (!title.trim()) return;
    try {
      const payload: any = {
        title: title.trim(),
        clientId: clientIdSel || undefined,
        client,
        price: price ? Number(price) : 0,
        start: start ? new Date(start) : undefined,
        deadline: deadline ? new Date(deadline) : undefined,
        status: "Open",
        labels: labels || undefined,
        description: desc || undefined,
      };
      const url = editingId ? `${API_BASE}/api/projects/${editingId}` : `${API_BASE}/api/projects`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const d = await res.json();
        const row: Row = {
          id: String(d._id || ""),
          title: d.title || payload.title,
          clientId: d.clientId ? String(d.clientId) : payload.clientId,
          client: d.client || payload.client || "-",
          price: d.price != null ? String(d.price) : (price || "-"),
          start: d.start ? new Date(d.start).toISOString().slice(0,10) : (start || "-"),
          due: d.deadline ? new Date(d.deadline).toISOString().slice(0,10) : (deadline || "-"),
          progress: (d.status as any) === "Completed" ? 100 : 0,
          status: (d.status as any) || "Open",
          labels: typeof d.labels === "string" ? d.labels : Array.isArray(d.labels) ? d.labels.join(", ") : (labels || ""),
          description: d.description || payload.description || "",
        };
        setRows((prev) => editingId ? prev.map(p => p.id === row.id ? row : p) : [row, ...prev]);
        // Reset filters/search so the new/updated project is visible immediately
        setStatusFilter("__all__");
        setLabelFilter("__all__");
        setStartFrom("");
        setDeadlineTo("");
        setQuery("");
        if (!keepOpen) setOpenAdd(false);
        setEditingId(null);
        toast.success(editingId ? "Project updated" : "Project added");

        // Lightweight refetch to ensure fresh list without manual reload
        try {
          const ref = await fetch(`${API_BASE}/api/projects`, { headers: getAuthHeaders() });
          if (ref.ok) {
            const data = await ref.json();
            const mapped: Row[] = (Array.isArray(data) ? data : []).map((d: any) => ({
              id: String(d._id || ""),
              title: d.title || "-",
              clientId: d.clientId ? String(d.clientId) : undefined,
              client: d.client || "-",
              price: d.price != null ? String(d.price) : "-",
              start: d.start ? new Date(d.start).toISOString().slice(0,10) : "-",
              due: d.deadline ? new Date(d.deadline).toISOString().slice(0,10) : "-",
              progress: (()=>{ const p = typeof d.progress === 'number' ? Number(d.progress) : (d.status === "Completed" ? 100 : 0); return Math.max(0, Math.min(100, isNaN(p) ? 0 : p)); })(),
              status: (d.status as any) || "Open",
              labels: typeof d.labels === "string" ? d.labels : Array.isArray(d.labels) ? d.labels.join(", ") : "",
              description: d.description || "",
            }));
            setRows(mapped);
          }
        } catch {}
      }
    } catch {}
  };

  const deleteProject = async (id: string) => {
    try {
      if (!window.confirm("Delete this project?")) return;
      await fetch(`${API_BASE}/api/projects/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Project removed");
    } catch {}
  };

  const updateProjectStatus = async (id: string, status: Row["status"]) => {
    try {
      const res = await fetch(`${API_BASE}/api/projects/${id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status, progress: status === "Completed" ? 100 : r.progress } : r)));
        toast.success("Status updated");
      }
    } catch {}
  };

  const openEdit = (r: Row) => {
    setEditingId(r.id);
    setTitle(r.title || "");
    setClient(r.client || "");
    if (r.clientId) setClientIdSel(r.clientId);
    setStart(r.start && r.start !== "-" ? r.start : "");
    setDeadline(r.due && r.due !== "-" ? r.due : "");
    setPrice(r.price && r.price !== "-" ? r.price : "");
    setLabels(r.labels || "");
    setDesc(r.description || "");
    setOpenAdd(true);
  };

  const openProgressEditor = (r: Row) => {
    setProgressProjectId(r.id);
    setProgressValue(r.progress || 0);
    setProgressOpen(true);
  };

  const saveProgressValue = async () => {
    if (!progressProjectId) return;
    const value = Math.max(0, Math.min(100, Number(progressValue) || 0));
    try {
      const res = await fetch(`${API_BASE}/api/projects/${progressProjectId}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ progress: value }),
      });
      if (res.ok) {
        setRows(prev => prev.map(r => r.id === progressProjectId ? { ...r, progress: value, status: r.status } : r));
        toast.success("Progress updated");
      } else {
        setRows(prev => prev.map(r => r.id === progressProjectId ? { ...r, progress: value } : r));
      }
    } catch {
      setRows(prev => prev.map(r => r.id === progressProjectId ? { ...r, progress: value } : r));
    } finally {
      setProgressOpen(false);
      setProgressProjectId(null);
    }
  };

  const filtered = useMemo(() => {
    let out = rows;
    if (query) {
      const s = query.toLowerCase();
      out = out.filter(r => [r.title, r.client, r.status].some(v => v.toLowerCase().includes(s)));
    }
    if (statusFilter && statusFilter !== "__all__") out = out.filter(r => r.status.toLowerCase() === statusFilter.toLowerCase());
    if (labelFilter && labelFilter !== "__all__") out = out.filter(r => (r.labels || "").split(",").map(x=>x.trim().toLowerCase()).includes(labelFilter.toLowerCase()));
    if (startFrom) out = out.filter(r => r.start && r.start !== "-" && r.start >= startFrom);
    if (deadlineTo) out = out.filter(r => r.due && r.due !== "-" && r.due <= deadlineTo);
    return out;
  }, [rows, query, statusFilter, labelFilter, startFrom, deadlineTo]);

  const manageLabels = () => {
    setOpenLabels(true);
  };

  const saveLabels = () => {
    const arr = labelDraft.map((x) => String(x || "").trim()).filter(Boolean);
    setLabelOptions(arr);
    localStorage.setItem("project_labels", JSON.stringify(arr));
    toast.success("Labels updated");
    setOpenLabels(false);
  };

  const resetFilters = () => {
    setStatusFilter("__all__");
    setLabelFilter("__all__");
    setStartFrom("");
    setDeadlineTo("");
    setQuery("");
  };

  const exportToCSV = () => {
    const header = ["ID","Title","Client","Price","Start date","Deadline","Progress","Status","Labels"];
    const lines = filtered.map((r, idx) => [idx + 1, r.title, r.client, r.price, r.start, r.due, `${r.progress}%`, r.status, r.labels || ""]);
    const csv = [header, ...lines].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "projects.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const printTable = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rowsHtml = filtered.map((r, idx) => `<tr>
      <td>${idx + 1}</td>
      <td>${r.title}</td>
      <td>${r.client}</td>
      <td>${r.price}</td>
      <td>${r.start}</td>
      <td>${r.due}</td>
      <td>${r.progress}%</td>
      <td>${r.status}</td>
    </tr>`).join("");
    w.document.write(`<!doctype html><html><head><title>Projects</title></head><body>
      <h3>Projects</h3>
      <table border="1" cellspacing="0" cellpadding="6">
        <thead><tr><th>#</th><th>Title</th><th>Client</th><th>Price</th><th>Start date</th><th>Deadline</th><th>Progress</th><th>Status</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const triggerImport = () => fileInputRef.current?.click();
  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length === 0) return;
      const header = lines[0].toLowerCase();
      const hasHeader = ["title","client","price","start","deadline"].every(k => header.includes(k));
      const body = hasHeader ? lines.slice(1) : lines;
      let imported = 0;
      for (const line of body) {
        const cols = line.split(",").map(c => c.replace(/^\"|\"$/g, "").trim());
        const [t, c, p, s, d, st] = cols;
        if (!t) continue;
        const payload: any = {
          title: t,
          client: c,
          price: p ? Number(p) : 0,
          start: s ? new Date(s) : undefined,
          deadline: d ? new Date(d) : undefined,
          status: st || "Open",
        };
        const res = await fetch(`${API_BASE}/api/projects`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
        if (res.ok) imported++;
      }
      toast.success(`Imported ${imported} project(s)`);
      const ref = await fetch(`${API_BASE}/api/projects${query ? `?q=${encodeURIComponent(query)}` : ""}`, { headers: getAuthHeaders() });
      if (ref.ok) {
        const data = await ref.json();
        const mapped: Row[] = (Array.isArray(data) ? data : []).map((d: any) => ({
          id: String(d._id || ""),
          title: d.title || "-",
          clientId: d.clientId ? String(d.clientId) : undefined,
          client: d.client || "-",
          price: d.price != null ? String(d.price) : "-",
          start: d.start ? new Date(d.start).toISOString().slice(0,10) : "-",
          due: d.deadline ? new Date(d.deadline).toISOString().slice(0,10) : "-",
          progress: d.status === "Completed" ? 100 : 0,
          status: (d.status as any) || "Open",
          labels: typeof d.labels === "string" ? d.labels : Array.isArray(d.labels) ? d.labels.join(", ") : "",
          description: d.description || "",
        }));
        setRows(mapped);
      }
    } catch {
      toast.error("Failed to import projects");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Projects</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={manageLabels}><Tags className="w-4 h-4 mr-2"/>Manage labels</Button>
          <Dialog open={openLabels} onOpenChange={setOpenLabels}>
            <DialogContent className="bg-card sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Manage labels</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input placeholder="New label" value={newLabel} onChange={(e)=>setNewLabel(e.target.value)} />
                  <Button
                    variant="outline"
                    onClick={() => {
                      const v = newLabel.trim();
                      if (!v) return;
                      setLabelDraft((prev) => [v, ...prev]);
                      setNewLabel("");
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {labelDraft.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No labels yet.</div>
                  ) : (
                    labelDraft.map((l, idx) => (
                      <div key={`${l}-${idx}`} className="flex items-center gap-2">
                        <Input value={l} onChange={(e)=>setLabelDraft((prev)=> prev.map((x,i)=> i===idx ? e.target.value : x))} />
                        <Button variant="outline" onClick={()=>setLabelDraft((prev)=> prev.filter((_,i)=> i!==idx))}>Remove</Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
                <Button onClick={saveLabels}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={onImportFile} />
          <Button variant="outline" onClick={triggerImport}><Upload className="w-4 h-4 mr-2"/>Import projects</Button>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button variant="gradient"><Plus className="w-4 h-4 mr-2"/>Add project</Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>Add project</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Project type</Label>
                    <Select value={projectType} onValueChange={setProjectType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Client Project">Client Project</SelectItem>
                        <SelectItem value="Internal">Internal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Client</Label>
                    <Select value={clientIdSel} onValueChange={(v)=>{ setClientIdSel(v); const opt = clientOptions.find(o=>o.id===v); setClient(opt?.name || ""); }}>
                      <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>
                        {clientOptions.length === 0 ? (
                          <SelectItem value="__no_clients__" disabled>No clients</SelectItem>
                        ) : (
                          clientOptions.map((opt)=> (
                            <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea placeholder="Description" value={desc} onChange={(e)=>setDesc(e.target.value)} className="min-h-[120px]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Start date</Label><Input type="date" placeholder="Start date" value={start} onChange={(e)=>setStart(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Deadline</Label><Input type="date" placeholder="Deadline" value={deadline} onChange={(e)=>setDeadline(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Price</Label><Input placeholder="Price" value={price} onChange={(e)=>setPrice(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Labels</Label><Input placeholder="Labels" value={labels} onChange={(e)=>setLabels(e.target.value)} /></div>
                </div>
              </div>
              <DialogFooter>
                <div className="flex-1"><Button variant="outline" type="button"><Paperclip className="w-4 h-4 mr-2"/>Upload File</Button></div>
                <Button variant="outline" onClick={()=>setOpenAdd(false)}>Close</Button>
                <Button variant="gradient" onClick={()=>saveProject(true)}>Save & continue</Button>
                <Button onClick={()=>saveProject(false)}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2"/>Filter</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={resetFilters}>Reset filters</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setStatusFilter("__all__"); setLabelFilter("__all__"); setStartFrom(""); setDeadlineTo(""); }}>Clear all</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Open")}>Only Open</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Completed")}>Only Completed</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { const dt = new Date(); const first = new Date(dt.getFullYear(), dt.getMonth(), 1).toISOString().slice(0,10); const last = new Date(dt.getFullYear(), dt.getMonth()+1, 0).toISOString().slice(0,10); setStartFrom(first); setDeadlineTo(last); }}>This month</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Select value={labelFilter} onValueChange={setLabelFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="- Label -"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              {labelOptions.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 mr-2"/>
            <Input type="date" className="w-40" value={startFrom} onChange={(e)=>setStartFrom(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" className="w-40" value={deadlineTo} onChange={(e)=>setDeadlineTo(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="- Status -"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Hold">Hold</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>Excel</Button>
            <Button variant="outline" size="sm" onClick={printTable}>Print</Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9 w-64" placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} />
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Start date</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r, idx) => (
              <TableRow key={r.id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell className="text-primary underline cursor-pointer" onClick={() => navigate(`/projects/overview/${r.id}`)}>{r.title}</TableCell>
                <TableCell className="text-primary cursor-pointer" onClick={() => r.clientId && navigate(`/clients/${r.clientId}`)}>{r.client}</TableCell>
                <TableCell>{r.price}</TableCell>
                <TableCell>{r.start}</TableCell>
                <TableCell className={new Date(r.due) < new Date(r.start) ? "text-destructive font-medium" : ""}>{r.due}</TableCell>
                <TableCell className="min-w-[140px]">
                  <button className="w-full text-left" onClick={() => openProgressEditor(r)} title="Click to update progress">
                    <div className="flex items-center gap-2">
                      <div className="h-2 bg-muted/50 rounded flex-1">
                        <div className="h-2 rounded bg-primary" style={{ width: `${r.progress}%` }} />
                      </div>
                      <div className="text-xs text-muted-foreground w-10 text-right">{r.progress}%</div>
                    </div>
                  </button>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">{r.status}</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => updateProjectStatus(r.id, "Open")}>Open</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateProjectStatus(r.id, "Completed")}>Completed</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateProjectStatus(r.id, "Hold")}>Hold</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="Actions">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/projects/overview/${r.id}`)}>
                        <Eye className="w-4 h-4 mr-2"/> View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(r)}>
                        <Pencil className="w-4 h-4 mr-2"/> Edit / Update
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => deleteProject(r.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2"/> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Progress editor */}
      <Dialog open={progressOpen} onOpenChange={setProgressOpen}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Progress: {progressValue}%</Label>
            <Input type="range" min={0} max={100} value={progressValue} onChange={(e)=>setProgressValue(Number(e.target.value))} />
            <Input type="number" min={0} max={100} value={progressValue} onChange={(e)=>setProgressValue(Math.max(0, Math.min(100, Number(e.target.value)||0)))} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={saveProgressValue}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
