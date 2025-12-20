import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import html2pdf from "html2pdf.js";

const API_BASE = "http://localhost:5000";

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
        const row = await r.json();
        setEst(row);
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

  const isEmbedded = useMemo(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }, []);

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
    if (!est) return;
    if (viewMode.isPrint) {
      const t = window.setTimeout(() => {
        try {
          window.print();
        } catch {}
      }, 350);
      return () => window.clearTimeout(t);
    }
  }, [viewMode.isPrint, est]);

  useEffect(() => {
    if (!est) return;
    if (!viewMode.isPdf) return;
    const el = pdfTargetRef.current;
    if (!el) return;

    const t = window.setTimeout(async () => {
      try {
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

        try {
          window.close();
        } catch {}
      } catch {}
    }, 450);
    return () => window.clearTimeout(t);
  }, [viewMode.isPdf, est, id]);

  useEffect(() => {
    if (!est) return;
    if (!viewMode.share) return;
    if (isSharing) return;
    const el = pdfTargetRef.current;
    if (!el) return;

    setIsSharing(true);
    const t = window.setTimeout(async () => {
      try {
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
        try {
          window.close();
        } catch {}
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
  const tax1 = (est?.tax ?? 0) / 100 * subTotal;
  const tax2 = (est?.tax2 ?? 0) / 100 * subTotal;
  const advance = Number(est?.advancedAmount || 0);
  const total = subTotal + tax1 + tax2 - advance;
  const paid = 0;
  const balance = total - paid;

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
  .print\\:hidden { display: none !important; }
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
      {!isEmbedded && (
        <div className={`flex items-center justify-end mb-3 print:hidden ${viewMode.isPdf ? "hidden" : ""}`}>
          <Button
            variant="outline"
            onClick={() => {
              try {
                window.close();
              } catch {}
              // fallback if the browser blocks closing
              try {
                navigate(-1);
              } catch {}
            }}
          >
            Close
          </Button>
        </div>
      )}
      <div className="invoice-card bg-white shadow-lg mx-auto max-w-5xl border rounded-lg overflow-hidden">
        <div className="invoice-scale" ref={pdfTargetRef}>
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
            <div className="text-3xl font-extrabold text-sky-700 tracking-wide">INVOICE ESTIMATE</div>
            <div className="mt-2 flex items-center justify-between text-sm text-gray-700">
              <div className="font-semibold">INVOICE TO: <span className="ml-2 font-normal">{formatClient(est?.client)}</span></div>
              <div className="flex gap-6">
                <div>Number: {est?.number || id}</div>
                <div>Date: {est?.estimateDate ? new Date(est.estimateDate).toLocaleDateString() : "-"}</div>
                <div>Valid Until: {est?.validUntil ? new Date(est.validUntil).toLocaleDateString() : "-"}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-gray-50">
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Bill To:</div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="font-semibold text-gray-900">{formatClient(est?.client)}</div>
                {est?.clientId && (
                  <div className="text-sm text-gray-500 mt-1">Client ID: {String(est.clientId)}</div>
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
              {est?.items?.length ? (
                est.items.map((it: any, idx: number) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{it.item || it.name || it.title || "-"}</div>
                      {it.description && (
                        <div className="text-sm text-gray-500 mt-1">{it.description}</div>
                      )}
                    </td>
                    <td className="p-4 text-center">{it.quantity ?? it.qty ?? "-"}</td>
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

        {est?.note && (
          <div className="px-8 pb-4">
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-700 mb-1">Notes:</div>
              <div className="bg-gray-50 p-3 rounded border text-sm text-gray-700">{est.note}</div>
            </div>
          </div>
        )}

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
                    <span className="text-gray-600">TAX ({est?.tax}%):</span>
                    <span className="text-gray-700">Rs.{tax1.toFixed(2)}</span>
                  </div>
                )}
                {tax2 > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Second TAX ({est?.tax2}%):</span>
                    <span className="text-gray-700">Rs.{tax2.toFixed(2)}</span>
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
