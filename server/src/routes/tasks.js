import { Router } from "express";
import mongoose from "mongoose";
import Task from "../models/Task.js";
import Invoice from "../models/Invoice.js";

const router = Router();

// List with optional filters
router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const projectId = req.query.projectId?.toString();
    const invoiceIdQ = req.query.invoiceId?.toString();
    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (invoiceIdQ) {
      let invId = null;
      if (mongoose.Types.ObjectId.isValid(invoiceIdQ)) {
        invId = invoiceIdQ;
      } else {
        // Try to resolve by invoice number
        const inv = await Invoice.findOne({ number: invoiceIdQ }).select("_id").lean();
        if (inv) invId = String(inv._id);
      }
      if (invId) filter.invoiceId = invId;
    }
    if (q) {
      Object.assign(filter, {
        $or: [
          { title: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { projectTitle: { $regex: q, $options: "i" } },
          { tags: { $elemMatch: { $regex: q, $options: "i" } } },
        ],
      });
    }
    const items = await Task.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Create
router.post("/", async (req, res) => {
  try {
    const doc = await Task.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update
router.put("/:id", async (req, res) => {
  try {
    const doc = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete
router.delete("/:id", async (req, res) => {
  try {
    const r = await Task.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
