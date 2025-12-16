import { Router } from "express";
import Order from "../models/Order.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const clientId = req.query.clientId?.toString();
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (q) filter.$or = [{ client: { $regex: q, $options: "i" } }, { status: { $regex: q, $options: "i" } }];
    const items = await Order.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await Order.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post("/", async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.number) {
      const count = await Order.countDocuments();
      payload.number = `ORDER #${count + 1}`;
    }
    if (Array.isArray(payload.items)) {
      payload.amount = payload.items.reduce((s, it) => s + (Number(it.quantity||0) * Number(it.rate||0)), 0);
      payload.items = payload.items.map(it => ({
        itemId: it.itemId,
        name: it.name,
        description: it.description,
        quantity: Number(it.quantity||0),
        unit: it.unit,
        rate: Number(it.rate||0),
        total: Number(it.quantity||0) * Number(it.rate||0),
      }));
    }
    const doc = await Order.create(payload);
    res.status(201).json(doc);
  }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const payload = req.body || {};
    if (Array.isArray(payload.items)) {
      payload.amount = payload.items.reduce((s, it) => s + (Number(it.quantity||0) * Number(it.rate||0)), 0);
      payload.items = payload.items.map(it => ({
        itemId: it.itemId,
        name: it.name,
        description: it.description,
        quantity: Number(it.quantity||0),
        unit: it.unit,
        rate: Number(it.rate||0),
        total: Number(it.quantity||0) * Number(it.rate||0),
      }));
    }
    const doc = await Order.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  try { const r = await Order.findByIdAndDelete(req.params.id); if (!r) return res.status(404).json({ error: "Not found" }); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default router;
