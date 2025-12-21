import { Router } from "express";
import Note from "../models/Note.js";

const router = Router();

router.get("/", async (req, res) => {
  const q = req.query.q?.toString().trim();
  const employeeId = req.query.employeeId?.toString();
  const leadId = req.query.leadId?.toString();
  const clientId = req.query.clientId?.toString();
  const filter = {};
  if (employeeId) filter.employeeId = employeeId;
  if (leadId) filter.leadId = leadId;
  if (clientId) filter.clientId = clientId;
  if (q) filter.$or = [{ title: { $regex: q, $options: "i" } }, { text: { $regex: q, $options: "i" } }];
  const items = await Note.find(filter).sort({ createdAt: -1 }).lean();
  res.json(items);
});

router.post("/", async (req, res) => {
  try {
    const doc = await Note.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const doc = await Note.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const r = await Note.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
