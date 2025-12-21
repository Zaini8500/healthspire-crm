import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, ChevronDown, RefreshCw, Settings, MoreHorizontal } from "lucide-react";

const API_BASE = "http://localhost:5000";

const getAuthHeaders = () => {
  const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { headers, token };
};

type UserRow = {
  _id: string;
  name?: string;
  email: string;
  role: "admin" | "staff" | "client";
  status: "active" | "inactive";
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
};

const ALL_PERMS: Array<{ key: string; label: string }> = [
  { key: "crm", label: "CRM" },
  { key: "hrm", label: "HRM" },
  { key: "projects", label: "Projects" },
  { key: "prospects", label: "Prospects" },
  { key: "sales", label: "Sales" },
  { key: "reports", label: "Reports" },
  { key: "clients", label: "Clients" },
  { key: "tasks", label: "Tasks" },
  { key: "messages", label: "Messages" },
  { key: "tickets", label: "Tickets" },
  { key: "announcements", label: "Announcements" },
  { key: "calendar", label: "Calendar" },
  { key: "events", label: "Events" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "notes", label: "Notes" },
  { key: "files", label: "Files" },
];

export default function ManageUsers() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("-");
  const [status, setStatus] = useState("-");
  const [openAdd, setOpenAdd] = useState(false);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<UserRow[]>([]);

  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState<UserRow["role"]>("staff");
  const [editStatus, setEditStatus] = useState<UserRow["status"]>("active");
  const [editPerms, setEditPerms] = useState<Set<string>>(new Set());

  const load = async () => {
    try {
      setLoading(true);
      const { headers } = getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/users/admin/list`, { headers });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load users");
      setItems(Array.isArray(json) ? json : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((u) => {
      if (role !== "-" && u.role !== role) return false;
      if (status !== "-" && u.status !== status) return false;
      if (!q) return true;
      return (u.email || "").toLowerCase().includes(q) || (u.name || "").toLowerCase().includes(q);
    });
  }, [items, query, role, status]);

  const openEditUser = (u: UserRow) => {
    setEditing(u);
    setEditRole(u.role);
    setEditStatus(u.status);
    setEditPerms(new Set(Array.isArray(u.permissions) ? u.permissions : []));
    setOpenEdit(true);
  };

  const togglePerm = (k: string) => {
    setEditPerms((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const saveEdit = async () => {
    if (!editing?._id) return;
    const { headers } = getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/users/admin/${editing._id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ role: editRole, status: editStatus, permissions: Array.from(editPerms) }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Failed to update user");
    setOpenEdit(false);
    setEditing(null);
    await load();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Manage Users</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">Export <ChevronDown className="w-4 h-4 ml-2"/></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>CSV</DropdownMenuItem>
              <DropdownMenuItem>Excel</DropdownMenuItem>
              <DropdownMenuItem>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" onClick={load} disabled={loading}><RefreshCw className="w-4 h-4"/></Button>
          <Button variant="outline" size="icon"><Settings className="w-4 h-4"/></Button>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild><Button className="bg-red-500 hover:bg-red-500/90" size="sm"><Plus className="w-4 h-4 mr-2"/>Add User</Button></DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader><DialogTitle>Add user</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <Input placeholder="Full name" />
                <Input placeholder="Email" />
                <Input placeholder="Password" type="password" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={()=>setOpenAdd(false)}>Close</Button>
                <Button onClick={()=>setOpenAdd(false)}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline">Filter</Button>
              <Button variant="outline">11 Nov 25 - 10 Dec 25</Button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Checkbox />
            </div>
            <div className="flex items-center gap-2">
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Sort By"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">All roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">Manage Columns</Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-8"><Checkbox /></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r)=> (
                <TableRow key={r._id}>
                  <TableCell><Checkbox /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8"><AvatarFallback>{String(r.name || r.email || "U").split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                      <div>
                        <div className="font-medium">{r.name || r.email}</div>
                        <div className="text-xs text-muted-foreground">{r.role}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                  <TableCell className="text-muted-foreground">{r.email}</TableCell>
                  <TableCell>{r.role}</TableCell>
                  <TableCell>{r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "-"}</TableCell>
                  <TableCell>{r.updatedAt ? new Date(r.updatedAt).toISOString().slice(0, 10) : "-"}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === 'active' ? 'success' : 'destructive'}>{r.status === 'active' ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEditUser(r)}><MoreHorizontal className="w-4 h-4"/></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Dialog open={openEdit} onOpenChange={setOpenEdit}>
            <DialogContent className="bg-card">
              <DialogHeader><DialogTitle>Edit user access</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="text-sm text-muted-foreground">{editing?.email || ""}</div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Role</div>
                    <Select value={editRole} onValueChange={(v) => setEditRole(v as any)}>
                      <SelectTrigger><SelectValue placeholder="Role"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Select value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                      <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {editRole === "staff" && (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {ALL_PERMS.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={editPerms.has(p.key)} onCheckedChange={() => togglePerm(p.key)} />
                        <span>{p.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenEdit(false)}>Close</Button>
                <Button onClick={saveEdit}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
