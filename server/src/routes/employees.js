import { Router } from "express";
import { authenticate, isAdmin } from "../middleware/auth.js";
import Employee from "../models/Employee.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, "..", "..");
const uploadDir = path.join(SERVER_ROOT, "uploads");
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `emp_${req.params.id || Date.now()}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// List with simple search
router.get("/", authenticate, async (req, res) => {
  // Staff can only see themselves
  if (req.user.role === 'staff') {
    const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
    if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
    return res.json([staffEmployee]);
  }
  
  // Admins can see all employees
  const q = req.query.q?.toString().trim();
  const filter = q
    ? {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } },
          { department: { $regex: q, $options: "i" } },
          { role: { $regex: q, $options: "i" } },
        ],
      }
    : {};
  const items = await Employee.find(filter).sort({ createdAt: -1 }).lean();
  res.json(items);
});

// Create (admin only)
router.post("/", authenticate, isAdmin, async (req, res) => {
  try {
    const doc = await Employee.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Bulk insert (admin only)
router.post("/bulk", authenticate, isAdmin, async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: "No items provided" });
    const inserted = await Employee.insertMany(items, { ordered: false });
    res.status(201).json({ ok: true, inserted: inserted.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Send invitations (admin only)
router.post("/invite", authenticate, isAdmin, async (req, res) => {
  try {
    const emails = Array.isArray(req.body?.emails) ? req.body.emails : [];
    res.json({ ok: true, count: emails.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get by id
router.get("/:id", authenticate, async (req, res) => {
  try {
    // Staff can only see their own profile
    if (req.user.role === 'staff') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      if (String(staffEmployee._id) !== String(req.params.id)) {
        return res.status(403).json({ error: "Can only view your own profile" });
      }
      return res.json(staffEmployee);
    }
    
    // Admins can see any profile
    const doc = await Employee.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update
router.put("/:id", authenticate, async (req, res) => {
  try {
    // Staff can only update their own profile (limited fields)
    if (req.user.role === 'staff') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      if (String(staffEmployee._id) !== String(req.params.id)) {
        return res.status(403).json({ error: "Can only update your own profile" });
      }
      
      // Staff can only update certain fields
      const allowedFields = ['phone', 'address', 'bio', 'avatar'];
      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }
      
      const doc = await Employee.findByIdAndUpdate(req.params.id, updates, { new: true });
      if (!doc) return res.status(404).json({ error: "Not found" });
      return res.json(doc);
    }
    
    // Admins can update any field
    const doc = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:id/avatar", authenticate, upload.single("avatar"), async (req, res) => {
  try {
    console.log('Avatar upload request:', {
      params: req.params,
      user: req.user?.email,
      userRole: req.user?.role,
      file: req.file ? 'received' : 'none',
      headers: req.headers['content-type']
    });
    
    // Staff can only update their own avatar
    if (req.user.role === 'staff') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      if (String(staffEmployee._id) !== String(req.params.id)) {
        return res.status(403).json({ error: "Can only update your own avatar" });
      }
    }
    
    if (!req.file) {
      console.log('Avatar upload failed: No file received');
      return res.status(400).json({ error: "No file uploaded" });
    }
    const avatarPath = `/uploads/${req.file.filename}`;
    const doc = await Employee.findByIdAndUpdate(
      req.params.id,
      { avatar: avatarPath },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete (admin only)
router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const r = await Employee.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id/avatar", authenticate, async (req, res) => {
  try {
    // Staff can only update their own avatar
    if (req.user.role === 'staff') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      if (String(staffEmployee._id) !== String(req.params.id)) {
        return res.status(403).json({ error: "Can only update your own avatar" });
      }
    }
    
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    
    // Remove avatar file if it exists
    if (employee.avatar && employee.avatar.startsWith("/uploads/")) {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.join(__dirname, "../../..", employee.avatar);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error("Failed to delete avatar file:", err);
      }
    }
    
    // Update employee record to remove avatar
    await Employee.findByIdAndUpdate(req.params.id, { avatar: "" });
    res.json({ message: "Avatar removed successfully" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
