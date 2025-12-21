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

type Payment = { _id: string; clientId?: string; client?: string; invoiceId?: string; amount?: number; date?: string };
type Client = { _id: string; name?: string; company?: string; person?: string };
type Order = { _id: string; clientId?: string; client?: string; amount?: number; orderDate?: string };
type Contract = { _id: string; clientId?: string; client?: string; amount?: number; contractDate?: string; tax1?: number; tax2?: number };
type Expense = { _id: string; clientId?: string; amount?: number; tax?: number; tax2?: number; date?: string };

export default function InvoicesSummary() {
  const [currency, setCurrency] = useState("PKR");
  const [query, setQuery] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const [invRes, payRes, cliRes, ordRes, conRes, expRes] = await Promise.all([
        fetch(`${API_BASE}/api/invoices`),
        fetch(`${API_BASE}/api/payments`),
        fetch(`${API_BASE}/api/clients`),
        fetch(`${API_BASE}/api/orders`),
        fetch(`${API_BASE}/api/contracts`),
        fetch(`${API_BASE}/api/expenses`),
      ]);
      const invData = invRes.ok ? await invRes.json() : [];
      const payData = payRes.ok ? await payRes.json() : [];
      const cliData = cliRes.ok ? await cliRes.json() : [];
      const ordData = ordRes.ok ? await ordRes.json() : [];
      const conData = conRes.ok ? await conRes.json() : [];
      setInvoices(Array.isArray(invData) ? invData : []);
      setPayments(Array.isArray(payData) ? payData : []);
      setClients(Array.isArray(cliData) ? cliData : []);
      setOrders(Array.isArray(ordData) ? ordData : []);
      setContracts(Array.isArray(conData) ? conData : []);
      const expData = expRes.ok ? await expRes.json() : [];
      setExpenses(Array.isArray(expData) ? expData : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const clientNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clients) {
      const name = (c.name || c.company || c.person || "-").toString();
      m.set(String(c._id), name);
    }
    return m;
  }, [clients]);

  const invById = useMemo(() => {
    const m = new Map<string, Invoice>();
    for (const i of invoices) {
      if (i?._id) m.set(String(i._id), i);
    }
    return m;
  }, [invoices]);

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
    // Payments aggregation per client (resolve via invoice when needed)
    const inYearPay = payments.filter((p) => !y || invYear(p.date as any) === y);
    for (const p of inYearPay) {
      const inv = p.invoiceId ? invById.get(String(p.invoiceId)) : undefined;
      const resolvedClientId = (p.clientId || inv?.clientId) ? String(p.clientId || inv?.clientId) : undefined;
      const resolvedClient = (p.client || inv?.client || "-");
      const key = resolvedClientId || resolvedClient;
      const row = grp.get(key) || { client: resolvedClient, clientId: resolvedClientId, count: 0, total: 0, tax1: 0, tax2: 0, tds: 0, paid: 0 };
      row.paid += Number(p.amount || 0);
      grp.set(key, row);
    }
    return Array.from(grp.values()).sort((a, b) => b.total - a.total);
  }, [invoices, payments, year, query]);

  const ordersAgg = useMemo(() => {
    const y = Number(year);
    const matches = (s: string) => (s || "").toLowerCase().includes(query.trim().toLowerCase());
    const getYear = (dt?: string) => { if (!dt) return NaN; const d = new Date(dt); return d.getFullYear(); };
    const grp = new Map<string, { client: string; clientId?: string; count: number; amount: number }>();
    const inYear = orders.filter(o => !y || getYear(o.orderDate as any) === y);
    const flt = inYear.filter(o => !query || matches(o.client || ""));
    for (const o of flt) {
      const key = o.clientId || o.client || "-";
      const row = grp.get(key) || { client: o.client || "-", clientId: o.clientId, count: 0, amount: 0 };
      row.count += 1;
      row.amount += Number(o.amount || 0);
      grp.set(key, row);
    }
    return Array.from(grp.values()).sort((a,b)=>b.amount-a.amount);
  }, [orders, year, query]);

  const contractsAgg = useMemo(() => {
    const y = Number(year);
    const matches = (s: string) => (s || "").toLowerCase().includes(query.trim().toLowerCase());
    const getYear = (dt?: string) => { if (!dt) return NaN; const d = new Date(dt); return d.getFullYear(); };
    const grp = new Map<string, { client: string; clientId?: string; count: number; amount: number; tax1: number; tax2: number }>();
    const inYear = contracts.filter(c => !y || getYear(c.contractDate as any) === y);
    const flt = inYear.filter(c => !query || matches(c.client || ""));
    for (const c of flt) {
      const key = c.clientId || c.client || "-";
      const row = grp.get(key) || { client: c.client || "-", clientId: c.clientId, count: 0, amount: 0, tax1: 0, tax2: 0 };
      row.count += 1;
      row.amount += Number(c.amount || 0);
      // Contracts tax percentages accumulate as absolute values from amount base if needed by report
      const base = Number(c.amount || 0);
      row.tax1 += base * (Number(c.tax1 || 0) / 100);
      row.tax2 += base * (Number(c.tax2 || 0) / 100);
      grp.set(key, row);
    }
    return Array.from(grp.values()).sort((a,b)=>b.amount-a.amount);
  }, [contracts, year, query]);

  const expensesAgg = useMemo(() => {
    const y = Number(year);
    const getYear = (dt?: string) => { if (!dt) return NaN; const d = new Date(dt); return d.getFullYear(); };
    const grp = new Map<string, { clientId?: string; amount: number; tax: number; tax2: number }>();
    const inYear = expenses.filter(e => !y || getYear(e.date as any) === y);
    for (const e of inYear) {
      const key = e.clientId ? String(e.clientId) : "-";
      const row = grp.get(key) || { clientId: e.clientId ? String(e.clientId) : undefined, amount: 0, tax: 0, tax2: 0 };
      row.amount += Number(e.amount || 0);
      row.tax += Number(e.tax || 0);
      row.tax2 += Number(e.tax2 || 0);
      grp.set(key, row);
    }
    return Array.from(grp.values()).sort((a,b)=> b.amount - a.amount);
  }, [expenses, year]);

  const itemsAgg = useMemo(() => {
    type Row = { name: string; qty: number; amount: number };
    const byName = new Map<string, Row>();
    // From invoices
    for (const inv of invoices) {
      const list: any[] = Array.isArray((inv as any).items) ? (inv as any).items : [];
      for (const it of list) {
        const name = String(it.name || it.title || "-");
        const qty = Number(it.quantity ?? it.qty ?? 0);
        const rate = Number(it.rate ?? 0);
        const amt = qty * rate;
        const row = byName.get(name) || { name, qty: 0, amount: 0 };
        row.qty += qty;
        row.amount += amt;
        byName.set(name, row);
      }
    }
    // From orders
    for (const ord of orders) {
      const list: any[] = Array.isArray((ord as any).items) ? (ord as any).items : [];
      for (const it of list) {
        const name = String(it.name || "-");
        const qty = Number(it.quantity ?? 0);
        const rate = Number(it.rate ?? 0);
        const amt = qty * rate;
        const row = byName.get(name) || { name, qty: 0, amount: 0 };
        row.qty += qty;
        row.amount += amt;
        byName.set(name, row);
      }
    }
    return Array.from(byName.values()).sort((a,b)=> b.amount - a.amount).slice(0, 20);
  }, [invoices, orders]);

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
                  const display = r.clientId && clientNameById.get(String(r.clientId)) ? clientNameById.get(String(r.clientId))! : r.client;
                  return (
                    <TableRow key={`${r.clientId || r.client}`}>
                      <TableCell className="whitespace-nowrap">{display}</TableCell>
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

      {/* Orders summary (sales module) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">Orders summary</div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Client</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersAgg.length ? (
                ordersAgg.map((r) => {
                  const display = r.clientId && clientNameById.get(String(r.clientId)) ? clientNameById.get(String(r.clientId))! : r.client;
                  return (
                    <TableRow key={`${r.clientId || r.client}`}>
                      <TableCell className="whitespace-nowrap">{display}</TableCell>
                      <TableCell>{r.count}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Contracts summary (sales module) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">Contracts summary</div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Client</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>TAX</TableHead>
                <TableHead>Second TAX</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractsAgg.length ? (
                contractsAgg.map((r) => {
                  const display = r.clientId && clientNameById.get(String(r.clientId)) ? clientNameById.get(String(r.clientId))! : r.client;
                  return (
                    <TableRow key={`${r.clientId || r.client}`}>
                      <TableCell className="whitespace-nowrap">{display}</TableCell>
                      <TableCell>{r.count}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.amount.toLocaleString()}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.tax1.toLocaleString()}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.tax2.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Expenses by client (sales module) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">Expenses by client</div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>TAX</TableHead>
                <TableHead>Second TAX</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expensesAgg.length ? (
                expensesAgg.map((r) => {
                  const display = r.clientId && clientNameById.get(String(r.clientId)) ? clientNameById.get(String(r.clientId))! : "-";
                  return (
                    <TableRow key={`${r.clientId || '-'}`}>
                      <TableCell className="whitespace-nowrap">{display}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.amount.toLocaleString()}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.tax.toLocaleString()}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.tax2.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top items (invoices + orders) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">Top items (invoices + orders)</div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsAgg.length ? (
                itemsAgg.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="whitespace-nowrap">{r.name}</TableCell>
                    <TableCell>{r.qty}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
