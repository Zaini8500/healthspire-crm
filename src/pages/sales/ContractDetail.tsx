import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { ChevronDown, Download, Printer, FileText, Copy, Trash2, RefreshCw, Edit3 } from "lucide-react";

const API_BASE = "http://localhost:5000";

type ProjectDoc = { _id: string; title?: string };

type ContractDoc = {
  _id: string;
  title?: string;
  client?: string;
  projectId?: string;
  contractDate?: string;
  validUntil?: string;
  amount?: number;
  status?: string;
  tax1?: number;
  tax2?: number;
  note?: string;
  items?: Array<{ name?: string; description?: string; quantity?: number; rate?: number }>;
};

export default function ContractDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const [row, setRow] = useState<ContractDoc | null>(null);
  const [projects, setProjects] = useState<ProjectDoc[]>([]);
  const [items, setItems] = useState<Array<{ name?: string; description?: string; quantity?: number; rate?: number }>>([]);
  const [editorNote, setEditorNote] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [itName, setItName] = useState("");
  const [itDesc, setItDesc] = useState("");
  const [itQty, setItQty] = useState("1");
  const [itRate, setItRate] = useState("0");

  const [editOpen, setEditOpen] = useState(false);
  const [eTitle, setETitle] = useState("");
  const [eClient, setEClient] = useState("");
  const [eProjectId, setEProjectId] = useState("-");
  const [eContractDate, setEContractDate] = useState("");
  const [eValidUntil, setEValidUntil] = useState("");
  const [eTax1, setETax1] = useState("0");
  const [eTax2, setETax2] = useState("0");
  const [eAmount, setEAmount] = useState("0");
  const [eNote, setENote] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/contracts/${id}`);
        if (!r.ok) return;
        const d = await r.json();
        setRow(d);
        setItems(Array.isArray(d.items) ? d.items : []);
        setEditorNote(d?.note || "");
      } catch {}
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/projects`);
        if (!r.ok) return;
        const d = await r.json();
        setProjects(Array.isArray(d) ? d : []);
      } catch {}
    })();
  }, []);

  const projectTitle = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p._id, p.title || "-"));
    return map;
  }, [projects]);

  const subTotal = useMemo(() => (items || []).reduce((a, it) => a + (Number(it.quantity || 0) * Number(it.rate || 0)), 0), [items]);
  const tax1 = (Number(row?.tax1 || 0) / 100) * subTotal;
  const tax2 = (Number(row?.tax2 || 0) / 100) * subTotal;
  const grandTotal = subTotal + tax1 + tax2;

  const saveItems = async (nextItems: ContractDoc["items"]) => {
    try {
      const amount = (nextItems || []).reduce((a: number, it: any) => a + (Number(it.quantity || 0) * Number(it.rate || 0)), 0);
      const res = await fetch(`${API_BASE}/api/contracts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: nextItems, amount }) });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || "Failed to save items");
      setRow(d);
      setItems(Array.isArray(d.items) ? d.items : (nextItems || []));
      toast.success("Saved items");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save items");
    }
  };

  const saveEditorNote = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/contracts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: editorNote || "" }) });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || "Failed to save editor");
      setRow(d);
      toast.success("Contract updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save editor");
    }
  };

  const openAddItem = () => {
    setEditingIndex(null);
    setItName(""); setItDesc(""); setItQty("1"); setItRate("0");
    setAddOpen(true);
  };

  const openEditItem = (idx: number) => {
    const it = (items || [])[idx] || {};
    setEditingIndex(idx);
    setItName(it.name || "");
    setItDesc(it.description || "");
    setItQty(String(it.quantity ?? 1));
    setItRate(String(it.rate ?? 0));
    setAddOpen(true);
  };

  const deleteItem = async (idx: number) => {
    if (!confirm("Delete this item?")) return;
    const next = (items || []).filter((_, i) => i !== idx);
    await saveItems(next);
  };

  const saveItem = async () => {
    const q = Number(itQty || 0);
    const r = Number(itRate || 0);
    const nextItem = { name: itName || "Item", description: itDesc || undefined, quantity: q, rate: r };
    const next = [...(items || [])];
    if (editingIndex == null) next.unshift(nextItem); else next[editingIndex] = nextItem;
    await saveItems(next);
    setAddOpen(false);
    setEditingIndex(null);
  };

  const editDialogOpen = () => {
    if (!row) return;
    setETitle(row.title || "");
    setEClient(row.client || "");
    setEProjectId(row.projectId || "-");
    setEContractDate(row.contractDate ? new Date(row.contractDate).toISOString().slice(0,10) : "");
    setEValidUntil(row.validUntil ? new Date(row.validUntil).toISOString().slice(0,10) : "");
    setETax1(String(row.tax1 ?? 0));
    setETax2(String(row.tax2 ?? 0));
    setEAmount(String(row.amount ?? 0));
    setENote(row.note || "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    try {
      const payload: any = {
        title: eTitle || undefined,
        client: eClient || undefined,
        projectId: eProjectId !== "-" ? eProjectId : undefined,
        contractDate: eContractDate ? new Date(eContractDate) : undefined,
        validUntil: eValidUntil ? new Date(eValidUntil) : undefined,
        tax1: Number(eTax1 || 0),
        tax2: Number(eTax2 || 0),
        amount: Number(eAmount || 0),
        note: eNote || undefined,
      };
      const res = await fetch(`${API_BASE}/api/contracts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || "Failed to save");
      setRow(d);
      setEditOpen(false);
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  };

  const patchStatus = async (status: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/contracts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || "Failed to update status");
      setRow(d);
      toast.success(`Marked as ${status}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update status");
    }
  };

  const cloneContract = async () => {
    try {
      if (!row) return;
      const payload: any = { ...row };
      delete payload._id; delete payload.id; delete payload.createdAt; delete payload.updatedAt;
      const r = await fetch(`${API_BASE}/api/contracts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "Failed to clone");
      toast.success("Contract cloned");
      navigate(`/sales/contracts/${d._id}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to clone");
    }
  };

  const deleteContract = async () => {
    if (!confirm("Delete this contract?")) return;
    try {
      const r = await fetch(`${API_BASE}/api/contracts/${id}`, { method: "DELETE" });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "Failed to delete");
      toast.success("Deleted");
      navigate("/sales/contracts");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    }
  };

  const openPreview = () => {
    window.open(`/sales/contracts/${id}/preview`, "_blank", "noopener,noreferrer");
  };

  const openPrintWindow = (mode: "print" | "pdf") => {
    const url = `${window.location.origin}/sales/contracts/${id}/preview?print=1&mode=${mode}`;
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) w.focus();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">CONTRACT: {row?.title || '-'}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">Actions <ChevronDown className="w-4 h-4 ml-2"/></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={openPreview}><FileText className="w-4 h-4 mr-2"/>Contract preview</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openPrintWindow("pdf")}><Download className="w-4 h-4 mr-2"/>Download PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openPrintWindow("print")}><Printer className="w-4 h-4 mr-2"/>Print contract</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/sales/contracts/${id}/preview`).then(()=>toast.success("URL copied"))}><Copy className="w-4 h-4 mr-2"/>Contract URL</DropdownMenuItem>
            <DropdownMenuItem onClick={editDialogOpen}><Edit3 className="w-4 h-4 mr-2"/>Edit contract</DropdownMenuItem>
            <DropdownMenuItem onClick={cloneContract}>Clone contract</DropdownMenuItem>
            <DropdownMenuItem onClick={()=>patchStatus("Accepted")}>Mark as Accepted</DropdownMenuItem>
            <DropdownMenuItem onClick={()=>patchStatus("Rejected")}>Mark as Rejected</DropdownMenuItem>
            <DropdownMenuItem onClick={()=>patchStatus("Sent")}>Mark as Sent</DropdownMenuItem>
            <DropdownMenuItem onClick={deleteContract} className="text-red-600 focus:text-red-600">Delete contract</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-0">
            <Tabs defaultValue="items">
              <TabsList>
                <TabsTrigger value="items">Contract Items</TabsTrigger>
                <TabsTrigger value="editor">Contract Editor</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="items">
                <Card className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Client</div>
                      <div className="font-medium">{row?.client || '-'}</div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>Contract date: {row?.contractDate ? new Date(row.contractDate).toISOString().slice(0,10) : '-'}</div>
                      <div>Valid until: {row?.validUntil ? new Date(row.validUntil).toISOString().slice(0,10) : '-'}</div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Item</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">No record found.</TableCell>
                          </TableRow>
                        ) : (
                          items.map((it, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <div className="font-medium">{it.name}</div>
                                {it.description ? (
                                  <div className="text-xs text-muted-foreground">{it.description}</div>
                                ) : null}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{it.quantity}</TableCell>
                              <TableCell className="whitespace-nowrap">Rs.{Number(it.rate || 0).toLocaleString()}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-between gap-3">
                                  <div>Rs.{Number((Number(it.quantity||0) * Number(it.rate||0)) || 0).toLocaleString()}</div>
                                  <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => openEditItem(idx)}>Edit</Button>
                                    <Button size="sm" variant="destructive" onClick={() => deleteItem(idx)}>Delete</Button>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    <div className="mt-3">
                      <Button variant="outline" size="sm" onClick={openAddItem}>+ Add item</Button>
                      <Button variant="outline" size="sm" className="ml-2" onClick={() => window.location.reload()}><RefreshCw className="w-4 h-4 mr-2"/>Refresh</Button>
                    </div>

                    <div className="mt-4">
                      <div className="ml-auto w-full sm:w-80">
                        <div className="flex items-center justify-between py-1">
                          <div className="text-muted-foreground">Sub Total</div>
                          <div>Rs.{subTotal.toLocaleString()}</div>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <div className="text-muted-foreground">Tax ({row?.tax1 || 0}%)</div>
                          <div>Rs.{tax1.toLocaleString()}</div>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <div className="text-muted-foreground">Tax ({row?.tax2 || 0}%)</div>
                          <div>Rs.{tax2.toLocaleString()}</div>
                        </div>
                        <div className="mt-1 border rounded overflow-hidden text-sm">
                          <div className="flex">
                            <div className="flex-1 px-3 py-2 font-medium">Total</div>
                            <div className="px-3 py-2 bg-primary text-primary-foreground font-semibold">Rs.{grandTotal.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="editor">
                <Card className="p-6">
                  <div className="text-sm text-muted-foreground mb-2">Contract Editor</div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-xs text-muted-foreground">Insert:</span>
                    {[
                      { k: "{{client}}", t: "Client" },
                      { k: "{{project}}", t: "Project" },
                      { k: "{{contract_date}}", t: "Contract date" },
                      { k: "{{valid_until}}", t: "Valid until" },
                      { k: "{{subtotal}}", t: "Sub Total" },
                      { k: "{{tax1}}", t: "Tax1" },
                      { k: "{{tax2}}", t: "Tax2" },
                      { k: "{{total}}", t: "Total" },
                    ].map((b) => (
                      <Button key={b.k} type="button" size="sm" variant="outline" onClick={() => setEditorNote((v)=> (v ? v + " " + b.k : b.k))}>{b.t}</Button>
                    ))}
                  </div>
                  <Textarea className="min-h-[260px]" placeholder="Write contract terms (supports placeholders like {{client}}, {{total}})..." value={editorNote} onChange={(e)=>setEditorNote(e.target.value)} />
                  <div className="mt-3 flex items-center justify-end">
                    <Button onClick={saveEditorNote}>Save</Button>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="preview">
                <Card className="p-2">
                  <iframe title="Contract Preview" src={`/sales/contracts/${id}/preview`} className="w-full h-[80vh] border-0 rounded" />
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Project</div>
              <div className="font-medium">{row?.projectId ? (projectTitle.get(row.projectId!) || '-') : '-'}</div>
              <div className="mt-4 text-sm text-muted-foreground">Status</div>
              <div className="text-sm">{row?.status || 'Open'}</div>
              <div className="mt-4 text-sm text-muted-foreground">Note</div>
              <div className="text-sm whitespace-pre-wrap">{row?.note || '-'}</div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <Card className="p-6 text-sm text-muted-foreground">No tasks linked.</Card>
        </TabsContent>
      </Tabs>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card max-w-2xl">
          <DialogHeader><DialogTitle>Add item</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Item</div>
            <div className="sm:col-span-9"><Input placeholder="Item" value={itName} onChange={(e)=>setItName(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Description</div>
            <div className="sm:col-span-9"><Textarea placeholder="Description" value={itDesc} onChange={(e)=>setItDesc(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Quantity</div>
            <div className="sm:col-span-9"><Input placeholder="Quantity" value={itQty} onChange={(e)=>setItQty(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Rate</div>
            <div className="sm:col-span-9"><Input placeholder="Rate" value={itRate} onChange={(e)=>setItRate(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setAddOpen(false)}>Close</Button>
            <Button onClick={saveItem}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card max-w-2xl">
          <DialogHeader><DialogTitle>Edit contract</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Title</div>
            <div className="sm:col-span-9"><Input placeholder="Title" value={eTitle} onChange={(e)=>setETitle(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Client</div>
            <div className="sm:col-span-9"><Input placeholder="Client" value={eClient} onChange={(e)=>setEClient(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Project</div>
            <div className="sm:col-span-9">
              <Select value={eProjectId} onValueChange={setEProjectId}>
                <SelectTrigger><SelectValue placeholder="Project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">Project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p._id} value={p._id}>{p.title || '-'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Contract date</div>
            <div className="sm:col-span-9"><Input type="date" value={eContractDate} onChange={(e)=>setEContractDate(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Valid until</div>
            <div className="sm:col-span-9"><Input type="date" value={eValidUntil} onChange={(e)=>setEValidUntil(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Tax</div>
            <div className="sm:col-span-9"><Input type="number" value={eTax1} onChange={(e)=>setETax1(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Second Tax</div>
            <div className="sm:col-span-9"><Input type="number" value={eTax2} onChange={(e)=>setETax2(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Amount</div>
            <div className="sm:col-span-9"><Input type="number" value={eAmount} onChange={(e)=>setEAmount(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Note</div>
            <div className="sm:col-span-9"><Textarea placeholder="Note" value={eNote} onChange={(e)=>setENote(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setEditOpen(false)}>Close</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
