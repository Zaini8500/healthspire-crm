import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { toast } from "@/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Download,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  Check,
  X,
  Tags,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:5000";

type Employee = { _id: string; name?: string; firstName?: string; lastName?: string };
type LeadLabel = { _id: string; name: string; color?: string };

type ContactDoc = {
  _id: string;
  leadId?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  isPrimaryContact?: boolean;
};

type LeadDoc = {
  _id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  type?: "Organization" | "Person";
  ownerId?: string;
  status?: string;
  source?: string;
  value?: string;
  lastContact?: string;
  initials?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  website?: string;
  vatNumber?: string;
  gstNumber?: string;
  currency?: string;
  currencySymbol?: string;
  labels?: string[];
  createdAt?: string;
};

const STATUS_OPTIONS = [
  { value: "New", label: "New", variant: "default" as const },
  { value: "Qualified", label: "Qualified", variant: "default" as const },
  { value: "Discussion", label: "Discussion", variant: "secondary" as const },
  { value: "Negotiation", label: "Negotiation", variant: "warning" as const },
  { value: "Won", label: "Won", variant: "success" as const },
  { value: "Lost", label: "Lost", variant: "destructive" as const },
];

const STATUS_VARIANT_BY_VALUE = new Map(STATUS_OPTIONS.map((s) => [s.value, s.variant] as const));

export default function Leads() {
  const navigate = useNavigate();
  const [items, setItems] = useState<LeadDoc[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [labels, setLabels] = useState<LeadLabel[]>([]);
  const [contacts, setContacts] = useState<ContactDoc[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [openManageLabels, setOpenManageLabels] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [filterOwnerId, setFilterOwnerId] = useState("-");
  const [filterStatus, setFilterStatus] = useState("-");
  const [filterLabelId, setFilterLabelId] = useState("-");
  const [filterSource, setFilterSource] = useState("-");
  const [filterCreatedFrom, setFilterCreatedFrom] = useState("");
  const [filterCreatedTo, setFilterCreatedTo] = useState("");

  // add lead form state
  const [leadForm, setLeadForm] = useState({
    type: "Organization" as "Organization" | "Person",
    name: "",
    company: "",
    email: "",
    phone: "",
    status: "New",
    source: "",
    ownerId: "-",
    labels: [] as string[],
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    website: "",
    vatNumber: "",
    gstNumber: "",
    currency: "",
    currencySymbol: "",
  });

  const [manageLabelName, setManageLabelName] = useState("");
  const [manageLabelColor, setManageLabelColor] = useState("bg-blue-600");

  const importRef = useRef<HTMLInputElement>(null);

  const employeeNameById = useMemo(() => {
    const m = new Map<string, string>();
    employees.forEach((e) => {
      const name = (e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "-").trim();
      if (e._id) m.set(e._id, name);
    });
    return m;
  }, [employees]);

  const labelById = useMemo(() => {
    const m = new Map<string, LeadLabel>();
    labels.forEach((l) => m.set(l._id, l));
    return m;
  }, [labels]);

  const primaryContactByLeadId = useMemo(() => {
    const m = new Map<string, ContactDoc>();
    for (const c of contacts) {
      const leadId = c.leadId?.toString?.() ?? (c.leadId ? String(c.leadId) : "");
      if (!leadId) continue;
      if (!c.isPrimaryContact) continue;
      m.set(leadId, c);
    }
    return m;
  }, [contacts]);

  const displayContactName = (c?: ContactDoc | null) => {
    if (!c) return "-";
    const n = `${c.firstName || ""}${c.lastName ? ` ${c.lastName}` : ""}`.trim();
    return n || c.name || "-";
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toISOString().slice(0, 10);
    } catch {
      return "-";
    }
  };

  const getInitials = (s?: string) => {
    const v = (s || "").trim();
    if (!v) return "-";
    return v
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const formatRelative = (iso?: string) => {
    if (!iso) return "-";
    try {
      const d = new Date(iso).getTime();
      const diff = Date.now() - d;
      const min = Math.floor(diff / 60000);
      if (min < 60) return `${Math.max(1, min)} min ago`;
      const hr = Math.floor(min / 60);
      if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
      const day = Math.floor(hr / 24);
      if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
      return formatDate(iso);
    } catch {
      return "-";
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/employees`);
      if (!res.ok) return;
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load employees");
    }
  };

  const loadLabels = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/lead-labels`);
      if (!res.ok) return;
      const data = await res.json();
      setLabels(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load labels");
    }
  };

  const loadContacts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/contacts`);
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      setContacts(Array.isArray(data) ? data : []);
    } catch {
      // Silent failure: leads list should still work
    }
  };

  const loadLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (filterOwnerId !== "-") params.set("ownerId", filterOwnerId);
      if (filterStatus !== "-") params.set("status", filterStatus);
      if (filterLabelId !== "-") params.set("labelId", filterLabelId);
      if (filterSource !== "-") params.set("source", filterSource);
      if (filterCreatedFrom) params.set("createdFrom", filterCreatedFrom);
      if (filterCreatedTo) params.set("createdTo", filterCreatedTo);
      const url = `${API_BASE}/api/leads${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
    loadLabels();
    loadContacts();
    loadLeads();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      loadLeads();
    }, 250);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const applyFilters = () => {
    loadLeads();
  };

  const clearFilters = () => {
    setFilterOwnerId("-");
    setFilterStatus("-");
    setFilterLabelId("-");
    setFilterSource("-");
    setFilterCreatedFrom("");
    setFilterCreatedTo("");
    setSearchQuery("");
    window.setTimeout(() => loadLeads(), 0);
  };

  const openCreateLead = () => {
    void loadLabels();
    void loadEmployees();
    setEditingId(null);
    setLeadForm({
      type: "Organization",
      name: "",
      company: "",
      email: "",
      phone: "",
      status: "New",
      source: "",
      ownerId: "-",
      labels: [],
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      website: "",
      vatNumber: "",
      gstNumber: "",
      currency: "",
      currencySymbol: "",
    });
    setOpenAdd(true);
  };

  const openEditLead = (lead: LeadDoc) => {
    void loadLabels();
    void loadEmployees();
    setEditingId(lead._id);
    setLeadForm({
      type: (lead.type as any) || "Organization",
      name: lead.name || "",
      company: lead.company || "",
      email: lead.email || "",
      phone: lead.phone || "",
      status: lead.status || "New",
      source: lead.source || "",
      ownerId: lead.ownerId || "-",
      labels: Array.isArray(lead.labels) ? lead.labels.map((x) => x?.toString?.() ?? String(x)) : [],
      address: lead.address || "",
      city: lead.city || "",
      state: lead.state || "",
      zip: lead.zip || "",
      country: lead.country || "",
      website: lead.website || "",
      vatNumber: lead.vatNumber || "",
      gstNumber: lead.gstNumber || "",
      currency: lead.currency || "",
      currencySymbol: lead.currencySymbol || "",
    });
    setOpenAdd(true);
  };

  const toggleLeadLabel = (labelId: string) => {
    const id = labelId?.toString?.() ?? String(labelId);
    setLeadForm((p) => {
      const selected = (p.labels || []).some((x) => (x?.toString?.() ?? String(x)) === id);
      return { ...p, labels: selected ? [] : [id] };
    });
  };

  const saveLead = async () => {
    try {
      if (!leadForm.name.trim()) {
        toast.error("Name is required");
        return;
      }

      const payload: any = {
        type: leadForm.type,
        name: leadForm.name.trim(),
        company: leadForm.company,
        email: leadForm.email,
        phone: leadForm.phone,
        status: leadForm.status,
        source: leadForm.source,
        address: leadForm.address,
        city: leadForm.city,
        state: leadForm.state,
        zip: leadForm.zip,
        country: leadForm.country,
        website: leadForm.website,
        vatNumber: leadForm.vatNumber,
        gstNumber: leadForm.gstNumber,
        currency: leadForm.currency,
        currencySymbol: leadForm.currencySymbol,
        labels: (leadForm.labels || []).map((x) => x?.toString?.() ?? String(x)),
      };
      if (leadForm.ownerId !== "-") payload.ownerId = leadForm.ownerId;

      const url = editingId ? `${API_BASE}/api/leads/${editingId}` : `${API_BASE}/api/leads`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save");
      toast.success(editingId ? "Lead updated" : "Lead created");
      setOpenAdd(false);
      setEditingId(null);
      await loadLeads();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save lead");
    }
  };

  const deleteLead = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/leads/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Lead deleted");
      await loadLeads();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete lead");
    }
  };

  const createLabel = async () => {
    try {
      const name = manageLabelName.trim();
      if (!name) {
        toast.error("Label is required");
        return;
      }
      const res = await fetch(`${API_BASE}/api/lead-labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: manageLabelColor }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Label created");
      setManageLabelName("");
      await loadLabels();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create label");
    }
  };

  const deleteLabel = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/lead-labels/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Label deleted");
      await loadLabels();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete label");
    }
  };

  const downloadCsv = (filename: string, rows: string[][]) => {
    const csv = rows
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const rows: string[][] = [
      ["Name", "Primary contact", "Phone", "Owner", "Labels", "Created", "Status", "Source"],
      ...items.map((l) => [
        l.name || "",
        displayContactName(primaryContactByLeadId.get(l._id)),
        l.phone || "",
        l.ownerId ? (employeeNameById.get(l.ownerId) || "") : "",
        Array.isArray(l.labels)
          ? l.labels
              .map((id) => labelById.get(id)?.name || "")
              .filter(Boolean)
              .join(" | ")
          : "",
        formatDate(l.createdAt),
        l.status || "",
        l.source || "",
      ]),
    ];
    downloadCsv(`leads_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const printLeads = () => {
    const rowsHtml = items
      .map((l) => {
        const owner = l.ownerId ? (employeeNameById.get(l.ownerId) || "-") : "-";
        const pc = displayContactName(primaryContactByLeadId.get(l._id));
        const lbl = Array.isArray(l.labels)
          ? l.labels
              .map((id) => labelById.get(id)?.name || "")
              .filter(Boolean)
              .join(", ")
          : "";
        return `
          <tr>
            <td>${l.name || "-"}</td>
            <td>${pc || "-"}</td>
            <td>${l.phone || "-"}</td>
            <td>${owner}</td>
            <td>${lbl || "-"}</td>
            <td>${formatDate(l.createdAt)}</td>
            <td>${l.status || "-"}</td>
            <td>${l.source || "-"}</td>
          </tr>`;
      })
      .join("");

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Leads</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; }
      h1 { font-size: 18px; margin: 0 0 12px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
      th { background: #f5f5f5; text-align: left; }
    </style>
  </head>
  <body>
    <h1>Leads</h1>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Primary contact</th>
          <th>Phone</th>
          <th>Owner</th>
          <th>Labels</th>
          <th>Created</th>
          <th>Status</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </body>
</html>
<script>
  window.onload = function () {
    try { window.focus(); } catch (e) {}
    try { window.print(); } catch (e) {}
  };
</script>`;

    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Popup blocked");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const downloadSampleImport = () => {
    const rows: string[][] = [
      ["name", "company", "phone", "status", "source"],
      ["Sarah Johnson", "Tech Solutions Inc", "+1 (555) 123-4567", "Qualified", "Website"],
      ["Michael Chen", "Digital Dynamics", "+1 (555) 234-5678", "New", "LinkedIn"],
    ];
    downloadCsv("leads_sample.csv", rows);
  };

  const parseCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const obj: any = {};
      header.forEach((h, i) => {
        obj[h] = cols[i] ?? "";
      });
      return obj;
    });
    return rows;
  };

  const importLeads = async () => {
    try {
      const f = importRef.current?.files?.[0];
      if (!f) {
        toast.error("Please choose a CSV file");
        return;
      }
      const rows = await parseCsv(f);
      if (!rows.length) {
        toast.error("No rows found");
        return;
      }
      const res = await fetch(`${API_BASE}/api/leads/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: rows }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Import complete");
      setOpenImport(false);
      if (importRef.current) importRef.current.value = "";
      await loadLeads();
    } catch (e: any) {
      toast.error(e?.message || "Failed to import leads");
    }
  };

  const columns = [
    { id: "New", title: "New", color: "bg-amber-400" },
    { id: "Qualified", title: "Qualified", color: "bg-blue-500" },
    { id: "Discussion", title: "Discussion", color: "bg-teal-500" },
    { id: "Negotiation", title: "Negotiation", color: "bg-primary" },
    { id: "Won", title: "Won", color: "bg-green-500" },
    { id: "Lost", title: "Lost", color: "bg-rose-500" },
  ] as const;

  const kanbanGroups: Record<string, LeadDoc[]> = useMemo(() => {
    const g: Record<string, LeadDoc[]> = {};
    columns.forEach((c) => {
      g[c.id] = items.filter((l) => (l.status || "New") === c.id);
    });
    return g;
  }, [items]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 text-sm">
          <h1 className="text-2xl font-bold font-display">Leads</h1>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={openManageLabels} onOpenChange={setOpenManageLabels}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline"><Tags className="w-4 h-4 mr-2"/>Manage labels</Button>
            </DialogTrigger>
            <DialogContent className="bg-card sm:max-w-2xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Manage labels</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    "bg-lime-500",
                    "bg-green-500",
                    "bg-teal-500",
                    "bg-cyan-500",
                    "bg-slate-300",
                    "bg-orange-500",
                    "bg-amber-500",
                    "bg-red-500",
                    "bg-pink-500",
                    "bg-fuchsia-600",
                    "bg-sky-500",
                    "bg-slate-600",
                    "bg-blue-600",
                    "bg-violet-500",
                    "bg-purple-300",
                  ].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setManageLabelColor(c)}
                      className={cn(
                        "h-6 w-6 rounded-full border",
                        c,
                        manageLabelColor === c ? "ring-2 ring-offset-2 ring-primary" : ""
                      )}
                      aria-label={c}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="Label" value={manageLabelName} onChange={(e)=>setManageLabelName(e.target.value)} />
                  <Button type="button" onClick={createLabel}>Save</Button>
                </div>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Label</TableHead>
                        <TableHead className="w-24">Color</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {labels.length ? labels.map((l) => (
                        <TableRow key={l._id}>
                          <TableCell>{l.name}</TableCell>
                          <TableCell><div className={cn("h-4 w-8 rounded", l.color || "bg-slate-300")} /></TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => deleteLabel(l._id)} aria-label="delete">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">No labels</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={()=>setOpenManageLabels(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={openImport} onOpenChange={setOpenImport}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline"><Download className="w-4 h-4 mr-2"/>Import leads</Button>
            </DialogTrigger>
            <DialogContent className="bg-card sm:max-w-2xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Import leads</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="border border-dashed rounded-md p-10 text-center text-sm text-muted-foreground">
                  <div className="mb-3">Drag-and-drop documents here</div>
                  <div className="mb-4">(or click to browse...)</div>
                  <input ref={importRef} type="file" accept=".csv,text/csv" className="hidden" />
                  <Button type="button" variant="outline" onClick={()=>importRef.current?.click()}>Browse</Button>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={downloadSampleImport}>Download sample file</Button>
                <Button type="button" variant="outline" onClick={()=>setOpenImport(false)}>Close</Button>
                <Button type="button" onClick={importLeads}>Next</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button type="button" variant="gradient" onClick={openCreateLead}><Plus className="w-4 h-4 mr-2"/>Add lead</Button>

          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogContent className="bg-card max-w-3xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit lead" : "Add lead"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <Label className="sm:col-span-2 text-muted-foreground">Type</Label>
                  <div className="sm:col-span-10">
                    <RadioGroup value={leadForm.type} onValueChange={(v)=>setLeadForm((p)=>({ ...p, type: v as any }))} className="flex items-center gap-6">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Organization" id="lead-type-org" />
                        <Label htmlFor="lead-type-org">Organization</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Person" id="lead-type-person" />
                        <Label htmlFor="lead-type-person">Person</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>{leadForm.type === "Organization" ? "Company" : "Name"}</Label>
                  <Input
                    placeholder={leadForm.type === "Organization" ? "Company name" : "Name"}
                    value={leadForm.name}
                    onChange={(e)=>setLeadForm((p)=>({ ...p, name: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Email</Label><Input type="email" placeholder="Email" value={leadForm.email} onChange={(e)=>setLeadForm((p)=>({ ...p, email: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Phone</Label><Input placeholder="Phone" value={leadForm.phone} onChange={(e)=>setLeadForm((p)=>({ ...p, phone: e.target.value }))} /></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Owner</Label>
                    <Select value={leadForm.ownerId} onValueChange={(v)=>setLeadForm((p)=>({ ...p, ownerId: v }))}>
                      <SelectTrigger><SelectValue placeholder="- Owner -" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-">- Owner -</SelectItem>
                        {employees.map((e) => (
                          <SelectItem key={e._id} value={e._id}>{(e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "-").trim()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Source</Label>
                    <Select value={leadForm.source || "-"} onValueChange={(v)=>setLeadForm((p)=>({ ...p, source: v === "-" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-">Source</SelectItem>
                        <SelectItem value="Website">Website</SelectItem>
                        <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="Cold Call">Cold Call</SelectItem>
                        <SelectItem value="Trade Show">Trade Show</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={leadForm.status} onValueChange={(v)=>setLeadForm((p)=>({ ...p, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Website</Label><Input placeholder="Website" value={leadForm.website} onChange={(e)=>setLeadForm((p)=>({ ...p, website: e.target.value }))} /></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>VAT Number</Label><Input placeholder="VAT Number" value={leadForm.vatNumber} onChange={(e)=>setLeadForm((p)=>({ ...p, vatNumber: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>GST Number</Label><Input placeholder="GST Number" value={leadForm.gstNumber} onChange={(e)=>setLeadForm((p)=>({ ...p, gstNumber: e.target.value }))} /></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Currency</Label><Input placeholder="Keep it blank to use the default (PKR)" value={leadForm.currency} onChange={(e)=>setLeadForm((p)=>({ ...p, currency: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Currency Symbol</Label><Input placeholder="Keep it blank to use the default (Rs.)" value={leadForm.currencySymbol} onChange={(e)=>setLeadForm((p)=>({ ...p, currencySymbol: e.target.value }))} /></div>
                </div>

                <div className="space-y-1">
                  <Label>Address</Label>
                  <Textarea placeholder="Address" value={leadForm.address} onChange={(e)=>setLeadForm((p)=>({ ...p, address: e.target.value }))} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1"><Label>City</Label><Input value={leadForm.city} onChange={(e)=>setLeadForm((p)=>({ ...p, city: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>State</Label><Input value={leadForm.state} onChange={(e)=>setLeadForm((p)=>({ ...p, state: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Zip</Label><Input value={leadForm.zip} onChange={(e)=>setLeadForm((p)=>({ ...p, zip: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Country</Label><Input value={leadForm.country} onChange={(e)=>setLeadForm((p)=>({ ...p, country: e.target.value }))} /></div>
                </div>

                <div className="space-y-2">
                  <Label>Labels</Label>
                  <div className="flex flex-wrap gap-2">
                    {labels.length ? labels.map((l) => {
                      const id = l._id?.toString?.() ?? String(l._id);
                      const selected = (leadForm.labels || []).some((x) => (x?.toString?.() ?? String(x)) === id);
                      return (
                        <button
                          key={l._id}
                          type="button"
                          onClick={() => toggleLeadLabel(id)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
                            selected ? "border-primary bg-primary/10" : "bg-transparent"
                          )}
                        >
                          <span className={cn("h-2 w-2 rounded-full", l.color || "bg-slate-300")} />
                          <span>{l.name}</span>
                          {selected ? <Check className="w-3 h-3" /> : null}
                        </button>
                      );
                    }) : (
                      <div className="text-sm text-muted-foreground">No labels</div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={()=>setOpenAdd(false)}>Close</Button>
                <Button type="button" onClick={saveLead}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list">
        <TabsList className="bg-muted/40">
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>

        {/* Filter toolbar */}
        <Card className="p-3 mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="icon" onClick={loadLeads}><RefreshCw className="w-4 h-4"/></Button>
            <Select value={filterOwnerId} onValueChange={setFilterOwnerId}>
              <SelectTrigger className="w-40"><SelectValue placeholder="- Owner -"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="-">- Owner -</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e._id} value={e._id}>{(e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "-").trim()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue placeholder="- Status -"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="-">- Status -</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterLabelId} onValueChange={setFilterLabelId}>
              <SelectTrigger className="w-40"><SelectValue placeholder="- Label -"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="-">- Label -</SelectItem>
                {labels.map((l) => (
                  <SelectItem key={l._id} value={l._id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-40"><SelectValue placeholder="- Source -"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="-">- Source -</SelectItem>
                <SelectItem value="Website">Website</SelectItem>
                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="Cold Call">Cold Call</SelectItem>
                <SelectItem value="Trade Show">Trade Show</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" className="w-40" value={filterCreatedFrom} onChange={(e)=>setFilterCreatedFrom(e.target.value)} />
            <Input type="date" className="w-40" value={filterCreatedTo} onChange={(e)=>setFilterCreatedTo(e.target.value)} />
            <Button type="button" variant="success" size="icon" onClick={applyFilters}><Check className="w-4 h-4"/></Button>
            <Button type="button" variant="outline" size="icon" onClick={clearFilters}><X className="w-4 h-4"/></Button>
            <div className="ml-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9 w-64" placeholder="Search" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} />
            </div>
          </div>
        </Card>

        {/* List */}
        <TabsContent value="list" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="text-sm text-muted-foreground">{loading ? "Loading..." : `${items.length} leads`}</div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={printLeads}><Printer className="w-4 h-4 mr-2"/>Print</Button>
                  <Button type="button" variant="outline" onClick={exportExcel}><Download className="w-4 h-4 mr-2"/>Excel</Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Primary contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Labels</TableHead>
                    <TableHead>Created date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length ? items.map((lead) => {
                    const status = lead.status || "New";
                    const variant = (STATUS_VARIANT_BY_VALUE.get(status) || "default") as any;
                    const ownerName = lead.ownerId ? (employeeNameById.get(lead.ownerId) || "-") : "-";
                    const leadLabels = Array.isArray(lead.labels) ? lead.labels.map((id) => labelById.get(id)).filter(Boolean) : [];
                    const primary = primaryContactByLeadId.get(lead._id);
                    return (
                      <TableRow key={lead._id}>
                        <TableCell className="whitespace-nowrap">
                          <button
                            type="button"
                            className="text-primary underline cursor-pointer"
                            onClick={() => navigate(`/crm/leads/${lead._id}`)}
                          >
                            {lead.name}
                          </button>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {primary ? (
                            <button
                              type="button"
                              className="text-primary underline cursor-pointer"
                              onClick={() => navigate(`/crm/contacts/${primary._id}`)}
                            >
                              {displayContactName(primary)}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{lead.phone || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap text-primary">{ownerName}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {leadLabels.length ? leadLabels.map((l) => (
                              <span key={l!._id} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                                <span className={cn("h-2 w-2 rounded-full", l!.color || "bg-slate-300")} />
                                <span>{l!.name}</span>
                              </span>
                            )) : "-"}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(lead.createdAt)}</TableCell>
                        <TableCell className="whitespace-nowrap"><Badge variant={variant}>{status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon-sm"><MoreHorizontal className="w-4 h-4"/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditLead(lead)}><Edit className="w-4 h-4 mr-2"/>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteLead(lead._id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2"/>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">No leads</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kanban */}
        <TabsContent value="kanban" className="mt-4">
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
            {columns.map((c) => (
              <div key={c.id} className="flex-shrink-0 w-[320px]">
                <Card className="h-full">
                  <CardHeader className="p-4 pb-2">
                    <div className="text-sm font-medium">{c.title}</div>
                    <div className={cn("h-0.5 mt-2 rounded", c.color)} />
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-3 min-h-[280px]">
                    {kanbanGroups[c.id]?.map((lead) => (
                      <div key={lead._id} className="kanban-card cursor-pointer" onClick={() => openEditLead(lead)}>
                        <button
                          type="button"
                          className="font-medium text-sm truncate text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/crm/leads/${lead._id}`);
                          }}
                        >
                          {lead.name}
                        </button>
                        <div className="text-xs text-muted-foreground mt-1">{lead.source || "-"}</div>
                        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                          <span>{formatRelative(lead.createdAt)}</span>
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>{getInitials(lead.ownerId ? employeeNameById.get(lead.ownerId) : lead.name)}</AvatarFallback>
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
      </Tabs>
    </div>
  );
}
