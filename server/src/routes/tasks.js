import { Router } from "express";
import mongoose from "mongoose";
import { authenticate } from "../middleware/auth.js";
import Task from "../models/Task.js";
import Invoice from "../models/Invoice.js";
import Counter from "../models/Counter.js";
import Employee from "../models/Employee.js";

const router = Router();

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
router.get("/", authenticate, async (req, res) => {
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
    const ticketIdQ = req.query.ticketId?.toString();
    let filter = {};
    
    // Staff can only see tasks assigned to them or where they are participants
    if (req.user.role === 'staff') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      
      const staffName = staffEmployee.name || `${staffEmployee.firstName || ""} ${staffEmployee.lastName || ""}`.trim();
      filter.$or = [
        { "assignees.name": staffName },
        { "participants.name": staffName }
      ];
      
      // Apply additional filters within the staff's accessible tasks
      const baseFilter = { ...filter };
      if (projectId) filter.projectId = projectId;
      if (leadIdQ) filter.leadId = leadIdQ;
      if (ticketIdQ) filter.ticketId = ticketIdQ;
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (tag) filter.tags = { $elemMatch: { $regex: tag, $options: "i" } };
      if (deadlineFrom || deadlineTo) {
        const range = {};
        if (deadlineFrom) range.$gte = new Date(deadlineFrom);
        if (deadlineTo) range.$lte = new Date(deadlineTo);
        filter.deadline = range;
      }
      
      // Combine base filter with additional filters
      if (Object.keys(filter).length > 1) {
        filter = {
          $and: [
            baseFilter,
            Object.fromEntries(Object.entries(filter).filter(([k]) => k !== '$or'))
          ]
        };
      }
      
      // Staff cannot filter by assignedTo (they can only see their own)
      // Ignore assignedTo filter for staff
    } else {
      // Admin filters
      if (projectId) filter.projectId = projectId;
      if (leadIdQ) filter.leadId = leadIdQ;
      if (ticketIdQ) filter.ticketId = ticketIdQ;
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
      if (invId) {
        if (filter.$and) {
          filter.$and.push({ invoiceId: invId });
        } else {
          filter.invoiceId = invId;
        }
      }
    }
    if (q) {
      const searchFilter = {
        $or: [
          { title: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { projectTitle: { $regex: q, $options: "i" } },
          { tags: { $elemMatch: { $regex: q, $options: "i" } } },
        ],
      };
      if (filter.$and) {
        filter.$and.push(searchFilter);
      } else {
        Object.assign(filter, searchFilter);
      }
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
router.get("/:id", authenticate, async (req, res) => {
  try {
    const doc = await Task.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    
    // Staff can only view tasks assigned to them or where they are participants
    if (req.user.role === 'staff') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      
      const staffName = staffEmployee.name || `${staffEmployee.firstName || ""} ${staffEmployee.lastName || ""}`.trim();
      const isAssignee = doc.assignees?.some((assignee) => assignee.name === staffName);
      const isParticipant = doc.participants?.some((participant) => participant.name === staffName);
      
      if (!isAssignee && !isParticipant) {
        return res.status(403).json({ error: "Can only view tasks assigned to you or where you are a participant" });
      }
    }

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
router.post("/", authenticate, async (req, res) => {
  try {
    // Staff can create tasks but should assign them appropriately
    if (req.user.role === 'staff') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      
      const staffName = staffEmployee.name || `${staffEmployee.firstName || ""} ${staffEmployee.lastName || ""}`.trim();
      
      // If no assignees provided, assign to self
      if (!req.body.assignees || req.body.assignees.length === 0) {
        req.body.assignees = [{ name: staffName }];
      }
      
      // Add staff as participant if not already
      if (!req.body.participants) {
        req.body.participants = [{ name: staffName }];
      } else {
        const isParticipant = req.body.participants.some((p) => p.name === staffName);
        if (!isParticipant) {
          req.body.participants.push({ name: staffName });
        }
      }
    }
    
    const doc = await Task.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update
router.put("/:id", authenticate, async (req, res) => {
  try {
    // First get the task to check access
    const existingTask = await Task.findById(req.params.id).lean();
    if (!existingTask) return res.status(404).json({ error: "Not found" });
    
    // Staff can only update tasks assigned to them or where they are participants
    if (req.user.role === 'staff') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      
      const staffName = staffEmployee.name || `${staffEmployee.firstName || ""} ${staffEmployee.lastName || ""}`.trim();
      const isAssignee = existingTask.assignees?.some((assignee) => assignee.name === staffName);
      const isParticipant = existingTask.participants?.some((participant) => participant.name === staffName);
      
      if (!isAssignee && !isParticipant) {
        return res.status(403).json({ error: "Can only update tasks assigned to you or where you are a participant" });
      }
      
      // Staff cannot remove themselves as assignee or participant
      if (req.body.assignees) {
        const stillAssignee = req.body.assignees.some((a) => a.name === staffName);
        if (!stillAssignee && isAssignee) {
          req.body.assignees.push({ name: staffName });
        }
      }
      
      if (req.body.participants) {
        const stillParticipant = req.body.participants.some((p) => p.name === staffName);
        if (!stillParticipant && isParticipant) {
          req.body.participants.push({ name: staffName });
        }
      }
    }
    
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
router.delete("/:id", authenticate, async (req, res) => {
  try {
    // First get the task to check access
    const existingTask = await Task.findById(req.params.id).lean();
    if (!existingTask) return res.status(404).json({ error: "Not found" });
    
    // Staff can only delete tasks assigned to them or where they are participants
    if (req.user.role === 'staff') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      
      const staffName = staffEmployee.name || `${staffEmployee.firstName || ""} ${staffEmployee.lastName || ""}`.trim();
      const isAssignee = existingTask.assignees?.some((assignee) => assignee.name === staffName);
      const isParticipant = existingTask.participants?.some((participant) => participant.name === staffName);
      
      if (!isAssignee && !isParticipant) {
        return res.status(403).json({ error: "Can only delete tasks assigned to you or where you are a participant" });
      }
    }
    
    const r = await Task.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
