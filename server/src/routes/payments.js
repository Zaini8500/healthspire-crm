import { Router } from "express";
import mongoose from "mongoose";
import Payment from "../models/Payment.js";
import Invoice from "../models/Invoice.js";

const router = Router();

async function resolveInvoiceObjectId(idOrNumber) {
  if (!idOrNumber) return null;
  const raw = String(idOrNumber);
  if (mongoose.Types.ObjectId.isValid(raw)) return raw;
  const inv = await Invoice.findOne({ number: raw }).select({ _id: 1 }).lean();
  return inv?._id ? String(inv._id) : null;
}

async function updateInvoiceStatus(invoiceId) {
  if (!invoiceId || !mongoose.Types.ObjectId.isValid(String(invoiceId))) return;
  const inv = await Invoice.findById(invoiceId);
  if (!inv) return;
  const pays = await Payment.find({ invoiceId }).select({ amount: 1 }).lean();
  const paid = (pays || []).reduce((s, p) => s + Number(p.amount || 0), 0);
  const total = Number(inv.amount || 0);
  let status = "Unpaid";
  if (paid > 0 && total > 0 && paid < total) status = "Partially paid";
  if ((total > 0 && paid >= total) || (total === 0 && paid > 0)) status = "Paid";
  inv.status = status;
  await inv.save();
}

// List payments with optional search and client filters
router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const clientId = req.query.clientId?.toString();
    const invoiceId = req.query.invoiceId?.toString();
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (invoiceId) {
      const resolved = await resolveInvoiceObjectId(invoiceId);
      if (!resolved) return res.json([]);
      filter.invoiceId = resolved;
    }
    if (q) {
      Object.assign(filter, {
        $or: [
          { client: { $regex: q, $options: "i" } },
          { method: { $regex: q, $options: "i" } },
        ],
      });
    }
    const items = await Payment.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Create payment
router.post("/", async (req, res) => {
  try {
    const payload = req.body || {};
    if (payload.invoiceId) {
      const resolved = await resolveInvoiceObjectId(payload.invoiceId);
      if (!resolved) return res.status(400).json({ error: "Invalid invoiceId" });
      payload.invoiceId = resolved;
    }
    if (payload.amount != null) payload.amount = Number(payload.amount || 0);
    if (payload.date) payload.date = new Date(payload.date);
    const doc = await Payment.create(payload);
    if (doc?.invoiceId) await updateInvoiceStatus(String(doc.invoiceId));
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update payment
router.put("/:id", async (req, res) => {
  try {
    const existing = await Payment.findById(req.params.id).lean();
    const payload = req.body || {};
    if (payload.invoiceId) {
      const resolved = await resolveInvoiceObjectId(payload.invoiceId);
      if (!resolved) return res.status(400).json({ error: "Invalid invoiceId" });
      payload.invoiceId = resolved;
    }
    if (payload.amount != null) payload.amount = Number(payload.amount || 0);
    if (payload.date) payload.date = new Date(payload.date);
    const doc = await Payment.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    const oldInvoiceId = existing?.invoiceId ? String(existing.invoiceId) : "";
    const newInvoiceId = doc?.invoiceId ? String(doc.invoiceId) : "";
    if (oldInvoiceId) await updateInvoiceStatus(oldInvoiceId);
    if (newInvoiceId && newInvoiceId !== oldInvoiceId) await updateInvoiceStatus(newInvoiceId);
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete payment
router.delete("/:id", async (req, res) => {
  try {
    const doc = await Payment.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    if (doc?.invoiceId) await updateInvoiceStatus(String(doc.invoiceId));
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
