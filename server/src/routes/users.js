import { Router } from "express";
import User from "../models/User.js";
import Employee from "../models/Employee.js";
import { authenticate, isAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/me", authenticate, async (req, res) => {
  res.json(req.user);
});

router.get("/admin/list", authenticate, isAdmin, async (_req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 }).select("name email role status permissions clientId createdAt updatedAt").lean();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/admin/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { role, status, permissions } = req.body || {};
    const update = {};
    if (role) update.role = role;
    if (status) update.status = status;
    if (Array.isArray(permissions)) update.permissions = permissions.map((x) => String(x));
    const doc = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select("name email role status permissions clientId");
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// User lookup for messaging (backed by Employees)
router.get("/", authenticate, async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const limitRaw = Number(req.query.limit || 20);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;

    const empFilter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { department: { $regex: search, $options: "i" } },
            { role: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const employees = await Employee.find(empFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Ensure each employee has a corresponding User record (by email) so conversations use valid User ids.
    const out = [];
    for (const emp of employees) {
      const email = String(emp?.email || "").toLowerCase().trim();
      if (!email) continue;

      // eslint-disable-next-line no-await-in-loop
      const user = await User.findOneAndUpdate(
        { email },
        {
          $setOnInsert: {
            email,
            username: email,
            role: "staff",
            status: "active",
            createdBy: "employee-sync",
          },
          $set: {
            name: emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
            avatar: emp.avatar || "",
          },
        },
        { new: true, upsert: true }
      ).lean();

      out.push({
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      });
    }

    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
