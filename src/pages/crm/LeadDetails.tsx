import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import Events from "../events/Events";
import Files from "../files/Files";
import Notes from "../notes/Notes";
import { TasksOverview } from "@/components/dashboard/TasksOverview";
import {
  Check,
  Download,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";

const API_BASE = "http://localhost:5000";

type Employee = { _id: string; name?: string; firstName?: string; lastName?: string };

type LeadLabel = { _id: string; name: string; color?: string };

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

type ContactDoc = {
  _id: string;
  leadId?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  email: string;
  phone?: string;
  skype?: string;
  isPrimaryContact?: boolean;
  gender?: "male" | "female" | "other" | "";
};

type ReminderDoc = {
  _id: string;
  leadId: string;
  title?: string;
  dueAt?: string;
  repeat?: boolean;
  createdAt?: string;
};

type ProjectDoc = {
  _id: string;
  title?: string;
};

type ContractDoc = {
  _id: string;
  leadId?: string;
  title?: string;
  projectId?: string;
  contractDate?: string;
  validUntil?: string;
  status?: string;
  tax1?: number;
  tax2?: number;
  note?: string;
  fileIds?: string[];
  createdAt?: string;
};

type ProposalDoc = {
  _id: string;
  leadId?: string;
  proposalDate?: string;
  validUntil?: string;
  status?: string;
  tax1?: number;
  tax2?: number;
  note?: string;
  fileIds?: string[];
  createdAt?: string;
};

type EstimateDoc = {
  _id: string;
  leadId?: string;
  number?: string;
  estimateDate?: string;
  validUntil?: string;
  status?: string;
  tax?: number;
  tax2?: number;
  note?: string;
  advancedAmount?: number;
  amount?: number;
  fileIds?: string[];
  createdAt?: string;
};

const STATUS_OPTIONS = [
  "New",
  "Qualified",
  "Discussion",
  "Negotiation",
  "Won",
  "Lost",
];

const SOURCE_OPTIONS = [
  "Website",
  "LinkedIn",
  "Referral",
  "Cold Call",
  "Trade Show",
];

const TABS = [
  { id: "contacts", label: "Contacts" },
  { id: "lead-info", label: "Lead info" },
  { id: "tasks", label: "Tasks" },
  { id: "estimates", label: "Estimates" },
  { id: "estimate-requests", label: "Estimate Requests" },
  { id: "proposals", label: "Proposals" },
  { id: "contracts", label: "Contracts" },
  { id: "notes", label: "Notes" },
  { id: "files", label: "Files" },
  { id: "events", label: "Events" },
] as const;

function toStr(v: any) {
  return v === undefined || v === null ? "" : String(v);
}

function parseTimeToHoursMinutes(raw: string) {
  const t = (raw || "").trim();
  if (!t) return { hh: 0, mm: 0 };

  // Accept "HH:MM" (24h)
  const m24 = t.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (m24) return { hh: Number(m24[1]), mm: Number(m24[2]) };

  // Accept "H:MM AM/PM" (12h)
  const m12 = t.match(/^([1-9]|1[0-2]):([0-5]\d)\s*([AaPp][Mm])$/);
  if (m12) {
    let hh = Number(m12[1]);
    const mm = Number(m12[2]);
    const ap = m12[3].toUpperCase();
    if (ap === "PM" && hh !== 12) hh += 12;
    if (ap === "AM" && hh === 12) hh = 0;
    return { hh, mm };
  }

  return null;
}

function formatYmd(iso?: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "-";
  }
}

export default function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("contacts");
  const [loading, setLoading] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [labels, setLabels] = useState<LeadLabel[]>([]);
  const [projects, setProjects] = useState<ProjectDoc[]>([]);

  const [lead, setLead] = useState<LeadDoc | null>(null);
  const [leadForm, setLeadForm] = useState({
    type: "Organization" as "Organization" | "Person",
    name: "",
    email: "",
    phone: "",
    ownerId: "-",
    status: "New",
    source: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    vatNumber: "",
    gstNumber: "",
    currency: "",
    currencySymbol: "",
    labels: [] as string[],
  });

  const [contacts, setContacts] = useState<ContactDoc[]>([]);
  const [contactsQuery, setContactsQuery] = useState("");

  const [openReminders, setOpenReminders] = useState(false);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [reminders, setReminders] = useState<ReminderDoc[]>([]);
  const [reminderForm, setReminderForm] = useState({
    title: "",
    date: "",
    time: "",
    repeat: false,
  });

  const [contracts, setContracts] = useState<ContractDoc[]>([]);
  const [contractsQuery, setContractsQuery] = useState("");
  const [openAddContract, setOpenAddContract] = useState(false);
  const [contractForm, setContractForm] = useState({
    title: "",
    contractDate: "",
    validUntil: "",
    projectId: "-",
    tax1: "0",
    tax2: "0",
    note: "",
  });
  const contractFilesRef = useRef<HTMLInputElement>(null);
  const [contractSelectedFiles, setContractSelectedFiles] = useState<File[]>([]);

  const [proposals, setProposals] = useState<ProposalDoc[]>([]);
  const [proposalsQuery, setProposalsQuery] = useState("");
  const [openAddProposal, setOpenAddProposal] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    proposalDate: "",
    validUntil: "",
    tax1: "0",
    tax2: "0",
    note: "",
  });
  const proposalFilesRef = useRef<HTMLInputElement>(null);
  const [proposalSelectedFiles, setProposalSelectedFiles] = useState<File[]>([]);

  const [estimates, setEstimates] = useState<EstimateDoc[]>([]);
  const [estimatesQuery, setEstimatesQuery] = useState("");
  const [openAddEstimate, setOpenAddEstimate] = useState(false);
  const [estimateForm, setEstimateForm] = useState({
    estimateDate: "",
    validUntil: "",
    tax: "0",
    tax2: "0",
    note: "",
    advancedAmount: "",
  });
  const estimateFilesRef = useRef<HTMLInputElement>(null);
  const [estimateSelectedFiles, setEstimateSelectedFiles] = useState<File[]>([]);

  const [openAddContact, setOpenAddContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    jobTitle: "",
    email: "",
    phone: "",
    skype: "",
    isPrimaryContact: false,
    gender: "" as "male" | "female" | "other" | "",
  });

  const contactsPrintRef = useRef<HTMLDivElement>(null);

  const primaryContact = useMemo(() => {
    return contacts.find((c) => c.isPrimaryContact);
  }, [contacts]);

  const employeeNameById = useMemo(() => {
    const m = new Map<string, string>();
    employees.forEach((e) => {
      const name = (e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "-").trim();
      if (e._id) m.set(e._id, name);
    });
    return m;
  }, [employees]);

  const projectTitleById = useMemo(() => {
    const m = new Map<string, string>();
    projects.forEach((p) => {
      if (p._id) m.set(p._id, p.title || "-");
    });
    return m;
  }, [projects]);

  const title = lead?.name || "Lead";
  const leadClientName = lead?.name || "";

  const formatDateTime = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const yyyyMmDd = d.toISOString().slice(0, 10);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${yyyyMmDd} ${hh}:${mm}`;
    } catch {
      return "";
    }
  };

  const loadProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/projects`);
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load projects");
    }
  };

  const uploadLeadFiles = async (filesToUpload: File[]) => {
    if (!id) return [] as string[];
    const uploadedIds: string[] = [];
    for (const f of filesToUpload) {
      const fd = new FormData();
      fd.append("leadId", id);
      fd.append("name", f.name);
      fd.append("file", f);
      const res = await fetch(`${API_BASE}/api/files`, { method: "POST", body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      if (json?._id) uploadedIds.push(String(json._id));
    }
    return uploadedIds;
  };

  const loadContracts = async () => {
    if (!id) return;
    try {
      const params = new URLSearchParams();
      params.set("leadId", id);
      if (contractsQuery.trim()) params.set("q", contractsQuery.trim());
      const res = await fetch(`${API_BASE}/api/contracts?${params.toString()}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      setContracts(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load contracts");
    }
  };

  const saveContract = async () => {
    if (!id) return;
    try {
      const t = contractForm.title.trim();
      if (!t) {
        toast.error("Title is required");
        return;
      }

      const fileIds = contractSelectedFiles.length ? await uploadLeadFiles(contractSelectedFiles) : [];
      const res = await fetch(`${API_BASE}/api/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: id,
          client: leadClientName,
          title: t,
          contractDate: contractForm.contractDate ? new Date(contractForm.contractDate).toISOString() : undefined,
          validUntil: contractForm.validUntil ? new Date(contractForm.validUntil).toISOString() : undefined,
          projectId: contractForm.projectId !== "-" ? contractForm.projectId : undefined,
          tax1: Number(contractForm.tax1 || 0),
          tax2: Number(contractForm.tax2 || 0),
          note: contractForm.note || "",
          fileIds,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");

      toast.success("Contract created");
      setOpenAddContract(false);
      setContractForm({ title: "", contractDate: "", validUntil: "", projectId: "-", tax1: "0", tax2: "0", note: "" });
      setContractSelectedFiles([]);
      if (contractFilesRef.current) contractFilesRef.current.value = "";
      await loadContracts();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save contract");
    }
  };

  const deleteContract = async (contractId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/contracts/${contractId}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Contract deleted");
      await loadContracts();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete contract");
    }
  };

  const loadProposals = async () => {
    if (!id) return;
    try {
      const params = new URLSearchParams();
      params.set("leadId", id);
      if (proposalsQuery.trim()) params.set("q", proposalsQuery.trim());
      const res = await fetch(`${API_BASE}/api/proposals?${params.toString()}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      setProposals(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load proposals");
    }
  };

  const saveProposal = async () => {
    if (!id) return;
    try {
      if (!proposalForm.proposalDate) {
        toast.error("Proposal date is required");
        return;
      }

      const fileIds = proposalSelectedFiles.length ? await uploadLeadFiles(proposalSelectedFiles) : [];
      const res = await fetch(`${API_BASE}/api/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: id,
          client: leadClientName,
          proposalDate: proposalForm.proposalDate ? new Date(proposalForm.proposalDate).toISOString() : undefined,
          validUntil: proposalForm.validUntil ? new Date(proposalForm.validUntil).toISOString() : undefined,
          tax1: Number(proposalForm.tax1 || 0),
          tax2: Number(proposalForm.tax2 || 0),
          note: proposalForm.note || "",
          fileIds,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");

      toast.success("Proposal created");
      setOpenAddProposal(false);
      setProposalForm({ proposalDate: "", validUntil: "", tax1: "0", tax2: "0", note: "" });
      setProposalSelectedFiles([]);
      if (proposalFilesRef.current) proposalFilesRef.current.value = "";
      await loadProposals();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save proposal");
    }
  };

  const deleteProposal = async (proposalId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/proposals/${proposalId}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Proposal deleted");
      await loadProposals();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete proposal");
    }
  };

  const loadEstimates = async () => {
    if (!id) return;
    try {
      const params = new URLSearchParams();
      params.set("leadId", id);
      if (estimatesQuery.trim()) params.set("q", estimatesQuery.trim());
      const res = await fetch(`${API_BASE}/api/estimates?${params.toString()}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      setEstimates(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load estimates");
    }
  };

  const saveEstimate = async () => {
    if (!id) return;
    try {
      if (!estimateForm.estimateDate) {
        toast.error("Estimate date is required");
        return;
      }

      const fileIds = estimateSelectedFiles.length ? await uploadLeadFiles(estimateSelectedFiles) : [];
      const res = await fetch(`${API_BASE}/api/estimates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: id,
          client: leadClientName || "-",
          estimateDate: estimateForm.estimateDate ? new Date(estimateForm.estimateDate).toISOString() : undefined,
          validUntil: estimateForm.validUntil ? new Date(estimateForm.validUntil).toISOString() : undefined,
          tax: Number(estimateForm.tax || 0),
          tax2: Number(estimateForm.tax2 || 0),
          note: estimateForm.note || "",
          advancedAmount: estimateForm.advancedAmount ? Number(estimateForm.advancedAmount || 0) : 0,
          items: [],
          fileIds,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");

      toast.success("Estimate created");
      setOpenAddEstimate(false);
      setEstimateForm({ estimateDate: "", validUntil: "", tax: "0", tax2: "0", note: "", advancedAmount: "" });
      setEstimateSelectedFiles([]);
      if (estimateFilesRef.current) estimateFilesRef.current.value = "";
      await loadEstimates();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save estimate");
    }
  };

  const deleteEstimate = async (estimateId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/estimates/${estimateId}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Estimate deleted");
      await loadEstimates();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete estimate");
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

  const loadReminders = async () => {
    if (!id) return;
    try {
      setRemindersLoading(true);
      const params = new URLSearchParams();
      params.set("leadId", id);
      const res = await fetch(`${API_BASE}/api/reminders?${params.toString()}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Reminders API not found. Restart backend server.");
        throw new Error(json?.error || "Failed");
      }
      setReminders(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load reminders");
    } finally {
      setRemindersLoading(false);
    }
  };

  const addReminder = async () => {
    if (!id) return;
    try {
      const title = reminderForm.title.trim();
      if (!title) {
        toast.error("Title is required");
        return;
      }
      if (!reminderForm.date) {
        toast.error("Date is required");
        return;
      }
      const parts = parseTimeToHoursMinutes(reminderForm.time);
      if (!parts) {
        toast.error("Invalid time format");
        return;
      }
      const dueAt = new Date(`${reminderForm.date}T00:00:00`);
      dueAt.setHours(parts.hh, parts.mm, 0, 0);
      if (Number.isNaN(dueAt.getTime())) {
        toast.error("Invalid date/time");
        return;
      }

      const res = await fetch(`${API_BASE}/api/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: id,
          title,
          repeat: reminderForm.repeat,
          dueAt: dueAt.toISOString(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Reminders API not found. Restart backend server.");
        throw new Error(json?.error || "Failed");
      }

      setReminderForm({ title: "", date: "", time: "", repeat: false });
      if (json?._id) {
        setReminders((p) => [json, ...p]);
      }
      await loadReminders();
      toast.success("Reminder added");
    } catch (e: any) {
      toast.error(e?.message || "Failed to add reminder");
    }
  };

  const makePrimaryContact = async (contactId: string) => {
    try {
      const updates = contacts
        .filter((c) => c._id !== contactId && c.isPrimaryContact)
        .map((c) =>
          fetch(`${API_BASE}/api/contacts/${c._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isPrimaryContact: false }),
          })
        );
      await Promise.all(updates);
      const res = await fetch(`${API_BASE}/api/contacts/${contactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimaryContact: true }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Primary contact updated");
      await loadContacts();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update primary contact");
    }
  };

  const deleteReminder = async (rid: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/reminders/${rid}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      await loadReminders();
      toast.success("Reminder deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete reminder");
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

  const loadLead = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/leads/${id}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      setLead(json);
      setLeadForm({
        type: json?.type || "Organization",
        name: json?.name || "",
        email: json?.email || "",
        phone: json?.phone || "",
        ownerId: json?.ownerId || "-",
        status: json?.status || "New",
        source: json?.source || "",
        website: json?.website || "",
        address: json?.address || "",
        city: json?.city || "",
        state: json?.state || "",
        zip: json?.zip || "",
        country: json?.country || "",
        vatNumber: json?.vatNumber || "",
        gstNumber: json?.gstNumber || "",
        currency: json?.currency || "",
        currencySymbol: json?.currencySymbol || "",
        labels: Array.isArray(json?.labels) ? json.labels.map((x: any) => x?.toString?.() ?? String(x)) : [],
      });
    } catch (e: any) {
      toast.error(e?.message || "Failed to load lead");
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    if (!id) return;
    try {
      const params = new URLSearchParams();
      params.set("leadId", id);
      if (contactsQuery.trim()) params.set("q", contactsQuery.trim());
      const res = await fetch(`${API_BASE}/api/contacts?${params.toString()}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      setContacts(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load contacts");
    }
  };

  useEffect(() => {
    loadEmployees();
    loadLabels();
    loadProjects();
  }, []);

  useEffect(() => {
    loadLead();
    loadContacts();
  }, [id]);

  useEffect(() => {
    if (!openReminders) return;
    loadReminders();
  }, [openReminders, id]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      loadContacts();
    }, 250);
    return () => window.clearTimeout(t);
  }, [contactsQuery]);

  useEffect(() => {
    if (activeTab !== "contracts") return;
    loadContracts();
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab !== "contracts") return;
    const t = window.setTimeout(() => {
      loadContracts();
    }, 250);
    return () => window.clearTimeout(t);
  }, [contractsQuery, activeTab]);

  useEffect(() => {
    if (activeTab !== "proposals") return;
    loadProposals();
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab !== "proposals") return;
    const t = window.setTimeout(() => {
      loadProposals();
    }, 250);
    return () => window.clearTimeout(t);
  }, [proposalsQuery, activeTab]);

  useEffect(() => {
    if (activeTab !== "estimates") return;
    loadEstimates();
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab !== "estimates") return;
    const t = window.setTimeout(() => {
      loadEstimates();
    }, 250);
    return () => window.clearTimeout(t);
  }, [estimatesQuery, activeTab]);

  const toggleLeadLabel = (labelId: string) => {
    const lid = labelId?.toString?.() ?? String(labelId);
    setLeadForm((p) => {
      const selected = (p.labels || []).some((x) => (x?.toString?.() ?? String(x)) === lid);
      return { ...p, labels: selected ? [] : [lid] };
    });
  };

  const saveLead = async () => {
    if (!id) return;
    try {
      if (!leadForm.name.trim()) {
        toast.error("Name is required");
        return;
      }
      const payload: any = {
        type: leadForm.type,
        name: leadForm.name.trim(),
        email: leadForm.email,
        phone: leadForm.phone,
        status: leadForm.status,
        source: leadForm.source,
        website: leadForm.website,
        address: leadForm.address,
        city: leadForm.city,
        state: leadForm.state,
        zip: leadForm.zip,
        country: leadForm.country,
        vatNumber: leadForm.vatNumber,
        gstNumber: leadForm.gstNumber,
        currency: leadForm.currency,
        currencySymbol: leadForm.currencySymbol,
        labels: (leadForm.labels || []).map((x) => x?.toString?.() ?? String(x)),
      };
      if (leadForm.ownerId !== "-") payload.ownerId = leadForm.ownerId;

      const res = await fetch(`${API_BASE}/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Saved");
      setLead(json);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    }
  };

  const openNewContract = () => {
    setContractForm({ title: "", contractDate: "", validUntil: "", projectId: "-", tax1: "0", tax2: "0", note: "" });
    setContractSelectedFiles([]);
    if (contractFilesRef.current) contractFilesRef.current.value = "";
    setOpenAddContract(true);
  };

  const openNewProposal = () => {
    setProposalForm({ proposalDate: "", validUntil: "", tax1: "0", tax2: "0", note: "" });
    setProposalSelectedFiles([]);
    if (proposalFilesRef.current) proposalFilesRef.current.value = "";
    setOpenAddProposal(true);
  };

  const openNewEstimate = () => {
    setEstimateForm({ estimateDate: "", validUntil: "", tax: "0", tax2: "0", note: "", advancedAmount: "" });
    setEstimateSelectedFiles([]);
    if (estimateFilesRef.current) estimateFilesRef.current.value = "";
    setOpenAddEstimate(true);
  };

  const openNewContact = () => {
    setContactForm({
      firstName: "",
      lastName: "",
      jobTitle: "",
      email: "",
      phone: "",
      skype: "",
      isPrimaryContact: false,
      gender: "",
    });
    setOpenAddContact(true);
  };

  const saveContact = async () => {
    if (!id) return;
    try {
      const firstName = contactForm.firstName.trim();
      const lastName = contactForm.lastName.trim();
      if (!firstName) {
        toast.error("First name is required");
        return;
      }
      if (!contactForm.email.trim()) {
        toast.error("Email is required");
        return;
      }

      const fullName = `${firstName}${lastName ? ` ${lastName}` : ""}`.trim();

      if (contactForm.isPrimaryContact) {
        await Promise.all(
          contacts
            .filter((c) => c.isPrimaryContact)
            .map((c) =>
              fetch(`${API_BASE}/api/contacts/${c._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isPrimaryContact: false }),
              })
            )
        );
      }

      const res = await fetch(`${API_BASE}/api/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: id,
          name: fullName,
          firstName,
          lastName,
          jobTitle: contactForm.jobTitle,
          email: contactForm.email.trim(),
          phone: contactForm.phone,
          skype: contactForm.skype,
          isPrimaryContact: contactForm.isPrimaryContact,
          gender: contactForm.gender,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");

      toast.success("Contact added");
      setOpenAddContact(false);
      await loadContacts();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save contact");
    }
  };

  const deleteContact = async (contactId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/contacts/${contactId}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Contact deleted");
      await loadContacts();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete contact");
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

  const exportContacts = () => {
    const rows: string[][] = [
      ["Name", "Job title", "Email", "Phone", "Skype", "Primary"],
      ...contacts.map((c) => [
        c.name || "",
        c.jobTitle || "",
        c.email || "",
        c.phone || "",
        c.skype || "",
        c.isPrimaryContact ? "Yes" : "No",
      ]),
    ];
    downloadCsv(`lead_${id}_contacts.csv`, rows);
  };

  const exportContracts = () => {
    const rows: string[][] = [
      ["Title", "Project", "Contract Date", "Valid Until", "Tax1", "Tax2", "Status", "Note"],
      ...contracts.map((c) => [
        c.title || "",
        c.projectId ? (projectTitleById.get(c.projectId) || "-") : "-",
        formatYmd(c.contractDate),
        formatYmd(c.validUntil),
        String(c.tax1 ?? 0),
        String(c.tax2 ?? 0),
        c.status || "-",
        c.note || "",
      ]),
    ];
    downloadCsv(`lead_${id}_contracts.csv`, rows);
  };

  const exportProposals = () => {
    const rows: string[][] = [
      ["Proposal Date", "Valid Until", "Tax1", "Tax2", "Status", "Note"],
      ...proposals.map((p) => [
        formatYmd(p.proposalDate),
        formatYmd(p.validUntil),
        String(p.tax1 ?? 0),
        String(p.tax2 ?? 0),
        p.status || "-",
        p.note || "",
      ]),
    ];
    downloadCsv(`lead_${id}_proposals.csv`, rows);
  };

  const exportEstimates = () => {
    const rows: string[][] = [
      ["Estimate Date", "Valid Until", "Tax", "Tax2", "Advanced", "Amount", "Status", "Note"],
      ...estimates.map((e) => [
        formatYmd(e.estimateDate),
        formatYmd(e.validUntil),
        String(e.tax ?? 0),
        String(e.tax2 ?? 0),
        String(e.advancedAmount ?? 0),
        String(e.amount ?? 0),
        e.status || "-",
        e.note || "",
      ]),
    ];
    downloadCsv(`lead_${id}_estimates.csv`, rows);
  };

  const printContacts = () => {
    const rowsHtml = contacts
      .map((c) => {
        return `
          <tr>
            <td>${toStr(c.name)}</td>
            <td>${toStr(c.jobTitle)}</td>
            <td>${toStr(c.email)}</td>
            <td>${toStr(c.phone)}</td>
            <td>${toStr(c.skype)}</td>
            <td>${c.isPrimaryContact ? "Yes" : "No"}</td>
          </tr>`;
      })
      .join("");

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Contacts</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; }
      h1 { font-size: 18px; margin: 0 0 12px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
      th { background: #f5f5f5; text-align: left; }
    </style>
  </head>
  <body>
    <h1>Contacts</h1>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Job title</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Skype</th>
          <th>Primary</th>
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

  const printEstimates = () => {
    const rowsHtml = estimates
      .map((e) => {
        return `
          <tr>
            <td>${toStr(formatYmd(e.estimateDate))}</td>
            <td>${toStr(formatYmd(e.validUntil))}</td>
            <td>${toStr(e.tax ?? 0)}</td>
            <td>${toStr(e.tax2 ?? 0)}</td>
            <td>${toStr(e.advancedAmount ?? 0)}</td>
            <td>${toStr(e.amount ?? 0)}</td>
            <td>${toStr(e.status || "-")}</td>
            <td>${toStr(e.note)}</td>
          </tr>`;
      })
      .join("");

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Estimates</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; }
      h1 { font-size: 18px; margin: 0 0 12px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
      th { background: #f5f5f5; text-align: left; }
    </style>
  </head>
  <body>
    <h1>Estimates</h1>
    <table>
      <thead>
        <tr>
          <th>Estimate Date</th>
          <th>Valid Until</th>
          <th>Tax</th>
          <th>Tax2</th>
          <th>Advanced</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Note</th>
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

  const printProposals = () => {
    const rowsHtml = proposals
      .map((p) => {
        return `
          <tr>
            <td>${toStr(formatYmd(p.proposalDate))}</td>
            <td>${toStr(formatYmd(p.validUntil))}</td>
            <td>${toStr(p.tax1 ?? 0)}</td>
            <td>${toStr(p.tax2 ?? 0)}</td>
            <td>${toStr(p.status || "-")}</td>
            <td>${toStr(p.note)}</td>
          </tr>`;
      })
      .join("");

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Proposals</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; }
      h1 { font-size: 18px; margin: 0 0 12px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
      th { background: #f5f5f5; text-align: left; }
    </style>
  </head>
  <body>
    <h1>Proposals</h1>
    <table>
      <thead>
        <tr>
          <th>Proposal Date</th>
          <th>Valid Until</th>
          <th>Tax1</th>
          <th>Tax2</th>
          <th>Status</th>
          <th>Note</th>
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

  const printContracts = () => {
    const rowsHtml = contracts
      .map((c) => {
        const project = c.projectId ? (projectTitleById.get(c.projectId) || "-") : "-";
        return `
          <tr>
            <td>${toStr(c.title)}</td>
            <td>${toStr(project)}</td>
            <td>${toStr(formatYmd(c.contractDate))}</td>
            <td>${toStr(formatYmd(c.validUntil))}</td>
            <td>${toStr(c.tax1 ?? 0)}</td>
            <td>${toStr(c.tax2 ?? 0)}</td>
            <td>${toStr(c.status || "-")}</td>
            <td>${toStr(c.note)}</td>
          </tr>`;
      })
      .join("");

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Contracts</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; }
      h1 { font-size: 18px; margin: 0 0 12px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
      th { background: #f5f5f5; text-align: left; }
    </style>
  </head>
  <body>
    <h1>Contracts</h1>
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Project</th>
          <th>Contract Date</th>
          <th>Valid Until</th>
          <th>Tax1</th>
          <th>Tax2</th>
          <th>Status</th>
          <th>Note</th>
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

  const makeClient = async () => {
    if (!lead) return;
    try {
      const type = lead.type === "Person" ? "person" : "org";
      const ownerName = lead.ownerId ? (employeeNameById.get(lead.ownerId) || "") : "";

      const payload: any = {
        type,
        company: type === "org" ? lead.name : (lead.company || ""),
        person: type === "person" ? lead.name : "",
        owner: ownerName,
        email: lead.email || "",
        phone: lead.phone || "",
        website: lead.website || "",
        address: lead.address || "",
        city: lead.city || "",
        state: lead.state || "",
        zip: lead.zip || "",
        country: lead.country || "",
        vatNumber: lead.vatNumber || "",
        gstNumber: lead.gstNumber || "",
        currency: lead.currency || "",
        currencySymbol: lead.currencySymbol || "",
      };

      const res = await fetch(`${API_BASE}/api/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Client created");
      if (json?._id) navigate(`/clients/${json._id}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create client");
    }
  };

  const SimpleEmptyTab = ({ title }: { title: string }) => {
    return (
      <Card>
        <CardHeader className="p-4">
          <div className="text-sm font-medium">{title}</div>
        </CardHeader>
        <CardContent className="p-4 text-sm text-muted-foreground">No record found.</CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Lead details - {title}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Primary contact: <span className="text-foreground">{primaryContact?.name || "-"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setOpenReminders(true)}>Reminders</Button>
          <Button type="button" onClick={makeClient}>Make client</Button>
        </div>
      </div>

      <Sheet open={openReminders} onOpenChange={setOpenReminders}>
        <SheetContent side="right" className="p-0 sm:max-w-[420px]">
          <div className="p-4 border-b">
            <SheetHeader className="space-y-0">
              <SheetTitle className="text-base">{title || "Reminders"}</SheetTitle>
            </SheetHeader>
          </div>

          <div className="p-4 space-y-3">
            <Input
              placeholder="Title"
              value={reminderForm.title}
              onChange={(e) => setReminderForm((p) => ({ ...p, title: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={reminderForm.date} onChange={(e) => setReminderForm((p) => ({ ...p, date: e.target.value }))} />
              <Input type="time" value={reminderForm.time} onChange={(e) => setReminderForm((p) => ({ ...p, time: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Repeat</span>
                <span className="text-muted-foreground">?</span>
              </div>
              <Checkbox
                checked={reminderForm.repeat}
                onCheckedChange={(v) => setReminderForm((p) => ({ ...p, repeat: Boolean(v) }))}
              />
            </div>

            <Button type="button" className="w-full" onClick={addReminder}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Add
            </Button>

            <div className="pt-2">
              {remindersLoading ? (
                <div className="text-sm text-muted-foreground text-center">Loading...</div>
              ) : reminders.length ? (
                <div className="space-y-2">
                  {reminders.map((r) => (
                    <div key={r._id} className="flex items-start justify-between gap-3 border rounded-md p-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{r.title || "-"}</div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(r.dueAt)}</div>
                      </div>
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => deleteReminder(r._id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center">No record found.</div>
              )}
            </div>
          </div>

          <SheetFooter className="p-4 border-t">
            <Button type="button" variant="outline" className="w-full" onClick={() => toast.message("Coming soon")}>
              Show all reminders
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="bg-muted/40 flex flex-wrap justify-start">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="contacts" className="mt-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Contacts</div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={exportContacts}><Download className="w-4 h-4 mr-2"/>Excel</Button>
                  <Button type="button" variant="outline" onClick={printContacts}><Printer className="w-4 h-4 mr-2"/>Print</Button>
                  <Button type="button" variant="outline" onClick={loadContacts}><RefreshCw className="w-4 h-4"/></Button>
                  <Button type="button" onClick={openNewContact}><Plus className="w-4 h-4 mr-2"/>Add contact</Button>
                </div>
              </div>
              <div className="flex items-center justify-end mt-2">
                <Input className="w-64" placeholder="Search" value={contactsQuery} onChange={(e) => setContactsQuery(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0" ref={contactsPrintRef}>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Skype</TableHead>
                    <TableHead className="w-44"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.length ? contacts.map((c) => (
                    <TableRow key={c._id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-primary underline cursor-pointer">{c.name}</span>
                          {c.isPrimaryContact ? <Badge variant="secondary">Primary contact</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{c.jobTitle || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{c.email || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{c.phone || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{c.skype || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!c.isPrimaryContact ? (
                            <Button type="button" variant="outline" size="sm" onClick={() => makePrimaryContact(c._id)}>
                              Make primary
                            </Button>
                          ) : null}
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => deleteContact(c._id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">No record found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={openAddContact} onOpenChange={setOpenAddContact}>
            <DialogContent className="bg-card max-w-2xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Add contact</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">First name</Label>
                  <div className="col-span-9"><Input placeholder="First name" value={contactForm.firstName} onChange={(e)=>setContactForm((p)=>({ ...p, firstName: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Last name</Label>
                  <div className="col-span-9"><Input placeholder="Last name" value={contactForm.lastName} onChange={(e)=>setContactForm((p)=>({ ...p, lastName: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Email</Label>
                  <div className="col-span-9"><Input type="email" placeholder="Email" value={contactForm.email} onChange={(e)=>setContactForm((p)=>({ ...p, email: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Phone</Label>
                  <div className="col-span-9"><Input placeholder="Phone" value={contactForm.phone} onChange={(e)=>setContactForm((p)=>({ ...p, phone: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Skype</Label>
                  <div className="col-span-9"><Input placeholder="Skype" value={contactForm.skype} onChange={(e)=>setContactForm((p)=>({ ...p, skype: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Job Title</Label>
                  <div className="col-span-9"><Input placeholder="Job Title" value={contactForm.jobTitle} onChange={(e)=>setContactForm((p)=>({ ...p, jobTitle: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Gender</Label>
                  <div className="col-span-9">
                    <RadioGroup value={contactForm.gender} onValueChange={(v)=>setContactForm((p)=>({ ...p, gender: v as any }))} className="flex items-center gap-6">
                      <div className="flex items-center gap-2"><RadioGroupItem id="c-m" value="male" /><Label htmlFor="c-m">Male</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem id="c-f" value="female" /><Label htmlFor="c-f">Female</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem id="c-o" value="other" /><Label htmlFor="c-o">Other</Label></div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Checkbox checked={contactForm.isPrimaryContact} onCheckedChange={(v)=>setContactForm((p)=>({ ...p, isPrimaryContact: Boolean(v) }))} />
                  <Label>Primary contact</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenAddContact(false)}>Close</Button>
                <Button type="button" onClick={saveContact}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="lead-info" className="mt-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Lead info</div>
                <Button type="button" onClick={saveLead} disabled={loading}>Save</Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
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
                <div className="space-y-1"><Label>Email</Label><Input type="email" value={leadForm.email} onChange={(e)=>setLeadForm((p)=>({ ...p, email: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Phone</Label><Input value={leadForm.phone} onChange={(e)=>setLeadForm((p)=>({ ...p, phone: e.target.value }))} /></div>
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
                      {SOURCE_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
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
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Website</Label><Input value={leadForm.website} onChange={(e)=>setLeadForm((p)=>({ ...p, website: e.target.value }))} /></div>
              </div>

              <div className="space-y-1">
                <Label>Address</Label>
                <Textarea value={leadForm.address} onChange={(e)=>setLeadForm((p)=>({ ...p, address: e.target.value }))} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1"><Label>City</Label><Input value={leadForm.city} onChange={(e)=>setLeadForm((p)=>({ ...p, city: e.target.value }))} /></div>
                <div className="space-y-1"><Label>State</Label><Input value={leadForm.state} onChange={(e)=>setLeadForm((p)=>({ ...p, state: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Zip</Label><Input value={leadForm.zip} onChange={(e)=>setLeadForm((p)=>({ ...p, zip: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Country</Label><Input value={leadForm.country} onChange={(e)=>setLeadForm((p)=>({ ...p, country: e.target.value }))} /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label>VAT Number</Label><Input value={leadForm.vatNumber} onChange={(e)=>setLeadForm((p)=>({ ...p, vatNumber: e.target.value }))} /></div>
                <div className="space-y-1"><Label>GST Number</Label><Input value={leadForm.gstNumber} onChange={(e)=>setLeadForm((p)=>({ ...p, gstNumber: e.target.value }))} /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Currency</Label><Input placeholder="Keep it blank to use the default (PKR)" value={leadForm.currency} onChange={(e)=>setLeadForm((p)=>({ ...p, currency: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Currency Symbol</Label><Input placeholder="Keep it blank to use the default (Rs.)" value={leadForm.currencySymbol} onChange={(e)=>setLeadForm((p)=>({ ...p, currencySymbol: e.target.value }))} /></div>
              </div>

              <div className="space-y-2">
                <Label>Labels</Label>
                <div className="flex flex-wrap gap-2">
                  {labels.length ? labels.map((l) => {
                    const lid = l._id?.toString?.() ?? String(l._id);
                    const selected = (leadForm.labels || []).some((x) => (x?.toString?.() ?? String(x)) === lid);
                    return (
                      <button
                        key={l._id}
                        type="button"
                        onClick={() => toggleLeadLabel(lid)}
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4"><TasksOverview /></TabsContent>
        <TabsContent value="estimates" className="mt-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Estimates</div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={exportEstimates}><Download className="w-4 h-4 mr-2"/>Excel</Button>
                  <Button type="button" variant="outline" onClick={printEstimates}><Printer className="w-4 h-4 mr-2"/>Print</Button>
                  <Button type="button" variant="outline" onClick={loadEstimates}><RefreshCw className="w-4 h-4"/></Button>
                  <Button type="button" onClick={openNewEstimate}><Plus className="w-4 h-4 mr-2"/>Add estimate</Button>
                </div>
              </div>
              <div className="flex items-center justify-end mt-2">
                <Input className="w-64" placeholder="Search" value={estimatesQuery} onChange={(e) => setEstimatesQuery(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Estimate</TableHead>
                    <TableHead>Estimate Date</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Tax2</TableHead>
                    <TableHead>Advanced</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estimates.length ? estimates.map((e) => (
                    <TableRow key={e._id}>
                      <TableCell className="whitespace-nowrap">
                        <button
                          type="button"
                          className="text-primary underline cursor-pointer"
                          onClick={() => navigate(`/prospects/estimates/${e._id}`)}
                        >
                          Estimate: {e.number || "-"}
                        </button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatYmd(e.estimateDate)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatYmd(e.validUntil)}</TableCell>
                      <TableCell className="whitespace-nowrap">{String(e.tax ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">{String(e.tax2 ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">{String(e.advancedAmount ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">{String(e.amount ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">{e.status || "-"}</TableCell>
                      <TableCell className="max-w-[420px] truncate">{e.note || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => deleteEstimate(e._id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">No record found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={openAddEstimate} onOpenChange={setOpenAddEstimate}>
            <DialogContent className="bg-card max-w-2xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Add estimate</DialogTitle>
              </DialogHeader>

              <div className="grid gap-3">
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Estimate date</Label>
                  <div className="col-span-9">
                    <Input type="date" value={estimateForm.estimateDate} onChange={(e) => setEstimateForm((p) => ({ ...p, estimateDate: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Valid until</Label>
                  <div className="col-span-9">
                    <Input type="date" value={estimateForm.validUntil} onChange={(e) => setEstimateForm((p) => ({ ...p, validUntil: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Tax</Label>
                  <div className="col-span-9">
                    <Input type="number" value={estimateForm.tax} onChange={(e) => setEstimateForm((p) => ({ ...p, tax: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Tax 2</Label>
                  <div className="col-span-9">
                    <Input type="number" value={estimateForm.tax2} onChange={(e) => setEstimateForm((p) => ({ ...p, tax2: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Advanced</Label>
                  <div className="col-span-9">
                    <Input type="number" value={estimateForm.advancedAmount} onChange={(e) => setEstimateForm((p) => ({ ...p, advancedAmount: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-start gap-3">
                  <Label className="col-span-3 text-muted-foreground">Note</Label>
                  <div className="col-span-9">
                    <Textarea placeholder="Note" value={estimateForm.note} onChange={(e) => setEstimateForm((p) => ({ ...p, note: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Files</Label>
                  <div className="col-span-9">
                    <input
                      ref={estimateFilesRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => setEstimateSelectedFiles(Array.from(e.target.files || []))}
                    />
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => estimateFilesRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose files
                      </Button>
                      <div className="text-xs text-muted-foreground truncate">
                        {estimateSelectedFiles.length ? `${estimateSelectedFiles.length} file(s) selected` : "No files selected"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenAddEstimate(false)}>Close</Button>
                <Button type="button" onClick={saveEstimate}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
        <TabsContent value="estimate-requests" className="mt-4"><SimpleEmptyTab title="Estimate Requests" /></TabsContent>
        <TabsContent value="proposals" className="mt-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Proposals</div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={exportProposals}><Download className="w-4 h-4 mr-2"/>Excel</Button>
                  <Button type="button" variant="outline" onClick={printProposals}><Printer className="w-4 h-4 mr-2"/>Print</Button>
                  <Button type="button" variant="outline" onClick={loadProposals}><RefreshCw className="w-4 h-4"/></Button>
                  <Button type="button" onClick={openNewProposal}><Plus className="w-4 h-4 mr-2"/>Add proposal</Button>
                </div>
              </div>
              <div className="flex items-center justify-end mt-2">
                <Input className="w-64" placeholder="Search" value={proposalsQuery} onChange={(e) => setProposalsQuery(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Proposal Date</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Tax1</TableHead>
                    <TableHead>Tax2</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposals.length ? proposals.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell className="whitespace-nowrap">
                        <button
                          type="button"
                          className="text-primary underline cursor-pointer"
                          onClick={() => navigate(`/prospects/proposals`)}
                        >
                          {formatYmd(p.proposalDate)}
                        </button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatYmd(p.validUntil)}</TableCell>
                      <TableCell className="whitespace-nowrap">{String(p.tax1 ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">{String(p.tax2 ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">{p.status || "-"}</TableCell>
                      <TableCell className="max-w-[420px] truncate">{p.note || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => deleteProposal(p._id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">No record found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={openAddProposal} onOpenChange={setOpenAddProposal}>
            <DialogContent className="bg-card max-w-2xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Add proposal</DialogTitle>
              </DialogHeader>

              <div className="grid gap-3">
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Proposal date</Label>
                  <div className="col-span-9">
                    <Input type="date" value={proposalForm.proposalDate} onChange={(e) => setProposalForm((p) => ({ ...p, proposalDate: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Valid until</Label>
                  <div className="col-span-9">
                    <Input type="date" value={proposalForm.validUntil} onChange={(e) => setProposalForm((p) => ({ ...p, validUntil: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Tax 1</Label>
                  <div className="col-span-9">
                    <Input type="number" value={proposalForm.tax1} onChange={(e) => setProposalForm((p) => ({ ...p, tax1: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Tax 2</Label>
                  <div className="col-span-9">
                    <Input type="number" value={proposalForm.tax2} onChange={(e) => setProposalForm((p) => ({ ...p, tax2: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-start gap-3">
                  <Label className="col-span-3 text-muted-foreground">Note</Label>
                  <div className="col-span-9">
                    <Textarea placeholder="Note" value={proposalForm.note} onChange={(e) => setProposalForm((p) => ({ ...p, note: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Files</Label>
                  <div className="col-span-9">
                    <input
                      ref={proposalFilesRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => setProposalSelectedFiles(Array.from(e.target.files || []))}
                    />
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => proposalFilesRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose files
                      </Button>
                      <div className="text-xs text-muted-foreground truncate">
                        {proposalSelectedFiles.length ? `${proposalSelectedFiles.length} file(s) selected` : "No files selected"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenAddProposal(false)}>Close</Button>
                <Button type="button" onClick={saveProposal}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
        <TabsContent value="contracts" className="mt-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Contracts</div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={exportContracts}><Download className="w-4 h-4 mr-2"/>Excel</Button>
                  <Button type="button" variant="outline" onClick={printContracts}><Printer className="w-4 h-4 mr-2"/>Print</Button>
                  <Button type="button" variant="outline" onClick={loadContracts}><RefreshCw className="w-4 h-4"/></Button>
                  <Button type="button" onClick={openNewContract}><Plus className="w-4 h-4 mr-2"/>Add contract</Button>
                </div>
              </div>
              <div className="flex items-center justify-end mt-2">
                <Input className="w-64" placeholder="Search" value={contractsQuery} onChange={(e) => setContractsQuery(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Title</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Contract Date</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Tax1</TableHead>
                    <TableHead>Tax2</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.length ? contracts.map((c) => (
                    <TableRow key={c._id}>
                      <TableCell className="whitespace-nowrap">
                        <button
                          type="button"
                          className="text-primary underline cursor-pointer"
                          onClick={() => navigate(`/sales/contracts`)}
                        >
                          {c.title || "-"}
                        </button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{c.projectId ? (projectTitleById.get(c.projectId) || "-") : "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatYmd(c.contractDate)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatYmd(c.validUntil)}</TableCell>
                      <TableCell className="whitespace-nowrap">{String(c.tax1 ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">{String(c.tax2 ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">{c.status || "-"}</TableCell>
                      <TableCell className="max-w-[340px] truncate">{c.note || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => deleteContract(c._id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">No record found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={openAddContract} onOpenChange={setOpenAddContract}>
            <DialogContent className="bg-card max-w-2xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Add contract</DialogTitle>
              </DialogHeader>

              <div className="grid gap-3">
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Title</Label>
                  <div className="col-span-9">
                    <Input placeholder="Title" value={contractForm.title} onChange={(e) => setContractForm((p) => ({ ...p, title: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Project</Label>
                  <div className="col-span-9">
                    <Select value={contractForm.projectId} onValueChange={(v) => setContractForm((p) => ({ ...p, projectId: v }))}>
                      <SelectTrigger><SelectValue placeholder="- Project -" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-">- Project -</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p._id} value={p._id}>{p.title || "-"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Contract date</Label>
                  <div className="col-span-9">
                    <Input type="date" value={contractForm.contractDate} onChange={(e) => setContractForm((p) => ({ ...p, contractDate: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Valid until</Label>
                  <div className="col-span-9">
                    <Input type="date" value={contractForm.validUntil} onChange={(e) => setContractForm((p) => ({ ...p, validUntil: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Tax 1</Label>
                  <div className="col-span-9">
                    <Input type="number" value={contractForm.tax1} onChange={(e) => setContractForm((p) => ({ ...p, tax1: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Tax 2</Label>
                  <div className="col-span-9">
                    <Input type="number" value={contractForm.tax2} onChange={(e) => setContractForm((p) => ({ ...p, tax2: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-start gap-3">
                  <Label className="col-span-3 text-muted-foreground">Note</Label>
                  <div className="col-span-9">
                    <Textarea placeholder="Note" value={contractForm.note} onChange={(e) => setContractForm((p) => ({ ...p, note: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Files</Label>
                  <div className="col-span-9">
                    <input
                      ref={contractFilesRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => setContractSelectedFiles(Array.from(e.target.files || []))}
                    />
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => contractFilesRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose files
                      </Button>
                      <div className="text-xs text-muted-foreground truncate">
                        {contractSelectedFiles.length ? `${contractSelectedFiles.length} file(s) selected` : "No files selected"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenAddContract(false)}>Close</Button>
                <Button type="button" onClick={saveContract}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
        <TabsContent value="notes" className="mt-4"><Notes /></TabsContent>
        <TabsContent value="files" className="mt-4"><Files /></TabsContent>
        <TabsContent value="events" className="mt-4"><Events /></TabsContent>
      </Tabs>
    </div>
  );
}
