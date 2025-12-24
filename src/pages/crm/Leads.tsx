import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  UserPlus,
  ExternalLink,
  Users,
  Paperclip,
  FileSignature,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/api/auth";

const API_BASE = "http://localhost:5000";

type Employee = { _id: string; name?: string; firstName?: string; lastName?: string; image?: string; avatar?: string };
type LeadLabel = { _id: string; name: string; color?: string };

type ContactDoc = {
  _id: string;
  leadId?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  isPrimaryContact?: boolean;
  avatar?: string;
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

  const [kanbanCounts, setKanbanCounts] = useState<Record<string, { contacts: number; files: number; contracts: number }>>({});

  const draggingLeadIdRef = useRef<string | null>(null);
  const draggingFromStatusRef = useRef<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  const [convertMode, setConvertMode] = useState<"client" | "contact">("client");
  const [makeClientOpen, setMakeClientOpen] = useState(false);
  const [makeClientStep, setMakeClientStep] = useState<"details" | "contact">("details");
  const [makeClientLead, setMakeClientLead] = useState<LeadDoc | null>(null);
  const [makeClientForm, setMakeClientForm] = useState({
    // client details
    type: "Person" as "Organization" | "Person",
    name: "",
    owner: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    phone: "",
    website: "",
    vatNumber: "",
    gstNumber: "",
    clientGroups: "",
    currency: "",
    currencySymbol: "",
    labels: "",
    disableOnlinePayment: false,
    // contact
    firstName: "",
    lastName: "",
    email: "",
    contactPhone: "",
    skype: "",
    jobTitle: "",
    gender: "male" as "male" | "female" | "other",
    password: "",
    primaryContact: true,
  });

  // Kanban columns and grouping
  const columns = [
    { id: "New", title: "New", color: "bg-slate-400" },
    { id: "Qualified", title: "Qualified", color: "bg-emerald-500" },
    { id: "Discussion", title: "Discussion", color: "bg-sky-500" },
    { id: "Negotiation", title: "Negotiation", color: "bg-amber-500" },
    { id: "Won", title: "Won", color: "bg-green-600" },
    { id: "Lost", title: "Lost", color: "bg-rose-500" },
  ] as const;

  const kanbanGroups: Record<string, LeadDoc[]> = useMemo(() => {
    const map: Record<string, LeadDoc[]> = Object.fromEntries(columns.map((c) => [c.id, []]));
    for (const l of items) {
      const s = (l.status && columns.find((c) => c.id === l.status)?.id) || "New";
      map[s].push(l);
    }
    return map;
  }, [items]);

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

  const contactCountByLeadId = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of contacts) {
      const leadId = c.leadId?.toString?.() ?? (c.leadId ? String(c.leadId) : "");
      if (!leadId) continue;
      m.set(leadId, (m.get(leadId) || 0) + 1);
    }
    return m;
  }, [contacts]);

  const displayContactName = (c?: ContactDoc | null) => {
    if (!c) return "-";
    const n = `${c.firstName || ""}${c.lastName ? ` ${c.lastName}` : ""}`.trim();
    return n || c.name || "-";
  };

  const updateLeadStatus = async (leadId: string, status: string) => {
    const prev = items;
    setItems((p) => p.map((l) => (String(l._id) === String(leadId) ? { ...l, status } : l)));
    try {
      const res = await fetch(`${API_BASE}/api/leads/${leadId}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setItems(prev);
      toast.error("Failed to update status");
    }
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
      const res = await fetch(`${API_BASE}/api/employees`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load employees");
    }
  };

  const loadLabels = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/lead-labels`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setLabels(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load labels");
    }
  };

  const loadContacts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/contacts`, { headers: getAuthHeaders() });
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
      const res = await fetch(url, { headers: getAuthHeaders() });
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
    let cancelled = false;
    const safeJson = async (url: string) => {
      try {
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        const json = await res.json().catch(() => []);
        return Array.isArray(json) ? json : [];
      } catch {
        return [];
      }
    };

    (async () => {
      if (!items.length) {
        setKanbanCounts({});
        return;
      }

      const entries = await Promise.all(
        items.map(async (lead) => {
          const leadId = String(lead._id);
          const contactsCount = contactCountByLeadId.get(leadId) || 0;
          const [files, contracts] = await Promise.all([
            safeJson(`${API_BASE}/api/files?leadId=${encodeURIComponent(leadId)}`),
            safeJson(`${API_BASE}/api/contracts?leadId=${encodeURIComponent(leadId)}`),
          ]);
          return [leadId, { contacts: contactsCount, files: files.length, contracts: contracts.length }] as const;
        })
      );

      if (cancelled) return;
      const next: Record<string, { contacts: number; files: number; contracts: number }> = {};
      for (const [id, v] of entries) next[id] = v;
      setKanbanCounts(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [items, contactCountByLeadId]);

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
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
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
      const res = await fetch(`${API_BASE}/api/leads/${id}`, { method: "DELETE", headers: getAuthHeaders() });
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
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
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
      const res = await fetch(`${API_BASE}/api/lead-labels/${id}`, { method: "DELETE", headers: getAuthHeaders() });
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
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ items: rows }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to import");
      toast.success("Imported");
      setOpenImport(false);
      if (importRef.current) importRef.current.value = "";
      await loadLeads();
    } catch (e: any) {
      toast.error(e?.message || "Failed to import");
    }
  };

  const saveMakeClient = async () => {
    try {
      const leadId = makeClientLead?._id;
      if (!leadId) return;

      if (convertMode === "contact") {
        await createLeadContactFromForm(leadId);
        toast.success("Contact added");
        setMakeClientOpen(false);
        setMakeClientLead(null);
        return;
      }

      const isOrg = makeClientForm.type === "Organization";
      const payload: any = {
        type: isOrg ? "org" : "person",
        company: isOrg ? makeClientForm.name : "",
        person: isOrg ? "" : makeClientForm.name,
        owner: makeClientForm.owner,
        address: makeClientForm.address,
        city: makeClientForm.city,
        state: makeClientForm.state,
        zip: makeClientForm.zip,
        country: makeClientForm.country,
        phone: makeClientForm.phone,
        website: makeClientForm.website,
        vatNumber: makeClientForm.vatNumber,
        gstNumber: makeClientForm.gstNumber,
        clientGroups: makeClientForm.clientGroups
          ? makeClientForm.clientGroups.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        currency: makeClientForm.currency,
        currencySymbol: makeClientForm.currencySymbol,
        labels: makeClientForm.labels
          ? makeClientForm.labels.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        disableOnlinePayment: Boolean(makeClientForm.disableOnlinePayment),
        // primary contact fields
        firstName: makeClientForm.firstName,
        lastName: makeClientForm.lastName,
        email: makeClientForm.email,
        contactPhone: makeClientForm.contactPhone || makeClientForm.phone,
        skype: makeClientForm.skype,
        jobTitle: makeClientForm.jobTitle,
        gender: makeClientForm.gender,
        isPrimaryContact: Boolean(makeClientForm.primaryContact),
      };

      const res = await fetch(`${API_BASE}/api/clients`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to create client");

      // Also create the lead contact record for CRM contacts list (same dialog data)
      try {
        await createLeadContactFromForm(leadId);
      } catch {
        // If contact creation fails, still allow client creation
      }

      toast.success("Client created");
      setMakeClientOpen(false);
      setMakeClientLead(null);
      navigate(`/clients/${json._id}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create client");
    }
  };

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
                    const owner = lead.ownerId ? employees.find((e) => String(e._id) === String(lead.ownerId)) : undefined;
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
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                {primary.avatar ? <AvatarImage src={`${API_BASE}${primary.avatar}`} alt="avatar" /> : null}
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(displayContactName(primary))}
                                </AvatarFallback>
                              </Avatar>
                              <button
                                type="button"
                                className="text-primary underline cursor-pointer"
                                onClick={() => navigate(`/crm/contacts/${primary._id}`)}
                              >
                                {displayContactName(primary)}
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{lead.phone || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {lead.ownerId ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                {(owner?.avatar || owner?.image) ? (
                                  <AvatarImage src={`${API_BASE}${owner?.avatar || owner?.image}`} alt="avatar" />
                                ) : null}
                                <AvatarFallback className="text-[10px]">{getInitials(ownerName)}</AvatarFallback>
                              </Avatar>
                              <button
                                type="button"
                                className="text-primary underline cursor-pointer"
                                onClick={() =>
                                  navigate(`/hrm/employees/${lead.ownerId}`, {
                                    state: { dbId: lead.ownerId, employee: { id: 0, name: ownerName, initials: getInitials(ownerName) } },
                                  })
                                }
                              >
                                {ownerName}
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
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
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 lg:mx-0 lg:px-0">
            {columns.map((c) => (
              <div key={c.id} className="flex-shrink-0 w-[280px]">
                <Card className="h-full">
                  <CardHeader className="p-3 pb-2">
                    <div className="text-sm font-medium">{c.title}</div>
                    <div className={cn("h-0.5 mt-2 rounded", c.color)} />
                  </CardHeader>
                  <CardContent
                    className={cn(
                      "p-2 pt-0 space-y-2 min-h-[140px]",
                      dragOverStatus === c.id ? "bg-muted/30" : ""
                    )}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverStatus(c.id);
                    }}
                    onDragLeave={() => setDragOverStatus((s) => (s === c.id ? null : s))}
                    onDrop={(e) => {
                      e.preventDefault();
                      const leadId = e.dataTransfer.getData("text/leadId") || draggingLeadIdRef.current;
                      setDragOverStatus(null);
                      if (!leadId) return;
                      void updateLeadStatus(leadId, c.id);
                      draggingLeadIdRef.current = null;
                      draggingFromStatusRef.current = null;
                    }}
                  >
                    {kanbanGroups[c.id]?.map((lead) => (
                      <div
                        key={lead._id}
                        draggable
                        onDragStart={(e) => {
                          draggingLeadIdRef.current = lead._id;
                          draggingFromStatusRef.current = lead.status || "New";
                          e.dataTransfer.setData("text/leadId", lead._id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          draggingLeadIdRef.current = null;
                          draggingFromStatusRef.current = null;
                          setDragOverStatus(null);
                        }}
                        className="kanban-card cursor-grab active:cursor-grabbing group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            className="font-medium text-sm truncate text-left"
                            onClick={() => navigate(`/crm/leads/${lead._id}`)}
                          >
                            {lead.name}
                          </button>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openConvertDialog("contact", lead);
                              }}
                              aria-label="+ Contact"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openConvertDialog("client", lead);
                              }}
                              aria-label="Make client"
                            >
                              <UserPlus className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditLead(lead);
                              }}
                              aria-label="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/crm/leads/${lead._id}`, "_blank", "noopener,noreferrer");
                              }}
                              aria-label="Open"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground mt-1">{lead.source || "-"}</div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                          <div className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            <span>{kanbanCounts[String(lead._id)]?.contacts ?? (contactCountByLeadId.get(String(lead._id)) || 0)}</span>
                          </div>
                          <div className="inline-flex items-center gap-1">
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>{kanbanCounts[String(lead._id)]?.files ?? 0}</span>
                          </div>
                          <div className="inline-flex items-center gap-1">
                            <FileSignature className="w-3.5 h-3.5" />
                            <span>{kanbanCounts[String(lead._id)]?.contracts ?? 0}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                          <span>{formatRelative(lead.createdAt)}</span>
                          <Avatar className="h-6 w-6">
                            {(() => {
                              const owner = lead.ownerId ? employees.find((e) => String(e._id) === String(lead.ownerId)) : undefined;
                              const src = owner?.avatar || owner?.image;
                              return src ? <AvatarImage src={`${API_BASE}${src}`} alt="avatar" /> : null;
                            })()}
                            <AvatarFallback>
                              {getInitials(lead.ownerId ? employeeNameById.get(lead.ownerId) : lead.name)}
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

          <Dialog open={makeClientOpen} onOpenChange={setMakeClientOpen}>
            <DialogContent className="bg-card max-w-3xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>
                  {convertMode === "contact"
                    ? (makeClientLead?.name ? `+ Contact: ${makeClientLead.name}` : "+ Contact")
                    : (makeClientLead?.name ? `Make client: ${makeClientLead.name}` : "Make client")}
                </DialogTitle>
              </DialogHeader>

              <Tabs value={makeClientStep} onValueChange={(v) => setMakeClientStep(v as any)}>
                <TabsList className="bg-muted/40">
                  <TabsTrigger value="details" disabled={convertMode === "contact"}>Client details</TabsTrigger>
                  <TabsTrigger value="contact">Client contacts</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <Label className="sm:col-span-2 text-muted-foreground">Type</Label>
                      <div className="sm:col-span-10">
                        <RadioGroup
                          value={makeClientForm.type}
                          onValueChange={(v) => setMakeClientForm((p) => ({ ...p, type: v as any }))}
                          className="flex items-center gap-6"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Organization" id="client-type-org" />
                            <Label htmlFor="client-type-org">Organization</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Person" id="client-type-person" />
                            <Label htmlFor="client-type-person">Person</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Name</Label>
                      <Input value={makeClientForm.name} onChange={(e) => setMakeClientForm((p) => ({ ...p, name: e.target.value }))} />
                    </div>

                    <div className="space-y-1">
                      <Label>Owner</Label>
                      <Input value={makeClientForm.owner} onChange={(e) => setMakeClientForm((p) => ({ ...p, owner: e.target.value }))} placeholder="Owner" />
                    </div>

                    <div className="space-y-1">
                      <Label>Address</Label>
                      <Textarea value={makeClientForm.address} onChange={(e) => setMakeClientForm((p) => ({ ...p, address: e.target.value }))} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>City</Label><Input value={makeClientForm.city} onChange={(e) => setMakeClientForm((p) => ({ ...p, city: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>State</Label><Input value={makeClientForm.state} onChange={(e) => setMakeClientForm((p) => ({ ...p, state: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Zip</Label><Input value={makeClientForm.zip} onChange={(e) => setMakeClientForm((p) => ({ ...p, zip: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Country</Label><Input value={makeClientForm.country} onChange={(e) => setMakeClientForm((p) => ({ ...p, country: e.target.value }))} /></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Phone</Label><Input value={makeClientForm.phone} onChange={(e) => setMakeClientForm((p) => ({ ...p, phone: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Website</Label><Input value={makeClientForm.website} onChange={(e) => setMakeClientForm((p) => ({ ...p, website: e.target.value }))} /></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>VAT Number</Label><Input value={makeClientForm.vatNumber} onChange={(e) => setMakeClientForm((p) => ({ ...p, vatNumber: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>GST Number</Label><Input value={makeClientForm.gstNumber} onChange={(e) => setMakeClientForm((p) => ({ ...p, gstNumber: e.target.value }))} /></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Client groups</Label><Input placeholder="Comma separated" value={makeClientForm.clientGroups} onChange={(e) => setMakeClientForm((p) => ({ ...p, clientGroups: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Labels</Label><Input placeholder="Comma separated" value={makeClientForm.labels} onChange={(e) => setMakeClientForm((p) => ({ ...p, labels: e.target.value }))} /></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Currency</Label><Input value={makeClientForm.currency} onChange={(e) => setMakeClientForm((p) => ({ ...p, currency: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Currency Symbol</Label><Input value={makeClientForm.currencySymbol} onChange={(e) => setMakeClientForm((p) => ({ ...p, currencySymbol: e.target.value }))} /></div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id="disable-online-payment"
                        type="checkbox"
                        checked={makeClientForm.disableOnlinePayment}
                        onChange={(e) => setMakeClientForm((p) => ({ ...p, disableOnlinePayment: e.target.checked }))}
                      />
                      <Label htmlFor="disable-online-payment">Disable online payment</Label>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="contact" className="mt-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>First name</Label><Input value={makeClientForm.firstName} onChange={(e) => setMakeClientForm((p) => ({ ...p, firstName: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Last name</Label><Input value={makeClientForm.lastName} onChange={(e) => setMakeClientForm((p) => ({ ...p, lastName: e.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Email</Label><Input type="email" value={makeClientForm.email} onChange={(e) => setMakeClientForm((p) => ({ ...p, email: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Phone</Label><Input value={makeClientForm.contactPhone} onChange={(e) => setMakeClientForm((p) => ({ ...p, contactPhone: e.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Skype</Label><Input value={makeClientForm.skype} onChange={(e) => setMakeClientForm((p) => ({ ...p, skype: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Job Title</Label><Input value={makeClientForm.jobTitle} onChange={(e) => setMakeClientForm((p) => ({ ...p, jobTitle: e.target.value }))} /></div>
                    </div>

                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <RadioGroup
                        value={makeClientForm.gender}
                        onValueChange={(v) => setMakeClientForm((p) => ({ ...p, gender: v as any }))}
                        className="flex items-center gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="male" id="gender-male" />
                          <Label htmlFor="gender-male">Male</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="female" id="gender-female" />
                          <Label htmlFor="gender-female">Female</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="other" id="gender-other" />
                          <Label htmlFor="gender-other">Other</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Password</Label><Input type="password" value={makeClientForm.password} onChange={(e) => setMakeClientForm((p) => ({ ...p, password: e.target.value }))} placeholder="Password" /></div>
                      <div className="flex items-center gap-2 mt-6">
                        <input
                          id="primary-contact"
                          type="checkbox"
                          checked={makeClientForm.primaryContact}
                          onChange={(e) => setMakeClientForm((p) => ({ ...p, primaryContact: e.target.checked }))}
                        />
                        <Label htmlFor="primary-contact">Primary contact</Label>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setMakeClientOpen(false)}>Close</Button>
                {makeClientStep === "contact" ? (
                  <Button type="button" variant="outline" onClick={() => setMakeClientStep("details")}>Previous</Button>
                ) : null}
                {makeClientStep === "details" ? (
                  <Button type="button" onClick={() => setMakeClientStep("contact")}>Next</Button>
                ) : (
                  <Button type="button" onClick={saveMakeClient}>Save</Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
