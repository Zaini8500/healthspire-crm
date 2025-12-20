import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import ReportsNav from "../ReportsNav";
import { toast } from "@/components/ui/sonner";

const API_BASE = "http://localhost:5000";

type Invoice = {
  _id: string;
  clientId?: string;
  client?: string;
  amount?: number;
  issueDate?: string;
  tax1?: number;
  tax2?: number;
  tds?: number;
};

type Payment = { _id: string; clientId?: string; client?: string; amount?: number; date?: string };

export default function InvoicesSummary() {
  const [currency, setCurrency] = useState("PKR");
  const [query, setQuery] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const [invRes, payRes] = await Promise.all([
        fetch(`${API_BASE}/api/invoices`),
        fetch(`${API_BASE}/api/payments`),
      ]);
      const invData = invRes.ok ? await invRes.json() : [];
      const payData = payRes.ok ? await payRes.json() : [];
      setInvoices(Array.isArray(invData) ? invData : []);
      setPayments(Array.isArray(payData) ? payData : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredAgg = useMemo(() => {
    // Filter by year and query, aggregate per client
    const y = Number(year);
    const matches = (s: string) => (s || "").toLowerCase().includes(query.trim().toLowerCase());
    const invYear = (dt?: string) => {
      if (!dt) return NaN;
      const d = new Date(dt);
      return d.getFullYear();
    };
    const grp = new Map<string, { client: string; clientId?: string; count: number; total: number; tax1: number; tax2: number; tds: number; paid: number }>();
    const inYearInv = invoices.filter((i) => !y || invYear(i.issueDate as any) === y);
    const invFiltered = inYearInv.filter((i) => !query || matches(i.client || ""));
    for (const i of invFiltered) {
      const key = i.clientId || i.client || "-";
      const row = grp.get(key) || { client: i.client || "-", clientId: i.clientId, count: 0, total: 0, tax1: 0, tax2: 0, tds: 0, paid: 0 };
      row.count += 1;
      row.total += Number(i.amount || 0);
      const base = Number(i.amount || 0);
      row.tax1 += base * (Number(i.tax1 || 0) / 100);
      row.tax2 += base * (Number(i.tax2 || 0) / 100);
      row.tds += Number(i.tds || 0);
      grp.set(key, row);
    }
    // Payments aggregation per client
    const inYearPay = payments.filter((p) => !y || invYear(p.date as any) === y);
    for (const p of inYearPay) {
      const key = p.clientId || p.client || "-";
      const row = grp.get(key) || { client: p.client || "-", clientId: p.clientId, count: 0, total: 0, tax1: 0, tax2: 0, tds: 0, paid: 0 };
      row.paid += Number(p.amount || 0);
      grp.set(key, row);
    }
    return Array.from(grp.values()).sort((a, b) => b.total - a.total);
  }, [invoices, payments, year, query]);

  const exportCSV = () => {
    const header = ["Client","Count","Invoice total","Tax A","Tax B","TDS","Payment received","Due"];
    const rows = filteredAgg.map(r => [r.client, r.count, r.total, r.tax1, r.tax2, r.tds, r.paid, Math.max(0, r.total + r.tax1 + r.tax2 - r.paid - r.tds)]);
    const csv = [header, ...rows].map(row => row.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `invoices_summary_${year}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const printTable = () => {
    const w = window.open("", "_blank"); if (!w) return;
    const rowsHtml = filteredAgg.map((r) => `<tr>
      <td>${r.client}</td>
      <td>${r.count}</td>
      <td>${r.total.toLocaleString()}</td>
      <td>${r.tax1.toLocaleString()}</td>
      <td>${r.tax2.toLocaleString()}</td>
      <td>${r.tds.toLocaleString()}</td>
      <td>${r.paid.toLocaleString()}</td>
      <td>${Math.max(0, r.total + r.tax1 + r.tax2 - r.paid - r.tds).toLocaleString()}</td>
    </tr>`).join("");
    w.document.write(`<!doctype html><html><head><title>Invoices summary ${year}</title></head><body>
      <h3>Invoices summary (${year})</h3>
      <table border="1" cellspacing="0" cellpadding="6">
        <thead><tr><th>Client</th><th>Count</th><th>Invoice total</th><th>Tax A</th><th>Tax B</th><th>TDS</th><th>Payment received</th><th>Due</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body></html>`);
    w.document.close(); w.focus(); w.print(); w.close();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Invoices summary</h1>
      </div>
      <ReportsNav />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-28"><SelectValue placeholder="Currency"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PKR">PKR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
              <div className="inline-flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={()=>setYear(y=>y-1)}><ChevronLeft className="w-4 h-4"/></Button>
                <span className="text-sm text-muted-foreground">{year}</span>
                <Button variant="outline" size="icon" onClick={()=>setYear(y=>y+1)}><ChevronRight className="w-4 h-4"/></Button>
                <Button variant="success" size="icon" onClick={load}><RefreshCw className="w-4 h-4"/></Button>
              </div>
              <Button variant="outline" size="sm">Yearly</Button>
              <Button variant="outline" size="sm" disabled>Monthly</Button>
              <Button variant="outline" size="sm" disabled>Custom</Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV}>Excel</Button>
              <Button variant="outline" size="sm" onClick={printTable}>Print</Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Client</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Invoice total</TableHead>
                <TableHead>TAX</TableHead>
                <TableHead>Second TAX</TableHead>
                <TableHead>TDS</TableHead>
                <TableHead>Payment Received</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filteredAgg.length ? (
                filteredAgg.map((r) => {
                  const due = Math.max(0, r.total + r.tax1 + r.tax2 - r.paid - r.tds);
                  return (
                    <TableRow key={`${r.clientId || r.client}`}>
                      <TableCell className="whitespace-nowrap">{r.client}</TableCell>
                      <TableCell>{r.count}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.total.toLocaleString()}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.tax1.toLocaleString()}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.tax2.toLocaleString()}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.tds.toLocaleString()}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.paid.toLocaleString()}</TableCell>
                      <TableCell className="whitespace-nowrap font-medium">{due.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
