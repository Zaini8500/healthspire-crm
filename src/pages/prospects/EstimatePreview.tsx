import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const API_BASE = "http://localhost:5000";

// Dynamically load html2pdf when needed to avoid bundler install requirement
const loadHtml2Pdf = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.html2pdf) return resolve(w.html2pdf);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js";
    script.async = true;
    script.onload = () => resolve((window as any).html2pdf);
    script.onerror = () => reject(new Error("Failed to load html2pdf"));
    document.head.appendChild(script);
  });
};

const DEFAULT_PAYMENT_INFO = `A/c Title: Health Spire Pvt LTd
Bank No: 3130301000008524
IBAN: PK81FAYS3130301000008524
Faysal Bank Bahria Orchard
Branch Code 3139.

A/c Title: Health Spire Pvt LTd
Bank No: 02220113618930
IBAN: PK86MEZN0002220113618930
Meezan Bank College
Road Branch Lahore Code 0222`;

export default function EstimatePreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [est, setEst] = useState<any | null>(null);
  const pdfTargetRef = useRef<HTMLDivElement | null>(null);
  const autoCloseRef = useRef(false);
  const [isSharing, setIsSharing] = useState(false);
  const [company] = useState({
    name: "HealthSpire",
    address: "761/D2 Shah Jelani Rd Township Lahore",
    city: "",
    email: "info@healthspire.org",
    phone: "+92 312 7231875",
    logo: "/HealthSpire%20logo.png",
    taxId: "",
    website: "www.healthspire.org",
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/estimates/${id}`);
        if (!r.ok) return;
        const d = await r.json();
        setEst(d);
      } catch {}
    })();
  }, [id]);

  const viewMode = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    const isPrint = sp.get("print") === "1";
    const mode = sp.get("mode") || "";
    const share = sp.get("share") === "1";
    const shareChannel = (sp.get("channel") || "").toLowerCase();
    const shareTo = sp.get("to") || "";
    const sharePhone = sp.get("phone") || "";
    return { isPrint, isPdf: mode === "pdf", share, shareChannel, shareTo, sharePhone };
  }, [location.search]);

  const uploadPdf = async (blob: Blob, filename: string) => {
    const fd = new FormData();
    fd.append("file", new File([blob], filename, { type: "application/pdf" }));
    const r = await fetch(`${API_BASE}/api/estimates/upload`, { method: "POST", body: fd });
    if (!r.ok) throw new Error("Upload failed");
    const json = await r.json().catch(() => null);
    const p = String(json?.path || "");
    if (!p) throw new Error("Upload failed");
    return `${API_BASE}${p}`;
  };

  const openShareTarget = (pdfUrl: string) => {
    const subject = `Estimate ${est?.number || id || ""}`.trim() || "Estimate";
    const body = `Hello,\n\nPlease find the estimate here: ${pdfUrl}\n\nThanks`;
    if (viewMode.shareChannel === "whatsapp") {
      const text = `Estimate: ${pdfUrl}`;
      const webBase = viewMode.sharePhone ? `https://wa.me/${encodeURIComponent(viewMode.sharePhone)}` : "https://wa.me/";
      const webUrl = `${webBase}?text=${encodeURIComponent(text)}`;
      const deepLink = `whatsapp://send?text=${encodeURIComponent(text)}${viewMode.sharePhone ? `&phone=${encodeURIComponent(viewMode.sharePhone)}` : ""}`;
      const t = window.setTimeout(() => { window.location.href = webUrl; }, 700);
      window.location.href = deepLink;
      window.setTimeout(() => window.clearTimeout(t), 1500);
      return;
    }
    const to = viewMode.shareTo ? encodeURIComponent(viewMode.shareTo) : "";
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  useEffect(() => {
    const shouldAutoClose = viewMode.isPrint || viewMode.isPdf;
    autoCloseRef.current = shouldAutoClose;
    const onAfterPrint = () => {
      if (!autoCloseRef.current) return;
      try { window.close(); } catch {}
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, [viewMode.isPrint, viewMode.isPdf]);

  useEffect(() => {
    if (!est) return;
    if (viewMode.isPrint) {
      const t = window.setTimeout(() => { try { window.print(); } catch {} }, 350);
      return () => window.clearTimeout(t);
    }
  }, [viewMode.isPrint, est]);

  useEffect(() => {
    if (!est) return;
    if (!viewMode.isPdf) return;
    const el = pdfTargetRef.current; if (!el) return;
    const t = window.setTimeout(async () => {
      try {
        const html2pdf = await loadHtml2Pdf();
        const filename = `estimate-${est?.number || id || ""}.pdf`;
        await html2pdf()
          .set({
            margin: 0,
            filename,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak: { mode: ["avoid-all", "css", "legacy"], avoid: ["tr", "table"] },
          } as any)
          .from(el)
          .save();
        try { window.close(); } catch {}
      } catch {}
    }, 450);
    return () => window.clearTimeout(t);
  }, [viewMode.isPdf, est, id]);

  useEffect(() => {
    if (!est) return;
    if (!viewMode.share) return;
    if (isSharing) return;
    const el = pdfTargetRef.current; if (!el) return;
    setIsSharing(true);
    const t = window.setTimeout(async () => {
      try {
        const html2pdf = await loadHtml2Pdf();
        const filename = `estimate-${est?.number || id || ""}.pdf`;
        const worker: any = html2pdf()
          .set({
            margin: 0,
            filename,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak: { mode: ["avoid-all", "css", "legacy"], avoid: ["tr", "table"] },
          } as any)
          .from(el)
          .toPdf();
        const pdfObj = await worker.get("pdf");
        const blob: Blob = await pdfObj.output("blob");
        const pdfUrl = await uploadPdf(blob, filename);
        openShareTarget(pdfUrl);
      } catch {
      } finally {
        try { window.close(); } catch {}
      }
    }, 450);
    return () => window.clearTimeout(t);
  }, [est, viewMode.share, viewMode.shareChannel, viewMode.shareTo, viewMode.sharePhone, id, isSharing]);

  const formatClient = (c: any) => {
    if (!c) return "-";
    if (typeof c === "string") return c;
    return c.name || c.company || c.person || "-";
  };

  const viewPaymentInfo = ((est?.paymentInfo || "").trim() ? est.paymentInfo : DEFAULT_PAYMENT_INFO);

  const itemsSub = useMemo(() => {
    const list: any[] = Array.isArray(est?.items) ? est!.items : [];
    if (!list.length) return Number(est?.amount || 0);
    return list.reduce((sum, it) => sum + (Number(it.quantity ?? it.qty ?? 0) * Number(it.rate ?? 0)), 0);
  }, [est]);
  const subTotal = itemsSub;
  const tax1 = (est?.tax1 ?? est?.tax ?? 0) / 100 * subTotal;
  const tax2 = (est?.tax2 ?? 0) / 100 * subTotal;
  const tds = (est?.tds ?? 0) / 100 * subTotal;
  const advance = Number(est?.advancedAmount || est?.advanceAmount || 0);
  const total = subTotal + tax1 + tax2 - tds - advance;

  const viewBrand = {
    name: est?.branding?.name || company.name,
    address: est?.branding?.address || company.address,
    city: company.city,
    email: est?.branding?.email || company.email,
    phone: est?.branding?.phone || company.phone,
    logo: est?.branding?.logo || company.logo,
    taxId: est?.branding?.taxId || company.taxId,
    website: est?.branding?.website || company.website,
  };

  const labelsList = useMemo(() => {
    const raw = est?.labels;
    if (!raw) return [] as string[];
    if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
    if (typeof raw === "string") return raw.split(",").map((s) => s.trim()).filter(Boolean);
    return [String(raw)].map((s) => s.trim()).filter(Boolean);
  }, [est?.labels]);

  return (
    <div className={`estimate-preview p-4 bg-gray-100 min-h-screen ${viewMode.isPdf ? "pdf-mode" : ""}`}>
      <style>{`
/* PDF generation uses screen CSS, not @media print. */
.pdf-mode { padding: 0 !important; background: white !important; min-height: auto !important; }
.pdf-mode .estimate-card { box-shadow: none !important; border: none !important; max-width: none !important; width: 210mm !important; overflow: visible !important; }
.pdf-mode .estimate-scale { transform: none !important; transform-origin: initial !important; width: 210mm !important; }
/* Slightly reduce internal paddings in PDF mode */
.pdf-mode .estimate-card .p-8 { padding: 12px !important; }
.pdf-mode .estimate-card .p-6 { padding: 10px !important; }
.pdf-mode .estimate-card .py-4 { padding-top: 8px !important; padding-bottom: 8px !important; }
/* Ensure footer stays at bottom for PDF render and fill A4 height */
.pdf-mode .estimate-page { display: flex; flex-direction: column; min-height: 297mm; }
.pdf-mode .estimate-footer { margin-top: auto; padding: 10px 12px !important; }
.pdf-mode .estimate-footer .text-sm { font-size: 11px !important; }
.pdf-mode .estimate-footer .text-xs { font-size: 10px !important; }
/* tighten header for PDF mode */
.pdf-mode .estimate-header { padding-top: 12px !important; padding-bottom: 8px !important; border-bottom-width: 2px !important; }
.pdf-mode .estimate-title { font-size: 36px !important; line-height: 1.12 !important; padding-top: 6px !important; padding-bottom: 6px !important; border-width: 1px !important; box-shadow: none !important; }
.pdf-mode .est-meta { margin-top: 4px !important; }

@media print {
  @page { size: A4 portrait; margin: 0; }
  html, body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print\:hidden { display: none !important; }
  .estimate-preview { padding: 0 !important; background: white !important; min-height: auto !important; }
  .estimate-card { box-shadow: none !important; border: none !important; max-width: none !important; width: 210mm !important; overflow: visible !important; }
  .estimate-scale { transform: none !important; transform-origin: initial !important; width: 210mm !important; }
  /* Reduce internal paddings in print */
  .estimate-card .p-8 { padding: 10px !important; }
  .estimate-card .p-6 { padding: 8px !important; }
  .estimate-card .py-4 { padding-top: 6px !important; padding-bottom: 6px !important; }
  .estimate-card thead th { padding: 8px !important; }
  .estimate-card th, .estimate-card td { padding: 6px 8px !important; }
  table, tr, td, th { page-break-inside: avoid !important; break-inside: avoid !important; }
  /* Ensure footer stays at bottom for print and page fills A4 */
  .estimate-page { display: flex; flex-direction: column; min-height: 297mm; }
  .estimate-footer { margin-top: auto; padding: 8px 12px !important; }
  .estimate-footer .text-sm { font-size: 11px !important; }
  .estimate-footer .text-xs { font-size: 10px !important; }
  /* tighten header for print */
  .estimate-header { padding-top: 12px !important; padding-bottom: 8px !important; border-bottom-width: 2px !important; }
  .estimate-title { font-size: 34px !important; line-height: 1.12 !important; padding-top: 6px !important; padding-bottom: 6px !important; border-width: 1px !important; box-shadow: none !important; }
  .est-meta { margin-top: 4px !important; }
}
      `}</style>
      <div className={`flex items-center justify-end mb-3 print:hidden ${viewMode.isPdf ? "hidden" : ""}`}>
        <Button variant="outline" onClick={() => navigate(-1)}>Close</Button>
      </div>
      <div className="estimate-card bg-white shadow-lg mx-auto max-w-5xl border rounded-lg overflow-hidden">
        <div className="estimate-scale estimate-page" ref={pdfTargetRef}>
          {/* Header */}
          <div className="pt-12 pb-8 px-8 border-b-4 border-sky-600 bg-gradient-to-r from-sky-50 to-blue-50 estimate-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <img src={viewBrand.logo} alt={viewBrand.name} className="h-32 w-32 object-contain drop-shadow-lg" />
                <div>
                  <div className="text-4xl font-extrabold text-sky-800 leading-tight">{viewBrand.name}</div>
                  <div className="text-sm text-gray-600">{viewBrand.website}</div>
                </div>
              </div>
              <div className="text-sm text-gray-700 text-right">
                <div className="grid grid-cols-1 gap-1">
                  <div>📞 {viewBrand.phone}</div>
                  <div>✉️ {viewBrand.email}</div>
                  <div>📍 {viewBrand.address}</div>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <div className="text-6xl font-black text-sky-900 tracking-widest text-center uppercase bg-white py-4 rounded-lg shadow-lg border-2 border-sky-600 estimate-title">Estimate</div>
              <div className="mt-4 grid grid-cols-2 gap-4 items-end text-sm text-gray-700 est-meta">
                <div className="font-semibold">
                  ESTIMATE TO: <span className="ml-2 font-normal">{formatClient(est?.client)}</span>
                </div>
                <div className="flex justify-end">
                  <div className="bg-gray-50 border rounded-lg px-4 py-2 grid grid-cols-3 gap-6">
                    <div>Number: {est?.number || id}</div>
                    <div>Date: {est?.estimateDate ? new Date(est.estimateDate).toLocaleDateString() : '-'}</div>
                    <div>Valid Until: {est?.validUntil ? new Date(est.validUntil).toLocaleDateString() : '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bill To/From */}
          <div className="p-8 bg-gray-50">
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Bill To:</div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="font-semibold text-gray-900">{formatClient(est?.client)}</div>
                  {est?.clientId && (
                    <div className="text-sm text-gray-500 mt-1">Client ID: {est.clientId}</div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Bill From:</div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="font-semibold text-gray-900">{viewBrand.name}</div>
                  <div className="text-sm text-gray-600 mt-1">{viewBrand.address}</div>
                  <div className="text-sm text-gray-600">{viewBrand.city}</div>
                  <div className="text-sm text-gray-600">{viewBrand.email}</div>
                  <div className="text-sm text-gray-600">{viewBrand.phone}</div>
                  <div className="text-sm text-gray-500 mt-1">TAX ID: {viewBrand.taxId || ""}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="p-8">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-gray-100 border-b-2 border-gray-300">
                  <TableHead className="text-left p-4 font-semibold text-gray-700">Item Description</TableHead>
                  <TableHead className="text-center p-4 w-32 font-semibold text-gray-700">Quantity</TableHead>
                  <TableHead className="text-right p-4 w-32 font-semibold text-gray-700">Price</TableHead>
                  <TableHead className="text-right p-4 w-40 font-semibold text-gray-700">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {est?.items?.length ? (
                  est.items.map((it:any, idx:number)=> (
                    <TableRow key={idx} className="border-b hover:bg-gray-50">
                      <TableCell className="p-4">
                        <div className="font-medium text-gray-900">{it.name || it.item || it.title || '-'}</div>
                        {it.description && (
                          <div className="text-sm text-gray-500 mt-1">{it.description}</div>
                        )}
                      </TableCell>
                      <TableCell className="p-4 text-center">{(it.quantity ?? it.qty) ?? '-'}</TableCell>
                      <TableCell className="p-4 text-right">Rs.{Number(it.rate ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="p-4 text-right font-medium">Rs.{(Number(it.quantity ?? it.qty ?? 0) * Number(it.rate ?? 0)).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="p-8 text-center text-gray-500">
                      No items specified. Total amount: Rs.{subTotal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Notes and Labels */}
          {(est?.note || est?.labels) && (
            <div className="px-8 pb-4">
              {est?.note && (
                <div className="mb-4">
                  <div className="text-sm font-semibold text-gray-700 mb-1">Notes:</div>
                  <div className="bg-gray-50 p-3 rounded border text-sm text-gray-700">{est.note}</div>
                </div>
              )}
              {labelsList.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-semibold text-gray-700 mb-1">Labels:</div>
                  <div className="flex flex-wrap gap-2">
                    {labelsList.map((label: string, idx: number) => (
                      <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        {label.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Totals & Payment Information */}
          <div className="px-8 pb-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <div className="text-sky-700 font-extrabold mb-2">PAYMENT INFORMATION:</div>
                  <div className="bg-gray-50 p-4 rounded border text-sm text-gray-800 space-y-3">
                    <div className="whitespace-pre-wrap">{viewPaymentInfo}</div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg border">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">Sub Total:</span>
                    <span className="font-medium">Rs.{subTotal.toFixed(2)}</span>
                  </div>
                  {tax1 > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">TAX ({est?.tax1 ?? est?.tax}%):</span>
                      <span className="text-gray-700">Rs.{tax1.toFixed(2)}</span>
                    </div>
                  )}
                  {tax2 > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Second TAX ({est?.tax2}%):</span>
                      <span className="text-gray-700">Rs.{tax2.toFixed(2)}</span>
                    </div>
                  )}
                  {tds > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">TDS ({est?.tds}%):</span>
                      <span className="text-red-600">-Rs.{tds.toFixed(2)}</span>
                    </div>
                  )}
                  {est?.advancedAmount && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Advance Amount:</span>
                      <span className="text-red-600">-Rs.{Number(est.advancedAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-3 border-t-2 border-gray-300">
                    <span className="text-lg font-bold text-gray-900">Total:</span>
                    <span className="text-lg font-bold text-gray-900">Rs.{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="estimate-footer bg-gray-900 text-white p-6 text-center">
            <div className="text-sm space-y-1">
              <div>Thank you for considering our estimate!</div>
              <div className="text-xs text-gray-400">
                This is a computer-generated estimate. No signature is required.
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {viewBrand.name} | {viewBrand.email} | {viewBrand.phone} | {viewBrand.website}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
