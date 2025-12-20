import { Router } from "express";
import mongoose from "mongoose";
import Task from "../models/Task.js";
import Invoice from "../models/Invoice.js";

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
    { name: "task" },
    { $max: { seq: n } },
    { upsert: true, new: true }
  );
};

const assignTaskNoIfMissing = async (doc) => {
  if (!doc || doc.taskNo) return doc;
  const c = await Counter.findOneAndUpdate(
    { name: "task" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const nextNo = c?.seq;
  if (!nextNo) return doc;

  // only set if still missing to avoid races
  await Task.updateOne({ _id: doc._id, taskNo: { $exists: false } }, { $set: { taskNo: nextNo } });
  await Task.updateOne({ _id: doc._id, taskNo: null }, { $set: { taskNo: nextNo } });
  doc.taskNo = nextNo;
  return doc;
};

// List with optional filters
router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const status = req.query.status?.toString().trim();
    const priority = req.query.priority?.toString().trim();
    const assignedTo = req.query.assignedTo?.toString().trim();
    const tag = req.query.tag?.toString().trim();
    const deadlineFrom = req.query.deadlineFrom?.toString().trim();
    const deadlineTo = req.query.deadlineTo?.toString().trim();
    const projectId = req.query.projectId?.toString();
    const invoiceIdQ = req.query.invoiceId?.toString();
    const leadIdQ = req.query.leadId?.toString();
    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (leadIdQ) filter.leadId = leadIdQ;

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter["assignees.name"] = assignedTo;
    if (tag) filter.tags = { $elemMatch: { $regex: tag, $options: "i" } };

    if (deadlineFrom || deadlineTo) {
      const range = {};
      if (deadlineFrom) range.$gte = new Date(deadlineFrom);
      if (deadlineTo) range.$lte = new Date(deadlineTo);
      filter.deadline = range;
    }
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

    const maxExisting = await Task.findOne({ taskNo: { $ne: null } })
      .sort({ taskNo: -1 })
      .select("taskNo")
      .lean();
    await ensureCounterAtLeast(maxExisting?.taskNo || 0);

    for (const it of items) {
      // eslint-disable-next-line no-await-in-loop
      await assignTaskNoIfMissing(it);
    }

    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Read one
router.get("/:id", async (req, res) => {
  try {
    const doc = await Task.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });

    const maxExisting = await Task.findOne({ taskNo: { $ne: null } })
      .sort({ taskNo: -1 })
      .select("taskNo")
      .lean();
    await ensureCounterAtLeast(maxExisting?.taskNo || 0);

    await assignTaskNoIfMissing(doc);
    res.json(doc);
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

    if (!doc.taskNo) {
      const c = await Counter.findOneAndUpdate(
        { name: "task" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      const updated = await Task.findByIdAndUpdate(
        req.params.id,
        { taskNo: c.seq },
        { new: true }
      );
      return res.json(updated || doc);
    }

    return res.json(doc);
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
