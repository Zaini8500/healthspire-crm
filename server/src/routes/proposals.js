import { Router } from "express";
import Proposal from "../models/Proposal.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const clientId = req.query.clientId?.toString();
    const leadId = req.query.leadId?.toString();
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (leadId) filter.leadId = leadId;
    if (q) filter.$or = [{ title: { $regex: q, $options: "i" } }, { client: { $regex: q, $options: "i" } }];
    const items = await Proposal.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post("/", async (req, res) => {
  try { const doc = await Proposal.create(req.body || {}); res.status(201).json(doc); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.put("/:id", async (req, res) => {
  try { const doc = await Proposal.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!doc) return res.status(404).json({ error: "Not found" }); res.json(doc); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  try { const r = await Proposal.findByIdAndDelete(req.params.id); if (!r) return res.status(404).json({ error: "Not found" }); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default router;
