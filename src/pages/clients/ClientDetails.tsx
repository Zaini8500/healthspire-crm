import { useEffect, useMemo, useState } from "react";
import { useParams, NavLink } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import Notes from "../notes/Notes";
import Files from "../files/Files";

const API_BASE = "http://localhost:5000";

export default function ClientDetails() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any | null>(null);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [estimateRequests, setEstimateRequests] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  // editable fields
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        setLoading(true);
        // fetch client list and pick one (no /clients/:id endpoint exists)
        const res = await fetch(`${API_BASE}/api/clients`);
        const list = await res.json();
        const row = (Array.isArray(list) ? list : []).find((x: any) => String(x._id) === String(id));
        if (row) {
          setClient(row);
          setForm({ ...row });
          const name = row.company || row.person || "";
          // fetch projects filtered by name (projects store client string)
          const resP = await fetch(`${API_BASE}/api/projects?q=${encodeURIComponent(name)}`);
          setProjects(await resP.json().catch(() => []));
          // fetch estimates filtered by client name
          const resE = await fetch(`${API_BASE}/api/estimates?q=${encodeURIComponent(name)}`);
          setEstimates(await resE.json().catch(() => []));
          // fetch expenses/notes/files using q by client display name (best-effort)
          try { const r1 = await fetch(`${API_BASE}/api/expenses?q=${encodeURIComponent(name)}`); setExpenses(await r1.json().catch(()=>[])); } catch {}
          // Notes & Files are loaded via embedded modules below
          // fetch modules with clientId filters (precise)
          try { const r = await fetch(`${API_BASE}/api/invoices?clientId=${encodeURIComponent(String(id))}`); setInvoices(await r.json().catch(()=>[])); } catch {}
          try { const r = await fetch(`${API_BASE}/api/payments?clientId=${encodeURIComponent(String(id))}`); setPayments(await r.json().catch(()=>[])); } catch {}
          try { const r = await fetch(`${API_BASE}/api/estimate-requests?clientId=${encodeURIComponent(String(id))}`); setEstimateRequests(await r.json().catch(()=>[])); } catch {}
          try { const r = await fetch(`${API_BASE}/api/orders?clientId=${encodeURIComponent(String(id))}`); setOrders(await r.json().catch(()=>[])); } catch {}
          try { const r = await fetch(`${API_BASE}/api/contracts?clientId=${encodeURIComponent(String(id))}`); setContracts(await r.json().catch(()=>[])); } catch {}
          try { const r = await fetch(`${API_BASE}/api/proposals?clientId=${encodeURIComponent(String(id))}`); setProposals(await r.json().catch(()=>[])); } catch {}
          try { const r = await fetch(`${API_BASE}/api/tickets?clientId=${encodeURIComponent(String(id))}`); setTickets(await r.json().catch(()=>[])); } catch {}
          try { const r = await fetch(`${API_BASE}/api/events?clientId=${encodeURIComponent(String(id))}`); setEvents(await r.json().catch(()=>[])); } catch {}
          try { const r = await fetch(`${API_BASE}/api/subscriptions?clientId=${encodeURIComponent(String(id))}`); setSubscriptions(await r.json().catch(()=>[])); } catch {}
        }
      } catch (e: any) {
        toast.error(String(e?.message || "Failed to load client"));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Load tasks after projects are known
  useEffect(() => {
    (async () => {
      if (!projects || !projects.length) { setTasks([]); return; }
      try {
        const combined: any[] = [];
        for (const p of projects) {
          const res = await fetch(`${API_BASE}/api/tasks?projectId=${encodeURIComponent(p._id)}`);
          if (res.ok) {
            const arr = await res.json().catch(() => []);
            combined.push(...(Array.isArray(arr) ? arr : []));
          }
        }
        setTasks(combined);
      } catch {
        setTasks([]);
      }
    })();
  }, [projects]);

  const totals = useMemo(() => {
    const totalInvoiced = (invoices || []).reduce((a, e: any) => a + Number(e.amount || 0), 0);
    const paid = (payments || []).reduce((a, p: any) => a + Number(p.amount || 0), 0);
    const due = totalInvoiced - paid;
    return { totalInvoiced, payments: paid, due };
  }, [invoices, payments]);

  const saveInfo = async () => {
    if (!client) return;
    try {
      const payload: any = { ...form };
      delete payload._id; delete payload.createdAt; delete payload.updatedAt; delete payload.__v;
      const res = await fetch(`${API_BASE}/api/clients/${client._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json().catch(()=>null); toast.error(e?.error || "Save failed"); return; }
      const updated = await res.json();
      setClient(updated);
      toast.success("Saved");
    } catch {}
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!client) return <div className="p-6">Client not found</div>;

  const displayName = client.company || client.person || "Client";

  return (
    <div className="space-y-4 animate-fade-in p-1 sm:p-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Client details - {displayName}</div>
        <NavLink to="/clients" className="text-primary text-sm">Back to Clients</NavLink>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Projects" value={projects.length} color="bg-indigo" icon="▦" />
        <Stat title="Total invoiced" value={`Rs.${totals.totalInvoiced.toLocaleString()}`} color="bg-primary" icon="🧾" />
        <Stat title="Payments" value={`Rs.${totals.payments.toLocaleString()}`} color="bg-success" icon="✔" />
        <Stat title="Due" value={`Rs.${totals.due.toLocaleString()}`} color="bg-destructive" icon="⚠" />
      </div>

      <Tabs defaultValue="contacts">
        <TabsList className="bg-muted/40">
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="info">Client info</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="estimates">Estimates</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="estimate-requests">Estimate Requests</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {client.avatar ? (
                        <img src={`${API_BASE}${client.avatar}`} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted" />
                      )}
                      <NavLink to={`/clients/${id}/primary-contact`} className="text-primary underline">
                        {client.person || form.firstName || "-"}
                      </NavLink>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">Primary contact</TableCell>
                  <TableCell className="whitespace-nowrap">{client.email || "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">{client.phone || "-"}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card className="p-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Type</Label><Input value={(form.type||"org")} onChange={(e)=>setForm((s:any)=>({...s,type:e.target.value}))} /></div>
              <div className="space-y-1"><Label>Company</Label><Input value={form.company||""} onChange={(e)=>setForm((s:any)=>({...s,company:e.target.value}))} /></div>
              <div className="space-y-1"><Label>Person</Label><Input value={form.person||""} onChange={(e)=>setForm((s:any)=>({...s,person:e.target.value}))} /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={form.email||""} onChange={(e)=>setForm((s:any)=>({...s,email:e.target.value}))} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={form.phone||""} onChange={(e)=>setForm((s:any)=>({...s,phone:e.target.value}))} /></div>
              <div className="space-y-1 sm:col-span-2"><Label>Address</Label><Textarea value={form.address||""} onChange={(e)=>setForm((s:any)=>({...s,address:e.target.value}))} /></div>
              <div className="space-y-1"><Label>City</Label><Input value={form.city||""} onChange={(e)=>setForm((s:any)=>({...s,city:e.target.value}))} /></div>
              <div className="space-y-1"><Label>State</Label><Input value={form.state||""} onChange={(e)=>setForm((s:any)=>({...s,state:e.target.value}))} /></div>
              <div className="space-y-1"><Label>Zip</Label><Input value={form.zip||""} onChange={(e)=>setForm((s:any)=>({...s,zip:e.target.value}))} /></div>
              <div className="space-y-1"><Label>Country</Label><Input value={form.country||""} onChange={(e)=>setForm((s:any)=>({...s,country:e.target.value}))} /></div>
              <div className="space-y-1"><Label>Website</Label><Input value={form.website||""} onChange={(e)=>setForm((s:any)=>({...s,website:e.target.value}))} /></div>
              <div className="space-y-1"><Label>Labels</Label><Input value={(form.labels||[]).join(', ')} onChange={(e)=>setForm((s:any)=>({...s,labels:e.target.value.split(',').map((x)=>x.trim()).filter(Boolean)}))} /></div>
            </div>
            <div className="flex justify-end mt-4"><Button onClick={saveInfo}>Save</Button></div>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p:any, idx: number)=> (
                  <TableRow key={String(p._id)}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="whitespace-nowrap">{p.title}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{p.status||"Open"}</TableCell>
                    <TableCell className="whitespace-nowrap">{p.price?`Rs.${p.price}`:"Rs.0"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="estimates">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>#</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Estimate date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimates.map((e:any)=> (
                  <TableRow key={String(e._id)}>
                    <TableCell className="whitespace-nowrap text-primary underline cursor-pointer">
                      <NavLink to={`/prospects/estimates/${e._id}`}>{e.number}</NavLink>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{e.amount?`Rs.${e.amount}`:"Rs.0"}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{e.status||"-"}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{e.estimateDate ? new Date(e.estimateDate).toISOString().slice(0,10) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((t:any)=> (
                  <TableRow key={String(t._id)}>
                    <TableCell className="whitespace-nowrap">{t.title}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{t.status}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{t.priority}</TableCell>
                    <TableCell className="whitespace-nowrap">{t.projectTitle || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{t.dueDate ? new Date(t.dueDate).toISOString().slice(0,10) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Notes clientId={id} />
        </TabsContent>

        <TabsContent value="files">
          <Files clientId={id} />
        </TabsContent>

        <TabsContent value="expenses">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((ex:any)=> (
                  <TableRow key={String(ex._id)}>
                    <TableCell className="whitespace-nowrap">{ex.title}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{ex.category}</TableCell>
                    <TableCell className="whitespace-nowrap">{ex.amount?`Rs.${ex.amount}`:'Rs.0'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issue date</TableHead>
                  <TableHead>Due date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv:any)=> (
                  <TableRow key={String(inv._id)}>
                    <TableCell className="whitespace-nowrap">{inv.number}</TableCell>
                    <TableCell className="whitespace-nowrap">{inv.amount?`Rs.${inv.amount}`:'Rs.0'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{inv.status||'-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{inv.issueDate?new Date(inv.issueDate).toISOString().slice(0,10):'-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{inv.dueDate?new Date(inv.dueDate).toISOString().slice(0,10):'-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p:any)=> (
                  <TableRow key={String(p._id)}>
                    <TableCell className="whitespace-nowrap">{p.invoiceId || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{p.date?new Date(p.date).toISOString().slice(0,10):'-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{p.method||'-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{p.note||'-'}</TableCell>
                    <TableCell className="whitespace-nowrap">{p.amount?`Rs.${p.amount}`:'Rs.0'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Estimate Requests */}
        <TabsContent value="estimate-requests">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimateRequests.map((r:any)=> (
                  <TableRow key={String(r._id)}>
                    <TableCell className="whitespace-nowrap">{r.title}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.amount?`Rs.${r.amount}`:'Rs.0'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{r.status||'-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{r.requestDate?new Date(r.requestDate).toISOString().slice(0,10):'-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Orders */}
        <TabsContent value="orders">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o:any)=> (
                  <TableRow key={String(o._id)}>
                    <TableCell className="whitespace-nowrap">{o.amount?`Rs.${o.amount}`:'Rs.0'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{o.status||'-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{o.orderDate?new Date(o.orderDate).toISOString().slice(0,10):'-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Contracts */}
        <TabsContent value="contracts">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contract date</TableHead>
                  <TableHead>Valid until</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c:any)=> (
                  <TableRow key={String(c._id)}>
                    <TableCell className="whitespace-nowrap">{c.title}</TableCell>
                    <TableCell className="whitespace-nowrap">{c.amount?`Rs.${c.amount}`:'Rs.0'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{c.status||'-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{c.contractDate?new Date(c.contractDate).toISOString().slice(0,10):'-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{c.validUntil?new Date(c.validUntil).toISOString().slice(0,10):'-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Proposals */}
        <TabsContent value="proposals">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Proposal date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map((pr:any)=> (
                  <TableRow key={String(pr._id)}>
                    <TableCell className="whitespace-nowrap">{pr.title}</TableCell>
                    <TableCell className="whitespace-nowrap">{pr.amount?`Rs.${pr.amount}`:'Rs.0'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{pr.status||'-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{pr.proposalDate?new Date(pr.proposalDate).toISOString().slice(0,10):'-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Tickets */}
        <TabsContent value="tickets">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Labels</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t:any)=> (
                  <TableRow key={String(t._id)}>
                    <TableCell className="whitespace-nowrap">{t.title}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{t.type||'-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{Array.isArray(t.labels)?t.labels.join(', '):'-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{t.assignedTo||'-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{t.status||'-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{t.lastActivity?new Date(t.lastActivity).toISOString().slice(0,10):'-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Events */}
        <TabsContent value="events">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Title</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev:any)=> (
                  <TableRow key={String(ev._id)}>
                    <TableCell className="whitespace-nowrap">{ev.title}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{ev.start?new Date(ev.start).toISOString().slice(0,10):'-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{ev.end?new Date(ev.end).toISOString().slice(0,10):'-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{ev.type||'-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{ev.location||'-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Subscriptions */}
        <TabsContent value="subscriptions">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Title</TableHead>
                  <TableHead>Next billing</TableHead>
                  <TableHead>Repeat every</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((s:any)=> (
                  <TableRow key={String(s._id)}>
                    <TableCell className="whitespace-nowrap">{s.title}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{s.nextBillingDate?new Date(s.nextBillingDate).toISOString().slice(0,10):'-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{s.repeatEvery||'-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{s.status||'-'}</TableCell>
                    <TableCell className="whitespace-nowrap">{s.amount?`Rs.${s.amount}`:'Rs.0'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}

function Stat({ title, value, color, icon }: { title: string; value: any; color: string; icon?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="text-2xl font-semibold mt-1">{value}</div>
        </div>
        <div className={`w-10 h-10 rounded-xl ${color} text-white flex items-center justify-center`}>{icon || '•'}</div>
      </div>
    </Card>
  );
}
