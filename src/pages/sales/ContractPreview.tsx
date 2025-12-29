import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const API_BASE = "http://localhost:5000";

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

export default function ContractPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [doc, setDoc] = useState<any | null>(null);
  const pdfTargetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/contracts/${id}`);
        if (!r.ok) return;
        const d = await r.json();
        setDoc(d);
      } catch {}
    })();
  }, [id]);

  const viewMode = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    return { isPrint: sp.get("print") === "1", isPdf: sp.get("mode") === "pdf" };
  }, [location.search]);

  useEffect(() => {
    if (!doc) return;
    if (viewMode.isPrint) {
      const t = window.setTimeout(() => {
        try { window.print(); } catch {}
      }, 350);
      return () => window.clearTimeout(t);
    }
  }, [viewMode.isPrint, doc]);

  useEffect(() => {
    if (!doc || !viewMode.isPdf) return;
    const el = pdfTargetRef.current; if (!el) return;
    const t = window.setTimeout(async () => {
      try {
        const html2pdf = await loadHtml2Pdf();
        const filename = `contract-${doc?._id || id}.pdf`;
        await html2pdf().set({
          margin: 0,
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"], avoid: ["tr", "table"] },
        } as any).from(el).save();
        try { window.close(); } catch {}
      } catch {}
    }, 450);
    return () => window.clearTimeout(t);
  }, [viewMode.isPdf, doc, id]);

  const items: any[] = Array.isArray(doc?.items) ? doc!.items : [];
  const subTotal = useMemo(() => items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.rate || 0), 0), [items]);
  const tax1 = (Number(doc?.tax1 || 0) / 100) * subTotal;
  const tax2 = (Number(doc?.tax2 || 0) / 100) * subTotal;
  const total = subTotal + tax1 + tax2;

  const replaceTokens = (s: string): string => {
    const map: Record<string, string> = {
      "{{client}}": String(doc?.client || "-") || "-",
      "{{project}}": "-",
      "{{contract_date}}": doc?.contractDate ? new Date(doc.contractDate).toLocaleDateString() : "-",
      "{{valid_until}}": doc?.validUntil ? new Date(doc.validUntil).toLocaleDateString() : "-",
      "{{subtotal}}": `Rs.${subTotal.toLocaleString()}`,
      "{{tax1}}": `Rs.${tax1.toLocaleString()}`,
      "{{tax2}}": `Rs.${tax2.toLocaleString()}`,
      "{{total}}": `Rs.${total.toLocaleString()}`,
    };
    let out = String(s || "");
    for (const k of Object.keys(map)) {
      out = out.split(k).join(map[k]);
    }
    return out;
  };

  const noteRaw = String(doc?.note || "");
  const noteHtml = useMemo(() => {
    const replaced = replaceTokens(noteRaw);
    const looksHtml = /<\w+[^>]*>/i.test(replaced);
    return looksHtml ? replaced : replaced.replace(/\n/g, "<br/>");
  }, [noteRaw, doc?.client, doc?.contractDate, doc?.validUntil, subTotal, tax1, tax2, total]);

  const viewBrand = {
    name: "HealthSpire",
    email: "info@healthspire.org",
    phone: "+92 312 7231875",
    address: "761/D2 Shah Jelani Rd Township Lahore",
    website: "www.healthspire.org",
    logo: "/HealthSpire%20logo.png",
  };

  return (
    <div className={`invoice-preview p-4 bg-gray-100 min-h-screen ${viewMode.isPdf ? "pdf-mode" : ""}`}>
      <style>{`
/* PDF generation uses screen CSS, not @media print. */
.pdf-mode { padding: 0 !important; background: white !important; min-height: auto !important; }
.pdf-mode .invoice-card { box-shadow: none !important; border: none !important; max-width: none !important; width: 210mm !important; overflow: visible !important; }
.pdf-mode .invoice-scale { transform: none !important; transform-origin: initial !important; width: 210mm !important; }
.pdf-mode .invoice-card .p-8 { padding: 12px !important; }
.pdf-mode .invoice-card .p-6 { padding: 10px !important; }
.pdf-mode .invoice-card .py-4 { padding-top: 8px !important; padding-bottom: 8px !important; }
.pdf-mode .invoice-card .pb-8 { padding-bottom: 16px !important; }
.pdf-mode .invoice-card .mt-4 { margin-top: 10px !important; }
.pdf-mode .invoice-card .gap-12 { gap: 20px !important; }
.pdf-mode .invoice-page { display: flex; flex-direction: column; min-height: 297mm; }
.pdf-mode .invoice-footer { margin-top: auto; padding: 10px 12px !important; }
.pdf-mode .invoice-footer .text-sm { font-size: 11px !important; }
.pdf-mode .invoice-footer .text-xs { font-size: 10px !important; }
.pdf-mode .invoice-header { padding-top: 12px !important; padding-bottom: 8px !important; border-bottom-width: 2px !important; }
.pdf-mode .invoice-title { font-size: 36px !important; line-height: 1.12 !important; padding-top: 6px !important; padding-bottom: 6px !important; border-width: 1px !important; box-shadow: none !important; }
.pdf-mode .inv-meta { margin-top: 4px !important; }

@media print {
  @page { size: A4 portrait; margin: 0; }
  html, body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print\\:hidden { display: none !important; }
  .invoice-preview { padding: 0 !important; background: white !important; min-height: auto !important; }
  .invoice-card { box-shadow: none !important; border: none !important; max-width: none !important; width: 210mm !important; overflow: visible !important; }
  .invoice-scale { transform: none !important; transform-origin: initial !important; width: 210mm !important; }
  .invoice-card .p-8 { padding: 10px !important; }
  .invoice-card .p-6 { padding: 8px !important; }
  .invoice-card .py-4 { padding-top: 6px !important; padding-bottom: 6px !important; }
  .invoice-card .pb-8 { padding-bottom: 12px !important; }
  .invoice-card .mt-4 { margin-top: 8px !important; }
  .invoice-card .gap-12 { gap: 20px !important; }
  table, tr, td, th { page-break-inside: avoid !important; break-inside: avoid !important; }
  .invoice-page { display: flex; flex-direction: column; min-height: 297mm; }
  .invoice-footer { margin-top: auto; padding: 8px 12px !important; }
  .invoice-footer .text-sm { font-size: 11px !important; }
  .invoice-footer .text-xs { font-size: 10px !important; }
  .invoice-header { padding-top: 12px !important; padding-bottom: 8px !important; border-bottom-width: 2px !important; }
  .invoice-title { font-size: 34px !important; line-height: 1.12 !important; padding-top: 6px !important; padding-bottom: 6px !important; border-width: 1px !important; box-shadow: none !important; }
  .inv-meta { margin-top: 4px !important; }
}
      `}</style>
      <div className={`flex items-center justify-end mb-3 print:hidden ${viewMode.isPdf ? "hidden" : ""}`}>
        <Button variant="outline" onClick={() => navigate(-1)}>Close</Button>
      </div>
      <div className="invoice-card bg-white shadow-lg mx-auto max-w-5xl border rounded-lg overflow-hidden">
        <div className="invoice-scale invoice-page" ref={pdfTargetRef}>
          <div className="pt-12 pb-8 px-8 border-b-4 border-sky-600 bg-gradient-to-r from-sky-50 to-blue-50 invoice-header">
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
              <div className="text-6xl font-black text-sky-900 tracking-widest text-center uppercase bg-white py-4 rounded-lg shadow-lg border-2 border-sky-600 invoice-title">Contract</div>
              <div className="mt-4 grid grid-cols-2 gap-4 items-end text-sm text-gray-700 inv-meta">
                <div className="font-semibold">
                  CONTRACT TO: <span className="ml-2 font-normal">{doc?.client || '-'}</span>
                </div>
                <div className="flex justify-end">
                  <div className="bg-gray-50 border rounded-lg px-4 py-2 grid grid-cols-2 gap-6">
                    <div>Date: {doc?.contractDate ? new Date(doc.contractDate).toLocaleDateString() : '-'}</div>
                    <div>Valid until: {doc?.validUntil ? new Date(doc.validUntil).toLocaleDateString() : '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            {noteRaw.trim() ? (
              <div className="mb-4">
                <div className="text-sm font-semibold text-gray-700 mb-1">Contract Terms:</div>
                <div className="bg-gray-50 p-3 rounded border text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: noteHtml }} />
              </div>
            ) : null}
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-gray-100 border-b-2 border-gray-300">
                  <TableHead className="text-left p-4 font-semibold text-gray-700">Item</TableHead>
                  <TableHead className="text-center p-4 w-32 font-semibold text-gray-700">Quantity</TableHead>
                  <TableHead className="text-right p-4 w-32 font-semibold text-gray-700">Rate</TableHead>
                  <TableHead className="text-right p-4 w-40 font-semibold text-gray-700">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length ? items.map((it, idx) => (
                  <TableRow key={idx} className="border-b hover:bg-gray-50">
                    <TableCell className="p-4">
                      <div className="font-medium text-gray-900">{it.name || '-'}</div>
                      {it.description ? (
                        <div className="text-sm text-gray-500 mt-1">{it.description}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="p-4 text-center">{it.quantity ?? '-'}</TableCell>
                    <TableCell className="p-4 text-right">Rs.{Number(it.rate ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="p-4 text-right font-medium">Rs.{(Number(it.quantity ?? 0) * Number(it.rate ?? 0)).toLocaleString()}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="p-8 text-center text-gray-500">No items specified. Total amount: Rs.{subTotal.toFixed(2)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="px-8 pb-8">
            <div className="ml-auto w-full sm:w-80">
              <div className="flex items-center justify-between py-1">
                <div className="text-muted-foreground">Sub Total</div>
                <div>Rs.{subTotal.toLocaleString()}</div>
              </div>
              <div className="flex items-center justify-between py-1">
                <div className="text-muted-foreground">Tax ({doc?.tax1 || 0}%)</div>
                <div>Rs.{tax1.toLocaleString()}</div>
              </div>
              <div className="flex items-center justify-between py-1">
                <div className="text-muted-foreground">Tax ({doc?.tax2 || 0}%)</div>
                <div>Rs.{tax2.toLocaleString()}</div>
              </div>
              <div className="mt-1 border rounded overflow-hidden text-sm">
                <div className="flex">
                  <div className="flex-1 px-3 py-2 font-medium">Total</div>
                  <div className="px-3 py-2 bg-primary text-primary-foreground font-semibold">Rs.{total.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="invoice-footer bg-gray-900 text-white p-6 text-center">
            <div className="text-sm space-y-1">
              <div>Thank you!</div>
              <div className="text-xs text-gray-400">This is a computer-generated contract.</div>
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
