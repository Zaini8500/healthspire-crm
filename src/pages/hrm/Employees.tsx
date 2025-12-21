import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Filter,
  Download,
  Mail,
  Phone,
  MapPin,
  LayoutGrid,
  List,
  MoreHorizontal,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders } from "@/lib/api/auth";

type Employee = {
  id: number;
  dbId?: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  location: string;
  status: "active" | "on-leave" | "remote";
  joinDate: string;
  initials: string;
  image?: string;
};

const employees: Employee[] = [];

const statusConfig = {
  active: { label: "Active", variant: "success" as const },
  "on-leave": { label: "On Leave", variant: "warning" as const },
  remote: { label: "Remote", variant: "default" as const },
};

const departmentColors: Record<string, string> = {
  Sales: "from-chart-1 to-chart-2",
  Engineering: "from-chart-2 to-chart-3",
  Marketing: "from-chart-3 to-chart-4",
  HR: "from-chart-4 to-chart-5",
  Finance: "from-chart-5 to-chart-1",
};

export default function Employees() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Employee[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"active" | "inactive">("active");
  const [openAdd, setOpenAdd] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isEdit, setIsEdit] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDbId, setEditingDbId] = useState<string | undefined>(undefined);
  const [openImport, setOpenImport] = useState(false);
  const [openInvite, setOpenInvite] = useState(false);
  const [inviteList, setInviteList] = useState("");
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [phoneVal, setPhoneVal] = useState("");
  const [gender, setGender] = useState("male");
  const [jobTitle, setJobTitle] = useState("");
  const [departmentVal, setDepartmentVal] = useState("HR");
  const [salary, setSalary] = useState("");
  const [salaryTerm, setSalaryTerm] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [emailVal, setEmailVal] = useState("");
  const [password, setPassword] = useState("********");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("Team member");
  const [sendLogin, setSendLogin] = useState(true);
  // Departments options loaded from backend
  const [deptOptions, setDeptOptions] = useState<string[]>([]);

  const getCurrentUserRole = () => {
    try {
      const userStr = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
      if (!userStr) return "admin";
      const user = JSON.parse(userStr);
      return user.role || "admin";
    } catch {
      return "admin";
    }
  };

  const currentUserRole = getCurrentUserRole();

  const filteredEmployees = useMemo(() => {
    const s = searchQuery.toLowerCase();
    const bySearch = items.filter(
      (emp) =>
        emp.name.toLowerCase().includes(s) ||
        emp.department.toLowerCase().includes(s) ||
        emp.role.toLowerCase().includes(s)
    );
    if (statusTab === "active") return bySearch.filter((e) => e.status !== "on-leave");
    return bySearch.filter((e) => e.status === "on-leave");
  }, [items, searchQuery, statusTab]);

  const nextStep = () => setStep((p) => (p < 3 ? ((p + 1) as 1 | 2 | 3) : p));
  const prevStep = () => setStep((p) => (p > 1 ? ((p - 1) as 1 | 2 | 3) : p));
  const genPass = () => setPassword(Math.random().toString(36).slice(2, 10) + "A1!");
  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setAddress("");
    setPhoneVal("");
    setGender("male");
    setJobTitle("");
    setDepartmentVal(deptOptions[0] || "HR");
    setSalary("");
    setSalaryTerm("");
    setHireDate("");
    setEmailVal("");
    setPassword("********");
    setRole("Team member");
    setSendLogin(true);
    setStep(1);
  };

  const parseCsv = (text: string) => {
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length) return [] as any[];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idx = (k: string) => headers.indexOf(k);
    const out: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      if (!cols.length) continue;
      const name = (cols[idx("name")] || "").trim();
      const firstName = name.split(" ")[0] || "";
      const lastName = name.split(" ").slice(1).join(" ") || "";
      out.push({
        name,
        firstName,
        lastName,
        email: (cols[idx("email")] || "").trim(),
        phone: (cols[idx("phone")] || "").trim(),
        department: (cols[idx("department")] || "HR").trim(),
        role: (cols[idx("role")] || "Team member").trim(),
        location: (cols[idx("location")] || "").trim(),
        status: (cols[idx("status")] || "active").trim(),
        joinDate: cols[idx("joindate")] ? new Date(cols[idx("joindate")]) : undefined,
      });
    }
    return out;
  };

  const onImportFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = parseCsv(text);
      setImportPreview(parsed);
    };
    reader.readAsText(f);
  };

  const saveImport = async () => {
    try {
      if (!importPreview.length) {
        setOpenImport(false);
        return;
      }
      await fetch(`${API_BASE}/api/employees/bulk`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ items: importPreview }),
      });
      setOpenImport(false);
      setImportPreview([]);
      await refreshFromAPI();
      toast.success("Team members imported");
    } catch {}
  };

  const saveInvite = async () => {
    try {
      const emails = inviteList
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      await fetch(`${API_BASE}/api/employees/invite`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ emails }),
      });
      setOpenInvite(false);
      setInviteList("");
      toast.success("Invitations sent");
    } catch {}
  };

  const exportCSV = () => {
    const rows = [
      ["name","email","phone","department","role","location","status","joinDate"],
      ...filteredEmployees.map((e)=>[
        e.name,
        e.email,
        e.phone,
        e.department,
        e.role,
        e.location,
        e.status,
        e.joinDate,
      ]),
    ];
    const csv = rows
      .map((r)=>r.map((c)=>`"${String(c).replace(/\"/g,'""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const printList = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = filteredEmployees
      .map((e)=>`<tr><td>${e.name}</td><td>${e.email}</td><td>${e.phone}</td><td>${e.department}</td><td>${e.role}</td></tr>`)
      .join("");
    w.document.write(`<!doctype html><html><head><title>Employees</title><style>table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;text-align:left}</style></head><body><h3>Employees</h3><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Department</th><th>Role</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  // API base (local dev)
  const API_BASE = "http://localhost:5000";

  const refreshDepartments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/departments?active=1`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const names = (Array.isArray(data) ? data : []).map((d: any) => String(d.name)).filter(Boolean);
        if (names.length) setDeptOptions(names);
      }
    } catch {}
  };

  const refreshFromAPI = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/employees`, { cache: "no-store", headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const mapped: Employee[] = (Array.isArray(data) ? data : []).map((d: any, i: number) => {
        const name: string = d.name || `${d.firstName || ""} ${d.lastName || ""}`.trim() || "Member";
        const initials = (d.initials || name.split(" ").map((w: string) => w[0]).join("").slice(0,2)).toUpperCase();
        const joinDate = d.joinDate ? new Date(d.joinDate).toLocaleString(undefined, { month: "short", year: "numeric" }) : "";
        return {
          id: i + 1,
          dbId: d._id,
          name,
          email: d.email || "",
          phone: d.phone || "",
          department: d.department || "HR",
          role: d.role || "Team member",
          location: d.location || "",
          status: (d.status as any) || "active",
          joinDate: joinDate || "",
          initials,
          image: d.avatar ? (String(d.avatar).startsWith("http") ? d.avatar : `${API_BASE}${d.avatar}`) : undefined,
        } as Employee;
      });
      setItems(mapped);
    } catch {}
  };

  useEffect(() => {
    // load department options
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
    
    // Try loading from backend; fallback to mock if API not available
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/employees`, { cache: "no-store", headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          const mapped: Employee[] = data.map((d: any, i: number) => {
            const name: string = d.name || `${d.firstName || ""} ${d.lastName || ""}`.trim() || "Member";
            const initials = (d.initials || name.split(" ").map((w: string) => w[0]).join("").slice(0,2)).toUpperCase();
            const joinDate = d.joinDate ? new Date(d.joinDate).toLocaleString(undefined, { month: "short", year: "numeric" }) : "";
            return {
              id: i + 1,
              dbId: d._id,
              name,
              email: d.email || "",
              phone: d.phone || "",
              department: d.department || "HR",
              role: d.role || "Team member",
              location: d.location || "",
              status: (d.status as any) || "active",
              joinDate: joinDate || "",
              initials,
              image: d.avatar ? (String(d.avatar).startsWith("http") ? d.avatar : `${API_BASE}${d.avatar}`) : undefined,
            } as Employee;
          });
          setItems(mapped);
        }
      } catch {}
    })();

    // Listen for departments updated event
    const handleDepartmentsUpdated = () => {
      refreshDepartments();
    };
    const handleEmployeeUpdated = () => {
      refreshFromAPI();
    };
    window.addEventListener("departmentsUpdated", handleDepartmentsUpdated);
    window.addEventListener("employeeUpdated", handleEmployeeUpdated);
    return () => {
      window.removeEventListener("departmentsUpdated", handleDepartmentsUpdated);
      window.removeEventListener("employeeUpdated", handleEmployeeUpdated);
    };
  }, []);

  // If departments load and current selection is not in list, default to first
  useEffect(() => {
    if (!isEdit && deptOptions.length && (!departmentVal || !deptOptions.includes(departmentVal))) {
      setDepartmentVal(deptOptions[0]);
    }
  }, [deptOptions]);

  const saveMember = async () => {
    const name = `${firstName} ${lastName}`.trim() || "New Member";
    const initials = name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    if (isEdit && editingIndex !== null) {
      // local update
      setItems((prev) => prev.map((it, idx) => idx === editingIndex ? { ...it, name, email: emailVal||"", phone: phoneVal||"", role, department: departmentVal, location: address||"", initials } : it));
      // backend update
      if (editingDbId) {
        try {
          const payload = {
            firstName,
            lastName,
            name,
            email: emailVal,
            phone: phoneVal,
            department: departmentVal,
            role,
            location: address,
            status: "active",
            joinDate: hireDate ? new Date(hireDate) : undefined,
            initials,
          };
          await fetch(`${API_BASE}/api/employees/${editingDbId}`, {
            method: "PUT",
            headers: getAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
          });
        } catch {}
      }
      await refreshFromAPI();
      toast.success("Member updated");
    } else {
      // local prepend
      setItems((prev) => [
        {
          id: Math.floor(Math.random() * 100000),
          name,
          email: emailVal || "",
          phone: phoneVal || "",
          department: departmentVal,
          role: role,
          location: address || "",
          status: "active",
          joinDate: hireDate || "Today",
          initials,
        },
        ...prev,
      ]);
      // backend create
      try {
        const payload = {
          firstName,
          lastName,
          name,
          email: emailVal,
          phone: phoneVal,
          department: departmentVal,
          role,
          location: address,
          status: "active",
          joinDate: hireDate ? new Date(hireDate) : undefined,
          initials,
        };
        await fetch(`${API_BASE}/api/employees`, {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        });
      } catch {}
      await refreshFromAPI();
      toast.success("Member created");
    }
    setOpenAdd(false);
    resetForm();
    setIsEdit(false);
    setEditingIndex(null);
    setEditingDbId(undefined);
  };

  const startEdit = (emp: Employee, index: number) => {
    const [fn, ln] = emp.name.split(" ");
    setFirstName(fn || "");
    setLastName(ln || "");
    setAddress(emp.location || "");
    setPhoneVal(emp.phone || "");
    setGender("male");
    setJobTitle(emp.role || "");
    setDepartmentVal(emp.department || "HR");
    setSalary("");
    setSalaryTerm("");
    setHireDate("");
    setEmailVal(emp.email || "");
    setPassword("********");
    setRole(emp.role || "Team member");
    setSendLogin(false);
    setIsEdit(true);
    setEditingIndex(index);
    setEditingDbId(emp.dbId);
    setStep(1);
    setOpenAdd(true);
  };

  const deleteEmployee = async (emp: Employee, index: number) => {
    const proceed = window.confirm(`Delete ${emp.name}?`);
    if (!proceed) return;
    setItems((prev) => prev.filter((it) => it.id !== emp.id));
    if (emp.dbId) {
      try {
        await fetch(`${API_BASE}/api/employees/${emp.dbId}`, { method: "DELETE", headers: getAuthHeaders() });
      } catch {}
      await refreshFromAPI();
    }
    toast.success("Member deleted");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-sm text-muted-foreground">Team members</h1>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md overflow-hidden">
              <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon-sm" onClick={()=>setViewMode("list")}>
                <List className="w-4 h-4"/>
              </Button>
              <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon-sm" onClick={()=>setViewMode("grid")}>
                <LayoutGrid className="w-4 h-4"/>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant={statusTab === "active" ? "secondary" : "outline"} size="sm" onClick={()=>setStatusTab("active")}>Active members</Button>
              <Button variant={statusTab === "inactive" ? "secondary" : "outline"} size="sm" onClick={()=>setStatusTab("inactive")}>Inactive members</Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentUserRole === "admin" && (
              <>
                <Dialog open={openImport} onOpenChange={setOpenImport}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Import team members</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card">
                    <DialogHeader>
                      <DialogTitle>Import team members</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                      <div className="space-y-1">
                        <Label>Upload CSV</Label>
                        <Input ref={importFileRef} type="file" accept=".csv" onChange={onImportFileChange} />
                        <p className="text-xs text-muted-foreground">Headers: name,email,phone,department,role,location,status,joinDate</p>
                      </div>
                      {importPreview.length > 0 && (
                        <div className="text-xs text-muted-foreground">Parsed {importPreview.length} rows</div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={()=>setOpenImport(false)}>Close</Button>
                      <Button onClick={saveImport}>Import</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={openInvite} onOpenChange={setOpenInvite}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Send invitation</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card">
                    <DialogHeader>
                      <DialogTitle>Send invitation</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                      <div className="space-y-1">
                        <Label>Emails (comma or newline separated)</Label>
                        <Textarea rows={6} placeholder="a@company.com, b@company.com" value={inviteList} onChange={(e)=>setInviteList(e.target.value)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={()=>setOpenInvite(false)}>Close</Button>
                      <Button onClick={saveInvite}>Send</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={openAdd} onOpenChange={(o)=>{setOpenAdd(o); if(!o) resetForm();}}>
                  <DialogTrigger asChild>
                    <Button variant="gradient" size="sm"><Plus className="w-4 h-4 mr-2"/>Add member</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card">
                    <DialogHeader>
                      <DialogTitle>Add member</DialogTitle>
                    </DialogHeader>
                {/* Stepper */}
                <div className="mb-4">
                  <div className="flex items-center gap-6 text-sm">
                    <button className={cn("pb-2", step===1?"text-foreground":"text-muted-foreground")} onClick={()=>setStep(1)}>General Info</button>
                    <button className={cn("pb-2", step===2?"text-foreground":"text-muted-foreground")} onClick={()=>setStep(2)}>Job Info</button>
                    <button className={cn("pb-2", step===3?"text-foreground":"text-muted-foreground")} onClick={()=>setStep(3)}>Account settings</button>
                  </div>
                  <div className="h-1 w-full bg-muted rounded">
                    <div className={cn("h-1 bg-success rounded transition-all", step===1&&"w-1/3", step===2&&"w-2/3", step===3&&"w-full")}></div>
                  </div>
                </div>

                {step===1 && (
                  <div className="grid gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>First name</Label><Input placeholder="First name" value={firstName} onChange={(e)=>setFirstName(e.target.value)} /></div>
                      <div className="space-y-1"><Label>Last name</Label><Input placeholder="Last name" value={lastName} onChange={(e)=>setLastName(e.target.value)} /></div>
                    </div>
                    <div className="space-y-1"><Label>Mailing address</Label><Textarea placeholder="Mailing address" value={address} onChange={(e)=>setAddress(e.target.value)} /></div>
                    <div className="space-y-1"><Label>Phone</Label><Input type="tel" placeholder="+1 (000) 000-0000" value={phoneVal} onChange={(e)=>setPhoneVal(e.target.value)} /></div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <RadioGroup value={gender} onValueChange={setGender} className="flex gap-6">
                        <div className="flex items-center gap-2"><RadioGroupItem value="male" id="g-m"/><Label htmlFor="g-m">Male</Label></div>
                        <div className="flex items-center gap-2"><RadioGroupItem value="female" id="g-f"/><Label htmlFor="g-f">Female</Label></div>
                        <div className="flex items-center gap-2"><RadioGroupItem value="other" id="g-o"/><Label htmlFor="g-o">Other</Label></div>
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {step===2 && (
                  <div className="grid gap-3">
                    <div className="space-y-1"><Label>Job Title</Label><Input placeholder="Job Title" value={jobTitle} onChange={(e)=>setJobTitle(e.target.value)} /></div>
                    <div className="space-y-1">
                      <Label>Department</Label>
                      <Select value={departmentVal} onValueChange={setDepartmentVal}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(deptOptions.length ? deptOptions : ['HR']).map((d)=> (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1"><Label>Salary</Label><Input placeholder="Salary" value={salary} onChange={(e)=>setSalary(e.target.value)} /></div>
                      <div className="space-y-1"><Label>Salary term</Label><Input placeholder="Salary term" value={salaryTerm} onChange={(e)=>setSalaryTerm(e.target.value)} /></div>
                      <div className="space-y-1"><Label>Date of hire</Label><Input type="date" value={hireDate} onChange={(e)=>setHireDate(e.target.value)} /></div>
                    </div>
                  </div>
                )}

                {step===3 && (
                  <div className="grid gap-3">
                    <div className="space-y-1"><Label>Email</Label><Input type="email" placeholder="Email" value={emailVal} onChange={(e)=>setEmailVal(e.target.value)} /></div>
                    <div className="space-y-1">
                      <Label>Password</Label>
                      <div className="flex items-center gap-2">
                        <Input type={showPassword?"text":"password"} value={password} onChange={(e)=>setPassword(e.target.value)} />
                        <Button type="button" variant="outline" size="sm" onClick={genPass}>Generate</Button>
                        <Button type="button" variant="ghost" size="icon" onClick={()=>setShowPassword(v=>!v)}>
                          {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1"><Label>Role</Label><Input value={role} onChange={(e)=>setRole(e.target.value)} /></div>
                    <div className="flex items-center gap-2 mt-1">
                      <Checkbox id="send-login" checked={sendLogin} onCheckedChange={(v)=>setSendLogin(Boolean(v))} />
                      <Label htmlFor="send-login">Email login details to this user</Label>
                    </div>
                  </div>
                )}

                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={()=>{setOpenAdd(false); resetForm();}}>Close</Button>
                  {step>1 && <Button variant="secondary" onClick={prevStep}>Previous</Button>}
                  {step<3 && <Button variant="gradient" onClick={nextStep}>Next</Button>}
                  {step===3 && <Button onClick={saveMember}>Save</Button>}
                </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold mt-1">{items.length}</p>
              </div>
              <Badge variant="success">+8</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Leave</p>
                <p className="text-2xl font-bold mt-1">{items.filter(i=>i.status==="on-leave").length}</p>
              </div>
              <Badge variant="warning">7.7%</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Remote</p>
                <p className="text-2xl font-bold mt-1">{items.filter(i=>i.status==="remote").length}</p>
              </div>
              <Badge variant="secondary">{items.length?((items.filter(i=>i.status==="remote").length/items.length)*100).toFixed(1):"0.0"}%</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Departments</p>
                <p className="text-2xl font-bold mt-1">{Array.from(new Set(items.map(i=>i.department))).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar: search + actions (Excel/Print/Search) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={exportCSV}>Excel</Button>
            <Button variant="outline" size="sm" onClick={printList}>Print</Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="pl-9 w-56" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Grid */}
      <div
        className={cn(
          "grid gap-4",
          viewMode === "grid"
            ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "grid-cols-1"
        )}
      >
        {filteredEmployees.map((employee) => (
          <Card key={employee.id} className="group hover:shadow-md transition-shadow">
            <CardContent className={cn("p-6", viewMode === "list" && "flex items-center gap-6")}>
              {/* Avatar & Basic Info */}
              <div className={cn("flex items-center gap-4", viewMode === "grid" && "flex-col text-center")}>
                <div className="relative">
                  <Avatar className={cn(
                    viewMode === "grid" ? "w-20 h-20" : "w-12 h-12",
                    "ring-2 ring-primary/20 ring-offset-1 ring-offset-card shadow-sm"
                  )}>
                    {employee.image && (
                      <AvatarImage className="object-cover object-center" src={employee.image} alt={employee.name} />
                    )}
                    <AvatarFallback
                      className={`bg-gradient-to-br ${
                        departmentColors[employee.department] || "from-primary to-indigo"
                      } text-primary-foreground font-semibold ${viewMode === "grid" ? "text-xl" : "text-sm"}`}
                    >
                      {employee.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow",
                      employee.status === "active" && "bg-success",
                      employee.status === "on-leave" && "bg-warning",
                      employee.status === "remote" && "bg-primary"
                    )}
                  />
                </div>

                <div className={cn(viewMode === "grid" && "mt-2")}>
                  <h3 className="font-semibold">{employee.name}</h3>
                  <p className="text-sm text-muted-foreground">{employee.role}</p>
                  <Badge variant="secondary" className="mt-2">
                    {employee.department}
                  </Badge>
                </div>
              </div>

              {/* Contact Info */}
              <div
                className={cn(
                  "space-y-2 text-sm",
                  viewMode === "grid" ? "mt-4 pt-4 border-t" : "flex-1"
                )}
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{employee.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{employee.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{employee.location}</span>
                </div>
              </div>

              {/* Actions */}
              <div
                className={cn(
                  "flex items-center gap-2",
                  viewMode === "grid"
                    ? "mt-4 pt-4 border-t justify-center"
                    : "opacity-0 group-hover:opacity-100 transition-opacity"
                )}
              >
                <Button variant="outline" size="sm" onClick={()=>{
                  const idForUrl = employee.dbId || String(employee.id);
                  navigate(`/hrm/employees/${idForUrl}`, { state: { employee, dbId: employee.dbId } });
                }}>
                  View Profile
                </Button>
                {currentUserRole === "admin" && (
                  <>
                    <Button variant="outline" size="sm" onClick={()=>{
                      const fullIndex = items.findIndex(e=>e.id===employee.id);
                      startEdit(employee, fullIndex);
                    }}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={()=>{
                      const fullIndex = items.findIndex(e=>e.id===employee.id);
                      deleteEmployee(employee, fullIndex);
                    }}>Delete</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
