import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

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

export default function InvoicePreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [inv, setInv] = useState<any | null>(null);
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
    website: "www.healthspire.org"
  });
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/invoices/${id}`);
        if (!r.ok) return;
        const invRow = await r.json();
        setInv(invRow);

        const invId = String(invRow?._id || "");
        const p = await fetch(`${API_BASE}/api/payments?invoiceId=${encodeURIComponent(invId)}`);
        if (p.ok) setPayments(await p.json());
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
    return {
      isPrint,
      isPdf: mode === "pdf",
      share,
      shareChannel,
      shareTo,
      sharePhone,
    };
  }, [location.search]);

  const uploadPdf = async (blob: Blob, filename: string) => {
    const fd = new FormData();
    fd.append("file", new File([blob], filename, { type: "application/pdf" }));
    const r = await fetch(`${API_BASE}/api/invoices/upload`, { method: "POST", body: fd });
    if (!r.ok) throw new Error("Upload failed");
    const json = await r.json().catch(() => null);
    const p = String(json?.path || "");
    if (!p) throw new Error("Upload failed");
    return `${API_BASE}${p}`;
  };

  const openShareTarget = (pdfUrl: string) => {
    const subject = `Invoice ${inv?.number || id || ""}`.trim() || "Invoice";
    const body = `Hello,\n\nPlease find the invoice here: ${pdfUrl}\n\nThanks`;
    if (viewMode.shareChannel === "whatsapp") {
      const text = `Invoice: ${pdfUrl}`;
      const webBase = viewMode.sharePhone ? `https://wa.me/${encodeURIComponent(viewMode.sharePhone)}` : "https://wa.me/";
      const webUrl = `${webBase}?text=${encodeURIComponent(text)}`;
      const deepLink = `whatsapp://send?text=${encodeURIComponent(text)}${viewMode.sharePhone ? `&phone=${encodeURIComponent(viewMode.sharePhone)}` : ""}`;
      const t = window.setTimeout(() => {
        window.location.href = webUrl;
      }, 700);
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
      try {
        window.close();
      } catch {}
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, [viewMode.isPrint, viewMode.isPdf]);

  useEffect(() => {
    if (!inv) return;
    if (viewMode.isPrint) {
      const t = window.setTimeout(() => {
        try {
          window.print();
        } catch {}
      }, 350);
      return () => window.clearTimeout(t);
    }
  }, [viewMode.isPrint, inv]);

  useEffect(() => {
    if (!inv) return;
    if (!viewMode.isPdf) return;
    const el = pdfTargetRef.current;
    if (!el) return;

    const t = window.setTimeout(async () => {
      try {
        const html2pdf = await loadHtml2Pdf();
        const filename = `invoice-${inv?.number || id || ""}.pdf`;
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

        // close the tab after download triggers
        try {
          window.close();
        } catch {}
      } catch {
        // if PDF generation fails, do nothing
      }
    }, 450);
    return () => window.clearTimeout(t);
  }, [viewMode.isPdf, inv, id]);

  useEffect(() => {
    if (!inv) return;
    if (!viewMode.share) return;
    if (isSharing) return;
    const el = pdfTargetRef.current;
    if (!el) return;

    setIsSharing(true);
    const t = window.setTimeout(async () => {
      try {
        const html2pdf = await loadHtml2Pdf();
        const filename = `invoice-${inv?.number || id || ""}.pdf`;
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
        try {
          window.close();
        } catch {}
      }
    }, 450);

    return () => window.clearTimeout(t);
  }, [inv, viewMode.share, viewMode.shareChannel, viewMode.shareTo, viewMode.sharePhone, id, isSharing]);

  const formatClient = (c: any) => {
    if (!c) return "-";
    if (typeof c === "string") return c;
    return c.name || c.company || c.person || "-";
  };

  const viewPaymentInfo = ((inv?.paymentInfo || "").trim() ? inv.paymentInfo : DEFAULT_PAYMENT_INFO);

  const itemsSub = useMemo(() => {
    const list: any[] = Array.isArray(inv?.items) ? inv!.items : [];
    if (!list.length) return Number(inv?.amount || 0);
    return list.reduce((sum, it) => sum + (Number(it.quantity ?? it.qty ?? 0) * Number(it.rate ?? 0)), 0);
  }, [inv]);
  const subTotal = itemsSub;
  const tax1 = (inv?.tax1 ?? 0) / 100 * subTotal;
  const tax2 = (inv?.tax2 ?? 0) / 100 * subTotal;
  const tds = (inv?.tds ?? 0) / 100 * subTotal;
  const advance = Number(inv?.advanceAmount || 0);
  const total = subTotal + tax1 + tax2 - tds - advance;
  const paid = useMemo(() => (Array.isArray(payments) ? payments.reduce((s, p:any)=> s + (Number(p.amount)||0), 0) : 0), [payments]);
  const balance = total - paid;

  const viewBrand = {
    name: inv?.branding?.name || company.name,
    address: inv?.branding?.address || company.address,
    city: company.city,
    email: inv?.branding?.email || company.email,
    phone: inv?.branding?.phone || company.phone,
    logo: inv?.branding?.logo || company.logo,
    taxId: inv?.branding?.taxId || company.taxId,
    website: inv?.branding?.website || company.website,
  };

  const labelsList = useMemo(() => {
    const raw = inv?.labels;
    if (!raw) return [] as string[];
    if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
    if (typeof raw === "string") return raw.split(",").map((s) => s.trim()).filter(Boolean);
    return [String(raw)].map((s) => s.trim()).filter(Boolean);
  }, [inv?.labels]);

  return (
    <div className={`invoice-preview p-4 bg-gray-100 min-h-screen ${viewMode.isPdf ? "pdf-mode" : ""}`}>
      <style>{`
/* PDF generation uses screen CSS, not @media print. */
.pdf-mode { padding: 0 !important; background: white !important; min-height: auto !important; }
.pdf-mode .invoice-card { box-shadow: none !important; border: none !important; max-width: none !important; width: 210mm !important; overflow: visible !important; }
.pdf-mode .invoice-scale { transform: scale(0.76); transform-origin: top left; width: calc(210mm / 0.76) !important; }
.pdf-mode .invoice-card .p-8 { padding: 14px !important; }
.pdf-mode .invoice-card .p-6 { padding: 12px !important; }
.pdf-mode .invoice-card .py-4 { padding-top: 10px !important; padding-bottom: 10px !important; }
.pdf-mode .invoice-card .pb-8 { padding-bottom: 16px !important; }
.pdf-mode .invoice-card .mt-4 { margin-top: 10px !important; }
.pdf-mode .invoice-card .gap-12 { gap: 20px !important; }

@media print {
  @page { size: A4 portrait; margin: 4mm; }
  html, body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print\:hidden { display: none !important; }
  .invoice-preview { padding: 0 !important; background: white !important; min-height: auto !important; }
  .invoice-card { box-shadow: none !important; border: none !important; max-width: none !important; width: 210mm !important; overflow: visible !important; }
  .invoice-scale { transform: scale(0.82); transform-origin: top left; width: calc(210mm / 0.82) !important; }
  .invoice-card .p-8 { padding: 16px !important; }
  .invoice-card .p-6 { padding: 14px !important; }
  .invoice-card .py-4 { padding-top: 10px !important; padding-bottom: 10px !important; }
  .invoice-card .pb-8 { padding-bottom: 16px !important; }
  .invoice-card .mt-4 { margin-top: 10px !important; }
  .invoice-card .gap-12 { gap: 20px !important; }
  table, tr, td, th { page-break-inside: avoid !important; break-inside: avoid !important; }
}
      `}</style>
      <div className={`flex items-center justify-end mb-3 print:hidden ${viewMode.isPdf ? "hidden" : ""}`}>
        <Button variant="outline" onClick={() => navigate(-1)}>Close</Button>
      </div>
      <div className="invoice-card bg-white shadow-lg mx-auto max-w-5xl border rounded-lg overflow-hidden">
        <div className="invoice-scale" ref={pdfTargetRef}>
        {/* HealthSpire Header */}
        <div className="p-6 border-b bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={viewBrand.logo} alt={viewBrand.name} className="h-20 w-20 object-contain" />
              <div>
                <div className="text-xl font-bold text-sky-700">{viewBrand.name}</div>
                <div className="text-xs text-gray-600">{viewBrand.website}</div>
              </div>
            </div>
            <div className="text-xs text-gray-700 text-right">
              <div className="flex gap-6">
                <div>📞 {viewBrand.phone}</div>
                <div>✉️ {viewBrand.email}</div>
                <div>📍 {viewBrand.address}</div>
              </div>
            </div>
          </div>
          <div className="mt-4 border-t pt-4 text-center">
            <div className="text-3xl font-extrabold text-sky-700 tracking-wide">INVOICE</div>
            <div className="mt-2 flex items-center justify-between text-sm text-gray-700">
              <div className="font-semibold">INVOICE TO: <span className="ml-2 font-normal">{formatClient(inv?.client)}</span></div>
              <div className="flex gap-6">
                <div>Number: {inv?.number || id}</div>
                <div>Date: {inv?.issueDate ? new Date(inv.issueDate).toLocaleDateString() : '-'}</div>
                <div>Due: {inv?.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To/From Section */}
        <div className="p-8 bg-gray-50">
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Bill To:</div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="font-semibold text-gray-900">{formatClient(inv?.client)}</div>
                {inv?.clientId && (
                  <div className="text-sm text-gray-500 mt-1">Client ID: {inv.clientId}</div>
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

        {/* Project Information */}
        {inv?.project && (
          <div className="px-8 py-4 bg-blue-50 border-b">
            <div className="text-sm">
              <span className="font-semibold text-gray-700">Project:</span> 
              <span className="ml-2 text-gray-900">{inv.project}</span>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="p-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="text-left p-4 font-semibold text-gray-700">Item Description</th>
                <th className="text-center p-4 w-32 font-semibold text-gray-700">Quantity</th>
                <th className="text-right p-4 w-32 font-semibold text-gray-700">Price</th>
                <th className="text-right p-4 w-40 font-semibold text-gray-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {inv?.items?.length ? (
                inv.items.map((it:any, idx:number)=> (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{it.name || it.title || '-'}</div>
                      {it.description && (
                        <div className="text-sm text-gray-500 mt-1">{it.description}</div>
                      )}
                    </td>
                    <td className="p-4 text-center">{(it.quantity ?? it.qty) ?? '-'}</td>
                    <td className="p-4 text-right">Rs.{Number(it.rate ?? 0).toLocaleString()}</td>
                    <td className="p-4 text-right font-medium">Rs.{(Number(it.quantity ?? it.qty ?? 0) * Number(it.rate ?? 0)).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    No items specified. Total amount: Rs.{subTotal.toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Notes and Labels */}
        {(inv?.note || inv?.labels) && (
          <div className="px-8 pb-4">
            {inv?.note && (
              <div className="mb-4">
                <div className="text-sm font-semibold text-gray-700 mb-1">Notes:</div>
                <div className="bg-gray-50 p-3 rounded border text-sm text-gray-700">{inv.note}</div>
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

        {/* Totals & Payment Information Section */}
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
                    <span className="text-gray-600">TAX ({inv?.tax1}%):</span>
                    <span className="text-gray-700">Rs.{tax1.toFixed(2)}</span>
                  </div>
                )}
                {tax2 > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Second TAX ({inv?.tax2}%):</span>
                    <span className="text-gray-700">Rs.{tax2.toFixed(2)}</span>
                  </div>
                )}
                {tds > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">TDS ({inv?.tds}%):</span>
                    <span className="text-red-600">-Rs.{tds.toFixed(2)}</span>
                  </div>
                )}
                {inv?.advanceAmount && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Advance Amount:</span>
                    <span className="text-red-600">-Rs.{Number(inv.advanceAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 border-t-2 border-gray-300">
                  <span className="text-lg font-bold text-gray-900">Total:</span>
                  <span className="text-lg font-bold text-gray-900">Rs.{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Paid:</span>
                  <span className="text-green-600 font-medium">Rs.{paid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 border-t">
                  <span className="text-lg font-bold text-gray-900">Balance Due:</span>
                  <span className="text-lg font-bold text-red-600">Rs.{balance.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-900 text-white p-6 text-center">
          <div className="text-sm space-y-1">
            <div>Thank you for your business!</div>
            <div className="text-xs text-gray-400">
              This is a computer-generated invoice. No signature is required.
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
