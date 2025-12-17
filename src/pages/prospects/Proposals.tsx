import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { Search, Plus, RefreshCw, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

const API_BASE = "http://localhost:5000";

type Row = {
  id: string;
  title: string;
  client: string;
  proposalDate: string;
  validUntil: string;
  amount: number;
  status: string;
  note: string;
};

const shortId = (id: string) => {
  const s = String(id || "");
  if (!s) return "-";
  return s.length <= 8 ? s : `${s.slice(0, 8)}…`;
};

export default function Proposals() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("-");
  const [openAdd, setOpenAdd] = useState(false);

  const [rows, setRows] = useState<Row[]>([]);

  const [proposalDate, setProposalDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [client, setClient] = useState("");
  const [title, setTitle] = useState("");
  const [tax1, setTax1] = useState("0");
  const [tax2, setTax2] = useState("0");
  const [note, setNote] = useState("");

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`${API_BASE}/api/proposals?${params.toString()}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to load proposals");
      const mapped: Row[] = (Array.isArray(data) ? data : []).map((d: any) => ({
        id: String(d._id || ""),
        title: d.title || "-",
        client: d.client || "-",
        proposalDate: d.proposalDate ? new Date(d.proposalDate).toISOString().slice(0, 10) : "-",
        validUntil: d.validUntil ? new Date(d.validUntil).toISOString().slice(0, 10) : "-",
        amount: Number(d.amount || 0),
        status: d.status || "draft",
        note: d.note || "",
      }));
      setRows(mapped);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load proposals");
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      load();
    }, 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const filteredRows = useMemo(() => {
    let out = rows;
    if (status && status !== "-") {
      out = out.filter((r) => String(r.status || "").toLowerCase() === String(status).toLowerCase());
    }
    return out;
  }, [rows, status]);

  const openNew = () => {
    setProposalDate("");
    setValidUntil("");
    setClient("");
    setTitle("");
    setTax1("0");
    setTax2("0");
    setNote("");
    setOpenAdd(true);
  };

  const save = async () => {
    try {
      const payload: any = {
        client: client || "",
        title: title || "",
        proposalDate: proposalDate ? new Date(proposalDate).toISOString() : undefined,
        validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
        tax1: Number(tax1 || 0),
        tax2: Number(tax2 || 0),
        note: note || "",
      };
      const res = await fetch(`${API_BASE}/api/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || "Failed to add proposal");
      toast.success("Proposal created");
      setOpenAdd(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to add proposal");
    }
  };

  const deleteRow = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/proposals/${id}`, { method: "DELETE" });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || "Failed");
      toast.success("Proposal deleted");
      setRows((p) => p.filter((x) => x.id !== id));
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete proposal");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Proposals</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Excel</Button>
          <Button variant="outline" size="sm">Print</Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
          </div>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild><Button variant="outline" size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-2"/>Add proposal</Button></DialogTrigger>
            <DialogContent className="bg-card max-w-2xl">
              <DialogHeader><DialogTitle>Add proposal</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Proposal date</div>
                <div className="sm:col-span-9"><Input type="date" placeholder="Proposal date" value={proposalDate} onChange={(e)=>setProposalDate(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Valid until</div>
                <div className="sm:col-span-9"><Input type="date" placeholder="Valid until" value={validUntil} onChange={(e)=>setValidUntil(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Client/Lead</div>
                <div className="sm:col-span-9"><Input placeholder="Client/Lead" value={client} onChange={(e)=>setClient(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Title</div>
                <div className="sm:col-span-9"><Input placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">TAX</div>
                <div className="sm:col-span-9"><Input type="number" value={tax1} onChange={(e)=>setTax1(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Second TAX</div>
                <div className="sm:col-span-9"><Input type="number" value={tax2} onChange={(e)=>setTax2(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Note</div>
                <div className="sm:col-span-9"><Textarea placeholder="Note" className="min-h-[96px]" value={note} onChange={(e)=>setNote(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <div className="w-full flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={()=>setOpenAdd(false)}>Close</Button>
                  <Button onClick={save}>Save</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="icon">▦</Button>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Status -" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Status -</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" className="w-44" placeholder="Last email seen" />
              <Input type="date" className="w-44" placeholder="Last preview seen" />
              <Button variant="outline" size="sm">Monthly</Button>
              <Button variant="outline" size="sm">Yearly</Button>
              <Button variant="outline" size="sm">Custom</Button>
              <Button variant="outline" size="sm">Dynamic</Button>
              <div className="inline-flex items-center gap-2">
                <Button variant="outline" size="icon"><ChevronLeft className="w-4 h-4"/></Button>
                <span className="text-sm text-muted-foreground">December 2025</span>
                <Button variant="outline" size="icon"><ChevronRight className="w-4 h-4"/></Button>
                <Button variant="success" size="icon" onClick={load}><RefreshCw className="w-4 h-4"/></Button>
              </div>
            </div>
            <div />
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Proposal</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Proposal date</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length ? (
                filteredRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{shortId(r.id)}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.client}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.proposalDate}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.validUntil}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.amount.toLocaleString()}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.status}</TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => deleteRow(r.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
