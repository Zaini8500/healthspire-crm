import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const API_BASE = "http://localhost:5000";

interface Project {
  id: string;
  title: string;
  clientId?: string;
  client?: string;
  price?: number;
  start?: string; // ISO
  deadline?: string; // ISO
  status?: string;
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  start: string;
  deadline: string;
  priority: string;
}

interface ContractRow {
  id: string;
  title: string;
  amount: string;
  contractDate: string;
  validUntil: string;
  status: string;
}

export default function ProjectDashboard() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/projects/${id}`);
        if (r.ok) {
          const d = await r.json();
          setProject({
            id: String(d._id || id),
            title: d.title || "-",
            clientId: d.clientId ? String(d.clientId) : undefined,
            client: d.client || "-",
            price: d.price,
            start: d.start ? new Date(d.start).toISOString() : undefined,
            deadline: d.deadline ? new Date(d.deadline).toISOString() : undefined,
            status: d.status || "Open",
          });
        }
      } catch {}
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/tasks?projectId=${id}`);
        if (r.ok) {
          const data = await r.json();
          setTasks((Array.isArray(data) ? data : []).map((t:any)=> ({
            id: String(t._id || ""),
            title: t.title || "-",
            status: t.status || "todo",
            start: t.start ? new Date(t.start).toISOString().slice(0,10) : "-",
            deadline: t.deadline ? new Date(t.deadline).toISOString().slice(0,10) : "-",
            priority: t.priority || "medium",
          })));
        }
      } catch {}
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/contracts?projectId=${id}`);
        if (r.ok) {
          const data = await r.json();
          setContracts((Array.isArray(data) ? data : []).map((c:any)=> ({
            id: String(c._id || ""),
            title: c.title || "-",
            amount: c.amount != null ? String(c.amount) : "-",
            contractDate: c.contractDate ? new Date(c.contractDate).toISOString().slice(0,10) : "-",
            validUntil: c.validUntil ? new Date(c.validUntil).toISOString().slice(0,10) : "-",
            status: c.status || "Open",
          })));
        }
      } catch {}
    })();
  }, [id]);

  const progress = useMemo(() => {
    if (!project?.start || !project.deadline) return 0;
    const s = new Date(project.start).getTime();
    const e = new Date(project.deadline).getTime();
    if (e <= s) return 0;
    const pct = Math.round(((Date.now() - s) / (e - s)) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [project?.start, project?.deadline]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-display">{project?.title || "Project"}</h1>
          <div className="text-sm text-muted-foreground">
            Client: {project?.clientId ? (
              <Link to={`/clients/${project.clientId}`} className="text-primary underline">{project?.client}</Link>
            ) : (project?.client || "-")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={project?.status === "Completed" ? "secondary" : "outline"}>{project?.status || "Open"}</Badge>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks List</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-4 space-y-2">
            <div className="text-sm text-muted-foreground">Progress</div>
            <div className="h-2 bg-muted/50 rounded">
              <div className="h-2 bg-muted rounded" style={{ width: `${progress}%` }} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><div className="text-muted-foreground">Start</div><div>{project?.start ? project.start.slice(0,10) : "-"}</div></div>
              <div><div className="text-muted-foreground">Deadline</div><div>{project?.deadline ? project.deadline.slice(0,10) : "-"}</div></div>
              <div><div className="text-muted-foreground">Price</div><div>{project?.price ?? "-"}</div></div>
              <div><div className="text-muted-foreground">Status</div><div>{project?.status || "Open"}</div></div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((t, idx) => (
                  <TableRow key={t.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{t.title}</TableCell>
                    <TableCell>{t.status}</TableCell>
                    <TableCell>{t.start}</TableCell>
                    <TableCell>{t.deadline}</TableCell>
                    <TableCell>{t.priority}</TableCell>
                  </TableRow>
                ))}
                {tasks.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No tasks</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="contracts">
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Contract date</TableHead>
                  <TableHead>Valid until</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c, idx) => (
                  <TableRow key={c.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{c.title}</TableCell>
                    <TableCell>{c.amount}</TableCell>
                    <TableCell>{c.contractDate}</TableCell>
                    <TableCell>{c.validUntil}</TableCell>
                    <TableCell>{c.status}</TableCell>
                  </TableRow>
                ))}
                {contracts.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No contracts</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
