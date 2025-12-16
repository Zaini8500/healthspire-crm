import { useLocation, useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, Phone, Send, Camera, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";

export default function EmployeeProfile() {
  const { id } = useParams();
  const location = useLocation() as any;
  const [emp, setEmp] = useState(
    (location.state?.employee as
    | {
        id: number;
        name: string;
        email: string;
        phone: string;
        department: string;
        role: string;
        location: string;
        status: "active" | "on-leave" | "remote";
        joinDate: string;
        initials: string;
      }
    | undefined) || undefined
  );

  const API_BASE = "http://localhost:5000";
  const isObjectId = (s?: string) => !!s && /^[a-fA-F0-9]{24}$/.test(s);
  const routeDbId = isObjectId(id) ? id : undefined;
  const stateDbId = isObjectId(location.state?.dbId) ? (location.state?.dbId as string) : undefined;
  const dbId = stateDbId || routeDbId;

  const name = emp?.name || `Employee #${id}`;
  const initials = emp?.initials || name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  // Job info state
  const [jobTitle, setJobTitle] = useState(emp?.role || "");
  const [salary, setSalary] = useState("");
  const [salaryTerm, setSalaryTerm] = useState("");
  const [dateHire, setDateHire] = useState("");
  const [departmentVal, setDepartmentVal] = useState(emp?.department || "HR");
  const [statusVal, setStatusVal] = useState<"active" | "on-leave" | "remote">((emp?.status as any) || "active");
  const [locationVal, setLocationVal] = useState(emp?.location || "");
  const [deptOptions, setDeptOptions] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [leaves, setLeaves] = useState<any[]>([]);
  const [expenseItems, setExpenseItems] = useState<any[]>([]);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseForm, setExpenseForm] = useState({ date: "", category: "", title: "", description: "", amount: "", tax: "", tax2: "" });
  const [fileItems, setFileItems] = useState<any[]>([]);
  const [fileOpen, setFileOpen] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const [noteItems, setNoteItems] = useState<any[]>([]);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteSearch, setNoteSearch] = useState("");
  const [noteForm, setNoteForm] = useState({ title: "", text: "" });
  const [projectItems, setProjectItems] = useState<any[]>([]);
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>("all");
  const [projectForm, setProjectForm] = useState({ title: "", client: "", price: "", start: "", deadline: "", status: "Open" });

  // General Info state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mailingAddress, setMailingAddress] = useState("");
  const [alternativeAddress, setAlternativeAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sick, setSick] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");

  // Social Links state
  const [socialLinks, setSocialLinks] = useState({
    facebook: "",
    twitter: "",
    linkedin: "",
    whatsapp: "",
    drigg: "",
    youtube: "",
    pinterest: "",
    instagram: "",
    github: "",
    tumblr: "",
    vino: "",
  });

  // Account Settings state
  const [accountEmail, setAccountEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reenterPassword, setReenterPassword] = useState("");
  const [accountRole, setAccountRole] = useState("");
  const [disableLogin, setDisableLogin] = useState(false);
  const [markAsInactive, setMarkAsInactive] = useState(false);

  // Avatar upload
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickPhoto = () => fileRef.current?.click();
  const onPick: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    const url = URL.createObjectURL(f);
    setPhotoUrl(url);
    uploadAvatar(f);
  };

  // Upload avatar to backend
  const uploadAvatar = async (file: File) => {
    try {
      if (!dbId) return;
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch(`${API_BASE}/api/employees/${dbId}/avatar`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const d = await res.json().catch(() => null);
        const url = d?.avatar ? (String(d.avatar).startsWith("http") ? d.avatar : `${API_BASE}${d.avatar}`) : undefined;
        if (url) setPhotoUrl(url);
        window.dispatchEvent(new Event("employeeUpdated"));
        toast.success("Profile photo updated");
      }
    } catch {}
  };

  // Auto-save function
  const autoSave = async (updates: any) => {
    try {
      if (!dbId) return;
      const res = await fetch(`${API_BASE}/api/employees/${dbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        window.dispatchEvent(new Event("employeeUpdated"));
      }
    } catch {}
  };

  // Fetch employee from API if dbId present and no state, or refresh state mapping
  useEffect(() => {
    (async () => {
      try {
        if (!emp && dbId) {
          const res = await fetch(`${API_BASE}/api/employees/${dbId}`);
          if (res.ok) {
            const d = await res.json();
            const name: string = d.name || `${d.firstName || ""} ${d.lastName || ""}`.trim() || `Employee`;
            const joinDate = d.joinDate ? new Date(d.joinDate).toLocaleString(undefined, { month: "short", year: "numeric" }) : "";
            const mapped = {
              id: 0,
              name,
              email: d.email || "",
              phone: d.phone || "",
              department: d.department || "HR",
              role: d.role || "Team member",
              location: d.location || "",
              status: (d.status as any) || "active",
              joinDate: joinDate || "",
              initials: (d.initials || name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)).toUpperCase(),
            } as any;
            setEmp(mapped);
            setJobTitle(mapped.role || "");
            setSalary(d.salary ? String(d.salary) : "");
            setSalaryTerm(d.salaryTerm || "");
            setDateHire(d.joinDate ? new Date(d.joinDate).toISOString().slice(0,10) : "");
            setDepartmentVal(d.department || "HR");
            setStatusVal((d.status as any) || "active");
            setLocationVal(d.location || "");
            
            // Load General Info
            setFirstName(d.firstName || "");
            setLastName(d.lastName || "");
            setMailingAddress(d.mailingAddress || "");
            setAlternativeAddress(d.alternativeAddress || "");
            setPhone(d.phone || "");
            setAltPhone(d.alternativePhone || "");
            setDateOfBirth(d.dateOfBirth ? new Date(d.dateOfBirth).toISOString().slice(0,10) : "");
            setSick(d.sick || "");
            setGender(d.gender || "male");
            
            // Load Social Links
            if (d.socialLinks) {
              setSocialLinks(d.socialLinks);
            }
            
            // Load Account Settings
            setAccountEmail(d.email || "");
            setAccountRole(d.role || "");
            setDisableLogin(d.disableLogin || false);
            setMarkAsInactive(d.markAsInactive || false);
            
            // Load avatar
            if (d.avatar) {
              const url = String(d.avatar).startsWith("http") ? d.avatar : `${API_BASE}${d.avatar}`;
              setPhotoUrl(url);
            }
          }
        } else if (emp) {
          setJobTitle(emp.role || "");
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/departments?active=1`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const names = (Array.isArray(data) ? data : []).map((d: any) => String(d.name)).filter(Boolean);
          if (names.length) setDeptOptions(names);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!dbId) return;
        const params = new URLSearchParams();
        params.set("employeeId", dbId);
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);
        const res = await fetch(`${API_BASE}/api/attendance/records?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setRecords(Array.isArray(data) ? data : []);
        }
      } catch {}
    })();
  }, [dbId, fromDate, toDate]);

  useEffect(() => {
    (async () => {
      try {
        const n = emp?.name || `${firstName} ${lastName}`.trim();
        if (!n) return;
        const res = await fetch(`${API_BASE}/api/leaves?q=${encodeURIComponent(n)}`);
        if (res.ok) {
          const data = await res.json();
          setLeaves(Array.isArray(data) ? data.filter((l:any)=> (l.name||"").toLowerCase().includes(n.toLowerCase())) : []);
        }
      } catch {}
    })();
  }, [emp, firstName, lastName]);

  useEffect(() => {
    (async () => {
      try {
        if (!dbId) { setFileItems([]); return; }
        const q = fileSearch ? `&q=${encodeURIComponent(fileSearch)}` : "";
        const res = await fetch(`${API_BASE}/api/files?employeeId=${dbId}${q}`);
        if (res.ok) {
          const data = await res.json();
          setFileItems(Array.isArray(data) ? data : []);
        }
      } catch {}
    })();
  }, [dbId, fileSearch]);

  useEffect(() => {
    (async () => {
      try {
        if (!dbId) { setNoteItems([]); return; }
        const q = noteSearch ? `&q=${encodeURIComponent(noteSearch)}` : "";
        const res = await fetch(`${API_BASE}/api/notes?employeeId=${dbId}${q}`);
        if (res.ok) {
          const data = await res.json();
          setNoteItems(Array.isArray(data) ? data : []);
        }
      } catch {}
    })();
  }, [dbId, noteSearch]);

  useEffect(() => {
    (async () => {
      try {
        if (!dbId) { setProjectItems([]); return; }
        const q = projectSearch ? `&q=${encodeURIComponent(projectSearch)}` : "";
        const res = await fetch(`${API_BASE}/api/projects?employeeId=${dbId}${q}`);
        if (res.ok) {
          const data = await res.json();
          setProjectItems(Array.isArray(data) ? data : []);
        }
      } catch {}
    })();
  }, [dbId, projectSearch]);

  useEffect(() => {
    (async () => {
      try {
        if (!dbId) { setExpenseItems([]); return; }
        const q = expenseSearch ? `&q=${encodeURIComponent(expenseSearch)}` : "";
        const res = await fetch(`${API_BASE}/api/expenses?employeeId=${dbId}${q}`);
        if (res.ok) {
          const data = await res.json();
          setExpenseItems(Array.isArray(data) ? data : []);
        }
      } catch {}
    })();
  }, [dbId, expenseSearch]);

  const saveJobInfo = async () => {
    try {
      if (!dbId) return;
      const payload: any = {
        role: jobTitle,
        salary: salary ? Number(salary) : undefined,
        salaryTerm: salaryTerm || undefined,
        joinDate: dateHire ? new Date(dateHire) : undefined,
        department: departmentVal || undefined,
        status: statusVal || undefined,
        location: locationVal || undefined,
      };
      const r = await fetch(`${API_BASE}/api/employees/${dbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        window.dispatchEvent(new Event("employeeUpdated"));
        toast.success("Job info saved");
      }
    } catch {}
  };

  const saveGeneral = async () => {
    try {
      if (!dbId) return;
      const payload: any = {
        firstName,
        lastName,
        mailingAddress,
        alternativeAddress,
        phone,
        alternativePhone: altPhone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        sick,
        gender,
      };
      const r = await fetch(`${API_BASE}/api/employees/${dbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) { window.dispatchEvent(new Event("employeeUpdated")); toast.success("General info saved"); }
    } catch {}
  };

  const saveSocial = async () => {
    try {
      if (!dbId) return;
      const r = await fetch(`${API_BASE}/api/employees/${dbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socialLinks }),
      });
      if (r.ok) { window.dispatchEvent(new Event("employeeUpdated")); toast.success("Social links saved"); }
    } catch {}
  };

  const saveAccount = async () => {
    try {
      if (!dbId) return;
      const payload: any = {
        email: accountEmail,
        role: accountRole,
        disableLogin,
        markAsInactive,
      };
      if (password) payload.password = password;
      const r = await fetch(`${API_BASE}/api/employees/${dbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) { window.dispatchEvent(new Event("employeeUpdated")); toast.success("Account settings saved"); }
    } catch {}
  };

  const onFileUploadPick: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    try {
      if (!dbId) return;
      const f = e.target.files?.[0];
      if (!f) return;
      const form = new FormData();
      form.append("file", f);
      form.append("employeeId", dbId);
      form.append("name", f.name);
      const res = await fetch(`${API_BASE}/api/files`, { method: "POST", body: form });
      if (res.ok) {
        setFileOpen(false);
        const item = await res.json().catch(()=>null);
        setFileItems((prev)=> [item, ...prev]);
        toast.success("File uploaded");
      }
      if (fileUploadRef.current) fileUploadRef.current.value = "";
    } catch {}
  };

  const deleteFile = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/files/${id}`, { method: "DELETE" });
      setFileItems((prev)=> prev.filter((x:any)=> x._id !== id));
      toast.success("File removed");
    } catch {}
  };

  const saveNote = async () => {
    try {
      if (!dbId || !noteForm.title.trim()) return;
      const payload = { employeeId: dbId, title: noteForm.title.trim(), text: noteForm.text, private: true } as any;
      const res = await fetch(`${API_BASE}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const item = await res.json();
        setNoteItems((prev)=> [item, ...prev]);
        setNoteOpen(false);
        setNoteForm({ title: "", text: "" });
        toast.success("Note added");
      }
    } catch {}
  };

  const deleteNote = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/notes/${id}`, { method: "DELETE" });
      setNoteItems((prev)=> prev.filter((x:any)=> x._id !== id));
      toast.success("Note removed");
    } catch {}
  };

  const saveProject = async () => {
    try {
      if (!dbId || !projectForm.title.trim()) return;
      const payload: any = {
        employeeId: dbId,
        title: projectForm.title.trim(),
        client: projectForm.client,
        price: projectForm.price ? Number(projectForm.price) : 0,
        start: projectForm.start ? new Date(projectForm.start) : undefined,
        deadline: projectForm.deadline ? new Date(projectForm.deadline) : undefined,
        status: projectForm.status || "Open",
      };
      const res = await fetch(`${API_BASE}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const item = await res.json();
        setProjectItems((prev)=> [item, ...prev]);
        setProjectOpen(false);
        setProjectForm({ title: "", client: "", price: "", start: "", deadline: "", status: "Open" });
        toast.success("Project added");
      }
    } catch {}
  };

  const deleteProject = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/projects/${id}`, { method: "DELETE" });
      setProjectItems((prev)=> prev.filter((x:any)=> x._id !== id));
      toast.success("Project removed");
    } catch {}
  };

  const saveExpense = async () => {
    try {
      if (!dbId || !expenseForm.title.trim()) return;
      const payload: any = {
        employeeId: dbId,
        date: expenseForm.date ? new Date(expenseForm.date) : undefined,
        category: expenseForm.category,
        title: expenseForm.title.trim(),
        description: expenseForm.description,
        amount: expenseForm.amount ? Number(expenseForm.amount) : 0,
        tax: expenseForm.tax ? Number(expenseForm.tax) : 0,
        tax2: expenseForm.tax2 ? Number(expenseForm.tax2) : 0,
      };
      const res = await fetch(`${API_BASE}/api/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const item = await res.json();
        setExpenseItems((prev)=> [item, ...prev]);
        setExpenseOpen(false);
        setExpenseForm({ date: "", category: "", title: "", description: "", amount: "", tax: "", tax2: "" });
        toast.success("Expense added");
      }
    } catch {}
  };

  const deleteExpense = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/expenses/${id}`, { method: "DELETE" });
      setExpenseItems((prev)=> prev.filter((x:any)=> x._id !== id));
      toast.success("Expense removed");
    } catch {}
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header card */}
      <Card>
        <CardContent className="p-0">
          <div className="relative p-6 bg-primary/90 text-primary-foreground rounded-t-xl">
            {/* Profile Pic Controls */}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
            <div className="absolute left-0 top-1 lg:left-1 lg:top-1 flex flex-col gap-3">
              <Button type="button" variant="ghost" size="icon" onClick={pickPhoto} className="w-8 h-8 rounded-md text-white hover:bg-white/20">
                <Camera className="w-4 h-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={pickPhoto} className="w-8 h-8 rounded-md text-white hover:bg-white/20">
                <Upload className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 ring-2 ring-primary/30 ring-offset-2 ring-offset-card shadow-md">
                  {photoUrl && <AvatarImage className="object-cover object-center" src={photoUrl} alt={name} />}
                  <AvatarFallback className="bg-white/20 text-white font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold">{name}</h2>
                  <div className="mt-1 inline-flex items-center gap-2 text-xs px-2 py-1 rounded bg-white/15">
                    <span>{emp?.department || "Sales & Marketing"}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    <span className="inline-flex items-center gap-1 opacity-90">
                      <Mail className="w-4 h-4" /> {accountEmail || emp?.email || "email@domain.com"}
                    </span>
                    <span className="inline-flex items-center gap-1 opacity-90">
                      <Phone className="w-4 h-4" /> {phone || emp?.phone || "+1 (000) 000-0000"}
                    </span>
                    <Button size="sm" variant="secondary" className="ml-1">
                      <Send className="w-4 h-4 mr-1" /> Send message
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stats 2x2 */}
              <div className="grid grid-cols-2 gap-6 w-full max-w-xl">
                {[
                  { label: "Open Projects", value: 0 },
                  { label: "Projects Completed", value: 0 },
                  { label: "Total Hours Worked", value: 0 },
                  { label: "Total Project Hours", value: 0 },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-3xl font-bold">{s.value}</div>
                    <div className="text-xs mt-1 opacity-90">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-3">
            <Tabs defaultValue="job">
              <TabsList className="flex flex-wrap gap-1 bg-muted/40">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="general">General Info</TabsTrigger>
                <TabsTrigger value="social">Social Links</TabsTrigger>
                <TabsTrigger value="job">Job Info</TabsTrigger>
                <TabsTrigger value="account">Account settings</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
                <TabsTrigger value="timecards">Time cards</TabsTrigger>
                <TabsTrigger value="leave">Leave</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    <div className="p-6">
                      <h3 className="font-semibold mb-4">General Info</h3>
                      <div className="grid gap-4 max-w-3xl">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>First name</Label>
                          <div className="sm:col-span-2">
                            <Input value={firstName} onChange={(e)=>{setFirstName(e.target.value); autoSave({firstName: e.target.value});}} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>Last name</Label>
                          <div className="sm:col-span-2">
                            <Input value={lastName} onChange={(e)=>{setLastName(e.target.value); autoSave({lastName: e.target.value});}} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>Mailing address</Label>
                          <div className="sm:col-span-2">
                            <Input value={mailingAddress} onChange={(e)=>{setMailingAddress(e.target.value); autoSave({mailingAddress: e.target.value});}} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>Alternative address</Label>
                          <div className="sm:col-span-2">
                            <Input value={alternativeAddress} onChange={(e)=>{setAlternativeAddress(e.target.value); autoSave({alternativeAddress: e.target.value});}} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>Phone</Label>
                          <div className="sm:col-span-2">
                            <Input value={phone} onChange={(e)=>{setPhone(e.target.value); autoSave({phone: e.target.value});}} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>Alternative phone</Label>
                          <div className="sm:col-span-2">
                            <Input value={altPhone} onChange={(e)=>{setAltPhone(e.target.value); autoSave({alternativePhone: e.target.value});}} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>Gender</Label>
                          <div className="sm:col-span-2">
                            <RadioGroup value={gender} onValueChange={(v)=>{setGender(v as any); autoSave({gender: v});}} className="flex gap-6">
                              <div className="flex items-center gap-2"><RadioGroupItem value="male" id="g-m"/><Label htmlFor="g-m">Male</Label></div>
                              <div className="flex items-center gap-2"><RadioGroupItem value="female" id="g-f"/><Label htmlFor="g-f">Female</Label></div>
                              <div className="flex items-center gap-2"><RadioGroupItem value="other" id="g-o"/><Label htmlFor="g-o">Other</Label></div>
                            </RadioGroup>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>Date of birth</Label>
                          <div className="sm:col-span-2">
                            <Input type="date" value={dateOfBirth} onChange={(e)=>{setDateOfBirth(e.target.value); autoSave({dateOfBirth: e.target.value ? new Date(e.target.value) : undefined});}} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>Sick</Label>
                          <div className="sm:col-span-2">
                            <Input value={sick} onChange={(e)=>{setSick(e.target.value); autoSave({sick: e.target.value});}} />
                          </div>
                        </div>
                      </div>
                      <div className="mt-6">
                        <Button variant="outline" onClick={saveGeneral}>Save</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="social" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    <div className="p-6">
                      <h3 className="font-semibold mb-4">Social Links</h3>
                      <div className="grid gap-4 max-w-3xl">
                        {Object.entries(socialLinks).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                            <Label className="capitalize">{key}</Label>
                            <div className="sm:col-span-2">
                              <Input value={value} onChange={(e)=>{setSocialLinks({...socialLinks, [key]: e.target.value}); autoSave({socialLinks: {...socialLinks, [key]: e.target.value}});}} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6">
                        <Button variant="outline" onClick={saveSocial}>Save</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="job" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    <div className="p-6">
                      <h3 className="font-semibold mb-4">Job Info</h3>
                      <div className="grid gap-4 max-w-3xl">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>Job Title</Label>
                          <div className="sm:col-span-2">
                            <Input placeholder="Sales & Marketing" value={jobTitle} onChange={(e)=>{setJobTitle(e.target.value); autoSave({role: e.target.value});}} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>Department</Label>
                          <div className="sm:col-span-2">
                            <Select value={departmentVal} onValueChange={(v)=>{setDepartmentVal(v); autoSave({department: v});}}>
                              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {(deptOptions.length ? deptOptions : ["HR"]).map((d)=> (
                                  <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>Salary</Label>
                          <div className="sm:col-span-2">
                            <Input placeholder="Salary" value={salary} onChange={(e)=>{setSalary(e.target.value); autoSave({salary: e.target.value ? Number(e.target.value) : undefined});}} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>Salary term</Label>
                          <div className="sm:col-span-2">
                            <Input placeholder="Salary term" value={salaryTerm} onChange={(e)=>{setSalaryTerm(e.target.value); autoSave({salaryTerm: e.target.value || undefined});}} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>Date of hire</Label>
                          <div className="sm:col-span-2">
                            <Input type="date" value={dateHire} onChange={(e)=>{setDateHire(e.target.value); autoSave({joinDate: e.target.value ? new Date(e.target.value) : undefined});}} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>Employment status</Label>
                          <div className="sm:col-span-2">
                            <Select value={statusVal} onValueChange={(v)=>{setStatusVal(v as any); autoSave({status: v});}}>
                              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="on-leave">On leave</SelectItem>
                                <SelectItem value="remote">Remote</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>Location</Label>
                          <div className="sm:col-span-2">
                            <Input placeholder="Office / City" value={locationVal} onChange={(e)=>{setLocationVal(e.target.value); autoSave({location: e.target.value});}} />
                          </div>
                        </div>
                      </div>
                      <div className="mt-6">
                        <Button variant="outline" onClick={saveJobInfo}>Save</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="account" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    <div className="p-6">
                      <h3 className="font-semibold mb-4">Account settings</h3>
                      <div className="grid gap-4 max-w-3xl">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>Email</Label>
                          <div className="sm:col-span-2">
                            <Input value={accountEmail} onChange={(e)=>{setAccountEmail(e.target.value); autoSave({email: e.target.value});}} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>Password</Label>
                          <div className="sm:col-span-2">
                            <Input type="password" placeholder="Password" value={password} onChange={(e)=>{setPassword(e.target.value); autoSave({password: e.target.value});}} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>Reenter password</Label>
                          <div className="sm:col-span-2">
                            <Input type="password" placeholder="Reenter password" value={reenterPassword} onChange={(e)=>setReenterPassword(e.target.value)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <Label>Role</Label>
                          <div className="sm:col-span-2">
                            <Input value={accountRole} onChange={(e)=>{setAccountRole(e.target.value); autoSave({role: e.target.value});}} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="disable" checked={disableLogin} onChange={(e)=>{setDisableLogin(e.target.checked); autoSave({disableLogin: e.target.checked});}} />
                          <Label htmlFor="disable">Disable login</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="inactive" checked={markAsInactive} onChange={(e)=>{setMarkAsInactive(e.target.checked); autoSave({markAsInactive: e.target.checked});}} />
                          <Label htmlFor="inactive">Mark as inactive</Label>
                        </div>
                      </div>
                      <div className="mt-6">
                        <Button variant="outline" onClick={saveAccount}>Save</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Timesheets */}
              <TabsContent value="timesheets" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    <div className="p-6">
                      <h3 className="font-semibold mb-4">Timesheets</h3>
                      <div className="flex flex-wrap gap-3 mb-4">
                        <div className="space-y-1">
                          <Label>From</Label>
                          <Input type="date" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label>To</Label>
                          <Input type="date" value={toDate} onChange={(e)=>setToDate(e.target.value)} />
                        </div>
                      </div>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>In</TableHead>
                              <TableHead>Out</TableHead>
                              <TableHead className="text-right">Duration (h)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {records.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">No records found.</TableCell>
                              </TableRow>
                            )}
                            {records.map((r: any) => {
                              const d = r.date ? new Date(r.date) : undefined;
                              const cin = r.clockIn ? new Date(r.clockIn) : undefined;
                              const cout = r.clockOut ? new Date(r.clockOut) : undefined;
                              const dur = cin && cout ? ((cout.getTime() - cin.getTime())/3600000) : 0;
                              return (
                                <TableRow key={r._id}>
                                  <TableCell>{d ? d.toLocaleDateString() : "-"}</TableCell>
                                  <TableCell>{cin ? cin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                                  <TableCell>{cout ? cout.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                                  <TableCell className="text-right">{dur ? dur.toFixed(2) : '-'}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Time cards */}
              <TabsContent value="timecards" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    <div className="p-6">
                      <h3 className="font-semibold mb-4">Time cards</h3>
                      <div className="flex flex-wrap gap-3 mb-4">
                        <div className="space-y-1">
                          <Label>Month</Label>
                          <Input type="month" value={monthFilter} onChange={(e)=>{
                            const m = e.target.value; setMonthFilter(m);
                            if (m) {
                              const [yy, mm] = m.split('-').map(Number);
                              const first = new Date(yy, mm-1, 1).toISOString().slice(0,10);
                              const last = new Date(yy, mm, 0).toISOString().slice(0,10);
                              setFromDate(first); setToDate(last);
                            }
                          }} />
                        </div>
                      </div>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Day</TableHead>
                              <TableHead>In</TableHead>
                              <TableHead>Out</TableHead>
                              <TableHead className="text-right">Hours</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {records.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">No records found.</TableCell>
                              </TableRow>
                            )}
                            {records.map((r: any) => {
                              const d = r.date ? new Date(r.date) : undefined;
                              const cin = r.clockIn ? new Date(r.clockIn) : undefined;
                              const cout = r.clockOut ? new Date(r.clockOut) : undefined;
                              const dur = cin && cout ? ((cout.getTime() - cin.getTime())/3600000) : 0;
                              return (
                                <TableRow key={r._id}>
                                  <TableCell>{d ? d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : '-'}</TableCell>
                                  <TableCell>{cin ? cin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                                  <TableCell>{cout ? cout.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                                  <TableCell className="text-right">{dur ? dur.toFixed(2) : '-'}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Leave */}
              <TabsContent value="leave" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    <div className="p-6">
                      <h3 className="font-semibold mb-4">Leave</h3>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>From</TableHead>
                              <TableHead>To</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {leaves.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">No records found.</TableCell>
                              </TableRow>
                            )}
                            {leaves.map((l: any) => (
                              <TableRow key={l._id}>
                                <TableCell className="capitalize">{l.type || '-'}</TableCell>
                                <TableCell>{l.from ? new Date(l.from).toLocaleDateString() : '-'}</TableCell>
                                <TableCell>{l.to ? new Date(l.to).toLocaleDateString() : '-'}</TableCell>
                                <TableCell className="capitalize">{l.status || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Timeline */}
              <TabsContent value="timeline" className="mt-4">
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">No timeline found.</CardContent>
                </Card>
              </TabsContent>

              {/* Files */}
              <TabsContent value="files" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <Input placeholder="Search files" className="max-w-xs" value={fileSearch} onChange={(e)=>setFileSearch(e.target.value)} />
                        <div>
                          <input ref={fileUploadRef} type="file" className="hidden" onChange={onFileUploadPick} />
                          <Button onClick={()=>fileUploadRef.current?.click()} variant="outline">Upload file</Button>
                        </div>
                      </div>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Size</TableHead>
                              <TableHead>Uploaded</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fileItems.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">No files found.</TableCell>
                              </TableRow>
                            )}
                            {fileItems.map((f:any)=> (
                              <TableRow key={f._id}>
                                <TableCell>
                                  {f.path ? (
                                    <a className="text-primary underline" href={`${API_BASE}${f.path}`} target="_blank" rel="noreferrer">{f.name || "file"}</a>
                                  ) : (f.name || "file")}
                                </TableCell>
                                <TableCell>{f.size ? `${(f.size/1024).toFixed(1)} KB` : "-"}</TableCell>
                                <TableCell>{f.createdAt ? new Date(f.createdAt).toLocaleString() : "-"}</TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant="outline" onClick={()=>deleteFile(f._id)}>Delete</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notes */}
              <TabsContent value="notes" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <Input placeholder="Search notes" className="max-w-xs" value={noteSearch} onChange={(e)=>setNoteSearch(e.target.value)} />
                        <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline">Add note</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Add note</DialogTitle></DialogHeader>
                            <div className="grid gap-3">
                              <div>
                                <Label>Title</Label>
                                <Input value={noteForm.title} onChange={(e)=>setNoteForm({...noteForm, title: e.target.value})} />
                              </div>
                              <div>
                                <Label>Description</Label>
                                <Input value={noteForm.text} onChange={(e)=>setNoteForm({...noteForm, text: e.target.value})} />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={()=>setNoteOpen(false)}>Close</Button>
                              <Button onClick={saveNote}>Save</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Title</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead>Excerpt</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {noteItems.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">No notes found.</TableCell>
                              </TableRow>
                            )}
                            {noteItems.map((n:any)=> (
                              <TableRow key={n._id}>
                                <TableCell>{n.title || "-"}</TableCell>
                                <TableCell>{n.createdAt ? new Date(n.createdAt).toLocaleString() : "-"}</TableCell>
                                <TableCell className="truncate max-w-[360px]">{n.text || "-"}</TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant="outline" onClick={()=>deleteNote(n._id)}>Delete</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Projects */}
              <TabsContent value="projects" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4 gap-3">
                        <Input placeholder="Search projects" className="max-w-xs" value={projectSearch} onChange={(e)=>setProjectSearch(e.target.value)} />
                        <div className="flex items-center gap-2">
                          <Select value={projectStatusFilter} onValueChange={setProjectStatusFilter}>
                            <SelectTrigger className="w-40"><SelectValue placeholder="Status"/></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="Open">Open</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          <Dialog open={projectOpen} onOpenChange={setProjectOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline">Add project</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader><DialogTitle>Add project</DialogTitle></DialogHeader>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <Label>Title</Label>
                                  <Input value={projectForm.title} onChange={(e)=>setProjectForm({...projectForm, title: e.target.value})} />
                                </div>
                                <div>
                                  <Label>Client</Label>
                                  <Input value={projectForm.client} onChange={(e)=>setProjectForm({...projectForm, client: e.target.value})} />
                                </div>
                                <div>
                                  <Label>Price</Label>
                                  <Input value={projectForm.price} onChange={(e)=>setProjectForm({...projectForm, price: e.target.value})} />
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  <Select value={projectForm.status} onValueChange={(v)=>setProjectForm({...projectForm, status: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Open">Open</SelectItem>
                                      <SelectItem value="In Progress">In Progress</SelectItem>
                                      <SelectItem value="Completed">Completed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Start</Label>
                                  <Input type="date" value={projectForm.start} onChange={(e)=>setProjectForm({...projectForm, start: e.target.value})} />
                                </div>
                                <div>
                                  <Label>Deadline</Label>
                                  <Input type="date" value={projectForm.deadline} onChange={(e)=>setProjectForm({...projectForm, deadline: e.target.value})} />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={()=>setProjectOpen(false)}>Close</Button>
                                <Button onClick={saveProject}>Save</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Title</TableHead>
                              <TableHead>Client</TableHead>
                              <TableHead>Start</TableHead>
                              <TableHead>Deadline</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {projectItems.filter((p:any)=> projectStatusFilter === 'all' || p.status === projectStatusFilter).length === 0 && (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground">No projects found.</TableCell>
                              </TableRow>
                            )}
                            {projectItems.filter((p:any)=> projectStatusFilter === 'all' || p.status === projectStatusFilter).map((p:any)=> (
                              <TableRow key={p._id}>
                                <TableCell>{p.title || "-"}</TableCell>
                                <TableCell>{p.client || "-"}</TableCell>
                                <TableCell>{p.start ? new Date(p.start).toLocaleDateString() : "-"}</TableCell>
                                <TableCell>{p.deadline ? new Date(p.deadline).toLocaleDateString() : "-"}</TableCell>
                                <TableCell>{p.status || "-"}</TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant="outline" onClick={()=>deleteProject(p._id)}>Delete</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Expenses */}
              <TabsContent value="expenses" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <Input placeholder="Search expenses" className="max-w-xs" value={expenseSearch} onChange={(e)=>setExpenseSearch(e.target.value)} />
                        <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline">Add expense</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader><DialogTitle>Add expense</DialogTitle></DialogHeader>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <Label>Date</Label>
                                <Input type="date" value={expenseForm.date} onChange={(e)=>setExpenseForm({...expenseForm, date: e.target.value})} />
                              </div>
                              <div>
                                <Label>Category</Label>
                                <Input value={expenseForm.category} onChange={(e)=>setExpenseForm({...expenseForm, category: e.target.value})} />
                              </div>
                              <div className="sm:col-span-2">
                                <Label>Title</Label>
                                <Input value={expenseForm.title} onChange={(e)=>setExpenseForm({...expenseForm, title: e.target.value})} />
                              </div>
                              <div className="sm:col-span-2">
                                <Label>Description</Label>
                                <Input value={expenseForm.description} onChange={(e)=>setExpenseForm({...expenseForm, description: e.target.value})} />
                              </div>
                              <div>
                                <Label>Amount</Label>
                                <Input value={expenseForm.amount} onChange={(e)=>setExpenseForm({...expenseForm, amount: e.target.value})} />
                              </div>
                              <div>
                                <Label>Tax</Label>
                                <Input value={expenseForm.tax} onChange={(e)=>setExpenseForm({...expenseForm, tax: e.target.value})} />
                              </div>
                              <div>
                                <Label>Tax2</Label>
                                <Input value={expenseForm.tax2} onChange={(e)=>setExpenseForm({...expenseForm, tax2: e.target.value})} />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={()=>setExpenseOpen(false)}>Close</Button>
                              <Button onClick={saveExpense}>Save</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Title</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {expenseItems.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground">No expenses found.</TableCell>
                              </TableRow>
                            )}
                            {expenseItems.map((eItem:any)=> (
                              <TableRow key={eItem._id}>
                                <TableCell>{eItem.date ? new Date(eItem.date).toLocaleDateString() : "-"}</TableCell>
                                <TableCell>{eItem.category || "-"}</TableCell>
                                <TableCell className="truncate max-w-[360px]">{eItem.title || "-"}</TableCell>
                                <TableCell>{typeof eItem.total === 'number' ? eItem.total : (typeof eItem.amount === 'number' ? eItem.amount : '-') }</TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant="outline" onClick={()=>deleteExpense(eItem._id)}>Delete</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
