import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import { ChevronDown, Download, Printer, FileText, Copy, Mail, MessageCircle } from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth";

const API_BASE = "http://localhost:5000";

export default function EstimateDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);
  const [openReminder, setOpenReminder] = useState(false);
  const [remTitle, setRemTitle] = useState("");
  const [remDueAt, setRemDueAt] = useState("");
  const [remRepeat, setRemRepeat] = useState(false);
  const [reminderEditingId, setReminderEditingId] = useState("");
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [infoName, setInfoName] = useState("");
  const [infoAddress, setInfoAddress] = useState("");
  const [infoPhone, setInfoPhone] = useState("");
  const [infoEmail, setInfoEmail] = useState("");
  const [infoWebsite, setInfoWebsite] = useState("");
  const [infoTaxId, setInfoTaxId] = useState("");
  const [infoLogo, setInfoLogo] = useState("");
  const [paymentInfo, setPaymentInfo] = useState("");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState<string>("1");
  const [unitType, setUnitType] = useState("");
  const [rate, setRate] = useState<string>("0");
  // signature source with fallbacks
  const signatureCandidates = [
    "/signature.png",
    "/signature.jpg",
    "/signature.jpeg",
    "/signature.webp",
    "/signature.svg",
  ];
  const [sigSrc, setSigSrc] = useState(signatureCandidates[0]);
  const handleSigError = () => {
    const idx = signatureCandidates.indexOf(sigSrc);
    if (idx < signatureCandidates.length - 1) setSigSrc(signatureCandidates[idx + 1]);
  };

  const deleteEstimate = async () => {
    if (!confirm("Delete this estimate?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/estimates/${id}`, { method: "DELETE" });
      if (!res.ok) return toast.error("Failed to delete estimate");
      toast.success("Estimate deleted");
      navigate("/prospects/estimates");
    } catch {}
  };
  // edit fields
  const [eClient, setEClient] = useState("");
  const [eEstimateDate, setEEstimateDate] = useState("");
  const [eValidUntil, setEValidUntil] = useState("");
  const [eTax, setETax] = useState("");
  const [eTax2, setETax2] = useState("");
  const [eNote, setENote] = useState("");
  const [eAdvancedAmount, setEAdvancedAmount] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/estimates/${id}`);
        if (!res.ok) return;
        const d = await res.json();
        setRow(d);
        setItems(Array.isArray(d.items) ? d.items : []);
      } catch {}
    })();
  }, [id]);

  const estimateDbId = useMemo(() => String(row?._id || ""), [row?._id]);

  const loadReminders = async () => {
    if (!estimateDbId) return;
    try {
      const r = await fetch(`${API_BASE}/api/reminders?estimateId=${encodeURIComponent(estimateDbId)}`);
      if (r.ok) setReminders(await r.json());
    } catch {}
  };

  useEffect(() => {
    if (!estimateDbId) return;
    loadReminders();
  }, [estimateDbId]);

  const openAddReminder = () => {
    setReminderEditingId("");
    setRemTitle("");
    setRemDueAt("");
    setRemRepeat(false);
    setOpenReminder(true);
  };

  const openEditReminder = (r: any) => {
    setReminderEditingId(r?._id || "");
    setRemTitle(r?.title || "");
    setRemDueAt(r?.dueAt ? new Date(r.dueAt).toISOString().slice(0, 10) : "");
    setRemRepeat(Boolean(r?.repeat));
    setOpenReminder(true);
  };

  const handleSaveReminder = async () => {
    if (!estimateDbId) return;
    try {
      const payload = {
        estimateId: estimateDbId,
        title: remTitle,
        dueAt: remDueAt ? new Date(remDueAt) : undefined,
        repeat: remRepeat,
      };
      const method = reminderEditingId ? "PUT" : "POST";
      const url = reminderEditingId ? `${API_BASE}/api/reminders/${reminderEditingId}` : `${API_BASE}/api/reminders`;
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        setOpenReminder(false);
        await loadReminders();
      }
    } catch {}
  };

  const handleDeleteReminder = async (rid: string) => {
    if (!confirm("Delete this reminder?")) return;
    try {
      await fetch(`${API_BASE}/api/reminders/${rid}`, { method: "DELETE" });
      setReminders(reminders.filter((r) => r._id !== rid));
    } catch {}
  };

  useEffect(() => {
    if (!row) return;
    const b = row?.branding || {};
    setInfoName(b.name || "HealthSpire");
    setInfoAddress(b.address || "761/D2 Shah Jelani Rd Township Lahore");
    setInfoPhone(b.phone || "+92 312 7231875");
    setInfoEmail(b.email || "info@healthspire.org");
    setInfoWebsite(b.website || "www.healthspire.org");
    setInfoTaxId(b.taxId || "");
    setInfoLogo(b.logo || "/HealthSpire%20logo.png");
    setPaymentInfo(row?.paymentInfo || "");
  }, [row]);

  // auto-print if ?print=1
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("print") === "1") {
      setTimeout(() => window.print(), 300);
    }
  }, []);

  const subTotal = useMemo(() => items.reduce((a, it) => a + Number(it.total || (Number(it.quantity||0) * Number(it.rate||0))), 0), [items]);
  const taxAmount = useMemo(() => Math.round((Number(row?.tax||0)/100) * subTotal), [subTotal, row]);
  const tax2Amount = useMemo(() => Math.round((Number(row?.tax2||0)/100) * subTotal), [subTotal, row]);
  const grandTotal = subTotal + taxAmount + tax2Amount;

  const saveItems = async (nextItems: any[]) => {
    try {
      const amount = (nextItems || []).reduce((a: number, it: any) => a + Number(it.total || (Number(it.quantity||0) * Number(it.rate||0))), 0);
      const res = await fetch(`${API_BASE}/api/estimates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: nextItems, amount }),
      });
      if (!res.ok) return toast.error("Failed to save items");
      const d = await res.json();
      setRow(d);
      setItems(Array.isArray(d.items) ? d.items : nextItems);
    } catch {}
  };

  const addItem = async () => {
    const q = Number(quantity || 0);
    const r = Number(rate || 0);
    const nextItem = {
      item: itemName || "Item",
      description: description || undefined,
      quantity: q,
      unit: unitType || undefined,
      rate: r,
      total: q * r,
    } as any;

    const next = [...(items || [])];
    if (editingItemIndex == null) {
      next.unshift(nextItem);
    } else {
      next[editingItemIndex] = nextItem;
    }
    await saveItems(next);
    setAddOpen(false);
    setEditingItemIndex(null);
    setItemName(""); setDescription(""); setQuantity("1"); setUnitType(""); setRate("0");
  };

  const openAddItem = () => {
    setEditingItemIndex(null);
    setItemName(""); setDescription(""); setQuantity("1"); setUnitType(""); setRate("0");
    setAddOpen(true);
  };

  const openEditItem = (idx: number) => {
    const it = (items || [])[idx] || {};
    setEditingItemIndex(idx);
    setItemName(it.item || "");
    setDescription(it.description || "");
    setQuantity(String(it.quantity ?? 1));
    setUnitType(it.unit || "");
    setRate(String(it.rate ?? 0));
    setAddOpen(true);
  };

  const deleteItem = async (idx: number) => {
    if (!confirm("Delete this item?")) return;
    const next = (items || []).filter((_: any, i: number) => i !== idx);
    await saveItems(next);
  };

  const patchStatus = async (status: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/estimates/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!res.ok) return toast.error("Failed to update status");
      const d = await res.json();
      setRow(d);
      toast.success(`Marked as ${status}`);
    } catch {}
  };

  const cloneEstimate = async () => {
    try {
      if (!row) return;
      const payload = { ...row };
      delete (payload as any)._id; delete (payload as any).id; delete (payload as any).number; delete (payload as any).createdAt; delete (payload as any).updatedAt; 
      const res = await fetch(`${API_BASE}/api/estimates`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) return toast.error("Failed to clone estimate");
      const d = await res.json();
      toast.success("Estimate cloned");
      navigate(`/prospects/estimates/${d._id}`);
    } catch {}
  };

  const openEditInfo = () => {
    if (!row) return;
    const b = row?.branding || {};
    setInfoName(b.name || "HealthSpire");
    setInfoAddress(b.address || "761/D2 Shah Jelani Rd Township Lahore");
    setInfoPhone(b.phone || "+92 312 7231875");
    setInfoEmail(b.email || "info@healthspire.org");
    setInfoWebsite(b.website || "www.healthspire.org");
    setInfoTaxId(b.taxId || "");
    setInfoLogo(b.logo || "/HealthSpire%20logo.png");
    setPaymentInfo(row?.paymentInfo || "");
    setOpenInfo(true);
  };

  const saveEstimateInfo = async () => {
    try {
      const payload = {
        branding: {
          name: infoName,
          address: infoAddress,
          phone: infoPhone,
          email: infoEmail,
          website: infoWebsite,
          taxId: infoTaxId,
          logo: infoLogo,
        },
        paymentInfo,
      };
      const res = await fetch(`${API_BASE}/api/estimates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return toast.error("Failed to save estimate info");
      const d = await res.json();
      setRow(d);
      setOpenInfo(false);
      toast.success("Estimate info updated");
    } catch {}
  };

  // status ribbon style for document overlay
  const statusText = (row?.status && String(row.status)) || "Draft";
  const statusStyle = useMemo(() => {
    switch (statusText.toLowerCase()) {
      case "accepted":
        return "bg-purple-600 text-white";
      case "declined":
        return "bg-red-600 text-white";
      case "sent":
        return "bg-blue-600 text-white";
      case "draft":
      default:
        return "bg-gray-300 text-gray-700";
    }
  }, [statusText]);

  const openPreview = () => {
    window.open(`/prospects/estimates/${id}/preview`, "_blank", "noopener,noreferrer");
  };

  const openPrintWindow = (mode: "print" | "pdf") => {
    const url = `${window.location.origin}/prospects/estimates/${id}/preview?print=1&mode=${mode}`;
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) w.focus();
  };

  const sendToLead = async () => {
    try {
      const leadId = String(row?.leadId || "");
      if (!leadId) return toast.error("No lead linked to this estimate");
      const res = await fetch(`${API_BASE}/api/leads/${encodeURIComponent(leadId)}`, { headers: getAuthHeaders() });
      const lead = await res.json().catch(() => null);
      if (!res.ok) return toast.error(lead?.error || "Failed to load lead");
      const email = String(lead?.email || "").trim();
      if (!email) return toast.error("Lead email not found");

      const sp = new URLSearchParams();
      sp.set("share", "1");
      sp.set("channel", "email");
      sp.set("to", email);
      const url = `/prospects/estimates/${id}/preview?${sp.toString()}`;
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (w) w.focus();
    } catch {
      toast.error("Failed to open email");
    }
  };

  const openShareEstimate = async (channel: "email" | "whatsapp") => {
    try {
      const sp = new URLSearchParams();
      sp.set("share", "1");
      sp.set("channel", channel);
      const url = `/prospects/estimates/${id}/preview?${sp.toString()}`;
      // Must open synchronously to avoid popup blockers.
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (w) w.focus();
    } catch {}
  };

  const editDialogOpen = () => {
    if (!row) return;
    setEClient(row.client || "");
    setEEstimateDate(row.estimateDate ? new Date(row.estimateDate).toISOString().slice(0,10) : "");
    setEValidUntil(row.validUntil ? new Date(row.validUntil).toISOString().slice(0,10) : "");
    setETax(String(row.tax ?? ""));
    setETax2(String(row.tax2 ?? ""));
    setENote(row.note || "");
    setEAdvancedAmount(String(row.advancedAmount ?? ""));
    setEditOpen(true);
  };

  const saveEdit = async () => {
    try {
      const update: any = {
        client: eClient || undefined,
        estimateDate: eEstimateDate ? new Date(eEstimateDate) : undefined,
        validUntil: eValidUntil ? new Date(eValidUntil) : undefined,
        tax: eTax ? Number(eTax) : 0,
        tax2: eTax2 ? Number(eTax2) : 0,
        note: eNote || undefined,
        advancedAmount: eAdvancedAmount ? Number(eAdvancedAmount) : 0,
      };
      const res = await fetch(`${API_BASE}/api/estimates/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update) });
      if (!res.ok) return toast.error("Failed to save");
      const d = await res.json();
      setRow(d); setEditOpen(false); toast.success("Saved");
    } catch {}
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <style>{`
        @media print {
          @page { margin: 18mm; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          #estimate-print, #estimate-print * { visibility: visible !important; }
          #estimate-print {
            position: absolute; left: 0; top: 0; width: 100%;
            transform: scale(0.85);
            transform-origin: top left;
            -webkit-transform: scale(0.85);
            -webkit-transform-origin: top left;
          }
          .print-hidden { display: none !important; }
          #estimate-print .status-ribbon {
            z-index: 10000 !important;
            left: -6px !important;
            top: -6px !important;
            padding: 4px 10px !important;
            font-size: 9px !important;
            border-radius: 2px !important;
            box-shadow: none !important;
            transform: rotate(-45deg) !important;
            -webkit-transform: rotate(-45deg) !important;
          }
          #estimate-print .status-ribbon .ribbon-notch { display: none !important; }
        }
      `}</style>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">INVOICE ESTIMATE: {row?.number || "-"}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">Actions <ChevronDown className="w-4 h-4 ml-2"/></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={openPreview}><FileText className="w-4 h-4 mr-2"/>Preview</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openPrintWindow("pdf")}><Download className="w-4 h-4 mr-2"/>Download PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openPrintWindow("print")}><Printer className="w-4 h-4 mr-2"/>Print</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openShareEstimate("email")}><Mail className="w-4 h-4 mr-2"/>Email (auto PDF link)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openShareEstimate("whatsapp")}><MessageCircle className="w-4 h-4 mr-2"/>WhatsApp (auto PDF link)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/prospects/estimates/${id}/preview`).then(() => toast.success("URL copied"))}><Copy className="w-4 h-4 mr-2"/>Copy URL</DropdownMenuItem>
            <DropdownMenuItem onClick={openEditInfo}>Edit estimate info</DropdownMenuItem>
            <DropdownMenuItem onClick={editDialogOpen}>Edit estimate</DropdownMenuItem>
            <DropdownMenuItem onClick={cloneEstimate}>Clone Estimate</DropdownMenuItem>
            <DropdownMenuItem onClick={deleteEstimate} className="text-red-600 focus:text-red-600">Delete estimate</DropdownMenuItem>
            <DropdownMenuItem onClick={()=>patchStatus("Accepted")}>Mark as Accepted</DropdownMenuItem>
            <DropdownMenuItem onClick={()=>patchStatus("Declined")}>Mark as Declined</DropdownMenuItem>
            <DropdownMenuItem onClick={()=>patchStatus("Sent")}>Send to client</DropdownMenuItem>
            <DropdownMenuItem onClick={sendToLead}><Mail className="w-4 h-4 mr-2"/>Send to lead</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="details">Edit</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-0" id="estimate-print">
            <Card className="p-6 relative shadow-none border-none rounded-none overflow-visible">
              {/* Diagonal status ribbon styled like sample */}
              <div className={`status-ribbon absolute -left-3 -top-3 rotate-[-45deg] uppercase tracking-wide font-semibold text-[10px] px-4 py-[3px] shadow z-50 whitespace-nowrap ${statusStyle}`} style={{ borderRadius: 3 }}>
                {statusText}
                {/* small white triangle notch */}
                <div className="ribbon-notch absolute -left-[3px] -top-[3px]" style={{ width: 0, height: 0, borderLeft: '3px solid transparent', borderTop: '3px solid white' }} />
              </div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <img src="/HealthSpire%20logo.png" alt="HealthSpire" style={{ height: 56 }} />
                  <div>
                    <div className="font-semibold">HealthSpire</div>
                    <div className="text-sm text-muted-foreground">Gujranwala, Pakistan</div>
                    <div className="text-sm text-muted-foreground">Email: info@healthspire.com</div>
                    <div className="text-sm text-muted-foreground">Website: www.healthspire.com</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-[#00BFA6] text-white px-4 py-2 rounded">Estimate: {row?.number || '-'}</div>
                  <div className="mt-2 text-sm text-muted-foreground">Advanced Amount: {row?.advancedAmount || 0}</div>
                  <div className="text-sm text-muted-foreground">Estimate date: {row?.estimateDate ? new Date(row.estimateDate).toISOString().slice(0,10) : '-'}</div>
                  <div className="text-sm text-muted-foreground">Valid until: {row?.validUntil ? new Date(row.validUntil).toISOString().slice(0,10) : '-'}</div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-6">
                <div>
                  <div className="font-medium">Estimate To</div>
                  <div className="text-muted-foreground">{row?.client || '-'}</div>
                </div>
                <div />
              </div>

              <div className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#00BFA6]">
                      <TableHead className="text-white">Item</TableHead>
                      <TableHead className="text-white">Quantity</TableHead>
                      <TableHead className="text-white">Rate</TableHead>
                      <TableHead className="text-white">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">No record found.</TableCell>
                      </TableRow>
                    ) : (
                      items.map((it, idx) => (
                        <TableRow key={idx} className="border-b border-gray-200">
                          <TableCell>
                            <div className="font-medium">{it.item}</div>
                            {it.description ? (
                              <div className="text-xs text-muted-foreground">{it.description}</div>
                            ) : null}
                          </TableCell>
                          <TableCell>{it.quantity}</TableCell>
                          <TableCell>Rs.{Number(it.rate || 0).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-between gap-3">
                              <div>Rs.{Number(it.total || 0).toLocaleString()}</div>
                              <div className="flex items-center gap-2 print-hidden">
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

                <div className="mt-3 print-hidden">
                  <Button variant="outline" size="sm" onClick={openAddItem}>+ Add item</Button>
                </div>

                <div className="mt-4">
                  <div className="ml-auto w-full sm:w-80">
                    <div className="flex items-center justify-between py-1">
                      <div className="text-muted-foreground">Sub Total</div>
                      <div>Rs.{subTotal.toLocaleString()}</div>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div className="text-muted-foreground">Tax ({row?.tax || 0}%)</div>
                      <div>Rs.{taxAmount.toLocaleString()}</div>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div className="text-muted-foreground">Tax ({row?.tax2 || 0}%)</div>
                      <div>Rs.{tax2Amount.toLocaleString()}</div>
                    </div>
                    <div className="mt-1 border rounded overflow-hidden text-sm">
                      <div className="flex">
                        <div className="flex-1 px-3 py-2 font-medium">Total</div>
                        <div className="px-3 py-2 bg-[#00BFA6] text-white font-semibold">Rs.{grandTotal.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <div />
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Client:</div>
              <div className="font-medium">{row?.client || '-'}</div>
              <div className="mt-4 text-sm text-muted-foreground">Status:</div>
              <div><Badge variant={row?.status === 'Accepted' ? 'secondary' : 'outline'}>{row?.status || 'Draft'}</Badge></div>
              <div className="mt-4 text-sm text-muted-foreground">Last email sent:</div>
              <div className="text-sm">Never</div>
              <div className="mt-4 text-sm text-muted-foreground">Reminders (Private)</div>
              <div className="mt-2 space-y-2">
                {reminders.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No reminders.</div>
                ) : (
                  reminders.map((r) => (
                    <div key={r._id} className="rounded border bg-muted/20 p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{r.title || "(No title)"}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.dueAt ? new Date(r.dueAt).toISOString().slice(0, 10) : "No due date"}{r.repeat ? " • Repeat" : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openEditReminder(r)}>Edit</Button>
                          <Button size="sm" variant="destructive" className="h-7 px-2" onClick={() => handleDeleteReminder(r._id)}>Del</Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={openAddReminder} className="px-2 py-1 mt-2 rounded bg-purple-50 text-purple-700 hover:bg-purple-100">+ Add reminder</Button>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <Card className="p-2">
            <iframe
              title="Estimate Preview"
              src={`/prospects/estimates/${id}/preview`}
              className="w-full h-[80vh] border-0 rounded"
            />
          </Card>
        </TabsContent>

        <TabsContent value="reminders">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-2">Reminders (Private)</div>
            <div className="space-y-2">
              {reminders.length === 0 ? (
                <div className="text-xs text-muted-foreground">No reminders.</div>
              ) : (
                reminders.map((r) => (
                  <div key={r._id} className="rounded border bg-muted/20 p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{r.title || "(No title)"}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.dueAt ? new Date(r.dueAt).toISOString().slice(0, 10) : "No due date"}{r.repeat ? " • Repeat" : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openEditReminder(r)}>Edit</Button>
                        <Button size="sm" variant="destructive" className="h-7 px-2" onClick={() => handleDeleteReminder(r._id)}>Del</Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={openAddReminder} className="px-2 py-1 mt-3 rounded bg-purple-50 text-purple-700 hover:bg-purple-100">+ Add reminder</Button>
          </Card>
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
            <div className="sm:col-span-9"><Input placeholder="Select from list or create new item..." value={itemName} onChange={(e)=>setItemName(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Description</div>
            <div className="sm:col-span-9"><Textarea placeholder="Description" value={description} onChange={(e)=>setDescription(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Quantity</div>
            <div className="sm:col-span-9"><Input placeholder="Quantity" value={quantity} onChange={(e)=>setQuantity(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Unit type</div>
            <div className="sm:col-span-9"><Input placeholder="Unit type (Ex: hours, pc, etc.)" value={unitType} onChange={(e)=>setUnitType(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Rate</div>
            <div className="sm:col-span-9"><Input placeholder="Rate" value={rate} onChange={(e)=>setRate(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setAddOpen(false)}>Close</Button>
            <Button onClick={addItem}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit estimate dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card max-w-2xl">
          <DialogHeader><DialogTitle>Edit estimate</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Client</div>
            <div className="sm:col-span-9"><Input placeholder="Client" value={eClient} onChange={(e)=>setEClient(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Estimate date</div>
            <div className="sm:col-span-9"><Input type="date" value={eEstimateDate} onChange={(e)=>setEEstimateDate(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Valid until</div>
            <div className="sm:col-span-9"><Input type="date" value={eValidUntil} onChange={(e)=>setEValidUntil(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Tax</div>
            <div className="sm:col-span-9"><Input placeholder="Tax %" value={eTax} onChange={(e)=>setETax(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Second Tax</div>
            <div className="sm:col-span-9"><Input placeholder="Tax2 %" value={eTax2} onChange={(e)=>setETax2(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Advanced Amount</div>
            <div className="sm:col-span-9"><Input placeholder="Advanced Amount" value={eAdvancedAmount} onChange={(e)=>setEAdvancedAmount(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Note</div>
            <div className="sm:col-span-9"><Textarea placeholder="Note" value={eNote} onChange={(e)=>setENote(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setEditOpen(false)}>Close</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openInfo} onOpenChange={setOpenInfo}>
        <DialogContent className="bg-card max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit estimate info</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Company name</div>
            <div className="sm:col-span-9"><Input value={infoName} onChange={(e)=>setInfoName(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Address</div>
            <div className="sm:col-span-9"><Input value={infoAddress} onChange={(e)=>setInfoAddress(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Phone</div>
            <div className="sm:col-span-9"><Input value={infoPhone} onChange={(e)=>setInfoPhone(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Email</div>
            <div className="sm:col-span-9"><Input value={infoEmail} onChange={(e)=>setInfoEmail(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Website</div>
            <div className="sm:col-span-9"><Input value={infoWebsite} onChange={(e)=>setInfoWebsite(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Tax ID</div>
            <div className="sm:col-span-9"><Input value={infoTaxId} onChange={(e)=>setInfoTaxId(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Logo URL</div>
            <div className="sm:col-span-9"><Input value={infoLogo} onChange={(e)=>setInfoLogo(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Payment information</div>
            <div className="sm:col-span-9"><Textarea rows={8} value={paymentInfo} onChange={(e)=>setPaymentInfo(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenInfo(false)}>Close</Button>
            <Button onClick={saveEstimateInfo}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openReminder} onOpenChange={setOpenReminder}>
        <DialogContent className="bg-card max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{reminderEditingId ? "Edit reminder" : "Add reminder"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Input placeholder="Title" value={remTitle} onChange={(e)=>setRemTitle(e.target.value)} /></div>
            <div><Input type="date" value={remDueAt} onChange={(e)=>setRemDueAt(e.target.value)} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={remRepeat} onChange={(e)=>setRemRepeat(e.target.checked)} />
              <span className="text-sm">Repeat</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenReminder(false)}>Close</Button>
            <Button onClick={handleSaveReminder}>{reminderEditingId ? "Update" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
