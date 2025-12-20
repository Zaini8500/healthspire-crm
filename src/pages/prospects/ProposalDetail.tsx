import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, Copy, CheckCircle2, XCircle, Send, Printer, Eye, FileDown, PenLine, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Link2, Code, ChevronDown } from "lucide-react";

const API_BASE = "http://localhost:5000";

const COMPANY = {
  name: "Mindspire",
  address: "Gurugram, Pakistan",
  email: "info@mindspire.org",
  website: "www.mindspire.org",
};

type Proposal = {
  id: string;
  title: string;
  client: string;
  amount: number;
  status: string;
  proposalDate?: string;
  validUntil?: string;
  note?: string;
  number?: number;
  tax1?: number;
  tax2?: number;
};

type Project = {
  id: string;
  title?: string;
  description?: string;
  price?: number;
  start?: string;
  deadline?: string;
};

export default function ProposalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [p, setP] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const [outerTab, setOuterTab] = useState("details-outer");
  const [innerTab, setInnerTab] = useState("items");

  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("draft");
  const [proposalDate, setProposalDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [note, setNote] = useState("");
  const [tax1, setTax1] = useState("0");
  const [tax2, setTax2] = useState("0");

  const editorRef = useRef<HTMLDivElement | null>(null);
  const [editorHtml, setEditorHtml] = useState<string>("");

  // Current project context (for variable interpolation)
  const [project, setProject] = useState<Project | null>(null);
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const pid = url.searchParams.get("projectId") || localStorage.getItem("current_project_id") || "";
      if (!pid) return;
      (async () => {
        try {
          const res = await fetch(`${API_BASE}/api/projects/${pid}`);
          if (!res.ok) return;
          const d = await res.json();
          setProject({
            id: String(d._id || pid),
            title: d.title || "",
            description: d.description || "",
            price: typeof d.price === 'number' ? d.price : undefined,
            start: d.start ? new Date(d.start).toISOString().slice(0,10) : undefined,
            deadline: d.deadline ? new Date(d.deadline).toISOString().slice(0,10) : undefined,
          });
        } catch {}
      })();
    } catch {}
  }, []);

  // Utility: strip HTML to plain English text for previews
  const stripHtml = (html: string) => {
    try {
      const div = document.createElement("div");
      div.innerHTML = html || "";
      return (div.textContent || div.innerText || "").trim();
    } catch { return html; }
  };
  const noteEnglish = useMemo(() => stripHtml(editorHtml || p?.note || ""), [editorHtml, p]);

  // Preview overlay (same tab)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const previewRef = useRef<HTMLIFrameElement | null>(null);
  const [previewPrint, setPreviewPrint] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [previewAutoDownload, setPreviewAutoDownload] = useState(false);

  // Manual print trigger for the already-loaded iframe
  const triggerPrintNow = () => {
    try { previewRef.current?.contentWindow?.focus(); previewRef.current?.contentWindow?.print(); } catch {}
  };

  type Item = { id: string; name: string; qty: number; rate: number };
  const [items, setItems] = useState<Item[]>([]);
  const subTotal = useMemo(() => items.reduce((s, it) => s + it.qty * it.rate, 0), [items]);
  const taxTotal = useMemo(() => subTotal * (Number(tax1||0)/100) + subTotal * (Number(tax2||0)/100), [subTotal, tax1, tax2]);
  const grandTotal = useMemo(() => subTotal + taxTotal, [subTotal, taxTotal]);

  // Items picker (fetch from Items page)
  type CatalogItem = { id: string; title: string; rate?: number; unit?: string; description?: string };
  const [pickOpen, setPickOpen] = useState(false);
  const [pickQuery, setPickQuery] = useState("");
  const [pickItems, setPickItems] = useState<CatalogItem[]>([]);
  const [pickLoading, setPickLoading] = useState(false);
  // create new item inside picker
  const [newTitle, setNewTitle] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSaving, setNewSaving] = useState(false);

  useEffect(() => {
    if (!pickOpen) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        setPickLoading(true);
        const url = `${API_BASE}/api/items${pickQuery ? `?q=${encodeURIComponent(pickQuery)}` : ""}`;
        const r = await fetch(url, { signal: ctrl.signal });
        if (!r.ok) { setPickItems([]); return; }
        const data = await r.json();
        const list: CatalogItem[] = (Array.isArray(data) ? data : [])
          .map((d:any) => ({ id: String(d._id || ""), title: d.title || "-", rate: typeof d.rate === 'number' ? d.rate : undefined, unit: d.unit || undefined, description: d.description || undefined }))
          .filter((x:any) => x.id);
        setPickItems(list);
      } catch {}
      finally { setPickLoading(false); }
    })();
    return () => ctrl.abort();
  }, [pickOpen, pickQuery]);

  const addFromCatalog = (ci: CatalogItem) => {
    setItems(prev => ([...prev, { id: Math.random().toString(36).slice(2), name: ci.title, qty: 1, rate: Number(ci.rate || 0) }]));
    setPickOpen(false);
  };

  const createNewItem = async () => {
    if (!newTitle.trim()) { toast.error("Title is required"); return; }
    try {
      setNewSaving(true);
      const payload: any = {
        title: newTitle.trim(),
        description: newDesc || undefined,
        category: "general",
        unit: newUnit || undefined,
        rate: Number(newRate || 0),
        showInClientPortal: false,
        image: "",
      };
      const r = await fetch(`${API_BASE}/api/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) {
        let msg = "Failed to create item";
        try { const e = await r.json(); if (e?.error) msg = String(e.error); } catch {}
        throw new Error(msg);
      }
      const created = await r.json();
      const ci: CatalogItem = { id: String(created._id || ""), title: created.title || newTitle.trim(), rate: created.rate, unit: created.unit, description: created.description };
      // add to proposal items immediately
      addFromCatalog(ci);
      // also update picker list for next time
      setPickItems(prev => [{ id: ci.id, title: ci.title, rate: ci.rate, unit: ci.unit, description: ci.description }, ...prev]);
      // reset form
      setNewTitle(""); setNewRate(""); setNewUnit(""); setNewDesc("");
      toast.success("Item created");
    } catch (e:any) {
      toast.error(e?.message || "Failed to create item");
    } finally {
      setNewSaving(false);
    }
  };

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/proposals/${id}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed to load proposal");
      const mapped: Proposal = {
        id: String(d._id || id),
        title: d.title || "-",
        client: d.client || "-",
        amount: Number(d.amount || 0),
        status: d.status || "draft",
        proposalDate: d.proposalDate ? new Date(d.proposalDate).toISOString().slice(0, 10) : undefined,
        validUntil: d.validUntil ? new Date(d.validUntil).toISOString().slice(0, 10) : undefined,
        note: d.note || "",
        number: typeof d.number === 'number' ? d.number : undefined,
        tax1: typeof d.tax1 === 'number' ? d.tax1 : 0,
        tax2: typeof d.tax2 === 'number' ? d.tax2 : 0,
      };
      setP(mapped);
      setTax1(String(mapped.tax1 ?? 0));
      setTax2(String(mapped.tax2 ?? 0));
      setEditorHtml(mapped.note || "");
    } catch (e: any) {
      toast.error(e?.message || "Failed to load proposal");
    } finally {
      setLoading(false);
    }
  };

  const buildPreviewDocument = () => {
    const proposalNo = p?.number ?? p?.id ?? "-";
    const proposalDateText = p?.proposalDate ?? "-";
    const expiryDateText = p?.validUntil ?? "-";
    const intro = (editorRef.current?.innerHTML ?? editorHtml ?? p?.note ?? "") || "";

    const rows = items
      .map((it) => {
        const total = (it.qty || 0) * (it.rate || 0);
        return `
          <tr>
            <td class="t-name">${String(it.name || "-")}</td>
            <td class="t-num">${Number(it.qty || 0)}</td>
            <td class="t-num">${Number(it.rate || 0).toLocaleString()}</td>
            <td class="t-num">${Number(total || 0).toLocaleString()}</td>
          </tr>
        `;
      })
      .join("");

    const sub = Number(subTotal || 0);
    const t1p = Number(tax1 || 0);
    const t2p = Number(tax2 || 0);
    const t1 = sub * (t1p / 100);
    const t2 = sub * (t2p / 100);
    const total = sub + t1 + t2;

    const doc = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Proposal #${proposalNo}</title>
  <style>
    :root { --accent:#111827; --brand:#111827; --muted:#6b7280; --border:#e5e7eb; --soft:#f8fafc; --highlight:#f59e0b; }
    * { box-sizing:border-box; }
    html, body { height:100%; }
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#eef2f7; color:#0f172a; }
    @page { size: A4; margin: 16mm; }
    .sheet { width: 210mm; min-height: 297mm; margin: 12px auto; background:#fff; border:1px solid var(--border); border-radius: 10px; box-shadow: 0 10px 30px rgba(2,6,23,.08); }
    .inner { padding: 18mm 16mm; }
    .top { display:flex; justify-content:space-between; align-items:center; gap:24px; }
    .brand { font-weight:700; color:var(--brand); font-size:18px; }
    .badge { display:inline-block; font-size:11px; padding:6px 10px; border-radius:999px; background:#111827; color:#fff; letter-spacing:.08em; }
    .title { text-align:center; margin: 6mm 0 2mm; font-size:22px; font-weight:800; letter-spacing:.02em; }
    .subtitle { text-align:center; color:var(--muted); font-size:12px; }
    .hr { height:1px; background:var(--border); margin: 6mm 0; }
    .meta { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 10mm; font-size:12px; }
    .meta .label { color:var(--muted); font-size:11px; }
    .section h2 { font-size:16px; font-weight:700; margin: 14px 0 6px; color:#111827; }
    .section p, .section li { color:#374151; font-size:12.5px; line-height:1.8; }
    .editor-html { margin-top: 2mm; }
    .table { width:100%; border-collapse:collapse; margin-top: 6mm; }
    .table thead { display: table-header-group; }
    .table thead th { background:#0f172a; color:#fff; font-size:11px; font-weight:700; text-align:left; padding:8px 10px; }
    .table tbody td { border:1px solid var(--border); padding:10px; font-size:12.5px; }
    .table tbody tr:nth-child(even) td { background: var(--soft); }
    .t-num { text-align:right; white-space:nowrap; }
    .t-name { width:40%; }
    .totals { width: 70mm; margin-left:auto; margin-top: 4mm; font-size:12.5px; border:1px solid var(--border); border-radius:8px; overflow:hidden; }
    .totals .row { display:flex; justify-content:space-between; padding:8px 12px; border-top:1px solid var(--border); }
    .totals .row:first-child { border-top:none; }
    .totals .row.total { background:#111827; color:#fff; font-weight:700; }
    .sign { display:flex; justify-content:space-between; gap: 10mm; margin-top: 12mm; font-size:12px; }
    .sign .box { flex:1; }
    .sign .line { height:1px; background:var(--border); margin: 10mm 0 2mm; }
    .footer { margin-top: 10mm; text-align:center; color: var(--muted); font-size:11px; }
    @media print {
      body { background:#fff; }
      .sheet { width:auto; min-height:auto; margin:0; border:none; border-radius:0; box-shadow:none; }
      .inner { padding: 0; }
      .hr { margin: 4mm 0; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="inner">
      <div class="top">
        <div class="brand">${COMPANY.name}</div>
        <div class="badge">PROPOSAL #${proposalNo}</div>
      </div>

      <div class="title">${p?.title || "Project Proposal"}</div>
      <div class="subtitle">Prepared for <b>${p?.client ?? "-"}</b></div>
      <div class="hr"></div>

      <div class="meta">
        <div>
          <div class="label">Proposal Date</div>
          <div>${proposalDateText}</div>
        </div>
        <div>
          <div class="label">Expiry Date</div>
          <div>${expiryDateText}</div>
        </div>
        <div>
          <div class="label">From</div>
          <div>${COMPANY.name}<br/><span style="color:var(--muted)">${COMPANY.address}</span></div>
        </div>
      </div>

      <div class="section editor-html">${intro || ""}</div>

      <div class="section">
        <h2>Pricing</h2>
        <table class="table">
          <thead>
            <tr>
              <th style="width:45%">Item</th>
              <th style="width:15%" class="t-num">Quantity</th>
              <th style="width:20%" class="t-num">Rate</th>
              <th style="width:20%" class="t-num">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="4" style="text-align:center; color:var(--muted); padding:12px">No record found.</td></tr>`}
          </tbody>
        </table>
        <div class="totals">
          <div class="row"><span style="color:var(--muted)">Sub Total</span><span>${sub.toLocaleString()}</span></div>
          ${t1p ? `<div class="row"><span>Tax A (${t1p}%)</span><span>${t1.toLocaleString()}</span></div>` : ""}
          ${t2p ? `<div class="row"><span>Tax B (${t2p}%)</span><span>${t2.toLocaleString()}</span></div>` : ""}
          <div class="row total"><span>Total</span><span>${total.toLocaleString()}</span></div>
        </div>
      </div>

      <div class="sign">
        <div class="box">
          <div class="label">For Client</div>
          <div class="line"></div>
          <div class="label">Signature & Date</div>
        </div>
        <div class="box">
          <div class="label">For ${COMPANY.name}</div>
          <div class="line"></div>
          <div class="label">Authorized Signature</div>
        </div>
      </div>

      <div class="footer">${COMPANY.name} • ${COMPANY.email} • ${COMPANY.website}</div>
    </div>
  </div>
</body>
</html>`;

    return doc;
  };

  useEffect(() => { load(); }, [id]);

  const openEdit = () => {
    if (!p) return;
    setTitle(p.title || "");
    setClient(p.client || "");
    setAmount(String(p.amount || 0));
    setStatus(p.status || "draft");
    setProposalDate(p.proposalDate || "");
    setValidUntil(p.validUntil || "");
    setNote(p.note || "");
    setTax1(String(p.tax1 ?? 0));
    setTax2(String(p.tax2 ?? 0));
    setEditorHtml(p.note || "");
    setEditOpen(true);
  };

  const save = async () => {
    if (!id) return;
    try {
      const payload: any = {
        title: title || "",
        client: client || "",
        amount: amount ? Number(amount) : 0,
        status: status || "draft",
        proposalDate: proposalDate ? new Date(proposalDate).toISOString() : undefined,
        validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
        note: (editorRef.current?.innerHTML ?? editorHtml ?? note) || "",
        tax1: Number(tax1 || 0),
        tax2: Number(tax2 || 0),
      };
      const res = await fetch(`${API_BASE}/api/proposals/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || "Failed to update");
      toast.success("Proposal updated");
      setEditOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update");
    }
  };

  const updateStatus = async (s: string) => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/api/proposals/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: s }) });
      if (res.ok) { toast.success("Status updated"); load(); }
    } catch {}
  };

  const cloneProposal = async () => {
    if (!p) return;
    try {
      const payload = {
        title: p.title,
        client: p.client,
        amount: p.amount,
        status: p.status,
        proposalDate: p.proposalDate ? new Date(p.proposalDate).toISOString() : undefined,
        validUntil: p.validUntil ? new Date(p.validUntil).toISOString() : undefined,
        note: p.note,
      };
      const res = await fetch(`${API_BASE}/api/proposals`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed to clone");
      toast.success("Cloned");
      navigate(`/prospects/proposals/${d._id}`);
    } catch (e: any) { toast.error(e?.message || "Failed to clone"); }
  };

  const openPreviewOverlay = (opts?: { print?: boolean; download?: boolean }) => {
    const html = buildPreviewDocument();
    setPreviewHtml(html);
    setPreviewOpen(true);
    setPreviewPrint(!!opts?.print);
    setPreviewAutoDownload(!!opts?.download);
    setIframeLoading(true);
  };

  const preview = () => { openPreviewOverlay(); };
  const downloadPdf = () => { openPreviewOverlay({ download: true }); };
  const printProposal = () => { openPreviewOverlay({ print: true }); };

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      try {
        if (e?.data?.type === 'proposal-pdf-done') {
          setPreviewAutoDownload(false);
          setPreviewOpen(false);
        }
      } catch {}
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const exec = (cmd: string, value?: string) => {
    try {
      editorRef.current?.focus();
      // eslint-disable-next-line deprecation/deprecation
      document.execCommand(cmd, false, value);
      setEditorHtml(editorRef.current?.innerHTML ?? "");
    } catch {}
  };

  const insertHtml = (html: string) => {
    const map: Record<string, string> = {
      "{PROPOSAL_ID}": String(p?.number ?? p?.id ?? "-"),
      "{PROPOSAL_DATE}": String(p?.proposalDate ?? "-"),
      "{PROPOSAL_EXPIRY_DATE}": String(p?.validUntil ?? "-"),
      "{PROJECT_TITLE}": String(project?.title ?? "-"),
      "{PROJECT_DESCRIPTION}": String(project?.description ?? "-"),
      "{PROJECT_PRICE}": project?.price != null ? Number(project.price).toLocaleString() : "-",
      "{PROJECT_START}": String(project?.start ?? "-"),
      "{PROJECT_DEADLINE}": String(project?.deadline ?? "-"),
    };
    let out = html;
    Object.entries(map).forEach(([k, v]) => { out = out.split(k).join(v); });
    exec("insertHTML", out);
  };

  const insertSection = (heading: string, contentHtml: string) => {
    insertHtml(`
      <h2 style="margin:22px 0 8px; font-size:18px; font-weight:700;">${heading}</h2>
      <div style="color:#374151; font-size:14px; line-height:1.8;">${contentHtml}</div>
    `);
  };

  const insertFullTemplate = () => {
    const titleText = p?.title || "Project Proposal";
    const clientText = p?.client || "Client";
    const numText = p?.number ?? p?.id ?? "-";
    insertHtml(`
      <div style="text-align:center; margin-top: 40px;">
        <div style="font-size:34px; font-weight:800;">${titleText}</div>
        <div style="margin-top:10px; color:#6b7280;">Prepared for: <b>${clientText}</b></div>
        <div style="margin-top:4px; color:#6b7280;">Proposal #${numText}</div>
      </div>
      <hr style="margin:26px 0; border:none; border-top:1px solid #e5e7eb;" />
      <p style="color:#374151; line-height:1.8; font-size:14px;">
        Thank you for the opportunity to submit this proposal. This document outlines the scope, timeline, deliverables, pricing, and terms for the project.
      </p>
      <h2 style="margin:22px 0 8px; font-size:18px; font-weight:700;">Project Overview</h2>
      <p style="color:#374151; line-height:1.8; font-size:14px;">{PROJECT_DESCRIPTION}</p>
      <h2 style="margin:22px 0 8px; font-size:18px; font-weight:700;">Scope of Work</h2>
      <ul style="line-height:1.9; font-size:14px; color:#374151;">
        <li>Discovery & requirements gathering</li>
        <li>UI/UX design</li>
        <li>Development & implementation</li>
        <li>Testing & QA</li>
        <li>Deployment & handover</li>
      </ul>
      <h2 style="margin:22px 0 8px; font-size:18px; font-weight:700;">Timeline</h2>
      <p style="color:#374151; line-height:1.8; font-size:14px;">Estimated start: {PROJECT_START}. Estimated deadline: {PROJECT_DEADLINE}.</p>
      <h2 style="margin:22px 0 8px; font-size:18px; font-weight:700;">Deliverables</h2>
      <ul style="line-height:1.9; font-size:14px; color:#374151;">
        <li>Deliverable 1</li>
        <li>Deliverable 2</li>
        <li>Documentation & handover</li>
      </ul>
      <h2 style="margin:22px 0 8px; font-size:18px; font-weight:700;">Pricing</h2>
      <p style="color:#374151; line-height:1.8; font-size:14px;">Total project price: <b>{PROJECT_PRICE}</b></p>
      <p style="color:#374151; line-height:1.8; font-size:14px;">Payment terms: 50% upfront, 50% on completion (editable).</p>
      <h2 style="margin:22px 0 8px; font-size:18px; font-weight:700;">Terms & Conditions</h2>
      <ul style="line-height:1.9; font-size:14px; color:#374151;">
        <li>Proposal valid until {PROPOSAL_EXPIRY_DATE}</li>
        <li>2 revision rounds included (editable)</li>
        <li>Support & maintenance options available</li>
      </ul>
      <hr style="margin:26px 0; border:none; border-top:1px solid #e5e7eb;" />
      <p style="color:#6b7280;font-size:12px">Client signature: ______________________</p>
    `);
  };

  const saveAndShow = async () => {
    await save();
    setOuterTab("details-outer");
    setInnerTab("preview");
  };

  if (loading) return <div>Loading...</div>;
  if (!p) return <div>Not found</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4"/></Button>
          <div>
            <div className="text-xs text-muted-foreground">Proposal</div>
            <h1 className="text-base">#{p.number ?? p.id}</h1>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="success">Actions <ChevronDown className="w-4 h-4 ml-1"/></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={preview}><Eye className="w-4 h-4 mr-2"/>Proposal preview</DropdownMenuItem>
            <DropdownMenuItem onClick={printProposal}><Printer className="w-4 h-4 mr-2"/>Print proposal</DropdownMenuItem>
            <DropdownMenuItem onClick={downloadPdf}><FileDown className="w-4 h-4 mr-2"/>Download PDF</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setOuterTab("details-outer"); setInnerTab("editor"); }}><PenLine className="w-4 h-4 mr-2"/>Edit proposal</DropdownMenuItem>
            <DropdownMenuItem onClick={openEdit}><PenLine className="w-4 h-4 mr-2"/>Edit proposal info</DropdownMenuItem>
            <DropdownMenuItem onClick={cloneProposal}><Copy className="w-4 h-4 mr-2"/>Clone proposal</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => updateStatus('accepted')}><CheckCircle2 className="w-4 h-4 mr-2"/>Mark as Accepted</DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus('declined')}><XCircle className="w-4 h-4 mr-2"/>Mark as Rejected</DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus('sent')}><Send className="w-4 h-4 mr-2"/>Mark as Sent</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              const subject = `Proposal #${p.number ?? p.id}`;
              const body = `Please review the proposal here: ${window.location.href}`;
              window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            }}><Send className="w-4 h-4 mr-2"/>Send to client</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-4">
          <Card>
            <CardContent className="p-4">
              {/* Outer tabs like in reference: Details | Tasks */}
              <Tabs value={outerTab} onValueChange={setOuterTab}>
                <TabsList>
                  <TabsTrigger value="details-outer">Details</TabsTrigger>
                  <TabsTrigger value="tasks-outer">Tasks</TabsTrigger>
                </TabsList>

                {/* DETAILS */}
                <TabsContent value="details-outer" className="mt-4">
                  {/* Inner tabs: Proposal items | Proposal editor | Preview */}
                  <Tabs value={innerTab} onValueChange={setInnerTab}>
                    <TabsList>
                      <TabsTrigger value="items">Proposal items</TabsTrigger>
                      <TabsTrigger value="editor">Proposal editor</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>

                    <TabsContent value="items" className="mt-4">
                      <div className="max-w-4xl mx-auto border rounded-lg bg-background">
                        <div className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="text-sm">
                              <div className="font-semibold">Mindspire</div>
                              <div className="text-muted-foreground">Gurugram, Pakistan</div>
                              <div className="text-muted-foreground">Email: info@mindspire.org</div>
                              <div className="text-muted-foreground">Website: www.mindspire.org</div>
                            </div>
                            <div className="text-right text-sm">
                              <div>Proposal to</div>
                              <div className="font-medium">{p.client}</div>
                              <div className="inline-block bg-black text-white text-xs px-2 py-1 rounded mt-2">PROPOSAL #{p.number ?? p.id}</div>
                              <div className="mt-2">Proposal date: {p.proposalDate ?? '-'}</div>
                              <div>Valid until: {p.validUntil ?? '-'}</div>
                            </div>
                          </div>
                          <div className="mt-6 rounded-md border overflow-hidden">
                            <div className="grid grid-cols-12 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                              <div className="col-span-6">Item</div>
                              <div className="col-span-2 text-right">Quantity</div>
                              <div className="col-span-2 text-right">Rate</div>
                              <div className="col-span-2 text-right">Total</div>
                            </div>
                            {items.length ? (
                              items.map((it) => (
                                <div key={it.id} className="grid grid-cols-12 px-3 py-2 items-center gap-2">
                                  <div className="col-span-6"><Input value={it.name} onChange={(e)=>setItems(p=>p.map(x=>x.id===it.id?{...x,name:e.target.value}:x))} /></div>
                                  <div className="col-span-2 text-right"><Input type="number" value={it.qty} onChange={(e)=>setItems(p=>p.map(x=>x.id===it.id?{...x,qty:Number(e.target.value)}:x))} /></div>
                                  <div className="col-span-2 text-right"><Input type="number" value={it.rate} onChange={(e)=>setItems(p=>p.map(x=>x.id===it.id?{...x,rate:Number(e.target.value)}:x))} /></div>
                                  <div className="col-span-2 text-right">{(it.qty*it.rate).toLocaleString()}</div>
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-6 text-center text-sm text-muted-foreground">No record found.</div>
                            )}
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <Button variant="outline" onClick={()=>setPickOpen(true)}>Add item</Button>
                            <div className="text-sm w-64">
                              <div className="flex justify-between"><span className="text-muted-foreground">Sub Total</span><span>{subTotal.toLocaleString()}</span></div>
                              <div className="flex justify-between items-center gap-2">
                                <span className="text-muted-foreground">Tax</span>
                                <span className="flex items-center gap-1">
                                  <Input className="w-16" type="number" value={tax1} onChange={(e)=>setTax1(e.target.value)} />
                                  +
                                  <Input className="w-16" type="number" value={tax2} onChange={(e)=>setTax2(e.target.value)} />%
                                </span>
                              </div>
                              <div className="flex justify-between font-medium"><span>Total</span><span>{grandTotal.toLocaleString()}</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="editor" className="mt-4">
                      <div className="max-w-6xl mx-auto grid gap-4 lg:grid-cols-12">
                        <div className="lg:col-span-9 border rounded-lg bg-background overflow-hidden flex flex-col h-[72vh]">
                          <div className="px-4 py-3 border-b flex items-center justify-between sticky top-0 bg-background z-10">
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => toast.message("Templates coming soon")}>Change template</Button>
                              <Button variant="outline" size="sm" onClick={insertFullTemplate}>Insert full template</Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={save}>Save</Button>
                              <Button size="sm" variant="secondary" onClick={saveAndShow}>Save &amp; show</Button>
                            </div>
                          </div>

                          <div className="px-3 py-2 border-b flex items-center gap-1 flex-wrap sticky top-[52px] bg-background z-10">
                            <Button type="button" size="icon" variant="ghost" onClick={() => exec("bold")}><Bold className="w-4 h-4"/></Button>
                            <Button type="button" size="icon" variant="ghost" onClick={() => exec("italic")}><Italic className="w-4 h-4"/></Button>
                            <Button type="button" size="icon" variant="ghost" onClick={() => exec("underline")}><Underline className="w-4 h-4"/></Button>
                            <div className="w-px h-5 bg-border mx-1" />
                            <Button type="button" size="icon" variant="ghost" onClick={() => exec("justifyLeft")}><AlignLeft className="w-4 h-4"/></Button>
                            <Button type="button" size="icon" variant="ghost" onClick={() => exec("justifyCenter")}><AlignCenter className="w-4 h-4"/></Button>
                            <Button type="button" size="icon" variant="ghost" onClick={() => exec("justifyRight")}><AlignRight className="w-4 h-4"/></Button>
                            <div className="w-px h-5 bg-border mx-1" />
                            <Button type="button" size="icon" variant="ghost" onClick={() => exec("insertUnorderedList")}><List className="w-4 h-4"/></Button>
                            <Button type="button" size="icon" variant="ghost" onClick={() => exec("insertOrderedList")}><ListOrdered className="w-4 h-4"/></Button>
                            <Button type="button" size="icon" variant="ghost" onClick={() => exec("formatBlock", "<h2>")}><Code className="w-4 h-4"/></Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const url = window.prompt("Enter link URL");
                                if (url) exec("createLink", url);
                              }}
                            >
                              <Link2 className="w-4 h-4"/>
                            </Button>
                          </div>

                          <div className="flex-1 overflow-auto bg-muted/20 p-6">
                            <div className="bg-white border rounded-md shadow-sm min-h-[900px]">
                              <div
                                ref={editorRef}
                                contentEditable
                                suppressContentEditableWarning
                                className="outline-none p-10 text-[15px] leading-7 min-h-[900px]"
                                onInput={() => setEditorHtml(editorRef.current?.innerHTML ?? "")}
                                dangerouslySetInnerHTML={{ __html: editorHtml || "<div style='text-align:center;font-size:34px;font-weight:800;margin-top:120px'>Project Proposal</div><div style='text-align:center;color:#6b7280;margin-top:10px'>Start writing your proposal…</div>" }}
                              />
                            </div>
                          </div>

                          <div className="px-4 py-3 border-t text-[11px] text-muted-foreground">
                            Available variables: {`{PROPOSAL_ID}, {PROPOSAL_DATE}, {PROPOSAL_EXPIRY_DATE}, {PROJECT_TITLE}, {PROJECT_DESCRIPTION}, {PROJECT_PRICE}, {PROJECT_START}, {PROJECT_DEADLINE}`}
                          </div>
                        </div>

                        <div className="lg:col-span-3 border rounded-lg bg-background overflow-hidden h-[72vh] flex flex-col">
                          <div className="px-4 py-3 border-b font-medium">Insert</div>
                          <div className="p-3 overflow-auto space-y-3">
                            <div className="text-xs text-muted-foreground">Sections</div>
                            <div className="grid gap-2">
                              <Button variant="outline" size="sm" onClick={() => insertSection("Project Overview", "<p>{PROJECT_DESCRIPTION}</p>")}>Project overview</Button>
                              <Button variant="outline" size="sm" onClick={() => insertSection("Objectives", "<ul><li>Objective 1</li><li>Objective 2</li></ul>")}>Objectives</Button>
                              <Button variant="outline" size="sm" onClick={() => insertSection("Scope of Work", "<ul><li>Discovery</li><li>Design</li><li>Development</li><li>Testing</li><li>Deployment</li></ul>")}>Scope of work</Button>
                              <Button variant="outline" size="sm" onClick={() => insertSection("Deliverables", "<ul><li>Deliverable 1</li><li>Deliverable 2</li></ul>")}>Deliverables</Button>
                              <Button variant="outline" size="sm" onClick={() => insertSection("Timeline", "<p>Start: {PROJECT_START} — Deadline: {PROJECT_DEADLINE}</p>")}>Timeline</Button>
                              <Button variant="outline" size="sm" onClick={() => insertSection("Pricing", "<p>Total: <b>{PROJECT_PRICE}</b></p><p>Payment terms: 50% upfront, 50% on completion.</p>")}>Pricing</Button>
                              <Button variant="outline" size="sm" onClick={() => insertSection("Terms & Conditions", "<ul><li>Proposal valid until {PROPOSAL_EXPIRY_DATE}</li><li>2 revisions included</li></ul>")}>Terms & conditions</Button>
                            </div>

                            <div className="pt-2">
                              <div className="text-xs text-muted-foreground">Variables</div>
                              <div className="grid gap-2 mt-2">
                                <Button variant="secondary" size="sm" onClick={() => insertHtml("{PROPOSAL_ID} ")}>{`{PROPOSAL_ID}`}</Button>
                                <Button variant="secondary" size="sm" onClick={() => insertHtml("{PROPOSAL_DATE} ")}>{`{PROPOSAL_DATE}`}</Button>
                                <Button variant="secondary" size="sm" onClick={() => insertHtml("{PROPOSAL_EXPIRY_DATE} ")}>{`{PROPOSAL_EXPIRY_DATE}`}</Button>
                                <Button variant="secondary" size="sm" onClick={() => insertHtml("{PROJECT_TITLE} ")}>{`{PROJECT_TITLE}`}</Button>
                                <Button variant="secondary" size="sm" onClick={() => insertHtml("{PROJECT_DESCRIPTION} ")}>{`{PROJECT_DESCRIPTION}`}</Button>
                                <Button variant="secondary" size="sm" onClick={() => insertHtml("{PROJECT_PRICE} ")}>{`{PROJECT_PRICE}`}</Button>
                              </div>
                            </div>

                            <div className="pt-2">
                              <div className="text-xs text-muted-foreground">Quick blocks</div>
                              <div className="grid gap-2 mt-2">
                                <Button variant="outline" size="sm" onClick={() => insertHtml("<hr style='margin:22px 0; border:none; border-top:1px solid #e5e7eb;' />")}>Divider</Button>
                                <Button variant="outline" size="sm" onClick={() => insertHtml("<p style='color:#6b7280;font-size:12px'>Client signature: ______________________</p>")}>Signature line</Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="preview" className="mt-4">
                      <div className="max-w-4xl mx-auto">
                        <div className="bg-muted/20 p-6 rounded-lg border">
                          <div className="bg-white border rounded-md shadow-sm p-10">
                            <div className="text-xs text-muted-foreground leading-6 max-w-[520px]" dangerouslySetInnerHTML={{ __html: (editorRef.current?.innerHTML ?? editorHtml ?? p.note ?? "") || "" }} />

                            <div className="text-center mt-8">
                              <div className="text-base tracking-[0.22em] font-semibold text-muted-foreground">PROPOSAL #{p.number ?? p.id}</div>
                              <div className="h-[3px] w-12 bg-amber-500 rounded-full mx-auto mt-3" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 text-sm">
                              <div>
                                <div className="text-xs text-muted-foreground">Proposal Date</div>
                                <div className="mt-1">{p.proposalDate ?? '-'}</div>
                                <div className="h-3" />
                                <div className="text-xs text-muted-foreground">Expiry Date</div>
                                <div className="mt-1">{p.validUntil ?? '-'}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Proposal For</div>
                                <div className="mt-1">{p.client}</div>
                                <div className="text-xs text-muted-foreground mt-1">USA</div>
                              </div>
                              <div className="md:text-right">
                                <div className="text-xs text-muted-foreground">Proposal From</div>
                                <div className="mt-1">{COMPANY.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">{COMPANY.address}</div>
                                <div className="text-xs text-muted-foreground">Email: {COMPANY.email}</div>
                                <div className="text-xs text-muted-foreground">Website: {COMPANY.website}</div>
                              </div>
                            </div>

                            <div className="text-center mt-14">
                              <div className="text-lg font-medium text-muted-foreground">Our Best Offer</div>
                              <div className="h-[3px] w-12 bg-amber-500 rounded-full mx-auto mt-3" />
                              <div className="text-xs text-muted-foreground mt-4 max-w-[620px] mx-auto leading-6">
                                In consideration of your unique needs and aspirations, we are pleased to present our best offer, crafted with meticulous attention to detail and driven by a commitment to delivering exceptional value.
                              </div>
                            </div>

                            <div className="mt-8">
                              <div className="grid grid-cols-12 bg-black text-white text-xs font-semibold px-3 py-2 rounded-t">
                                <div className="col-span-6">Item</div>
                                <div className="col-span-2 text-right">Quantity</div>
                                <div className="col-span-2 text-right">Rate</div>
                                <div className="col-span-2 text-right">Total</div>
                              </div>
                              <div className="border border-t-0 rounded-b overflow-hidden">
                                {items.length ? (
                                  items.map((it) => (
                                    <div key={it.id} className="grid grid-cols-12 px-3 py-2 text-sm border-t">
                                      <div className="col-span-6">{it.name || '-'}</div>
                                      <div className="col-span-2 text-right">{it.qty}</div>
                                      <div className="col-span-2 text-right">{it.rate}</div>
                                      <div className="col-span-2 text-right">{(it.qty * it.rate).toLocaleString()}</div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">No record found.</div>
                                )}
                              </div>

                              <div className="mt-3 w-72 ml-auto text-sm">
                                <div className="flex justify-between border px-3 py-2"><span className="text-muted-foreground">Sub Total</span><span>{Number(subTotal || 0).toLocaleString()}</span></div>
                                <div className="flex justify-between bg-black text-white font-semibold px-3 py-2"><span>Total</span><span>{Number(grandTotal || 0).toLocaleString()}</span></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                {/* TASKS */}
                <TabsContent value="tasks-outer" className="mt-4">
                  <div className="text-sm text-muted-foreground">No tasks found.</div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">Client</div>
                <div>{p.client}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="capitalize">{p.status}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Proposal #</div>
                <div>#{p.number ?? p.id}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Proposal date</div>
                <div>{p.proposalDate ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Valid until</div>
                <div>{p.validUntil ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Last email sent</div>
                <div>Never</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Last email seen</div>
                <div>-</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Last preview seen</div>
                <div>-</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="text-sm font-medium">Reminders</div>
              <div className="text-sm text-muted-foreground">No record found.</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card max-w-2xl">
          <DialogHeader><DialogTitle>Edit proposal</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Title</div>
            <div className="sm:col-span-9"><Input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Title" /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Client</div>
            <div className="sm:col-span-9"><Input value={client} onChange={(e)=>setClient(e.target.value)} placeholder="Client" /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Amount</div>
            <div className="sm:col-span-9"><Input type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Amount" /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Status</div>
            <div className="sm:col-span-9">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Proposal date</div>
            <div className="sm:col-span-9"><Input type="date" value={proposalDate} onChange={(e)=>setProposalDate(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Valid until</div>
            <div className="sm:col-span-9"><Input type="date" value={validUntil} onChange={(e)=>setValidUntil(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Notes (English)</div>
            <div className="sm:col-span-9">
              <Textarea value={noteEnglish} readOnly placeholder="English summary of proposal content" className="min-h-[96px]" />
              <div className="text-[11px] text-muted-foreground mt-1">Edit full content in the Proposal editor tab.</div>
            </div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Tax (%)</div>
            <div className="sm:col-span-4"><Input type="number" value={tax1} onChange={(e)=>setTax1(e.target.value)} /></div>
            <div className="sm:col-span-2 text-center pt-2 text-sm text-muted-foreground">+</div>
            <div className="sm:col-span-3"><Input type="number" value={tax2} onChange={(e)=>setTax2(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <div className="w-full flex items-center justify-end gap-2">
              <Button variant="outline" onClick={()=>setEditOpen(false)}>Close</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Items picker dialog */}
      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent className="bg-card max-w-2xl">
          <DialogHeader><DialogTitle>Choose item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Search items" value={pickQuery} onChange={(e)=>setPickQuery(e.target.value)} />
            <div className="max-h-[360px] overflow-auto border rounded-md">
              {pickLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading...</div>
              ) : pickItems.length ? (
                <div className="divide-y">
                  {pickItems.map(ci => (
                    <div key={ci.id} className="p-3 flex items-center justify-between gap-3 hover:bg-muted/40">
                      <div>
                        <div className="font-medium text-sm">{ci.title}</div>
                        <div className="text-xs text-muted-foreground">{ci.description || ''}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground">Rate: {Number(ci.rate || 0).toLocaleString()}</div>
                        <Button size="sm" onClick={()=>addFromCatalog(ci)}>Add</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">No items found.</div>
              )}
            </div>

            <div className="pt-2">
              <div className="text-xs text-muted-foreground mb-2">Create new item</div>
              <div className="grid gap-2 sm:grid-cols-12">
                <div className="sm:col-span-9"><Input placeholder="Title" value={newTitle} onChange={(e)=>setNewTitle(e.target.value)} /></div>
                <div className="sm:col-span-3"><Input placeholder="Unit (hrs, pc, etc.)" value={newUnit} onChange={(e)=>setNewUnit(e.target.value)} /></div>
                <div className="sm:col-span-4"><Input type="number" placeholder="Rate" value={newRate} onChange={(e)=>setNewRate(e.target.value)} /></div>
                <div className="sm:col-span-8"><Input placeholder="Short description" value={newDesc} onChange={(e)=>setNewDesc(e.target.value)} /></div>
              </div>
              <div className="mt-2 flex items-center justify-end gap-2">
                <Button variant="outline" onClick={()=>{ setNewTitle(''); setNewRate(''); setNewUnit(''); setNewDesc(''); }}>Clear</Button>
                <Button onClick={createNewItem} disabled={newSaving || !newTitle.trim()}>{newSaving ? 'Saving…' : 'Save & add'}</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[96vw] w-[96vw] h-[88vh] p-0 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="font-medium">Proposal preview</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={triggerPrintNow}>Print</Button>
                <Button size="sm" onClick={() => setPreviewOpen(false)}>Close</Button>
              </div>
            </div>
            <div className="relative flex-1">
              <iframe
                ref={previewRef}
                srcDoc={previewHtml}
                onLoad={() => {
                  setIframeLoading(false);
                  if (previewPrint) {
                    try { previewRef.current?.contentWindow?.focus(); previewRef.current?.contentWindow?.print(); } catch {}
                    setPreviewPrint(false);
                  }
                  if (previewAutoDownload) {
                    try {
                      const w = previewRef.current?.contentWindow as any;
                      const d = w?.document as Document;
                      const s = d.createElement('script');
                      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                      s.onload = () => {
                        try {
                          const target = d.querySelector('.sheet') || d.body;
                          // @ts-ignore
                          w.html2pdf().set({ margin: 0, filename: `Proposal-${p?.number ?? p?.id ?? 'document'}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(target).save().then(() => {
                            window.postMessage({ type: 'proposal-pdf-done' }, '*');
                          });
                        } catch {}
                      };
                      d.body.appendChild(s);
                    } catch {}
                  }
                }}
                className="absolute inset-0 w-full h-full bg-muted/20"
              />
              {iframeLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <div className="px-4 py-2 text-sm rounded-md border bg-background shadow-sm animate-pulse">Loading preview…</div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
