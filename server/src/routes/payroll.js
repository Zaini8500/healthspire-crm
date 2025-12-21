import { Router } from "express";
import { authenticate, isAdmin } from "../middleware/auth.js";
import Payroll from "../models/Payroll.js";
import Employee from "../models/Employee.js";

const router = Router();

// List by period with optional search
router.get("/", authenticate, async (req, res) => {
  try {
    const rawPeriod = req.query.period?.toString();
    const period = rawPeriod || new Date().toISOString().slice(0,7);
    const q = req.query.q?.toString().trim();
    let filter = period === "all" ? {} : { period };
    
    // Staff can only see their own payroll
    if (req.user.role === 'staff') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      filter.employeeId = staffEmployee._id;
      // Ignore search filter for staff
    } else if (q) {
      // Admins can search by employee name
      Object.assign(filter, { employee: { $regex: q, $options: "i" } });
    }
    
    const items = await Payroll.find(filter).sort({ period: -1, employee: 1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Run payroll for a period from Employees' salary (admin only)
router.post("/run", authenticate, isAdmin, async (req, res) => {
  try {
    const period = req.body?.period || req.query.period || new Date().toISOString().slice(0,7);
    const emps = await Employee.find({}).lean();
    const bulk = emps.map((e) => {
      const name = e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim();
      const basic = Number(e.salary || 0) || 0;
      const allowances = 0;
      const deductions = 0;
      const net = basic + allowances - deductions;
      return {
        updateOne: {
          filter: { employeeId: e._id, period },
          update: { $set: { employeeId: e._id, employee: name, period, basic, allowances, deductions, net, status: "draft" } },
          upsert: true,
        },
      };
    });
    if (bulk.length) await Payroll.bulkWrite(bulk, { ordered: false });
    const items = await Payroll.find({ period }).sort({ employee: 1 }).lean();
    res.json({ ok: true, count: items.length, items });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update a payroll row
router.put("/:id", authenticate, async (req, res) => {
  try {
    // First get the payroll record to check ownership
    const payroll = await Payroll.findById(req.params.id).lean();
    if (!payroll) return res.status(404).json({ error: "Not found" });
    
    // Staff can only update their own payroll
    if (req.user.role === 'staff') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      if (String(payroll.employeeId) !== String(staffEmployee._id)) {
        return res.status(403).json({ error: "Can only update your own payroll" });
      }
    }
    
    const doc = await Payroll.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
