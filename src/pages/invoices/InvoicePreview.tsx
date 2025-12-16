import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const API_BASE = "http://localhost:5000";

export default function InvoicePreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inv, setInv] = useState<any | null>(null);
  const [company] = useState({
    name: "HealthSpire",
    address: "761/D2 Shah Jelani Rd Township Lahore",
    city: "",
    email: "info@healthspire.org",
    phone: "+92 312 7231875",
    logo: "/healthspire-logo.png",
    taxId: "",
    website: "www.healthspire.org"
  });
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/invoices/${id}`);
        if (r.ok) setInv(await r.json());
        const p = await fetch(`${API_BASE}/api/payments?invoiceId=${id}`);
        if (p.ok) setPayments(await p.json());
      } catch {}
    })();
  }, [id]);

  const formatClient = (c: any) => {
    if (!c) return "-";
    if (typeof c === "string") return c;
    return c.name || c.company || c.person || "-";
  };

  const itemsSub = useMemo(() => {
    const list: any[] = Array.isArray(inv?.items) ? inv!.items : [];
    if (!list.length) return Number(inv?.amount || 0);
    return list.reduce((sum, it) => sum + (Number(it.quantity ?? it.qty ?? 0) * Number(it.rate ?? 0)), 0);
  }, [inv]);
  const subTotal = itemsSub;
  const tax1 = (inv?.tax1 ?? 0) / 100 * subTotal;
  const tax2 = (inv?.tax2 ?? 0) / 100 * subTotal;
  const tds = (inv?.tds ?? 0) / 100 * subTotal;
  const total = subTotal + tax1 + tax2 - tds;
  const paid = useMemo(() => (Array.isArray(payments) ? payments.reduce((s, p:any)=> s + (Number(p.amount)||0), 0) : 0), [payments]);
  const balance = total - paid;

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <div className="flex items-center justify-end mb-3">
        <Button variant="outline" onClick={() => navigate(-1)}>Close</Button>
      </div>
      <div className="bg-white shadow-lg mx-auto max-w-5xl border rounded-lg overflow-hidden">
        {/* HealthSpire Header */}
        <div className="p-6 border-b bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={company.logo} alt={company.name} className="h-14 w-14 object-contain" />
              <div>
                <div className="text-xl font-bold text-sky-700">{company.name}</div>
                <div className="text-xs text-gray-600">{company.website}</div>
              </div>
            </div>
            <div className="text-xs text-gray-700 text-right">
              <div className="flex gap-6">
                <div>📞 {company.phone}</div>
                <div>✉️ {company.email}</div>
                <div>📍 {company.address}</div>
              </div>
            </div>
          </div>
          <div className="mt-4 border-t pt-4 text-center">
            <div className="text-3xl font-extrabold text-sky-700 tracking-wide">INVOICE ESTIMATE</div>
            <div className="mt-2 flex items-center justify-between text-sm text-gray-700">
              <div className="font-semibold">INVOICE TO: <span className="ml-2 font-normal">{formatClient(inv?.client)}</span></div>
              <div className="flex gap-6">
                <div>Number: {inv?.number || id}</div>
                <div>Date: {inv?.issueDate ? new Date(inv.issueDate).toLocaleDateString() : '-'}</div>
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
                <div className="font-semibold text-gray-900">{company.name}</div>
                <div className="text-sm text-gray-600 mt-1">{company.address}</div>
                <div className="text-sm text-gray-600">{company.city}</div>
                <div className="text-sm text-gray-600">{company.email}</div>
                <div className="text-sm text-gray-600">{company.phone}</div>
                <div className="text-sm text-gray-500 mt-1">TAX ID: {company.taxId}</div>
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
            {inv?.labels && (
              <div className="mb-4">
                <div className="text-sm font-semibold text-gray-700 mb-1">Labels:</div>
                <div className="flex flex-wrap gap-2">
                  {inv.labels.split(',').map((label: string, idx: number) => (
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
                  <div>
                    <div><span className="font-semibold">A/c Title:</span> Health Spire Pvt LTd</div>
                    <div><span className="font-semibold">Bank No:</span> 3130301000008524</div>
                    <div><span className="font-semibold">IBAN:</span> PK81FAYS3130301000008524.</div>
                    <div>Faysal Bank Bahria Orchard</div>
                    <div>Branch Code 3139.</div>
                  </div>
                  <div className="pt-2">
                    <div><span className="font-semibold">A/c Title:</span> Health Spire Pvt LTd</div>
                    <div><span className="font-semibold">Bank No:</span> 02220113618930.</div>
                    <div><span className="font-semibold">IBAN:</span> PK86MEZN0002220113618930.</div>
                    <div>Meezan Bank College</div>
                    <div>Road Branch Lahore Code 0222</div>
                  </div>
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
              {company.name} | {company.email} | {company.phone} | {company.website}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
