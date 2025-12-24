import { Router } from "express";
import Project from "../models/Project.js";
import { authenticate } from "../middleware/auth.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  const q = req.query.q?.toString().trim();
  const filter = {};

  // Role-based scoping
  if (req.user.role === "admin") {
    // Admin can optionally filter by employeeId
    const employeeId = req.query.employeeId?.toString();
    if (employeeId) filter.employeeId = employeeId;
  } else if (req.user.role === "staff") {
    // Staff can only see projects assigned to them
    const staffUser = await User.findOne({ email: req.user.email }).lean();
    if (!staffUser) return res.json([]);
    const employee = await Employee.findOne({ email: req.user.email }).lean();
    if (!employee) return res.json([]);
    filter.employeeId = employee._id;
  } else {
    // Clients and other roles not allowed here
    return res.status(403).json({ error: "Access denied" });
  }

  if (q) filter.$or = [{ title: { $regex: q, $options: "i" } }, { client: { $regex: q, $options: "i" } }];
  const items = await Project.find(filter).sort({ createdAt: -1 }).lean();
  res.json(items);
});

// Get single project by id
router.get("/:id", authenticate, async (req, res) => {
  try {
    const doc = await Project.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });

    // Role-based access check
    if (req.user.role === "admin") {
      // Admin can view any project
    } else if (req.user.role === "staff") {
      // Staff can only view projects assigned to them
      const employee = await Employee.findOne({ email: req.user.email }).lean();
      if (!employee || String(doc.employeeId) !== String(employee._id)) {
        return res.status(403).json({ error: "Access denied" });
      }
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/", authenticate, async (req, res) => {
  // Only admins can create projects
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied" });
  }
  try {
    const doc = await Project.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", authenticate, async (req, res) => {
  try {
    const pre = await Project.findById(req.params.id).lean();
    const doc = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });

    // Role-based update permissions
    if (req.user.role === "admin") {
      // Admin can update any project
    } else if (req.user.role === "staff") {
      // Staff can only update projects assigned to them (limited fields)
      const employee = await Employee.findOne({ email: req.user.email }).lean();
      if (!employee || String(doc.employeeId) !== String(employee._id)) {
        return res.status(403).json({ error: "Access denied" });
      }
      // Staff can only update certain fields (progress, status, etc.)
      const allowedUpdates = ["progress", "status", "description"];
      const updates = Object.keys(req.body);
      const hasInvalidUpdates = updates.some(key => !allowedUpdates.includes(key));
      if (hasInvalidUpdates) {
        return res.status(403).json({ error: "You can only update progress, status, or description" });
      }
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    // Notify newly assigned employee (admin only)
    try {
      const nextEmployeeId = req.body?.employeeId;
      if (req.user.role === "admin" && nextEmployeeId && String(nextEmployeeId) !== String(pre?.employeeId || "")) {
        const emp = await Employee.findById(nextEmployeeId).lean();
        const email = String(emp?.email || "").toLowerCase().trim();
        if (email) {
          const u = await User.findOne({ email }).select("_id").lean();
          if (u?._id) {
            await Notification.create({
              userId: u._id,
              type: "project_assigned",
              title: "New project assigned",
              message: String(doc.title || "Project"),
              href: `/projects/overview/${doc._id}`,
              meta: { projectId: doc._id },
            });
          }
        }
      }
    } catch {
      // best-effort
    }

    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  // Only admins can delete projects
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied" });
  }
  try {
    const r = await Project.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
