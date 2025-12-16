import { Router } from "express";
import Payment from "../models/Payment.js";

const router = Router();

// List payments with optional search and client filters
router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const clientId = req.query.clientId?.toString();
    const invoiceId = req.query.invoiceId?.toString();
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (invoiceId) filter.invoiceId = invoiceId;
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
    const doc = await Payment.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update payment
router.put("/:id", async (req, res) => {
  try {
    const doc = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
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
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
