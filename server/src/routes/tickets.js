import { Router } from "express";
import mongoose from "mongoose";
import Ticket from "../models/Ticket.js";

const router = Router();

const CounterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Counter = mongoose.models.Counter || mongoose.model("Counter", CounterSchema);

const ensureCounterAtLeast = async (minSeq) => {
  const n = Number(minSeq || 0) || 0;
  await Counter.findOneAndUpdate(
    { name: "ticket" },
    { $max: { seq: n } },
    { upsert: true, new: true }
  );
};

const assignTicketNoIfMissing = async (doc) => {
  if (!doc || doc.ticketNo) return doc;
  const c = await Counter.findOneAndUpdate(
    { name: "ticket" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const nextNo = c?.seq;
  if (!nextNo) return doc;
  await Ticket.updateOne({ _id: doc._id, ticketNo: { $exists: false } }, { $set: { ticketNo: nextNo } });
  await Ticket.updateOne({ _id: doc._id, ticketNo: null }, { $set: { ticketNo: nextNo } });
  doc.ticketNo = nextNo;
  return doc;
};

router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const clientId = req.query.clientId?.toString();
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (q) filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { client: { $regex: q, $options: "i" } },
      { type: { $regex: q, $options: "i" } },
      { labels: { $elemMatch: { $regex: q, $options: "i" } } },
    ];
    const items = await Ticket.find(filter).sort({ createdAt: -1 }).lean();

    const maxNo = items.reduce((m, it) => Math.max(m, Number(it?.ticketNo || 0) || 0), 0);
    await ensureCounterAtLeast(maxNo);
    for (const it of items) {
      if (!it.ticketNo) await assignTicketNoIfMissing(it);
    }

    res.json(items);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post("/", async (req, res) => {
  try {
    const payload = req.body || {};
    const doc = await Ticket.create(payload);
    await assignTicketNoIfMissing(doc);
    res.status(201).json(doc);
  }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await Ticket.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    await ensureCounterAtLeast(Number(doc?.ticketNo || 0) || 0);
    if (!doc.ticketNo) await assignTicketNoIfMissing(doc);
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:id/messages", async (req, res) => {
  try {
    const text = req.body?.text?.toString() || "";
    const createdBy = req.body?.createdBy?.toString() || "";
    if (!text.trim()) return res.status(400).json({ error: "Message text is required" });
    const msg = { text: text.trim(), createdBy, createdAt: new Date() };
    const doc = await Ticket.findByIdAndUpdate(
      req.params.id,
      { $push: { messages: msg }, $set: { lastActivity: new Date() } },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try { const doc = await Ticket.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!doc) return res.status(404).json({ error: "Not found" }); res.json(doc); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  try { const r = await Ticket.findByIdAndDelete(req.params.id); if (!r) return res.status(404).json({ error: "Not found" }); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default router;
