import { Router } from "express";
import Expense from "../models/Expense.js";

const router = Router();

router.get("/", async (req, res) => {
  const q = req.query.q?.toString().trim();
  const employeeId = req.query.employeeId?.toString();
  const clientId = req.query.clientId?.toString();
  const projectId = req.query.projectId?.toString();
  const filter = {};
  if (employeeId) filter.employeeId = employeeId;
  if (clientId) filter.clientId = clientId;
  if (projectId) filter.projectId = projectId;
  if (q) filter.$or = [
    { title: { $regex: q, $options: "i" } },
    { category: { $regex: q, $options: "i" } },
    { description: { $regex: q, $options: "i" } },
  ];
  const items = await Expense.find(filter).sort({ createdAt: -1 }).lean();
  res.json(items);
});

router.post("/", async (req, res) => {
  try {
    const doc = await Expense.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const doc = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const r = await Expense.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
